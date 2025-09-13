from __future__ import annotations  # noqa: A005

import io
from datetime import timedelta  # noqa: A005
from pathlib import Path  # noqa: A005
from typing import TYPE_CHECKING
from uuid import uuid4

import magic
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.exceptions import RequestDataTooBig, ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import models
from django.db.models import Case, Count, Exists, ExpressionWrapper, F, Func, IntegerField, Q, Sum, Value, When
from django.db.models.lookups import Exact
from django.utils import timezone

from users.utils import merge_err_dicts

if TYPE_CHECKING:
    from ninja.files import UploadedFile

    from chat.models import GameInvitation
    from pong.models import GameRoom
    from tournaments.models import Participant, Tournament


def calculate_winrate(wins: int, loses: int) -> int | None:
    """Returns `None` if the user didn't play any games yet, a valid winrate otherwise."""
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
            """Custom SQL function for calculating the winrate."""

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

    def with_search(self, search: str, curr_user):
        """
        Searches users based on the given context.
        The context is their username or nickhame.
        """
        search_qs = (
            self.prefetch_related("user")
            .all()
            .order_by("-is_online", "user__nickname")
            .exclude(blocked_users=curr_user.profile)
        )
        if search:
            search_qs = search_qs.filter(Q(user__nickname__istartswith=search) | Q(user__username__istartswith=search))
        return search_qs


