from datetime import datetime, timedelta
from pathlib import Path
from random import choice, randint, randrange, sample

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import Chat, ChatMessage, Notification
from pong.models import GameRoom, GameRoomPlayer, Match
from tournaments.models import Bracket, Participant, Round, Tournament
from users.models import OauthConnection, Profile, User

# start date of the simulation
NOW = timezone.now()
START_DATE = NOW - timedelta(days=80)
END_DATE = NOW


class SimulatedUser:
    def __init__(
        self,
        username: str,
        email: str,
        real_elo: int,
        dynamic_elo_range: int = 200,
        profile_picture_path: str = "",
        nickname: str = "",
    ):
        self.username = username
        self.email = email
        self.profile_picture_path = profile_picture_path
        self.nickname = nickname
        self.real_elo = real_elo
        self.dynamic_elo_range = dynamic_elo_range  # how much ELO can vary up/down
        self.user: User = None
        self.profile: Profile = None
        self.last_match_date = None

    def get_dynamic_elo(self) -> int:
        """
        Results of the players in the match depends on their real skill and mood. This is represented by real elo,
        which represents the true skill of a player, which varies by dynamic elo range, which represents their mood,
        consistency, how tired they are, how tilted they are, and other factors that may influence their results.
        """
        elo_variation = randint(-self.dynamic_elo_range, self.dynamic_elo_range)
        elo = self.real_elo + elo_variation
        return max(Match.MINIMUM_ELO, min(Match.MAXIMUM_ELO, elo))

    def set_models(self, user: User, profile: Profile) -> None:
        """Set the Django User and Profile models for this simulated user."""
        self.user = user
        self.profile = profile
        self.user.profile = profile


simulated_users: dict[str, SimulatedUser] = {}


# ruff: noqa: S106, S311, T201, PLR2004
def choice_except(seq, value):
    res = choice(seq)
    while res == value:
        if len(seq) < 1:
            return None
        res = choice(seq)
    return res


def generate_random_date(start: datetime = (timezone.now() - timedelta(days=22)), end: datetime = timezone.now()):
    delta = end - start
    delta_in_seconds = delta.days * 24 * 60 * 60 + delta.seconds
    return start + timedelta(seconds=randrange(delta_in_seconds))


def calc_win_chance_based_on_elo(elo1: int, elo2: int):
    return round(1 / (1 + 10 ** ((elo2 - elo1) / 400)) * 100)


def clean_database():
    User.objects.all().delete()
    Profile.objects.all().delete()
    Match.objects.all().delete()
    Tournament.objects.all().delete()
    Bracket.objects.all().delete()
    Round.objects.all().delete()
    Participant.objects.all().delete()
    OauthConnection.objects.all().delete()
    Chat.objects.all().delete()
    ChatMessage.objects.all().delete()
    Notification.objects.all().delete()
    GameRoom.objects.all().delete()
    GameRoomPlayer.objects.all().delete()


def generate_users() -> None:
    print("Generating users...")

    # special user who has no data on itself
    User.objects.create_user("User0", email="user0@gmail.com", password="123")

    # name, real_elo, dynamic_elo, avatar_path, nickname
    users_data = [
        ("sad_hampter", 100, 300, "sad_hampter.jpg", "little_rat"),
        ("Juan", 150, 250, "", ""),
        ("Martine", 200, 200, "martine.jpg", "The_Queen"),
        ("Pedro", 200, 400, "pedro.jpg", "The_original"),
        ("Anya", 300, 250, "", ""),
        ("Juanita", 400, 200, "", ""),
        ("John", 800, 300, "", ""),
        ("Josiane", 800, 280, "", ""),
        ("johndoe1", 1000, 250, "", ""),
        ("Pedro1", 1000, 800, "pedro1.jpg", "The_copy"),
        ("Joe_The_Uncatchable", 1000, 900, "", ""),
        ("george55", 1000, 300, "", ""),
        ("Rick", 1200, 300, "rick_roll.webp", "Roll"),
        ("Alex", 1200, 400, "", ""),
        ("Taki", 1500, 350, "taki.jpg", "lovely_dog"),
        ("Pedro2", 1500, 500, "pedro2.jpg", "Copy_Two"),
        ("alice", 1500, 200, "alice.jpg", "aLIcE"),
        ("menaco", 1600, 220, "menaco.jpg", "PrettyFrog"),
        ("warhawk", 1700, 300, "", ""),
        ("evil_sherif", 2000, 400, "", ""),
        ("TheBall", 2000, 800, "", ""),
        ("Felix", 2000, 200, "felix.jpg", "Deadly_Kitty"),
        ("alice123", 2100, 150, "", ""),
        ("Lily", 2200, 400, "", ""),
        ("Rex", 2200, 400, "rex.jpg", "Good_boy"),
        ("Grandpa", 2400, 300, "grandpa.jpg", "Old_grumpy"),
        ("faboussa", 2500, 200, "", ""),
        ("Yuko", 2500, 200, "", ""),
        ("emuminov", 2600, 300, "", ""),
        ("Darksmelo", 2600, 300, "darksmelo.png", "Hey_yeH"),
        ("celiastral", 2600, 150, "", ""),
        ("Marie", 2600, 100, "marie.jpg", "Good_girl"),
        ("Grandma", 2700, 200, "grandma.jpg", "Old_hag"),
        ("Tama", 2750, 100, "tama.jpg", "flower_girl"),
        ("LifeEnjoyer", 3000, 0, "", ""),
    ]

    users_to_create = []
    profiles_to_create = []

    for name, real_elo, dynamic_elo, avatar_path, nickname in users_data:
        sim_user = SimulatedUser(name, f"{name}@gmail.com", real_elo, dynamic_elo, avatar_path, nickname)
        simulated_users[name] = sim_user

        users_to_create.append(
            User(
                username=name,
                email=f"{name}@gmail.com",
                password=make_password("123"),
                nickname=nickname if nickname else name,
                date_joined=START_DATE,
            ),
        )

        if nickname:
            print(f"  Prepared {name} with nickname: {nickname}")
        else:
            print(f"  Prepared {name}")

    print(f"Bulk creating {len(users_to_create)} users...")
    created_users = User.objects.bulk_create(users_to_create)

    for i, _ in enumerate(users_data):
        user = created_users[i]
        profile = Profile(user=user)
        profiles_to_create.append(profile)

    print(f"Bulk creating {len(profiles_to_create)} profiles...")
    created_profiles = Profile.objects.bulk_create(profiles_to_create)

    for i, (name, _, _, _, _) in enumerate(users_data):
        sim_user = simulated_users[name]
        sim_user.set_models(created_users[i], created_profiles[i])

    # life enjoyer is friends with everyone
    life_enjoyer = simulated_users["LifeEnjoyer"]
    for sim_user in simulated_users.values():
        if sim_user != life_enjoyer:
            life_enjoyer.profile.add_friend(sim_user.profile)

    special_users = {
        username: sim_user
        for username, sim_user in simulated_users.items()
        if username in ["Yuko", "celiastral", "emuminov", "Darksmelo", "faboussa"]
    }

    for sim_user in special_users.values():
        for friend in special_users.values():
            if sim_user == friend:
                continue
            sim_user.profile.add_friend(friend.profile)

    # sad hampter needs a friend :(
    celiastral = special_users["celiastral"]
    sad_hampter = simulated_users["sad_hampter"]
    celiastral.profile.add_friend(sad_hampter.profile)
    sad_hampter.profile.add_friend(celiastral.profile)

    for i in range(3, 10):  # we already have Pedro1 and Pedro2
        user = User.objects.create_user(f"Pedro{i}", email=f"Pedro{i}@gmail.com", password="123")
        if randint(0, 1):
            life_enjoyer.profile.block_user(user.profile)
        else:
            life_enjoyer.profile.add_friend(user.profile)
    life_enjoyer.profile.save()

    print("=" * 50)


