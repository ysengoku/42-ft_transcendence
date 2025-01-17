from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from ninja import NinjaAPI
from typing import List
from .schemas import ProfilePreviewSchema, ProfileFullSchema, SignUpSchema
from .models import User, Profile

api = NinjaAPI()


@api.get("users/", response=List[ProfilePreviewSchema])
def get_users(request):
    return Profile.objects.prefetch_related('user').all()


@api.get("users/{username}", response=ProfileFullSchema)
def get_user(request, username: str):
    return get_object_or_404(Profile, user__username=username)


@api.post("users/", response={201: ProfilePreviewSchema})
def register_user(request, data: SignUpSchema):
    if data.password != data.password_repeat:
        raise ValidationError({"msg": "Passwords do not match."})
    if User.objects.filter(username__iexact=data.username).exists():
        raise ValidationError({"msg": "A user with that username already exists."})
    user = User(username=data.username, email=data.email)
    user.set_password(data.password)
    user.full_clean()
    user.save()
    return 201, user.profile


@api.exception_handler(ValidationError)
def django_validation_error(request, exc: ValidationError):
    return api.create_response(
        request,
        {
            "detail": [
                {
                    "type": "unknown_type",
                    "loc": ["body", "payload", key],
                    "msg": exc.message_dict[key][0],
                }
                for key in exc.message_dict
            ]
        },
        status=400,
    )
