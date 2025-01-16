from ninja import ModelSchema
from .models import User


class UserSchema(ModelSchema):
    number: int

    class Meta:
        model = User
        fields = '__all__'

    @staticmethod
    def resolve_number(obj):
        return 1
