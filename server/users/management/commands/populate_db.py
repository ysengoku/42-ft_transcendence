from random import choice, randint

from django.core.management.base import BaseCommand

from users.models import Match, User


# ruff: noqa: S106
class Command(BaseCommand):
    help = "Populates db with a dummy data"

    def handle(self, **kwargs) -> None:
        if User.objects.count() != 0:
            print("DB is not empty.")  # noqa: T201
            return

        User.objects.create_superuser("admin", "admin@gmail.com", "123")
        life_enjoyer = User.objects.create_user(
            "LifeEnjoyer", "regular", email="lifeenjoyer@gmail.com", password="123"
        ).profile
        yuko = User.objects.create_user("Yuko", "regular", email="yuko@gmail.com", password="123").profile
        celia = User.objects.create_user("celiastral", "regular", email="celiastral@gmail.com", password="123").profile
        fanny = User.objects.create_user(
            "Fannybooboo", "regular", email="fannybooboo@gmail.com", password="123"
        ).profile
        eldar = User.objects.create_user("emuminov", "regular", email="emuminov@gmail.com", password="123").profile
        sad_hampter = User.objects.create_user(
            "SadHampter", "regular", email="sadhampter@gmail.com", password="123"
        ).profile
        User.objects.create_user("User0", "regular", email="user0@gmail.com", password="123")

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
        ]
        for name in names:
            user = User.objects.create_user(f"{name}", "regular", email=f"{name}@gmail.com", password="123")
            regular_users.append(user)
            life_enjoyer.add_friend(user.profile)
        life_enjoyer.save()

        for i in range(30):
            user = User.objects.create_user(f"Pedro{i}", "regular", email=f"Pedro{i}@gmail.com", password="123")
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
                opponents = regular_users.copy()
                opponents.remove(user)
                opponent = choice(opponents)  # noqa: S311
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

        print("\033[92mDB was successefully populated!\033[0m")  # noqa: T201
