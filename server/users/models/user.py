import uuid

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as BaseUserManager
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import models
from django.db.models import Q
from ninja.files import UploadedFile

from users.utils import merge_err_dicts

"""
Models related to authentication and authorization.
"""


class UserManager(BaseUserManager):
    def for_id(self, user_id: str):
        return self.filter(id=user_id)

    def for_oauth_id(self, oauth_id: str):
        return self.filter(oauth_id=oauth_id)

    def for_username_or_email(self, identifier: str):
        return self.filter(Q(username__iexact=identifier) | Q(email=identifier))

    def for_username(self, username: str):
        return self.filter(username__iexact=username)

    def fill_user_data(self, username: str, connection_type: str, **extra_fields):
        username = AbstractUser.normalize_username(username)
        if connection_type != self.model.REGULAR:
            username = self._generate_unique_username(username)
        if extra_fields.get("password"):
            extra_fields["password"] = make_password(extra_fields.get("password"))
        if extra_fields.get("email"):
            extra_fields["email"] = BaseUserManager.normalize_email(extra_fields.get("email"))
        extra_fields.setdefault("nickname", username)
        return self.model(username=username, connection_type=connection_type, **extra_fields)

    def create_user(self, username: str, connection_type: str, **extra_fields):
        extra_fields["is_superuser"] = False
        user = self.fill_user_data(username, connection_type, **extra_fields)
        user.save()
        return user

    def validate_and_create_user(self, username: str, connection_type: str, **extra_fields):
        extra_fields["is_superuser"] = False
        user = self.fill_user_data(username, connection_type, **extra_fields)
        user.full_clean()
        user.save()
        return user

    def _generate_unique_username(self, username: str):
        base_username = username
        counter = self.filter(username__iexact=username).count()
        if counter > 0:
            return f"{base_username}-{counter}"
        return base_username


class User(AbstractUser):
    """
    Contains information that is related to authentication and authorization of one single user.
    """

    FT = "42"
    GITHUB = "github"
    REGULAR = "regular"
    CONNECTION_TYPES_CHOICES = (
        (FT, "42 School API"),
        (GITHUB, "Github API"),
        (REGULAR, "Our Own Auth"),
    )

    REQUIRED_FIELDS = ()

    username_validator = UnicodeUsernameValidator()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=50, validators=[username_validator], unique=True)
    nickname = models.CharField(max_length=50, validators=[username_validator])
    email = models.EmailField(blank=True, default="")
    connection_type = models.CharField(max_length=10, choices=CONNECTION_TYPES_CHOICES, default="regular")
    oauth_id = models.IntegerField(blank=True, null=True)
    password = models.CharField(max_length=128, default="")
    mfa_secret = models.CharField(max_length=128, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    password = models.CharField(max_length=128, blank=True, default="")
    mfa_secret = models.CharField(max_length=128, blank=True, default="")

    objects = UserManager()

    def validate_unique(self, *args: list, **kwargs: dict) -> None:
        """
        Called during full_clean().
        Additional logic for validation of unique fields.
        **kwargs have a default parameter exclude, which excludes certain fields from being validated.
        """
        if "username" not in kwargs.get("exclude") and User.objects.filter(username__iexact=self.username).exists():
            raise ValidationError({"username": ["A user with that username already exists."]})

        if (
            "email" not in kwargs["exclude"]
            and self.connection_type == User.REGULAR
            and User.objects.filter(email=self.email).exists()
        ):
            raise ValidationError({"email": ["A user with that email already exists."]})

        kwargs["exclude"] |= {"username", "email"}
        super().validate_unique(*args, **kwargs)

    def clean(self):
        """
        Additional validation logic on the entire model that is not related to uniqueness.
        """
        if not self.password and self.connection_type == User.REGULAR:
            raise ValidationError({"password": ["This connection type requires a password."]})
        if not self.email and self.connection_type == User.REGULAR:
            raise ValidationError({"password": ["Email is required."]})

    def update_user(self, data, new_profile_picture: UploadedFile | None):
        """
        Updates the user depending on the non-empty fields of `data`.
        Only the provided fields are updated.
        Possible fields for update: `username`, `nickname`, `email`, `profile_picture` and `password`.
        """
        err_dict = {}

        if new_profile_picture:
            try:
                self.profile.update_avatar(new_profile_picture)
            except ValidationError as exc:
                err_dict = merge_err_dicts(err_dict, exc.error_dict)

        if data.old_password and not data.password:
            err_dict = merge_err_dicts(err_dict, {"password": ["Please enter your new password."]})

        if data.password and data.password_repeat:
            is_old_password_valid = self.check_password(password=data.old_password)
            if not is_old_password_valid:
                raise PermissionDenied
            if data.old_password == data.password:
                err_dict = merge_err_dicts(
                    err_dict,
                    {"password": ["New password cannot be the same as the old password."]},
                )
            self.set_password(data.password)
            data.password = ""

        if data.username == self.username:
            err_dict = merge_err_dicts(err_dict, {"username": ["New username cannot be the same as the old username."]})

        if data.email == self.email:
            err_dict = merge_err_dicts(err_dict, {"email": ["New email cannot be the same as the old email."]})

        for key, val in data:
            if val and hasattr(self, key):
                setattr(self, key, val)

        exclude = set()
        if not data.email:
            exclude.add("email")
        if not data.username:
            exclude.add("username")

        try:
            self.validate_unique(exclude=exclude)
            self.full_clean(validate_unique=False)
        except ValidationError as exc:
            err_dict = merge_err_dicts(err_dict, exc.error_dict)

        if err_dict:
            raise ValidationError(err_dict)
        self.save()
        self.profile.save()
        return self

    def __str__(self):
        return f"{self.username} - {self.connection_type}"
