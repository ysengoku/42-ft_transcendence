from pathlib import Path  # noqa: A005

import magic
from django.core.exceptions import RequestDataTooBig, ValidationError
from django.db import models
from django.db.models import Case, Count, Exists, ExpressionWrapper, F, Func, IntegerField, Q, Sum, Value, When
from django.db.models.lookups import Exact
from ninja.files import UploadedFile

from users.utils import merge_err_dicts


def calculate_winrate(wins: int, loses: int) -> int | None:
    total = wins + loses
    if total == 0:
        return None
    return round(wins / (total) * 100)


class ProfileQuerySet(models.QuerySet):
    def for_username(self, username: str):
        return self.filter(user__username__iexact=username)

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
                        Round(F("wins") * 1.0 / F("total_matches") * Value(100)),
                        output_field=IntegerField(),
                    ),
                ),
            )
        )

    def with_full_profile(self, curr_user, username: str):
        return (
            self.prefetch_related("friends__user")
            .select_related("user")
            .with_friendship_and_block_status(curr_user, username)
            .with_wins_and_loses_and_total_matches()
        )

    def with_search(self, search: str):
        """
        Searches users based on the given context.
        """
        if search:
            return (
                self.prefetch_related("user")
                .filter(Q(user__nickname__istartswith=search) | Q(user__username__istartswith=search))
                .order_by("-is_online")
            )
        return Profile.objects.prefetch_related("user").all().order_by("-is_online")


class Profile(models.Model):
    """
    Contains user information to the application logic itself.
    """

    user = models.OneToOneField("users.User", default=None, null=True, blank=True, on_delete=models.CASCADE)
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
            # Prevent duplicate entries (A->B can only exist once)
            models.UniqueConstraint(fields=["from_profile", "to_profile"], name="unique_friendship"),
        ]

    def __str__(self):
        return f"{self.from_profile.user.username} likes {self.to_profile.user.username}"
