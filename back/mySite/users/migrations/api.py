# users/api.py
from ninja import Router

router = Router()

@router.get("/profile")
def profile(request):
    return {"message": "This is the profile endpoint"}