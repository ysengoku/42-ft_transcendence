from django.db import models


class OauthConnectionManager(models.Manager):
    def for_state_and_pending_status(self, state: str):
        return self.filter(status=self.model.PENDING, state=state)

    def create_pending_connection(self, state: str, platform: str):
        OauthConnection.objects.create(
            state=state,
            connection_type=platform,
            status=OauthConnection.PENDING,
        )


class OauthConnection(models.Model):
    FT = "42"
    GITHUB = "github"
    REGULAR = "regular"

    CONNECTION_TYPES_CHOICES = (
        (FT, "42 School API"),
        (GITHUB, "Github API"),
        (REGULAR, "Our Own Auth"),
    )

    PENDING = "pending"
    CONNECTED = "connected"
    STATUS_CHOICES = ((PENDING, "Pending"), (CONNECTED, "Connected"))

    state = models.CharField(max_length=64, editable=False)
    status = models.CharField(max_length=9, editable=False, choices=STATUS_CHOICES)
    connection_type = models.CharField(max_length=7, choices=CONNECTION_TYPES_CHOICES)
    oauth_id = models.IntegerField(blank=True, null=True)
    user = models.OneToOneField(
        "users.User",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
        related_name="oauth_connection",
    )
    date = models.DateTimeField(auto_now_add=True)

    objects = OauthConnectionManager()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        username = self.user.username if self.user else "No User"
        connection_type = self.connection_type if self.connection_type else "No Connection Type"
        return f"{connection_type} of {username}"

    def set_from_pending_to_connected(self, user_info: dict, user: str):
        self.oauth_id = user_info.get("id")
        self.user = user
        self.status = OauthConnection.CONNECTED

        self.save()
