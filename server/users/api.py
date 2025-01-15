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

# from django.core.exceptions import ValidationError
#
# @api.exception_handler(ValidationError)
# def django_validation_error(request, exc: ValidationError):
#     return api.create_response(
#         request,
#         {
#             "detail": [
#                 {
#                     "type": "unknown_type",
#                     "loc": ["body", "payload", key],
#                     "msg": exc.message_dict[key],
#                 }
#                 for key in exc.message_dict
#             ]
#         },
#         status=400,
#     )