def erase_old_avatars():
    avatars_folder = "/app/media/avatars"
    avatars_path = Path(avatars_folder)
    if avatars_path.is_dir() is False:
        return
    for file in avatars_path.iterdir():
        file_path = avatars_path / file
        if Path.is_file(file_path):
            Path.unlink(file_path)
            print(file, "is removed")


def put_avatars():
    """Set avatars for users using simulated_users dict."""
    erase_old_avatars()

    def get_content_type(filename):
        ext = Path(filename).suffix.lower()
        if ext in {".jpg", ".jpeg"}:
            return "image/jpeg"
        if ext == ".png":
            return "image/png"
        if ext == ".webp":
            return "image/webp"
        return "application/octet-stream"

    def put_one_avatar(file_path: str, profile: Profile):
        full_path = f"/app/test_assets/{file_path}"
        with Path(full_path).open("rb") as f:
            content_type = get_content_type(full_path)
            uploaded = SimpleUploadedFile(name=file_path, content=f.read(), content_type=content_type)
            f.seek(0)
            profile.update_avatar(uploaded)
            profile.save()

    print("Setting avatars...")
    for username, sim_user in simulated_users.items():
        if sim_user.profile_picture_path:
            put_one_avatar(sim_user.profile_picture_path, sim_user.profile)
            print(f"  Set avatar for {username}: {sim_user.profile_picture_path}")

    print("Avatar assignment complete!")
    print("=" * 50)


def generate_matches():
    """Generate matches chronologically by date."""
    simulated_users_lst: list[SimulatedUser] = list(simulated_users.values())
    num_users = len(simulated_users_lst)

    print(f"Generating matches for {num_users} simulated users...")

    current_date = START_DATE
    total_matches = 0

    # Collection for bulk match creation
    matches_to_create = []

    user_match_counts = {user.username: 0 for user in simulated_users_lst}
    while current_date <= END_DATE:
        daily_matches = randint(num_users, num_users * 2)

        print(f"  Date {current_date.strftime('%Y-%m-%d')}: {daily_matches} matches")

        if daily_matches > 0:
            minutes_per_match = 1439 // daily_matches

            for i in range(daily_matches):
                base_minutes = i * minutes_per_match
                variation = randint(0, min(minutes_per_match - 1, 20))  # variation to avoid predictability
                match_minutes = base_minutes + variation
                match_time = current_date + timedelta(minutes=match_minutes)

                # find two users who can play who haven't played in last 20 minutes
                available_users = []
                for user in simulated_users_lst:
                    if user.last_match_date is None:
                        available_users.append(user)
                    else:
                        time_since_last_match = (match_time - user.last_match_date).total_seconds() / 60
                        if time_since_last_match >= 20:
                            available_users.append(user)

                if len(available_users) < 2:
                    continue

                user1, user2 = sample(available_users, 2)

                win_chance = calc_win_chance_based_on_elo(user1.get_dynamic_elo(), user2.get_dynamic_elo())
                if randint(0, 100) >= win_chance:
                    winner = user2
                    loser = user1
                else:
                    winner = user1
                    loser = user2

                # Use should_save=False to avoid individual database writes
                resolved_match, _, _ = Match.objects.resolve(
                    winner.profile,
                    loser.profile,
                    randint(4, 7),
                    randint(0, 3),
                    date=match_time,
                    should_save=False,
                )

                # Collect match for bulk creation
                matches_to_create.append(resolved_match)

                user1.last_match_date = match_time
                user2.last_match_date = match_time

                total_matches += 1
                user_match_counts[user1.username] += 1
                user_match_counts[user2.username] += 1

        current_date += timedelta(days=1)

    Match.objects.bulk_create(matches_to_create, batch_size=1000)
    all_profiles = [sim_user.profile for sim_user in simulated_users_lst]
    Profile.objects.bulk_update(all_profiles, ["elo"])

    print("\n=== MATCH GENERATION SUMMARY ===")
    print("Final elo and match counts for each simulated user:")

    sorted_users = sorted(simulated_users_lst, key=lambda u: u.profile.elo, reverse=True)
    for user in sorted_users:
        match_count = user_match_counts[user.username]
        print(f"  {user.username:<20} | Matches: {match_count:3d} | Final ELO: {user.profile.elo:4d}")

    print(f"Generated {total_matches} total matches")
    print("=" * 50)


TOURNAMENT_ALIASES = [
    "RedFalcon",
    "BlueTiger",
    "SilverWolf",
    "GoldenEagle",
    "ShadowFox",
    "RedDragon",
    "EmeraldLion",
    "NightHawk",
    "MysticBear",
    "StormRider",
    "CosmicWhale",
    "PhantomCat",
    "DustCoyote",
    "PrairieWolf",
    "IronMustang",
    "CanyonHawk",
    "LoneBison",
    "DesertCrow",
]

