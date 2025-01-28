import json
import hashlib
import os
import webbrowser
from urllib.parse import urlencode, parse_qsl, urlparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import requests
from pathlib import Path

SCOPES = ['public', 'profile']  # Liste des scopes valides pour l'API 42

HOST = "localhost"
PORT = 8080

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

        self.server.query_params = parse_qsl(urlparse(self.path.split("?")[1]).query)
        self.wfile.write(b"Hello, world!")

class Server(HTTPServer):
    def __init__(self, host: str, port: int):
        super().__init__((host, port), RequestHandler)
        self.query_params = None

def authorize(secrets: dict) -> dict:
    redirect_uri = secrets['redirect_uris'][0]

    params = {
        "response_type": "code",
        "client_id": secrets["client_id"],
        "redirect_uri": redirect_uri,
        "scope": " ".join(SCOPES),
        "state": hashlib.sha256(os.urandom(1024)).hexdigest(),
    }

    url = f"{secrets['auth_uri']}?{urlencode(params)}"
    if not webbrowser.open(url):
        raise RuntimeError("Failed to open browser")

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

    response = requests.post(secrets["token_uri"], data=params, headers={"Content-Type": "application/x-www-form-urlencoded"})
    
    if response.status_code != 200:
        raise RuntimeError("Failed to get access token")

    return response.json()

if __name__ == "__main__":
    # Charger le fichier secrets
    secrets_file = json.loads(Path("secrets.json").read_text())

    # Sélectionner la plateforme
    platform = "42"  # Change à "github" pour utiliser GitHub
    secrets = secrets_file[platform]  # Récupérer uniquement les secrets pour la plateforme sélectionnée

    # Debug : Vérifie le contenu
    print(f"Secrets for platform '{platform}': {secrets}")

    # Autoriser et obtenir les tokens
    tokens = authorize(secrets)
    print(f"Tokens for {platform}: {tokens}")
