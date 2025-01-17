from ninja import Router, File, Form
from django.shortcuts import get_object_or_404
from .schemas import UserResponse
from .models import User

router = Router()

@router.put("/avatar", response=UserResponse)
def update_avatar(request, file: File(...)):
    if not request.user.is_authenticated:
        return {"error": "Authentication required"}, 401

    request.user.avatar.save(file.name, file)
    request.user.save()

    return {
        "id": request.user.id,
        "username": request.user.username,
        "avatar": request.user.avatar.url if request.user.avatar else None
    }

@router.get("/me", response=UserResponse)
def get_current_user(request):
    if not request.user.is_authenticated:
        return {"error": "Authentication required"}, 401
    
    return {
        "id": request.user.id,
        "username": request.user.username,
        "avatar": request.user.avatar.url if request.user.avatar else None
    }