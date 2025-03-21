from random import choice, randint

from django.core.management.base import BaseCommand

from chat.models import Chat, ChatMessage
from users.models import Match, OauthConnection, Profile, User


def choice_except(seq, value):
    res = choice(seq)  # noqa: S311
    while res == value:
        if len(seq) == 1:
            return None
        res = choice(seq)  # noqa: S311
    return res


# ruff: noqa: S106
class Command(BaseCommand):
    help = "Populates db with a dummy data"

    def handle(self, **kwargs) -> None:
        User.objects.all().delete()
        Profile.objects.all().delete()
        Match.objects.all().delete()
        OauthConnection.objects.all().delete()
        Chat.objects.all().delete()
        ChatMessage.objects.all().delete()

        life_enjoyer = User.objects.create_user("LifeEnjoyer", email="lifeenjoyer@gmail.com", password="123").profile
        yuko = User.objects.create_user("Yuko", email="yuko@gmail.com", password="123").profile
        celia = User.objects.create_user("celiastral", email="celiastral@gmail.com", password="123").profile
        fanny = User.objects.create_user("Fannybooboo", email="boussard.fanny@gmail.com", password="123").profile
        eldar = User.objects.create_user("emuminov", email="emuminov@gmail.com", password="123").profile
        sad_hampter = User.objects.create_user("SadHampter", email="sadhampter@gmail.com", password="123").profile
        User.objects.create_user("User0", email="user0@gmail.com", password="123")

        regular_users = []
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
        ]

        for name in names:
            user = User.objects.create_user(f"{name}", email=f"{name}@gmail.com", password="123")
            regular_users.append(user)
            life_enjoyer.add_friend(user.profile)
        life_enjoyer.save()

        for i in range(30):
            user = User.objects.create_user(f"Pedro{i}", email=f"Pedro{i}@gmail.com", password="123")
            life_enjoyer.block_user(user.profile)

        celia.add_friend(sad_hampter)
        users = yuko, celia, fanny, eldar
        for user in users:
            for friend in users:
                if user == friend:
                    continue
                user.add_friend(friend)
            user.save()

        Match.objects.resolve(celia, yuko, 2, 1)
        Match.objects.resolve(celia, yuko, 3, 1)
        Match.objects.resolve(celia, yuko, 4, 2)
        Match.objects.resolve(celia, yuko, 5, 2)
        Match.objects.resolve(celia, yuko, 1, 0)
        Match.objects.resolve(celia, yuko, 2, 1)

        Match.objects.resolve(celia, eldar, 2, 1)
        Match.objects.resolve(celia, eldar, 3, 1)
        Match.objects.resolve(celia, eldar, 4, 2)
        Match.objects.resolve(celia, eldar, 2, 1)
        Match.objects.resolve(eldar, celia, 5, 2)
        Match.objects.resolve(eldar, celia, 1, 0)

        Match.objects.resolve(celia, fanny, 3, 2)
        Match.objects.resolve(celia, fanny, 3, 0)
        Match.objects.resolve(celia, fanny, 5, 1)
        Match.objects.resolve(celia, fanny, 4, 1)
        Match.objects.resolve(celia, fanny, 5, 4)
        Match.objects.resolve(celia, fanny, 2, 1)

        Match.objects.resolve(yuko, fanny, 3, 2)
        Match.objects.resolve(yuko, fanny, 3, 0)
        Match.objects.resolve(yuko, fanny, 5, 1)
        Match.objects.resolve(yuko, fanny, 4, 1)
        Match.objects.resolve(fanny, yuko, 5, 4)
        Match.objects.resolve(fanny, yuko, 2, 1)

        Match.objects.resolve(eldar, fanny, 3, 2)
        Match.objects.resolve(eldar, fanny, 3, 0)
        Match.objects.resolve(eldar, fanny, 5, 1)
        Match.objects.resolve(eldar, fanny, 4, 1)
        Match.objects.resolve(fanny, eldar, 5, 4)
        Match.objects.resolve(fanny, eldar, 2, 1)

        Match.objects.resolve(eldar, yuko, 3, 2)
        Match.objects.resolve(eldar, yuko, 3, 0)
        Match.objects.resolve(eldar, yuko, 5, 1)
        Match.objects.resolve(eldar, yuko, 4, 1)
        Match.objects.resolve(yuko, eldar, 5, 4)
        Match.objects.resolve(yuko, eldar, 2, 1)

        for _i in range(10):
            Match.objects.resolve(yuko, sad_hampter, 5, 1)
            Match.objects.resolve(eldar, sad_hampter, 6, 1)
            Match.objects.resolve(celia, sad_hampter, 11, 1)
            Match.objects.resolve(fanny, sad_hampter, 5, 1)

        for _i in range(5):
            for user in regular_users:
                opponent = choice_except(regular_users, user)
                players = [user, opponent]
                winner = choice(players)  # noqa: S311
                players.remove(winner)
                loser = players[0]
                Match.objects.resolve(winner.profile, loser.profile, choice(range(3, 6)), choice(range(3)))  # noqa: S311
                Match.objects.resolve(life_enjoyer, loser.profile, choice(range(3, 6)), choice(range(3)))  # noqa: S311
                Match.objects.resolve(life_enjoyer, winner.profile, choice(range(3, 6)), choice(range(3)))  # noqa: S311
                if randint(0, 10) > 6:  # noqa: S311,PLR2004
                    Match.objects.resolve(winner.profile, life_enjoyer, choice(range(3, 6)), choice(range(3)))  # noqa: S311
                if randint(0, 10) > 7:  # noqa: S311,PLR2004
                    Match.objects.resolve(loser.profile, life_enjoyer, choice(range(3, 6)), choice(range(3)))  # noqa: S311

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
            for _ in range(50):
                other_profile = choice_except(profiles, profile)
                chat, _ = Chat.objects.get_or_create(profile, other_profile)
                for _ in range(10):
                    ChatMessage.objects.create(content=choice(chat_messages_content), sender=profile, chat=chat)   # noqa: S311

        print("\033[92mDB was successefully populated!\033[0m")  # noqa: T201
