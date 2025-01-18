from pydantic import BaseModel
from typing import Optional

class UserAvatarSchema(BaseModel):
    avatar: Optional[str] = None  # Champ pour l'upload d'avatar

class UserResponse(BaseModel):
    id: int
    username: str
    avatar: Optional[str] = None  # L'avatar peut être vide ou avoir une URL