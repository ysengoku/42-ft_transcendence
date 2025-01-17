from ninja import Router
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import User
from .schemas import UserAvatarSchema

router = Router()

@router.post("/upload-avatar/")
def upload_avatar(request, data: UserAvatarSchema):
    # Récupérer l'utilisateur
    user = User.objects.get(id=request.user.id)

    if 'avatar' in request.FILES:
        avatar_file = request.FILES['avatar']
        file_name = default_storage.save(f'avatars/{avatar_file.name}', ContentFile(avatar_file.read()))
        user.avatar = f'avatars/{file_name}'
        user.save()
        
        return {"avatar_url": user.avatar.url}
    return {"error": "No file uploaded"}
