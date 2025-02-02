from pathlib import Path

import magic
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as BaseUserManager
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import PermissionDenied, RequestDataTooBig, ValidationError
from django.db import models
from django.db.models import Case, Count, Exists, ExpressionWrapper, F, Func, IntegerField, Q, Sum, Value, When
from django.db.models.lookups import Exact
from ninja.files import UploadedFile

from .stats_calc import calculate_elo_change, calculate_winrate
from .utils import merge_err_dicts


class UserManager(BaseUserManager):
    def for_username_or_email(self, identifier: str):
        return self.filter(Q(username__iexact=identifier) | Q(email=identifier))

    def for_username(self, username: str):
        return self.filter(username__iexact=username)

    def fill_user_data(self, username: str, connection_type: str, **extra_fields):
        username = AbstractUser.normalize_username(username)
        if connection_type != self.model.REGULAR:
            username = self._generate_unique_username(username)
        if extra_fields.get("password"):
            extra_fields["password"] = make_password(extra_fields.get("password"))
        if extra_fields.get("email"):
            extra_fields["email"] = BaseUserManager.normalize_email(extra_fields.get("email"))
        extra_fields.setdefault("nickname", username)
        return self.model(username=username, connection_type=connection_type, **extra_fields)

    def create_user(self, username: str, connection_type: str, **extra_fields):
        extra_fields["is_superuser"] = False
        user = self.fill_user_data(username, connection_type, **extra_fields)
        user.full_clean()
        user.save()
        return user

    def validate_and_create_user(self, username: str, connection_type: str, **extra_fields):
        extra_fields["is_superuser"] = False
        user = self.fill_user_data(username, connection_type, **extra_fields)
        user.full_clean()
        user.save()
        return user

    def _generate_unique_username(self, username: str):
        base_username = username
        counter = self.filter(username__iexact=username).count()
        if counter > 0:
            return f"{base_username}-{counter}"
        return base_username


class User(AbstractUser):
    """
    Contains information that is related to authentication and authorization of one single user.
    """

    FT = "42"
    GITHUB = "github"
    REGULAR = "regular"
    CONNECTION_TYPES_CHOICES = (
        (FT, "42 School API"),
        (GITHUB, "Github API"),
        (REGULAR, "Our Own Auth"),
    )

    REQUIRED_FIELDS = ()

    username_validator = UnicodeUsernameValidator()

    username = models.CharField(max_length=50, validators=[username_validator], unique=True)
    nickname = models.CharField(max_length=50, validators=[username_validator])
    email = models.EmailField(default="")
    connection_type = models.CharField(max_length=10, choices=CONNECTION_TYPES_CHOICES, default="regular")
    password = models.CharField(max_length=128, default="")

    objects = UserManager()

    def validate_unique(self, *args: list, **kwargs: dict) -> None:
        if "username" not in kwargs["exclude"] and User.objects.filter(username__iexact=self.username).exists():
            raise ValidationError({"username": ["A user with that username already exists."]})
        if (
            "email" not in kwargs["exclude"]
            and self.connection_type == User.REGULAR
            and User.objects.filter(email=self.email).exists()
        ):
            raise ValidationError({"email": ["A user with that email already exists."]})
        kwargs["exclude"] |= {"username", "email"}
        super().validate_unique(*args, **kwargs)

    def clean(self):
        if not self.password and self.connection_type == User.REGULAR:
            raise ValidationError({"password": ["This connection type requires a password."]})
        if not self.email and self.connection_type == User.REGULAR:
            raise ValidationError({"password": ["Email is required."]})

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
            is_old_password_valid = self.check_password(password=data.old_password)
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

        if data.email == self.email:
            err_dict = merge_err_dicts(err_dict, {"email": ["New email cannot be the same as the old email."]})

        for key, val in data:
            if val and hasattr(self, key):
                setattr(self, key, val)

        exclude = set()
        if not data.email:
            exclude.add("email")
        if not data.username:
            exclude.add("username")

        try:
            self.validate_unique(exclude=exclude)
            self.full_clean(validate_unique=False)
        except ValidationError as exc:
            err_dict = merge_err_dicts(err_dict, exc.error_dict)

        if err_dict:
            raise ValidationError(err_dict)
        self.save()
        self.profile.save()
        return self

    def __str__(self):
        return f"{self.username} - {self.connection_type}"


