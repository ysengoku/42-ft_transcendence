from datetime import datetime, timedelta
from random import choice, randint, randrange, sample

from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import Chat, ChatMessage, Notification
from pong.models import GameRoom, GameRoomPlayer, Match
from tournaments.models import Bracket, Participant, Round, Tournament
from users.models import OauthConnection, Profile, User


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


def generate_users() -> tuple[list[User], User]:
    # special user who is winning at life
    life_enjoyer = User.objects.create_user("LifeEnjoyer", email="lifeenjoyer@gmail.com", password="123")
    life_enjoyer.profile.elo = 2800
    life_enjoyer.profile.save()

    # special user who has no data on itself
    User.objects.create_user("User0", email="user0@gmail.com", password="123")

    users = {}
    names_and_elo = [
        ("sad_hampter", 100),
        ("Juan", 150),
        ("Pedro", 200),
        ("Anya", 300),
        ("Juanita", 400),
        ("John", 800),
        ("johndoe1", 1000),
        ("Joe_The_Uncatchable", 1000),
        ("george55", 1000),
        ("Alex", 1200),
        ("alice", 1500),
        ("menaco", 1600),
        ("warhawk", 1700),
        ("evil_sherif", 2000),
        ("TheBall", 2000),
        ("alice123", 2100),
        ("Yuko", 2500),
        ("celiastral", 2700),
        ("emuminov", 2500),
        ("Darksmelo", 2500),
        ("faboussa", 2500),
    ]

    for name, elo in names_and_elo:
        user = User.objects.create_user(f"{name}", email=f"{name}@gmail.com", password="123")
        user.profile.elo = elo
        user.profile.save()
        users[user.username] = user
        life_enjoyer.profile.add_friend(user.profile)

    special_users = {
        username: user
        for username, user in users.items()
        if username in ["Yuko", "celiastral", "emuminov", "Darksmelo", "faboussa"]
    }

    for user in special_users.values():
        for friend in special_users.values():
            if user == friend:
                continue
            user.profile.add_friend(friend.profile)

    # sad hampter needs a friend :(
    celiastral = special_users["celiastral"]
    sad_hampter = users["sad_hampter"]
    celiastral.profile.add_friend(sad_hampter.profile)
    sad_hampter.profile.add_friend(celiastral.profile)

    for i in range(10):
        user = User.objects.create_user(f"Pedro{i}", email=f"Pedro{i}@gmail.com", password="123")
        if randint(0, 1):
            life_enjoyer.profile.block_user(user.profile)
        else:
            life_enjoyer.profile.add_friend(user.profile)
    life_enjoyer.profile.save()
    return users, life_enjoyer


def generate_matches(users: dict[str, User], life_enjoyer: User):
    # generate random sorted dates in advance to preserve the sequentiality of the played matches
    dates = sorted([generate_random_date() for _ in range(100)])

    # resolves matches based on chance proportional to their elo
    users_lst = list(users.values())
    for i in range(len(dates)):
        for user in users_lst:
            opponent = choice_except(users_lst, user)
            if randint(0, 100) >= calc_win_chance_based_on_elo(user.profile.elo, opponent.profile.elo):
                winner = opponent
                loser = user
            else:
                winner = user
                loser = opponent
            Match.objects.resolve(
                winner.profile,
                loser.profile,
                randint(4, 7),
                randint(0, 3),
                dates[i],
            )

            # life_enjoyer can't stop winning
            if not randint(0, 8):
                Match.objects.resolve(
                    life_enjoyer.profile,
                    loser.profile,
                    randint(4, 7),
                    randint(0, 3),
                    dates[i],
                )
            if not randint(0, 11):
                Match.objects.resolve(
                    life_enjoyer.profile,
                    winner.profile,
                    randint(4, 7),
                    randint(0, 3),
                    dates[i],
                )


