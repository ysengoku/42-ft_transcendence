from pathlib import Path

import magic
from django.contrib.auth import authenticate
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as BaseUserManager
from django.core.exceptions import PermissionDenied, RequestDataTooBig, ValidationError
from django.db import models
from django.db.models import Case, Count, F, Q, Sum, When
from ninja.files import UploadedFile

from .stats_calc import calculate_elo_change, calculate_winrate
from .utils import merge_err_dicts


class UserManager(BaseUserManager):
    pass


class User(AbstractUser):
    objects = UserManager()

    def validate_unique(self, *args: list, **kwargs: dict) -> None:
        if "username" not in kwargs["exclude"] and User.objects.username_occupied:
            raise ValidationError({"username": ["A user with that username already exists."]})
        kwargs["exclude"] = {"username"}
        super().validate_unique(*args, **kwargs)

    def update_user(self, data, new_profile_picture: UploadedFile | None):
        err_dict = {}

        if new_profile_picture:
            try:
                self.profile.update_avatar(new_profile_picture)
            except ValidationError as exc:
                err_dict = merge_err_dicts(err_dict, exc.error_dict)

        if data.old_password and not data.password:
            err_dict = merge_err_dicts(err_dict, {"password": ["Please enter your new password."]})

        if data.password and data.password_repeat:
            is_old_password_valid = authenticate(username=self.username, password=data.old_password)
            if not is_old_password_valid:
                raise PermissionDenied
            if data.old_password == data.password:
                err_dict = merge_err_dicts(
                    err_dict,
                    {"password": ["New password cannot be the same as the old password."]},
                )
            self.set_password(data.password)
            data.password = ""

        if data.username == self.username:
            err_dict = merge_err_dicts(err_dict, {"username": ["New username cannot be the same as the old username."]})

        for key, val in data:
            if val and hasattr(self, key):
                setattr(self, key, val)

        try:
            if data.username and data.username != self.username:
                self.full_clean()
            else:
                self.full_clean(exclude={"username"})
        except ValidationError as exc:
            err_dict = merge_err_dicts(err_dict, exc.error_dict)

        if err_dict:
            raise ValidationError(err_dict)
        self.save()
        self.profile.save()
        return self


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to="avatars/", null=True, blank=True)
    elo = models.IntegerField(default=1000)
    friends = models.ManyToManyField("self", symmetrical=False)
    blocked_users = models.ManyToManyField("self")
    is_online = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.user.username

    @property
    def avatar(self) -> str:
        if self.profile_picture:
            return self.profile_picture.url
        return "/static/images/default_avatar.png"

    @property
    def matches(self):
        return self.won_matches.all() | self.lost_matches.all()

    @property
    def wins(self):
        return self.won_matches.count()

    @property
    def loses(self):
        return self.lost_matches.count()

    @property
    def winrate(self):
        return calculate_winrate(self.wins, self.loses)

    @property
    def total_matches(self):
        return self.matches.count()

    @property
    def scored_balls(self):
        return (
            self.matches.aggregate(
                scored_balls=Sum(Case(When(loser=self, then="losers_score"), When(winner=self, then="winners_score"))),
            )["scored_balls"]
            or 0
        )

    @property
    def best_enemy(self):
        best_enemy = self.won_matches.values("loser").annotate(wins=Count("loser")).order_by("-wins").first()
        if not best_enemy or not best_enemy.get("loser", None):
            return None
        return Profile.objects.get(id=best_enemy["loser"])

    @property
    def worst_enemy(self):
        worst_enemy = self.lost_matches.values("winner").annotate(losses=Count("winner")).order_by("-losses").first()
        if not worst_enemy or not worst_enemy.get("winner", None):
            return None
        return Profile.objects.get(id=worst_enemy["winner"])

    def get_stats_against_player(self, profile):
        res = self.matches.aggregate(
            wins=Count("pk", filter=Q(winner=self) & Q(loser=profile)),
            loses=Count("pk", filter=Q(winner=profile) & Q(loser=self)),
        )
        return {
            "username": profile.user.username,
            "avatar": profile.avatar,
            "elo": profile.elo,
            "wins": res["wins"],
            "loses": res["loses"],
            "winrate": calculate_winrate(res["wins"], res["loses"]),
        }

    def annotate_elo_data_points(self):
        return self.matches.annotate(
            elo_change_signed=Case(When(winner=self, then=F("elo_change")), When(loser=self, then=-F("elo_change"))),
            elo_result=Case(When(winner=self, then=F("winners_elo")), When(loser=self, then=F("losers_elo"))),
        )

    def delete_avatar(self) -> None:
        self.profile_picture.delete()
        if self.profile_picture and Path.is_file(self.profile_picture.path):
            Path.unlink(self.profile_picture.path)

    def update_avatar(self, new_avatar) -> None:
        self.validate_avatar(new_avatar)
        self.delete_avatar()
        self.profile_picture = new_avatar

    def validate_avatar(self, file: UploadedFile) -> None:
        """
        Validates uploaded avatar for having a correct extension being a valid image.
        Supported file types: png, jpg, webp.
        Maximum size of the file is 10mb.
        """
        max_file_size = 1024 * 1024 * 10

        if file.size >= max_file_size:
            raise RequestDataTooBig

        err_dict = {}
        invalid_file_type_msg = {"avatar": ["Invalid file type. Supported file types: .png, .jpg, .webp."]}
        accepted_file_extensions = [".png", ".jpg", ".jpeg", ".webp"]
        accepted_mime_types = ["image/png", "image/jpeg", "image/webp"]
        file_mime_type = magic.from_buffer(file.read(1024), mime=True)
        if (
            Path(file.name).suffix not in accepted_file_extensions
            or file.content_type not in accepted_mime_types
            or file_mime_type not in accepted_mime_types
        ):
            err_dict = merge_err_dicts(err_dict, invalid_file_type_msg)

        if err_dict:
            raise ValidationError(err_dict)


class MatchManager(models.Manager):
    MINUMUM_ELO = 100
    K_FACTOR = 32
    WIN = 1
    DRAW = 0.5
    LOSS = 0

    def resolve(self, winner: Profile, loser: Profile, winners_score: int, losers_score: int):
        """
        Resolves all elo calculations, updates profiles of players,
        creates a new match record and saves everything into the database.
        """
        elo_change = calculate_elo_change(winner.elo, loser.elo, MatchManager.WIN, MatchManager.K_FACTOR)
        if (loser.elo - elo_change) < MatchManager.MINUMUM_ELO:
            elo_change = loser.elo - MatchManager.MINUMUM_ELO
        winner.elo += elo_change
        loser.elo -= elo_change
        resolved_match = Match(
            winner=winner,
            loser=loser,
            winners_score=winners_score,
            losers_score=losers_score,
            elo_change=elo_change,
            winners_elo=winner.elo,
            losers_elo=loser.elo,
        )
        resolved_match.save()
        winner.save()
        loser.save()
        return resolved_match


class Match(models.Model):
    winner = models.ForeignKey(Profile, related_name="won_matches", on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey(Profile, related_name="lost_matches", on_delete=models.SET_NULL, null=True)
    winners_score = models.IntegerField()
    losers_score = models.IntegerField()
    elo_change = models.IntegerField()
    winners_elo = models.IntegerField(default=1000)
    losers_elo = models.IntegerField(default=1000)
    date = models.DateTimeField(auto_now_add=True)

    objects = MatchManager()

    class Meta:
        verbose_name_plural = "matches"
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.winner.user.username} - {self.loser.user.username}"
