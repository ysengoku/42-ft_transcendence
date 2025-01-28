import hashlib
import json
import os
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse


SCOPES_GITHUB = ["user"]
SCOPES_42 = ["public", "profile"]


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

        self.server.query_params = parse_qsl(urlparse(self.path.split("?")[1]).query)
        self.wfile.write(b"Hello, world!")


# Serveur HTTP temporaire pour obtenir le code d'autorisation
class Server(HTTPServer):
    def __init__(self, host: str, port: int):
        super().__init__((host, port), RequestHandler)
        self.query_params = None


# Fonction de sélection des secrets et scopes en fonction de la plateforme
def param(platform: str) -> dict:
    # Charger le fichier secrets
    secrets_file = json.loads(Path("secrets.json").read_text())

    if platform == "github":
        secrets = secrets_file["github"]
        SCOPES = SCOPES_GITHUB
    elif platform == "42":
        secrets = secrets_file["42"]
        SCOPES = SCOPES_42
    else:
        raise ValueError(f"Unsupported platform: {platform}")

    return secrets, SCOPES


# Fonction pour effectuer l'autorisation OAuth
def authorize(secrets: dict, SCOPES: list) -> dict:
    redirect_uri = secrets["redirect_uris"][0]

    params = {
        "response_type": "code",
        "client_id": secrets["client_id"],
        "redirect_uri": redirect_uri,
        "scope": " ".join(SCOPES),
        "state": hashlib.sha256(os.urandom(1024)).hexdigest(),
    }

    # Créer l'URL de demande d'autorisation
    url = f"{secrets['auth_uri']}?{urlencode(params)}"
    if not webbrowser.open(url):
        raise RuntimeError("Failed to open browser")

    # Lancer le serveur temporaire pour recevoir le code
    server = Server(HOST, PORT)

    try:
        server.handle_request()
    finally:
        server.server_close()

    if params["state"] != server.query_params["state"]:
        raise RuntimeError("Invalid state")

    code = server.query_params["code"]

    params = {
        "client_id": secrets["client_id"],
        "client_secret": secrets["client_secret"],
        "code": code,
        "redirect_uri": redirect_uri,
    }

    # Échanger le code contre un token
    response = requests.post(
        secrets["token_uri"],
        data=params,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        raise RuntimeError("Failed to get access token")

    return response.json()


# Vue Django Ninja pour gérer l'authentification OAuth
router = Router()


@router.get("/authorize")
def oauth_authorize(request, platform: str):
    # Choisir les secrets et scopes en fonction de la plateforme
    try:
        secrets, SCOPES = param(platform)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Appeler la fonction d'autorisation
    tokens = authorize(secrets, SCOPES)

    return {"tokens": tokens}
