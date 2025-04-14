from datetime import datetime, timedelta
from random import choice, randint, randrange

from django.core.management.base import BaseCommand
from django.utils import timezone

from chat.models import Chat, ChatMessage, Notification
from pong.models import Match
from users.models import OauthConnection, Profile, User


# ruff: noqa: S106, S311
def choice_except(seq, value):
    res = choice(seq)  # noqa: S311
    while res == value:
        if len(seq) == 1:
            return None
        res = choice(seq)  # noqa: S311
    return res


def generate_random_date(start: datetime = (timezone.now() - timedelta(days=22)), end: datetime = timezone.now()):
    delta = end - start
    delta_in_seconds = delta.days * 24 * 60 * 60 + delta.seconds
    return start + timedelta(seconds=randrange(delta_in_seconds))

def clean_database():
    User.objects.all().delete()
    Profile.objects.all().delete()
    Match.objects.all().delete()
    OauthConnection.objects.all().delete()
    Chat.objects.all().delete()
    ChatMessage.objects.all().delete()
    Notification.objects.all().delete()

def generate_users():
    # special user who is winning at life
    life_enjoyer = User.objects.create_user("LifeEnjoyer", email="lifeenjoyer@gmail.com", password="123")

    # special user who has no data on itself
    User.objects.create_user("User0", email="user0@gmail.com", password="123")

    users = []
    names = [
        "Pedro",
        "Juan",
        "Anya",
        "Juanita",
        "John",
        "Joe_The_Uncatchable",
        "Alex",
        "alice",
        "menaco",
        "evil_sherif",
        "TheBall",
        "warhawk",
        "alice123",
        "johndoe1",
        "george55",
        "Yuko",
        "celiastral",
        "emuminov",
        "Darksmelo",
        "faboussa",
        "sad_hampter",
    ]

    for name in names:
        user = User.objects.create_user(f"{name}", email=f"{name}@gmail.com", password="123")
        users.append(user)
        life_enjoyer.profile.add_friend(user.profile)

    for i in range(10):
        user = User.objects.create_user(f"Pedro{i}", email=f"Pedro{i}@gmail.com", password="123")
        if randint(0, 1):
            life_enjoyer.profile.block_user(user.profile)
        else:
            life_enjoyer.profile.add_friend(user.profile)
    life_enjoyer.profile.save()
    return users, life_enjoyer

def generate_matches(users: list[User], life_enjoyer: User):
    # generate random sorted dates in advance to preserve the sequentiality of the played matches
    dates = sorted([generate_random_date() for _ in range(100)])

    for i in range(len(dates)):
        for user in users:
            opponent = choice_except(users, user)
            players = [user, opponent]
            winner = choice(players)
            players.remove(winner)
            loser = players[0]
            Match.objects.resolve(
                winner.profile,
                loser.profile,
                choice(range(3, 6)),
                choice(range(3)),
                dates[i],
            )

            # life_enjoyer can't stop winning
            if not randint(0, 5):
                Match.objects.resolve(
                    life_enjoyer.profile,
                    loser.profile,
                    choice(range(3, 6)),
                    choice(range(3)),
                    dates[i],
                )
            if not randint(0, 8):
                Match.objects.resolve(
                    life_enjoyer.profile,
                    winner.profile,
                    choice(range(3, 6)),
                    choice(range(3)),
                    dates[i],
                )



class Command(BaseCommand):
    help = "Populates db with a dummy data"

    def handle(self, **kwargs) -> None:  # noqa: PLR0915
        clean_database()

        users, life_enjoyer = generate_users()

        generate_matches(users, life_enjoyer)
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