def generate_tournaments(users: dict[str, User]) -> None:
    dummy_aliases = [
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
    ]
    options = [int(x) for x in __import__("django.conf").conf.settings.REQUIRED_PARTICIPANTS_OPTIONS]
    profiles = [u.profile for u in users.values() if hasattr(u, "profile") and u.profile.user is not None]

    for i in range(15):
        name = f"Tournament {i + 1}"
        date = generate_random_date()
        status = choice([Tournament.PENDING, Tournament.ONGOING, Tournament.FINISHED])
        user = choice(list(users.values()))
        required = choice(options)

        tournament = Tournament.objects.create(
            name=name,
            date=date,
            status=status,
            creator=user.profile,
            required_participants=required,
        )

        available_aliases = dummy_aliases.copy()

        participants = sample(profiles, k=required)
        participant_objs = []
        for p in participants:
            alias = available_aliases.pop(randint(0, len(available_aliases) - 1))
            part = Participant.objects.create(
                profile=p,
                tournament=tournament,
                alias=alias,
                current_round=0,
            )
            participant_objs.append(part)

        # ongoing/finished の場合はラウンド生成・状態更新
        if status in (Tournament.ONGOING, Tournament.FINISHED):
            total_rounds = 2 if required == 4 else 3
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
                    bracket_status = Tournament.FINISHED if rnd_status == Tournament.FINISHED else Tournament.ONGOING
                    bracket = Bracket.objects.create(
                        round=rnd_obj,
                        participant1=p1,
                        participant2=p2,
                        status=bracket_status,
                    )

                    if bracket_status == Tournament.FINISHED:
                        s1, s2 = randint(0, 3), randint(0, 3)
                        if s1 == s2:
                            s1 += 1
                        bracket.score_p1, bracket.score_p2 = s1, s2
                        winner = p1 if s1 > s2 else p2
                        loser = p2 if s1 > s2 else p1
                        bracket.winner = winner
                        bracket.score = f"{s1}-{s2}"
                        bracket.save()

                        winner.status = "playing" if rnd < total_rounds else "winner"
                        loser.status = "eliminated"
                        loser.current_round = rnd
                        winner.current_round = rnd + (0 if rnd < total_rounds else rnd)
                        winner.save()
                        loser.save()

                        next_round.append(winner)
                    elif status == Tournament.ONGOING:
                        if randint(0, 1):
                            s1, s2 = randint(0, 3), randint(0, 3)
                            if s1 == s2:
                                s2 += 1
                            bracket.score_p1, bracket.score_p2 = s1, s2
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


def generate_empty_tournament(user: User) -> Tournament:
    return Tournament.objects.create(
        name="Empty Tournament",
        date=generate_random_date(),
        status=Tournament.PENDING,
        creator=user.profile,
        required_participants=0,
    )


