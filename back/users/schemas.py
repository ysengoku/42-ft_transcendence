from pydantic import BaseModel
from typing import Optional

class UserAvatarSchema(BaseModel):
    avatar: Optional[str] = None  # Champ pour l'upload d'avatar
