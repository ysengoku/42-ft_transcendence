from django.shortcuts import render
from django.http import HttpRequest, JsonResponse
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import User


# Create your views here.
@api_view(['GET'])
def index(request: HttpRequest) -> Response:
    users = User.objects.all()
    return Response(users)
