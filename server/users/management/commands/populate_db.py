from random import choice

from django.core.management.base import BaseCommand

from users.models import Match, Profile, User


# ruff: noqa: S106
class Command(BaseCommand):
    help = "Populates db with a dummy data"

    def handle(self, **kwargs) -> None:
        if User.objects.count() != 0:
            print("DB is not empty.")  # noqa: T201
            return

        User.objects.create_superuser("admin", "admin@gmail.com", "123")
        life_enjoyer = User.objects.create_user("LifeEnjoyer", "regular", "lifeenjoyer@gmail.com", "123").profile
        yuko = User.objects.create_user("Yuko", "regular", "yuko@gmail.com", "123").profile
        celia = User.objects.create_user("celiastral", "regular", "celiastral@gmail.com", "123").profile
        fanny = User.objects.create_user("Fannybooboo", "regular", "fannybooboo@gmail.com", "123").profile
        eldar = User.objects.create_user("emuminov", "regular", "emuminov@gmail.com", "123").profile
        sad_hampter = User.objects.create_user("SadHampter", "regular", "sadhampter@gmail.com", "123").profile
        User.objects.create_user("User0", "regular", "user0@gmail.com", "123")
        for i in range(30):
            user = User.objects.create_user(f"Pedro{i}", "regular", f"pedro{i}@gmail.com", "123")
            user.profile.is_online = choice([True, False])  # noqa: S311
            user.profile.save()
            life_enjoyer.add_friend(user.profile)
        life_enjoyer.save()

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

        user1 = Profile.objects.get(user__username="Pedro1")
        Match.objects.resolve(sad_hampter, user1, 5, 3)
        Match.objects.resolve(sad_hampter, user1, 6, 2)
        Match.objects.resolve(sad_hampter, user1, 2, 1)
        Match.objects.resolve(sad_hampter, user1, 5, 4)
        Match.objects.resolve(sad_hampter, user1, 2, 1)
        Match.objects.resolve(sad_hampter, user1, 5, 0)
        Match.objects.resolve(sad_hampter, user1, 3, 1)
        Match.objects.resolve(sad_hampter, user1, 6, 2)
        Match.objects.resolve(sad_hampter, user1, 5, 2)

        print("\033[92mDB was successefully populated!\033[0m")  # noqa: T201
