from ninja import ModelSchema, Schema
from .models import User


class ErrorSchema(Schema):
    message: str


class UserSchema(ModelSchema):
    avatar: str

    class Meta:
        model = User
        fields = ['username', 'date_joined', 'email', 'password']

    @staticmethod
    def resolve_avatar(obj):
        return obj.profile.avatar


class SignUpSchema(Schema):
    username: str
    email: str
    password: str
    password_repeat: str