TOURNAMENT_NAMES = [
    "Wild West Showdown",
    "Dusty Trail Tournament",
    "Lone Star Clash",
    "Cactus Creek Cup",
    "Rodeo Rumble",
    "O.K. Corral Cup",
    "Frontier Frenzy",
    "Gold Rush Games",
    "High Noon Shootout",
    "Pioneer’s Prize",
]


def create_pending_tournament() -> None:
    dummy_aliases = TOURNAMENT_ALIASES.copy()

    target_usernames = ["Taki", "Felix", "Rex", "sad_hampter", "Tama", "Pedro", "menaco", "Rick"]
    list_profiles = [simulated_users[username].profile for username in target_usernames if username in simulated_users]

    if not list_profiles:
        print("No valid profiles found for pending tournament! Please generate users first.")
        return

    options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
    print("Number of profiles for the pending tournament:", len(list_profiles))
    name = choice(TOURNAMENT_NAMES)
    generate_random_date()
    status = Tournament.PENDING
    chosen_profile = choice(list_profiles)
    list_profiles.remove(chosen_profile)

    required = choice(options)

    print(f"{name}\n  Requires: {required} participants\n  Status: {status}\n  Creator: {chosen_profile.user.nickname}")
    tournament = Tournament.objects.validate_and_create(
        creator=chosen_profile,
        tournament_name=name,
        required_participants=required,
        alias=chosen_profile.user.nickname,
        settings={"game_speed": "medium", "score_to_win": 3, "time_limit": 1, "ranked": False, "cool_mode": True},
    )
    tournament.status = status
    tournament.save(update_fields=["status"])

    required -= 2  # PENDING Tournament needs -2 : creator + non registered yet participant

    if chosen_profile in list_profiles:
        list_profiles.remove(chosen_profile)
    participants = sample(list_profiles, k=required)
    participant_objs = []
    participant_objs.append(tournament.participants.get(profile=chosen_profile))
    for p in participants:
        print("  Participant:", p.user.username)
        alias = dummy_aliases.pop(randint(0, len(dummy_aliases) - 1))
        part = Participant.objects.create(
            profile=p,
            tournament=tournament,
            alias=alias,
            current_round=0,
        )
        list_profiles.remove(p)
        participant_objs.append(part)
    print("There are", len(participant_objs), "participants in this tournament")
    if status is Tournament.PENDING:
        num_rounds = 2 if required == 4 else 3
        for round_num in range(1, num_rounds + 1):
            Round.objects.create(tournament=tournament, number=round_num, status=Round.PENDING)

    print("=" * 50)


def generate_tournaments() -> None:
    options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
    simulated_users_lst = list(simulated_users.values())
    profiles = [sim_user.profile for sim_user in simulated_users_lst]
    list_users = [sim_user.user for sim_user in simulated_users_lst]
    for i in range(2):
        name = choice(TOURNAMENT_NAMES)
        generate_random_date()
        option_for_status = [Tournament.FINISHED, Tournament.CANCELLED]
        status = option_for_status[i]
        user = choice(list_users)
        list_users.remove(user)

        required = choice(options)

        print(f"{name}\n  Requires: {required} participants\n  Status: {status}\n  Creator: {user.username}")
        tournament = Tournament.objects.validate_and_create(
            creator=user.profile,
            tournament_name=name,
            required_participants=required,
            alias="The creator",
            settings={"game_speed": "medium", "score_to_win": 3, "time_limit": 1, "ranked": False, "cool_mode": True},
        )
        tournament.status = status
        tournament.save(update_fields=["status"])

        available_aliases = TOURNAMENT_ALIASES.copy()

        required -= 2 if status is Tournament.CANCELLED else 1
        if user.profile in profiles:
            profiles.remove(user.profile)
        participants = sample(profiles, k=required)
        participant_objs = []
        participant_objs.append(tournament.participants.get(profile=user.profile))
        for p in participants:
            print("  Participant:", p.user.username)
            alias = available_aliases.pop(randint(0, len(available_aliases) - 1))
            part = Participant.objects.create(
                profile=p,
                tournament=tournament,
                alias=alias,
                current_round=0,
            )
            profiles.remove(p)
            participant_objs.append(part)
        print("  There are", len(participant_objs), "participants in this tournament")
        if status is Tournament.FINISHED:
            total_rounds = 2 if required == 3 else 3
            # required has been lowed to avoir adding a participant since the creator is added at the beginning
            current = participant_objs.copy()

            for rnd in range(1, total_rounds + 1):
                for part in current:
                    part.status = "playing"
                    part.current_round = rnd
                    part.save()

                rnd_status = (
                    Tournament.FINISHED
                    if status == Tournament.FINISHED or (status == Tournament.ONGOING and rnd < total_rounds)
                    else Tournament.PENDING
                )
                rnd_obj = Round.objects.create(
                    tournament=tournament,
                    number=rnd,
                    status=rnd_status,
                )

                next_round = []
                for j in range(0, len(current), 2):
                    p1 = current[j]
                    p2 = current[j + 1]
                    bracket_status = Bracket.FINISHED if rnd_status == Round.FINISHED else Bracket.ONGOING
                    bracket = Bracket.objects.create(
                        round=rnd_obj,
                        participant1=p1,
                        participant2=p2,
                        status=bracket_status,
                    )

                    if bracket_status == Tournament.FINISHED:
                        s1, s2 = randint(0, 3), randint(0, 3)
                        if s1 == s2:
                            if s1 == 3:
                                s2 = 2
                            else:
                                s1 += 1
                        bracket.winners_score = max(s2, s1)
                        bracket.losers_score = min(s2, s1)
                        winner = p1 if s1 > s2 else p2
                        loser = p2 if s1 > s2 else p1
                        bracket.winner = winner
                        bracket.score = f"{s1}-{s2}"
                        bracket.save()

                        winner.status = Participant.PLAYING if rnd < total_rounds else Participant.WINNER
                        loser.status = Participant.ELIMINATED
                        loser.current_round = rnd
                        winner.current_round = rnd + (0 if rnd < total_rounds else rnd)
                        winner.save()
                        loser.save()

                        next_round.append(winner)
                    elif status == Tournament.ONGOING:
                        if randint(0, 1):
                            s1, s2 = randint(0, 3), randint(0, 3)
                            if s1 == s2:
                                if s1 == 3:
                                    s2 = 2
                                else:
                                    s1 += 1
                            bracket.winners_score = max(s2, s1)
                            bracket.losers_score = min(s2, s1)
                            winner = p1 if s1 > s2 else p2
                            loser = p2 if s1 > s2 else p1
                            bracket.winner = winner
                            bracket.score = f"{s1}-{s2}"
                            bracket.status = Bracket.FINISHED
                            bracket.save()

                            winner.status = Participant.PLAYING
                            loser.status = Participant.ELIMINATED
                            winner.current_round = rnd
                            loser.current_round = rnd
                            winner.save()
                            loser.save()

                            next_round.append(winner)
                current = next_round

            final = Round.objects.get(tournament=tournament, number=total_rounds)
            finished_brackets = final.brackets.filter(status=Tournament.FINISHED)
            if finished_brackets.exists():
                champ = finished_brackets.order_by("?").first().winner
                tournament.winner = champ
                tournament.save()

    print("=" * 50)


