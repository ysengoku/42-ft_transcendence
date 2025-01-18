from ninja import NinjaAPI, Schema, File, UploadedFile
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import User
from .schemas import UserAvatarSchema, UserResponse
from django.shortcuts import get_object_or_404

api = NinjaAPI()

@api.get("/me", response=UserResponse)
def get_current_user(request):
    if not request.user.is_authenticated:
        return {"error": "Authentication required"}, 401

    avatar_url = request.build_absolute_uri(request.user.avatar.url) if request.user.avatar else request.build_absolute_uri('/media/avatars/default_avatar.png')

    return {
        "id": request.user.id,
        "username": request.user.username,
        "avatar": avatar_url
    }

@api.post("/upload-avatar/")
def upload_avatar(request, avatar: UploadedFile = File(...)):
    if not request.user.is_authenticated:
        return {"error": "Authentication required"}, 401

    # Mise à jour directe de l'avatar
    request.user.avatar.save(avatar.name, avatar)
    request.user.save()

    return {
        "id": request.user.id,
        "username": request.user.username,
        "avatar": request.build_absolute_uri(request.user.avatar.url)
    }