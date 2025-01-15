"""
URL configuration for djangoProject1 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from ninja import NinjaAPI
from users.api import router as users_router

# Create an instance of NinjaAPI
api = NinjaAPI()

# Add the users router to the API
api.add_router("/users/", users_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),  # Adding Django Ninja API routes
]