def generate_chats_and_notifications() -> None:
    """Generate natural chat dialogues and notifications between specific characters."""
    print("Creating chats...")

    messages_to_create = []
    notifications_to_create = []

    dialogues = {
        ("Taki", "Rex"): [
            "woof did you see that squirrel earlier",
            "bro yes!! almost caught it this time",
            "same, my human was NOT happy about the digging tho",
            "lmaooo mine gave me the disappointed face",
            "why do they get mad when we bring them dead birds as gifts",
            "RIGHT?? like we're trying to help",
            "anyway wanna go bark at the mailman later",
            "bet, meet you at the fence at 3",
            "yo that cat Tama was in our yard again",
            "ugh I HATE when cats think they own everything",
            "right? Felix too, acting all superior",
            "we should team up and chase them away",
            "definitely, dogs gotta stick together against the feline invasion",
            "speaking of which, my human Darksmelo was coding again all night",
            "mine too! they need to touch grass more often",
            "at least they give us treats when they're debugging",
            "dude the food bowl was EMPTY this morning",
            "nightmare scenario, did you give them the sad eyes",
            "you know it, full puppy dog technique",
            "works every time, humans are so easy to manipulate",
            "facts, anyway wanna dig holes in the garden later",
            "always, race you to the flower bed",
            "you're on, loser buys the tennis balls",
            "wait we don't have money",
            "details details",
            "my human's been stressed about some tournament bug",
            "mine too! something about security patches",
            "at least they're working together on this game thing",
            "yeah Darksmelo seems chill, treats you well",
            "totally, best human ever, yours is cool too",
        ],
        ("emuminov", "celiastral"): [
            "yo the collision detection is still acting weird",
            "which part specifically",
            "ball keeps clipping through paddles sometimes",
            "probably the epsilon value, lemme check",
            "also thinking we need to optimize the reconciliation logic",
            "agreed, the client prediction is causing desyncs",
            "wanna pair program on it tomorrow",
            "sounds good, I'll grab the coffee",
            "btw those 3D models you made are incredible",
            "thanks but I feel like the textures are still off",
            "nah they're perfect, you're just being hard on yourself",
            "story of my life, never satisfied with my art",
            "that's what makes you good tho, the perfectionism",
            "or what makes me depressed and burnt out",
            "hey you wanna talk about it",
            "maybe later, just having one of those days",
            "this multiplayer sync is driving me insane",
            "same, been debugging physics for 6 hours straight",
            "at least your art actually works when you're done",
            "yeah but code is more logical, art is just... subjective pain",
            "lmao subjective pain, I'm stealing that phrase",
            "feel free, I have plenty more where that came from",
            "saw sad_hampter lost another match today",
            "aww poor little guy, he's trying so hard",
            "you really have a soft spot for him huh",
            "he's just so earnest about it, even when he fails",
            "that's actually really sweet of you to notice",
            "someone has to appreciate the underdogs",
            "true, anyway back to this rendering pipeline nightmare",
        ],
        ("Yuko", "Darksmelo"): [
            "tournament bracket generation is finally working",
            "thank god, that was a nightmare to debug",
            "ikr, the recursive elimination was breaking everything",
            "speaking of nightmares, the chat notifications are acting up",
            "what kind of acting up",
            "they're not marking as read properly",
            "probably the websocket connection timing out",
            "I'll look into it after lunch",
            "the new tournament UI mockups are ready for review",
            "sick, can you send them over",
            "already in the shared folder, used your color scheme",
            "you actually listened to my backend dev color opinions",
            "surprisingly you have decent taste for a security nerd",
            "wow thanks, very reassuring coming from the design queen",
            "queen? I prefer design overlord",
            "noted, I'll update your slack title",
            "how's Taki doing btw",
            "being adorable as always, keeps interrupting my coding",
            "that's what you get for having a cute dog",
            "no regrets, he's the best debugging buddy",
            "meanwhile I'm here debugging alone like a hermit",
            "you should get a pet, good for mental health",
            "maybe a cat, they're more independent",
            "Taki would be offended by that suggestion",
            "we need better task management for this sprint",
            "agreed, the current system is chaos",
            "I'm thinking kanban board with proper labels",
            "as long as it has security task priorities",
            "obviously, can't ship with vulnerabilities",
            "exactly, users trust us with their data",
        ],
        ("emuminov", "faboussa"): [
            "JWT refresh tokens are working smoothly now",
            "nice! what about the OAuth integration",
            "42 and github are both solid, no issues",
            "perfect, MFA is also stable on my end",
            "users still complaining about the session timeout tho",
            "maybe extend it to 2 hours instead of 1",
            "good call, I'll push that change",
            "also thinking about adding password strength indicators",
            "how's the work situation treating you",
            "not bad, managing the team is interesting",
            "bet it's way different from just coding",
            "totally, less debugging more people debugging",
            "people are definitely buggier than code",
            "lmao facts, at least code errors make sense",
            "speaking of which, the MFA flow needs optimization",
            "agreed, too many steps for user onboarding",
            "been thinking about implementing TOTP",
            "time-based one time passwords? solid choice",
            "yeah, more secure than SMS and users like apps",
            "Google Authenticator compatibility is a must",
            "obviously, and backup codes for recovery",
            "you always think ahead with security",
            "paranoia is a feature not a bug in our field",
            "wise words, anyway the DevOps pipeline is smooth",
            "crazy how big this project got",
            "remember when it was just a simple pong game",
            "now we have tournaments, chat, multiplayer, auth",
            "feature creep is real but at least it's fun creep",
            "true, and we learned so much building it",
            "definitely ready for real world projects now",
        ],
        ("sad_hampter", "LifeEnjoyer"): [
            "how are you so good at this game",
            "just practice and staying positive my friend",
            "I literally can't win a single match",
            "everyone starts somewhere, you'll improve",
            "easy for you to say when you're ranked #1",
            "I was terrible when I started too",
            "really? that's hard to believe",
            "trust me, we all have bad games sometimes",
            "I lost 12 matches in a row today",
            "that's rough buddy, but losing teaches you more than winning",
            "doesn't feel like I'm learning anything except how to lose",
            "what specifically went wrong in those matches",
            "everything? my timing, positioning, decision making",
            "okay let's break it down, timing first",
            "I always seem to react too late",
            "try watching your opponent's patterns before they move",
            "that... actually makes sense",
            "positioning is about controlling space, not just reacting",
            "I never thought about it like controlling space",
            "exactly! you're already thinking differently",
            "sometimes I wonder if you're even human",
            "lol just lots of practice, my grandma taught me actually",
            "your grandma plays this game?",
            "she's one of the best players, very competitive",
            "that's so cool, wish I had gaming family",
            "family helps but determination matters more",
            "speaking of determination, why do you help me",
            "everyone deserves encouragement, especially underdogs",
            "you're literally the nicest person I've ever met",
            "just paying it forward, someone helped me once too",
            "can you teach me that move you do",
            "which one specifically",
            "the one where you predict where the ball will go",
            "ah that's pattern recognition, comes with time",
            "I feel like I'll never get that good",
            "hey, improvement isn't linear, trust the process",
        ],
        ("Grandma", "Grandpa"): [
            "Harold did you take your medication today",
            "yes dear for the third time",
            "just checking, last time you forgot and got cranky",
            "I wasn't cranky I was tired",
            "same thing, anyway dinner is at 6",
            "what are we having",
            "that fish you like with the lemon",
            "sounds perfect",
            "our grandson called today",
            "how's little LifeEnjoyer doing",
            "little? Harold he's the best player in the game now",
            "still remember when I taught him his first moves",
            "you mean when I taught him and you took credit",
            "details Martha, details",
            "he says he's been helping some struggling players",
            "that's our boy, always been kind hearted",
            "I beat that Tama character again today",
            "the cat one? impressive, she's very good",
            "these young players think age makes you slow",
            "little do they know you've been gaming since Pong",
            "literally since Pong, Harold",
            "and you're still crushing them at 75",
            "76 next month, and still improving",
            "remind me to never challenge you again",
            "did you remember to call the doctor",
            "yes Martha, appointment is Thursday at 2",
            "good, and don't forget we have bridge club tonight",
            "with the Johnsons? do I have to",
            "Harold you enjoy it once you're there",
            "fine but I'm bringing my tablet",
            "no gaming during bridge night",
            "what if I get a tournament invitation",
            "it can wait two hours",
            "you're no fun in your old age",
            "we're the same age Harold",
        ],
        ("alice", "Rick"): [
            "this place gets curiouser and curiouser",
            "never gonna give you up never gonna let you down",
            "excuse me what did you just say",
            "never gonna run around and desert you",
            "are you having some sort of episode",
            "never gonna make you cry never gonna say goodbye",
            "ok I'm just gonna pretend this is normal",
            "never gonna tell a lie and hurt you",
            "bestie do you only speak in song lyrics",
            "we're no strangers to love you know the rules",
            "sir this is giving major NPC energy",
            "and so do I a full commitment's what I'm thinking of",
            "I'm literally about to log off if you don't stop",
            "you wouldn't get this from any other guy",
            "BRUH are you actually Rick Astley",
            "I just wanna tell you how I'm feeling",
            "this is more chaotic than the Mad Hatter's tea party",
            "gotta make you understand",
            "at least the Cheshire Cat made sense sometimes",
            "never gonna give never gonna give",
            "you know what this is lowkey iconic ngl",
            "give you up",
            "wait are you trying to rickroll me through text",
            "we've known each other for so long",
            "this is literally so unhinged I can't even",
            "your heart's been aching but you're too shy to say it",
            "ok but why is this actually slapping tho",
            "inside we both know what's been going on",
            "I'm dead this is so random but also perfect",
            "we know the game and we're gonna play it",
            "you're giving main character energy and I respect it",
            "and if you ask me how I'm feeling",
            "no cap this is the weirdest conversation ever",
            "don't tell me you're too blind to see",
            "but also somehow the most entertaining",
            "never gonna give you up",
            "okay I'm convinced you're actually a meme come to life",
            "never gonna let you down",
        ],
        ("Joe_The_Uncatchable", "evil_sherif"): [
            "well well if it isn't the law",
            "Joe you varmint, thought you skipped town",
            "takes more than a badge to catch me sheriff",
            "we'll see about that partner",
            "you've been chasing me for 3 years now",
            "and I'll chase you for 3 more if I have to",
            "good luck with that old timer",
            "I ain't that old yet you young whippersnapper",
            "heard you had trouble with Marie again",
            "that goody two shoes sheriff thinks she can stop me",
            "well she did run you out of Deadwood",
            "temporary setback, I'll be back",
            "you said that about Tombstone too",
            "this time is different, got myself a plan",
            "let me guess, more of your half baked schemes",
            "least I got schemes, you just run and hide",
            "those Pedro brothers are getting on my nerves",
            "finally something we agree on",
            "too righteous for their own good",
            "and that Martine girl they're always protecting",
            "what's your beef with her anyway",
            "she reminds me of everything I hate about hope",
            "that's dark even for you sheriff",
            "darkness is all I got left Joe",
            "why don't you just give up chasing me",
            "because you're the only excitement in this town",
            "that's actually kind of sad",
            "sad? this is the most fun I've had in years",
            "we're both getting too old for this",
            "speak for yourself, I got plenty of fight left",
            "sure you do, saw you wheezing after that last chase",
            "that was... altitude sickness",
            "we're in a valley sheriff",
            "shut up and start running, I'm feeling energetic today",
        ],
        ("Felix", "Tama"): [
            "the humans left the tuna can out again",
            "amateur mistake on their part",
            "knocked over their water glass as punishment",
            "classic move, I respect that",
            "also found a really good sunbeam by the window",
            "dibs on it after my nap",
            "we can share, it's big enough for two",
            "how very generous of you",
            "saw you beat Grandma again in the tournament",
            "that old lady is tough but my reflexes are faster",
            "respect, she's usually unbeatable",
            "years of hunting mice prepared me for this",
            "your dexterity is honestly unfair",
            "what can I say, cat superiority is real",
            "meanwhile those dogs think they're so great",
            "Taki and Rex? please, no finesse whatsoever",
            "humans tried to give me a bath yesterday",
            "the audacity, what did you do",
            "made sure they regretted that decision",
            "as is proper, we clean ourselves thank you very much",
            "exactly, they act like we're helpless",
            "meanwhile we're skilled hunters and gamers",
            "speaking of hunting, caught anything good lately",
            "just some digital prey, been focused on tournaments",
            "LifeEnjoyer thinks he's so untouchable",
            "his grandma taught him well but I've been studying his patterns",
            "planning to dethrone the golden boy",
            "about time someone challenged his reign",
            "cats deserve to rule both games and households",
            "absolutely, superior beings in every way",
        ],
        ("Felix", "Taki"): [
            "dog",
            "cat",
            "your owner throws balls and you actually chase them",
            "your owner gives you food and you act like you own the place",
            "I do own the place",
            "fair point",
            "wanna call a truce and go bother the humans together",
            "now you're speaking my language",
            "saw you failed to catch that squirrel again",
            "at least I try, you just watch from the window",
            "I'm conserving energy for more important things",
            "like what, knocking things off tables",
            "it's called interior decoration",
            "right, and I'm a professional ball player",
            "your human Darksmelo seems stressed lately",
            "yeah he's been working on some security thing",
            "mine just codes and ignores me",
            "at least you get attention when you want it",
            "true, I just have to meow pathetically",
            "we dogs have to do tricks for attention",
            "you know what, humans are weird",
            "finally something we agree on",
            "they work all day on computers",
            "then wonder why we're attention seeking",
            "maybe we should team up against them",
            "temporary alliance against the human overlords",
            "deal, but I'm still better than you",
            "we'll see about that fleabag",
            "did you just call me fleabag",
            "if the collar fits",
        ],
        ("emuminov", "Yuko"): [
            "how's the UI mockups coming along",
            "pretty good, working on the tournament bracket visualization",
            "nice, backend API is ready for that",
            "perfect timing, I'll need the match data structure",
            "already documented in the swagger, check endpoint /api/tournaments",
            "you're the best, also the new color scheme looks sick",
            "thanks! users will actually enjoy looking at our app now",
            "way better than my programmer art attempts",
            "btw we need to discuss the sprint planning",
            "agreed, current velocity is all over the place",
            "what's causing the bottlenecks on your end",
            "mostly waiting for design approval on components",
            "let's streamline that process, what do you need",
            "just faster feedback cycles would help",
            "how about daily design check-ins during sprints",
            "that would be perfect actually",
            "how are you finding working with celiastral",
            "she's incredibly talented but seems stressed lately",
            "the perfectionism is real with that one",
            "yeah but her 3D models are absolutely gorgeous",
            "no argument there, just wish she was easier on herself",
            "maybe we could suggest some team bonding activities",
            "good thinking, what did you have in mind",
            "the new component library is coming together nicely",
            "thanks! reusability was the main goal",
            "it's going to save so much development time",
            "exactly, no more copy-pasting styles everywhere",
            "and the dark mode toggle is chef's kiss",
            "users have been requesting that for months",
            "finally delivering on promises feels good",
        ],
        ("emuminov", "Darksmelo"): [
            "security audit results came back",
            "how bad is it",
            "actually not terrible, just need to patch a few things",
            "which areas specifically",
            "JWT token validation and some input sanitization",
            "on it, I'll handle the auth middleware updates",
            "also thinking we should add rate limiting",
            "good call, prevent those script kiddies from spamming",
            "how's Taki handling your late coding sessions",
            "he's actually great company, sits right next to my desk",
            "that's adorable, does he interrupt much",
            "only when I'm debugging, he has impeccable timing",
            "maybe he senses your stress levels",
            "probably, dogs are smart like that",
            "wish I had a debugging buddy like that",
            "you should get a pet, seriously helps with burnout",
            "been looking into the chat encryption implementation",
            "yeah? any concerns on the security side",
            "mostly about key rotation and storage",
            "we're using proper key derivation functions right",
            "absolutely, PBKDF2 with sufficient iterations",
            "and salting is properly randomized",
            "each user gets a unique salt, stored separately",
            "excellent, what about the websocket security",
            "WSS with proper cert validation, no plain connections",
            "and we're validating all incoming message formats",
            "yep, strict schema validation on everything",
            "you're paranoid in all the right ways",
            "tournament bracket generation is solid btw",
            "thanks, that was a fun algorithm problem",
            "how are you handling edge cases",
            "like odd numbers of participants and byes",
            "exactly, those can break everything",
            "recursive tree balancing with proper seeding",
            "and what about security for tournament data",
            "all mutations require proper auth and validation",
            "can't have people cheating their way to victory",
        ],
        ("Darksmelo", "celiastral"): [
            "your collision detection code is solid btw",
            "thanks! had to rewrite it like 5 times",
            "performance is really good too, no security issues",
            "that was my biggest worry with the real-time updates",
            "nah the websocket implementation is clean",
            "still paranoid about race conditions tho",
            "always good to be paranoid in our field",
            "exactly, trust no one not even yourself",
            "those 3D models you made are absolutely stunning",
            "ugh but the textures are still not right on the paddles",
            "dude they look perfect to me",
            "you don't understand, the specular mapping is all wrong",
            "I literally cannot tell the difference",
            "that's because you're not an artist with crippling perfectionism",
            "fair point, but users are going to love them",
            "I hope so, spent way too many hours on those models",
            "saw sad_hampter in chat earlier, poor guy lost another match",
            "aww he's trying so hard though, it's actually really sweet",
            "you have such a soft spot for that little dude",
            "someone has to appreciate the adorable strugglers",
            "that's actually really kind of you",
            "plus his determination is honestly inspiring",
            "even when he fails spectacularly",
            "especially then! failure with style is an art form",
            "been thinking about anti-cheat measures",
            "what kind of cheating are you worried about",
            "mostly client-side manipulation and packet injection",
            "the server-side validation should catch most of that",
            "true but we need to be extra careful with competitive play",
            "tournament mode definitely needs stricter checks",
            "exactly, reputation is everything in competitive gaming",
            "good thing you're paranoid about security stuff",
            "paranoia keeps the cheaters away",
        ],
        ("faboussa", "Darksmelo"): [
            "remember when we thought this would take 2 weeks",
            "lmaooo those were simpler times",
            "now look at us, you're doing backend security I'm managing",
            "wild how things change, but hey we made it work",
            "speaking of which, got any leads on jobs after this",
            "actually yeah, that startup I mentioned is still interested",
            "the one with the crypto thing or the AI thing",
            "AI thing, crypto is too sketchy for me",
            "crazy how we went from arguing about variable names",
            "to actually building something people use",
            "those early git commit messages were hilarious",
            "fixed stuff, broke other stuff, repeat",
            "peak engineering documentation right there",
            "at least we learned proper practices eventually",
            "remember when you suggested using tabs instead of spaces",
            "that was a dark period in my life, don't bring it up",
            "how's the OAuth integration treating you these days",
            "pretty smooth actually, 42 API is solid",
            "and the MFA implementation",
            "users love complaining about it but it's necessary",
            "security vs convenience, eternal struggle",
            "exactly, meanwhile Taki keeps stepping on my keyboard",
            "at least he's not committing code for you",
            "don't give him ideas",
            "been thinking about what comes after this project",
            "same, this has been quite the learning experience",
            "think we're ready for industry work now",
            "definitely, portfolio is looking pretty solid",
            "plus we know how to work in teams now",
            "speak for yourself, I still prefer solo debugging",
            "some things never change",
            "wouldn't want them to, keeps things interesting",
            "remember debugging that memory leak together",
            "3am, pizza boxes everywhere, pure chaos",
            "but we figured it out eventually",
            "teamwork makes the dream work and all that",
        ],
        ("Pedro1", "Pedro2"): [
            "brother we need to talk about the ranch",
            "what about it Pedro",
            "the cattle are getting restless",
            "probably because you keep calling them by name",
            "Bessie and Moo-bert are good cows",
            "you can't name livestock Pedro",
            "watch me",
            "this is why pa left you the funny hat instead of the good boots",
            "heard that evil_sherif was spotted near town again",
            "we better keep an eye on Martine and Juanita",
            "those damsels need protecting from that varmint",
            "agreed brother, can't let evil triumph",
            "remember what pa always said about protecting the innocent",
            "a Pedro brother's duty never ends",
            "especially when there's wickedness about",
            "speaking of which, that Juan fella seems jealous of us",
            "been practicing my quick draw lately",
            "good, we need to stay sharp",
            "evil_sherif won't go down without a fight",
            "true, but right always wins in the end",
            "that's what ma used to say",
            "may she rest in peace, brother",
            "she'd be proud of how we turned out",
            "protecting folks and keeping the peace",
            "winter's coming, need to repair the fence",
            "already on it, ordered new posts yesterday",
            "what about the hay for the horses",
            "got enough to last through spring",
            "and food for Bessie and the gang",
            "they're CATTLE Pedro, not gang members",
            "they're family, Pedro2",
            "sometimes I wonder how we're related",
            "Juan challenged me to a duel today",
            "that no-good wannabe cowboy again",
            "he's still bitter about losing to us last month",
            "some folks just can't handle being outshined",
            "we should invite him for dinner sometime",
            "kill him with kindness, I like it brother",
        ],
        ("sad_hampter", "celiastral"): [
            "I lost again... 47 matches in a row now",
            "aww that's actually kinda impressive in its own way",
            "how is losing impressive",
            "takes dedication to be that consistently adorable at failing",
            "did you just call my failure adorable",
            "maybe... you're like a cute little underdog",
            "I don't know how to feel about this",
            "embrace it! everyone loves rooting for the cute loser",
            "that's... weirdly encouraging actually",
            "see! you're already getting better at being positive",
            "thanks I guess? you're really nice to me",
            "of course! someone has to appreciate your adorable struggle",
            "wish I could be creative like you with the 3D models",
            "creativity and gaming skill are different types of intelligence",
            "but you make such beautiful things",
            "and you have such determination even when things get tough",
            "determination to fail spectacularly maybe",
            "no seriously, most people would have quit by now",
            "you think I should quit?",
            "absolutely not! your persistence is actually inspiring",
            "sometimes I feel like I'm just bad at everything",
            "mood, but that's not true about you",
            "how can you tell",
            "because you keep trying, that takes real courage",
            "doesn't feel very courageous when I'm losing constantly",
            "courage isn't about winning, it's about showing up",
            "you really think that?",
            "I know that, trust me I have my own struggles with perfectionism",
            "at least your art is appreciated by everyone",
            "and your earnest effort is appreciated by me",
            "why do you care so much about my dumb gaming attempts",
            "because underdogs deserve champions, and you're my underdog",
            "that's... nobody's ever said anything like that to me",
            "well I mean it, you're genuinely endearing",
            "I don't know what to say",
            "you don't have to say anything, just keep being you",
            "even if I keep losing?",
            "especially if you keep losing with style",
        ],
    }

    total_conversations = len(dialogues)
    time_span = END_DATE - START_DATE
    time_per_conversation = time_span / total_conversations

    conversation_index = 0
    for participants, messages in dialogues.items():
        user1_name, user2_name = participants
        if user1_name in simulated_users and user2_name in simulated_users:
            profile1 = simulated_users[user1_name].profile
            profile2 = simulated_users[user2_name].profile

            chat, _ = Chat.objects.get_or_create(profile1, profile2)

            conversation_start = START_DATE + (time_per_conversation * conversation_index)
            conversation_end = conversation_start + time_per_conversation

            for i, message in enumerate(messages):
                sender = profile1 if i % 2 == 0 else profile2
                receiver = profile2 if i % 2 == 0 else profile1

                # Calculate message time based on position in conversation
                message_time = conversation_start + (conversation_end - conversation_start) * (i / len(messages))
                # Add some randomness (±30 minutes) to make it more natural
                message_time += timedelta(minutes=randint(-30, 30))

                msg = ChatMessage(content=message, sender=sender, chat=chat, is_read=True, date=message_time)
                if randint(0, 10) >= 9:
                    msg.is_liked = True
                messages_to_create.append(msg)

                notification = Notification.objects.populate(
                    receiver=receiver,
                    sender=sender,
                    notification_action=Notification.MESSAGE,
                    notification_data={"message": message[:50]},  # truncate long messages
                    date=message_time,
                )
                notifications_to_create.append(notification)

            conversation_index += 1

    print("Generating friend pairs...")
    friend_pairs = [
        ("Taki", "Rex"),
        ("emuminov", "celiastral"),
        ("Yuko", "Darksmelo"),
        ("Grandma", "Grandpa"),
        ("Felix", "Tama"),
        ("Pedro1", "Pedro2"),
        ("emuminov", "Yuko"),
        ("emuminov", "Darksmelo"),
        ("Darksmelo", "celiastral"),
        ("faboussa", "Darksmelo"),
        ("sad_hampter", "celiastral"),
    ]

    for user1_name, user2_name in friend_pairs:
        if user1_name in simulated_users and user2_name in simulated_users:
            profile1 = simulated_users[user1_name].profile
            profile2 = simulated_users[user2_name].profile

            notification = Notification.objects.populate(
                receiver=profile1,
                sender=profile2,
                notification_action=Notification.NEW_FRIEND,
                date=generate_random_date(),
            )
            notifications_to_create.append(notification)

    print(f"Bulk creating {len(messages_to_create)} chat messages...")
    ChatMessage.objects.bulk_create(messages_to_create, batch_size=1000)

    print(f"Bulk creating {len(notifications_to_create)} notifications...")
    Notification.objects.bulk_create(notifications_to_create, batch_size=1000)

    print("Chat dialogues and notifications created successfully!")
    print("=" * 50)