class Command(BaseCommand):
    help = "Populates db with a dummy data"

    def handle(self, **kwargs) -> None:  # noqa: PLR0915
        clean_database()

        users, life_enjoyer = generate_users()

        generate_matches(users, life_enjoyer)
        generate_tournaments(users)

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

        # Chat users
        chat_messages_content = [
            "Did you get my email?",
            "See you tomorrow!",
            "Nope. See you tomorrow, snackless one! 😆",
            "That was ONE TIME! Never letting that go, huh? 😂",
            "Just making sure. Last time you showed up empty-handed. "
            "I don't want a repeat of that situation, "
            "so I need to confirm everything is in order."
            "You know how important this is, and I can't afford any mistakes."
            "If anything is missing again, we'll have a serious problem. 👀",
            "Good morning!",
            "Hey, what's up?",
            "Let's catch up soon!",
            "Can you help me with this?",
            "Congratulations on your achievement!",
            "Happy Birthday!",
            "See you later.",
            "Thank you so much!",
            "Thank you so much!",
            "I'm on my way.",
            "Later! Don't forget to bring snacks. 🤓",
            "Haha, we'll see! Catch you later!",
            "Of course! What kind of monster do you think I am?! 🍫",
            "Let's grab lunch sometime.",
            "I'm here if you need me.",
            "Did you watch the game last night?",
            "Thanks for your support!",
            "Sorry, I missed your call.",
            "Call me when you're free.",
            "It was great seeing you!",
            "Let's plan a meeting soon.",
            "I hope you're doing well.",
            "Take care and stay safe.",
            "Can we reschedule our meeting?",
            "I'll be there in 5 minutes.",
            "Looking forward to our chat!",
            "Just checking in—how are you?",
            "Wanna catch up later?",
            "Don't forget about our meeting tomorrow.",
            "I'm excited about our project collaboration!",
            "Let me know if you need anything.",
            "Let's grab lunch sometime.",
            "I'm here if you need me.",
            "Did you watch the game last night?",
            "Thanks for your support!",
            "Sorry, I missed your call.",
            "Call me when you're free.",
            "It was great seeing you!",
            "Let's plan a meeting soon.",
            "I hope you're doing well.",
            "Take care and stay safe.",
            "Can we reschedule our meeting?",
            "I'll be there in 5 minutes.",
            "Looking forward to our chat!",
            "Just checking in—how are you?",
            "Wanna catch up later?",
            "Don't forget about our meeting tomorrow.",
            "I'm excited about our project collaboration!",
            "Let me know if you need anything.",
            "Hey there! 😄 How's your day going?",
            "Good morning! 🌞 Ready to seize the day?",
            "Let's catch up soon! 🍕😋",
            "Wanna have some fun? 🎉😜",
            "Keep smiling and enjoy life! 😁✨",
            "Feeling lucky today! 🍀😉",
            "Time to celebrate! 🎊🥳",
            "Just chilling... 😎🍹",
            "You're awesome! 🤩🙌",
            "Can't wait to see you! 😍🚀",
            "Stay cool, my friend! 😎👍",
            "Hope you're having a blast! 😆🎈",
            "Let's rock this day! 🤘😃",
            "Sending you positive vibes! ✨😊",
            "Life's too short—let's have fun! 😜💥",
            "Always smiling when you're around! 😁💖",
            "Here's to great times and good laughs! 😂🍻",
            "Adventure awaits! 🚀🌟",
            "Chase your dreams! 🌈💫",
            "Happiness is contagious! 😄💞",
            "Let's make today unforgettable! 🎉🔥",
            "Life's a party, join in! 🥳🍾",
            "Keep the good times rolling! 😎🎶",
            "Time to shine, superstar! ✨🌟",
            "Let's laugh until it hurts! 😂😜",
            """Hey there! 😄
How's your day going?
Hope you're enjoying every moment!""",
            """Good morning! 🌞
Ready to conquer the day?
Let's make it amazing!""",
            """Hi friend! 🍕
Let's catch up over some pizza and laughter!
Can't wait to see you!""",
            """Hello! 🎉
I just wanted to say you rock!
Stay awesome and keep smiling!""",
            """Greetings! 🚀
Your energy lights up the room!
Keep soaring high, superstar!""",
        ]
        profiles = list(Profile.objects.all())
        for profile in profiles:
            for _ in range(100):
                other_profile = choice_except(profiles, profile)
                chat, _ = Chat.objects.get_or_create(profile, other_profile)
                for _ in range(10):
                    random_message_content = choice(chat_messages_content)  # noqa: S311
                    ChatMessage.objects.create(content=random_message_content, sender=profile, chat=chat)
            for _ in range(15):
                sender = choice_except(profiles, profile)
                if sender:
                    notification = Notification.objects.action_new_friend(receiver=profile, sender=sender)
                    if randint(0, 1):  # noqa: S311
                        notification.is_read = True
                        notification.save()

        print("\033[92mDB was successefully populated!\033[0m")  # noqa: T201
