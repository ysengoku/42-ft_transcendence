from ninja import Schema, File
from django.core.files import File as DjangoFile
from typing import Optional

class UserAvatarUpdate(Schema):
    avatar: Optional[str] = None

class UserResponse(Schema):
    id: int
    username: str
    avatar: str