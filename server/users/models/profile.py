from datetime import timedelta  # noqa: A005
from pathlib import Path  # noqa: A005

import magic
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.exceptions import RequestDataTooBig, ValidationError
from django.db import models
from django.db.models import Case, Count, Exists, ExpressionWrapper, F, Func, IntegerField, Q, Sum, Value, When
from django.db.models.lookups import Exact
from django.utils import timezone
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
            friends_count=Count("friends", distinct=True),
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
                .order_by("-is_online", "user__nickname")
            )
        return Profile.objects.prefetch_related("user").all().order_by("-is_online", "user__nickname")


class Profile(models.Model):
    """
    Contains user information to the application logic itself.
    """

    user = models.OneToOneField("users.User", default=None, null=True, blank=True, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to="avatars/", null=True, blank=True)
    elo = models.IntegerField(default=1000)
    friends = models.ManyToManyField("self", symmetrical=False, through="Friendship", related_name="friends_of")
    blocked_users = models.ManyToManyField("self", symmetrical=False, related_name="blocked_users_of")
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(auto_now_add=True)
    nb_active_connexions = models.IntegerField(default=0)
    # Stocke les noms des canaux actifs
    active_channels = models.JSONField(default=list, blank=True)

    objects = ProfileQuerySet.as_manager()

    def __str__(self) -> str:
        return f"Profile of {self.user.username}"

    def update_activity(self):
        self.last_activity = timezone.now()
        if not self.is_online:
            self.is_online = True
            self.save(update_fields=["is_online", "last_activity"])
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "online_users",
                {
                    "type": "user_status",
                    "action": "user_online",
                    "data": {
                        "username": self.user.username,
                        "nickname": getattr(self, "nickname", self.user.username),
                        "status": "online",
                        "date": timezone.now().isoformat(),
                    },
                },
            )
        else:
            self.save(update_fields=["last_activity"])

    @property
    def is_really_online(self):
        return self.is_online and timezone.now() - self.last_activity < timedelta(minutes=30)

    @property
    def avatar(self) -> str:
        if self.profile_picture:
            return self.profile_picture.url
        return settings.DEFAULT_USER_AVATAR

    @property
    def matches(self):
        return self.won_matches.all() | self.lost_matches.all()

    @property
    def dialogues(self):
        return self.dialogues_as_user1 | self.dialogues_as_user2

    def get_title_and_price(self):  # noqa: PLR0911
        # ruff: noqa: PLR2004
        if self.elo > 2700:
            return "Wild West Legend", 1000000
        if self.elo > 2300:
            return "Star Criminal", 500000
        if self.elo > 2000:
            return "Ace Outlaw", 100000
        if self.elo > 1700:
            return "Big Shot", 10000
        if self.elo > 1400:
            return "El Bandito", 1000
        if self.elo > 1100:
            return "Goon", 100
        if self.elo > 800:
            return "Troublemaker", 50
        if self.elo > 500:
            return "Petty Criminal", 10
        return "Damsel", 0

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
            "nickname": profile.user.nickname,
            "avatar": profile.avatar,
            "elo": profile.elo,
            "wins": res["wins"],
            "loses": res["loses"],
            "winrate": calculate_winrate(res["wins"], res["loses"]),
        }

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

    def to_username_nickname_avatar_schema(self):
        return {
            "username": self.user.username,
            "nickname": self.user.nickname,
            "avatar": self.avatar,
        }

    def to_profile_minimal_schema(self):
        return self.to_username_nickname_avatar_schema() | {
            "elo": self.elo,
            "is_online": self.is_online,
        }

    def can_participate_in_game(self):
        """
        Checks if the user can be invited or can start games.
        User should not participate in matchmaking, be a participant of a tournament or play pong match currently.
        """
        active_statuses = ["pending", "ongoing"]
        # active non-tournament game
        has_active_game_room = self.game_rooms.filter(status__in=active_statuses, bracket__isnull=True).exists()
        if has_active_game_room:
            return False

        # active tournament presence
        is_in_active_tournament = self.participant_set.filter(
            tournament__status__in=active_statuses,
        ).exists()
        if is_in_active_tournament:  # noqa: SIM103
            return False

        return True


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