class ProfileQuerySet(models.QuerySet):
    def for_username(self, username: str):
        return self.filter(user__username=username)

    def with_friendship_and_block_status(self, curr_user, username: str):
        """
        Annotates friendship and block status regarding user <username>.
        """
        return self.annotate(
            is_friend=Exists(curr_user.profile.friends.filter(user__username=username)),
            is_blocked_user=Exists(curr_user.profile.blocked_users.filter(user__username=username)),
            is_blocked_by_user=Exists(curr_user.profile.blocked_users_of.filter(user__username=username)),
        )

    def with_wins_and_loses_and_total_matches(self):
        """
        Annotates wins, loses and calculated winrate, using ORM queries.
        """

        class Round(Func):
            function = "ROUND"
            template = "%(function)s(%(expressions)s, 0)"

        return (
            # count loses and wins as distinct for correct values
            self.annotate(wins=Count("won_matches", distinct=True), loses=Count("lost_matches", distinct=True))
            # calculate total = wins + loses
            .annotate(total_matches=F("wins") + F("loses"))
            # calculate winrate
            .annotate(
                winrate=Case(
                    # if no games, return null
                    When(Exact(F("total_matches"), Value(0)), then=Value(None)),
                    # otherwise return rounded result of wins / total_matches * 100
                    # multiplies by 1.0 to force floating point conversion, as 'wins' and 'loses' are ints
                    default=ExpressionWrapper(
                        Round(F("wins") * 1.0 / F("total_matches") * Value(100)), output_field=IntegerField()
                    ),
                )
            )
        )

    def with_full_profile(self, curr_user, username: str):
        return (
            self.prefetch_related("friends__user")
            .select_related("user")
            .with_friendship_and_block_status(curr_user, username)
            .with_wins_and_loses_and_total_matches()
        )


class Profile(models.Model):
    """
    Contains user information to the application logic itself.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to="avatars/", null=True, blank=True)
    elo = models.IntegerField(default=1000)
    friends = models.ManyToManyField("self", symmetrical=False, through="Friendship", related_name="friends_of")
    blocked_users = models.ManyToManyField("self", symmetrical=False, related_name="blocked_users_of")
    is_online = models.BooleanField(default=True)

    objects = ProfileQuerySet.as_manager()

    def __str__(self) -> str:
        return f"Profile of {self.user.username}"

    @property
    def avatar(self) -> str:
        if self.profile_picture:
            return self.profile_picture.url
        return "/static/images/default_avatar.png"

    @property
    def matches(self):
        return self.won_matches.all() | self.lost_matches.all()

    def get_scored_balls(self):
        return (
            self.matches.aggregate(
                scored_balls=Sum(Case(When(loser=self, then="losers_score"), When(winner=self, then="winners_score"))),
            )["scored_balls"]
            or 0
        )

    def get_best_enemy(self):
        best_enemy = self.won_matches.values("loser").annotate(wins=Count("loser")).order_by("-wins").first()
        if not best_enemy or not best_enemy.get("loser", None):
            return None
        return Profile.objects.get(id=best_enemy["loser"])

    def get_worst_enemy(self):
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

    def get_elo_data_points(self):
        return self.matches.annotate(
            elo_change_signed=Case(When(winner=self, then=F("elo_change")), When(loser=self, then=-F("elo_change"))),
            elo_result=Case(When(winner=self, then=F("winners_elo")), When(loser=self, then=F("losers_elo"))),
        ).values("elo_change_signed", "elo_result", "date")

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

    def add_friend(self, new_friend):
        if new_friend == self:
            return "Can't add yourself to the friendlist."
        if self.friends.filter(pk=new_friend.pk).exists():
            return f"User {new_friend.user.username} is already in the friendlist."
        if self.blocked_users.filter(pk=new_friend.pk).exists():
            return f"User {new_friend.user.username} is in the blocklist."
        self.friends.add(new_friend)
        return None

    def remove_friend(self, removed_friend):
        if not self.friends.filter(pk=removed_friend.pk).exists():
            return f"User {removed_friend.user.username} is not in the friendlist."
        self.friends.remove(removed_friend)
        return None

    def block_user(self, user_to_block):
        if user_to_block == self:
            return "Can't block self."
        if self.blocked_users.filter(pk=user_to_block.pk).exists():
            return f"User {user_to_block.user.username} is already blocked."
        self.blocked_users.add(user_to_block)
        self.remove_friend(user_to_block)
        return None

    def unblock_user(self, blocked_user_to_remove):
        if not self.blocked_users.filter(pk=blocked_user_to_remove.pk).exists():
            return f"User {blocked_user_to_remove.user.username} is not in your blocklist."
        self.blocked_users.remove(blocked_user_to_remove)
        return None

    def to_profile_minimal_schema(self):
        return {
            "username": self.user.username,
            "nickname": self.user.nickname,
            "avatar": self.avatar,
            "elo": self.elo,
            "is_online": self.is_online,
        }


class Friendship(models.Model):
    from_profile = models.ForeignKey(Profile, related_name="from_profile", on_delete=models.CASCADE)
    to_profile = models.ForeignKey(Profile, related_name="to_profile", on_delete=models.CASCADE)

    class Meta:
        constraints = [
            # Block self-friendship
            models.CheckConstraint(check=~models.Q(from_profile=models.F("to_profile")), name="no_self_friendship"),
            # Prevent duplicate entries (A→B can only exist once)
            models.UniqueConstraint(fields=["from_profile", "to_profile"], name="unique_friendship"),
        ]

    def __str__(self):
        return f"{self.from_profile.user.username} likes {self.to_profile.user.username}"


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