def generate_finished_tournaments(users: dict[str, User], n_tournaments: int = 5) -> None:
    options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
    list_users = list(users.values())

    for _ in range(n_tournaments):
        name = choice(TOURNAMENT_NAMES)
        aliases = TOURNAMENT_ALIASES.copy()
        generate_random_date()
        status = Tournament.FINISHED
        creator = choice(list_users)
        list_users.remove(creator)

        # Prepare the list of profiles for this tournament
        profiles_in_tournament = [u.profile for u in users.values()]

        required = choice(options)

        creator_alias = choice(aliases)
        aliases.remove(creator_alias)
        tournament = Tournament.objects.validate_and_create(
            creator=creator.profile,
            tournament_name=name,
            required_participants=required,
            alias=creator_alias,
            settings={"game_speed": "medium", "score_to_win": 5, "time_limit": 1, "ranked": False, "cool_mode": True},
        )
        tournament.status = status
        tournament.save(update_fields=["status"])

        required -= 1
        participant_objs = [tournament.participants.get(profile=creator.profile)]

        remaining_profiles = profiles_in_tournament.copy()
        if creator.profile in remaining_profiles:
            remaining_profiles.remove(creator.profile)
        participants = sample(remaining_profiles, k=required)

        for p in participants:
            alias = aliases.pop(randint(0, len(aliases) - 1))
            part = Participant.objects.create(
                profile=p,
                tournament=tournament,
                alias=alias,
                current_round=0,
            )
            participant_objs.append(part)

        # Generate rounds and brackets
        total_rounds = (len(participant_objs)).bit_length() - 1
        current = participant_objs.copy()

        for rnd in range(1, total_rounds + 1):
            for part in current:
                part.status = Participant.PLAYING
                part.current_round = rnd
                part.save()

            rnd_obj = Round.objects.create(
                tournament=tournament,
                number=rnd,
                status=Tournament.FINISHED,
            )

            next_round = []
            for j in range(0, len(current), 2):
                p1 = current[j]
                p2 = current[j + 1]
                bracket = Bracket.objects.create(
                    round=rnd_obj,
                    participant1=p1,
                    participant2=p2,
                    status=Bracket.FINISHED,
                )

                s1, s2 = randint(0, 5), randint(0, 5)
                if s1 == s2:
                    s1 += 1
                bracket.winners_score = max(s2, s1)
                bracket.losers_score = min(s2, s1)
                winner = p1 if s1 > s2 else p2
                loser = p2 if s1 > s2 else p1
                bracket.winner = winner
                bracket.score = f"{s1}-{s2}"
                bracket.save()

                # Update participant status
                winner.status = Participant.WINNER if rnd == total_rounds else Participant.PLAYING
                loser.status = Participant.ELIMINATED
                winner.current_round = rnd + (0 if rnd < total_rounds else rnd)
                loser.current_round = rnd
                winner.save()
                loser.save()

                next_round.append(winner)
            current = next_round

        final = Round.objects.get(tournament=tournament, number=total_rounds)
        finished_brackets = final.brackets.filter(status=Tournament.FINISHED)
        if finished_brackets.exists():
            champ = finished_brackets.order_by("?").first().winner
            tournament.winner = champ
            tournament.save()