class Profile(models.Model):
    """
    The most important model of the application.
    Contains user specific information related to the application logic itself.
    Relates to a lot of models, including models from other apps.
    """

    user = models.OneToOneField("users.User", default=None, null=True, blank=True, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to="avatars/", null=True, blank=True)
    elo = models.IntegerField(default=1000)
    friends = models.ManyToManyField("self", symmetrical=False, through="Friendship", related_name="friends_of")
    blocked_users = models.ManyToManyField("self", symmetrical=False, related_name="blocked_users_of")
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(auto_now_add=True)
    nb_active_connexions = models.IntegerField(default=0)

    objects = ProfileQuerySet.as_manager()

    def __str__(self) -> str:
        return f"Profile of {self.user.username}"

    def update_activity(self):
        self.last_activity = timezone.now()
        self.save(update_fields=["last_activity"])
        self.refresh_from_db()
        if not self.is_online:
            self.is_online = True
            self.save(update_fields=["is_online"])
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

    @property
    def is_really_online(self):
        return self.is_online and timezone.now() - self.last_activity < timedelta(seconds=1)

    @property
    def avatar(self) -> str:
        """Returns either profile picture of the user, or the default avatar, if the user didn't provide one."""
        if self.profile_picture:
            return self.profile_picture.url
        return settings.DEFAULT_USER_AVATAR

    @property
    def matches(self):
        return self.won_matches.all() | self.lost_matches.all()

    @property
    def dialogues(self):
        return self.dialogues_as_user1 | self.dialogues_as_user2

    @classmethod
    def get_db_table(cls):
        return cls._meta.db_table

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
        """Best enemy is the user against which the user won the most."""
        best_enemy = self.won_matches.values("loser").annotate(wins=Count("loser")).order_by("-wins").first()
        if not best_enemy or not best_enemy.get("loser", None):
            return None
        return Profile.objects.get(id=best_enemy["loser"])

    def get_worst_enemy(self):
        """Worst enemy is the user against which the user lost the most."""
        worst_enemy = self.lost_matches.values("winner").annotate(losses=Count("winner")).order_by("-losses").first()
        if not worst_enemy or not worst_enemy.get("winner", None):
            return None
        return Profile.objects.get(id=worst_enemy["winner"])

    def get_stats_against_player(self, profile):
        """
        Gets play statistics of the given user.
        Wins, loses, elo and winrate are retrieved.
        """
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
        """Deletes avatar from both the database, as well as an actual picture from the media volume."""
        self.profile_picture.delete()
        if self.profile_picture and Path.is_file(self.profile_picture.path):
            Path.unlink(self.profile_picture.path)

    def rename_avatar(self, new_avatar) -> InMemoryUploadedFile:
        ext = Path(new_avatar.name).suffix
        base_name = str(self.pk) if self.pk else uuid4().hex
        new_name = f"{base_name}_avatar{ext}"
        new_avatar.seek(0)
        avatar_content = io.BytesIO(new_avatar.read())
        return InMemoryUploadedFile(
            file=avatar_content,
            field_name="profile_picture",
            name=new_name,
            content_type=new_avatar.content_type,
            size=new_avatar.size,
            charset=new_avatar.charset,
        )

    def update_avatar(self, new_avatar) -> None:
        """Validates an avatar, and if its valid, deletes an old avatar and sets a new one. Does not saves the model."""
        self.validate_avatar(new_avatar)
        self.delete_avatar()
        renamed_avatar = self.rename_avatar(new_avatar)
        self.profile_picture = renamed_avatar

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

    def add_friend(self, new_friend) -> None | str:
        if new_friend == self:
            return "Can't add yourself to the friendlist."
        if self.friends.filter(pk=new_friend.pk).exists():
            return f"User {new_friend.user.username} is already in the friendlist."
        if self.blocked_users.filter(pk=new_friend.pk).exists():
            return f"User {new_friend.user.username} is in the blocklist."
        self.friends.add(new_friend)
        return None

    def remove_friend(self, removed_friend) -> None | str:
        if not self.friends.filter(pk=removed_friend.pk).exists():
            return f"User {removed_friend.user.username} is not in the friendlist."
        self.friends.remove(removed_friend)
        return None

    def block_user(self, user_to_block) -> None | str:
        if user_to_block == self:
            return "Can't block self."
        if self.blocked_users.filter(pk=user_to_block.pk).exists():
            return f"User {user_to_block.user.username} is already blocked."
        self.blocked_users.add(user_to_block)
        self.remove_friend(user_to_block)
        from chat.models import Chat

        chat = Chat.objects.for_exact_participants(user_to_block, self).first()
        if not chat:
            return None
        chat.messages.all().update(is_read=True)
        return None

    def unblock_user(self, blocked_user_to_remove) -> None | str:
        if not self.blocked_users.filter(pk=blocked_user_to_remove.pk).exists():
            return f"User {blocked_user_to_remove.user.username} is not in your blocklist."
        self.blocked_users.remove(blocked_user_to_remove)
        from chat.models import Chat

        chat = Chat.objects.for_exact_participants(blocked_user_to_remove, self).first()
        if not chat:
            return None
        chat.messages.filter(is_really_read=False).update(is_read=False)
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

    def get_user_data_with_date(self):
        return self.to_username_nickname_avatar_schema() | {
            "date": timezone.now().isoformat(),
        }

    def get_active_tournament(self) -> None | Tournament:
        """Gets the active tournament where user is still a playing participant."""
        participant: Participant = self.participant_set.filter(
            ~Q(status__in=["eliminated", "winner"]),
            tournament__status__in=["pending", "ongoing"],
            profile=self,
        ).first()
        if participant and not participant.excluded:
            return participant.tournament
        return None

    def get_active_game_participation(self) -> tuple[GameRoom | None, Tournament | None, GameInvitation | None]:
        """
        Gets active game pariticipation.
        User should not participate in matchmaking, be a participant of a tournament, play pong match currently
        or have a game invitation for someone.
        """
        active_statuses = ["pending", "ongoing"]
        # active non-tournament game
        active_game_room: GameRoom | None = self.game_rooms.filter(
            status__in=active_statuses,
            bracket__isnull=True,
        ).first()

        # active tournament presence
        active_tournament: Tournament | None = self.get_active_tournament()

        # active invitation of someone (as inviter)
        pending_invitation_as_inviter: GameInvitation | None = self.sent_invites.filter(status="pending").first()

        return active_game_room, active_tournament, pending_invitation_as_inviter


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
