from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Match, Profile, User

admin.site.register(User, UserAdmin)
admin.site.register(Profile)
admin.site.register(Match)
