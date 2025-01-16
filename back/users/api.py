from ninja import NinjaAPI
from typing import List
from .schemas import UserSchema
from .models import User

api = NinjaAPI()


@api.get("users/", response=List[UserSchema])
def get_users(request):
    return User.objects.all()


@api.post("users/", response=UserSchema)
def register_user(request):
    user = User.create.create_user()
    return user