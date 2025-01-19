from ninja import NinjaAPI, Schema, File, UploadedFile
from ninja.responses import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import User
from .schemas import UserAvatarSchema, UserResponse

api = NinjaAPI()

@api.post("/upload-avatar/", response=UserResponse)
def upload_avatar(
    request, 
    avatar_new_image: UploadedFile = File(...)
):
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    
    try:
        # Si un avatar existe déjà (autre que celui par défaut), on le supprime
        if request.user.avatar and request.user.avatar.name != 'avatars/default_avatar.png':
            if os.path.exists(request.user.avatar.path):
                os.remove(request.user.avatar.path)
        
        # Sauvegarde du nouvel avatar
        request.user.avatar.save(avatar_new_image.name, avatar_new_image)
        request.user.save()
        
        # Construction de l'URL complète pour l'avatar
        avatar_url = request.build_absolute_uri(request.user.avatar.url) if request.user.avatar else None
        
        # Utilisation de votre schéma UserResponse existant
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "avatar": avatar_url
            },
            status=200
        )
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api.post("/test-upload/")
def test_upload(request, file: UploadedFile = File(...)):
    # Define the target directory and file name
    file_path = f"avatars/{file.name}"
    
    # Save the file to the media directory
    saved_file_path = default_storage.save(file_path, ContentFile(file.read()))
    
    return {"filename": file.name, "saved_to": saved_file_path}
