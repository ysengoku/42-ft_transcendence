from django.conf import settings
from django.conf.urls.static import static
from django.urls import path

from server.api import api

urlpatterns = [
    path("api/", api.urls),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