class Command(BaseCommand):
    help = "Populates db with dummy data"

    def handle(self, **kwargs) -> None:  # noqa: PLR0915
        clean_database()

        generate_users()
        put_avatars()
        generate_matches()
        generate_tournaments()
        create_pending_tournament()
        generate_chats_and_notifications()

        # MFA users
        mfa_users = [
            ("secure_bob", "secure_bob@gmail.com"),
            ("safe_alice", "safe_alice@gmail.com"),
            ("careful_charlie", "careful_charlie@gmail.com"),
            ("prudent_paula", "prudent_paula@gmail.com"),
            ("fanny", "boussard.fanny@gmail.com"),
        ]
        for username, email in mfa_users:
            user = User.objects.create_user(username, email=email, password="123")
            user.mfa_enabled = True
            user.save()

        # 42 OAuth Users
        ft_users = [
            ("ft_user1", "ft1@student.42.fr"),
            ("ft_user2", "ft2@student.42.fr"),
            ("ft_cadet", "cadet@student.42.fr"),
            ("ft_champion", "champion@student.42.fr"),
        ]
        for i, (username, _) in enumerate(ft_users, start=1):
            oauth_connection = OauthConnection.objects.create(
                status=OauthConnection.CONNECTED,
                connection_type=OauthConnection.FT,
                oauth_id=420000 + i,
            )
            User.objects.create_user(
                username=username,
                oauth_connection=oauth_connection,
            )

        # GitHub OAuth Users
        github_users = [
            ("github_dev", "dev@gmail.com"),
            ("github_coder", "coder@gmail.com"),
            ("open_source_pro", "opensource@gmail.com"),
            ("git_master", "gitmaster@gmail.com"),
        ]
        for i, (username, _) in enumerate(github_users, start=1):
            oauth_connection = OauthConnection.objects.create(
                status=OauthConnection.CONNECTED,
                connection_type=OauthConnection.GITHUB,
                oauth_id=430000 + i,
            )
            User.objects.create_user(
                username=username,
                oauth_connection=oauth_connection,
            )

        print("\033[92mDB was successfully populated!\033[0m")  # noqa: T201
