from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from ninja import NinjaAPI
from ninja.errors import ValidationError as NinjaValidationError
from typing import List
from .schemas import UserSchema, SignUpSchema
from .models import User

api = NinjaAPI()


@api.get("users/", response=List[UserSchema])
def get_users(request):
    return User.objects.prefetch_related('profile').all()


@api.get("users/{username}", response=UserSchema)
def get_user(request, username: str):
    return get_object_or_404(User, username=username)


@api.post("users/", response={201: UserSchema})
def register_user(request, data: SignUpSchema):
    if data.password != data.password_repeat:
        raise ValidationError({"msg": "Passwords do not match."})
    user = User(username=data.username, email=data.email)
    user.set_password(data.password)
    user.full_clean()
    user.save()
    return 201, user


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
