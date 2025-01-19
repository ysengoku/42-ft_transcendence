## nginx ##

1. Vite pendant le développement :
Rôle : Durant le développement, Vite fonctionne comme un serveur de développement local pour le frontend. Il sert ton application Vue.js, React, ou autre, et permet de gérer des requêtes API vers le backend (Django) via un proxy.
Comment ça marche ? : Lorsque tu fais des requêtes à /api sur le frontend, Vite redirige ces requêtes vers le backend (généralement via un proxy configuré dans vite.config.js).
Avantage : Cela te permet de travailler localement sans t'inquiéter de configurer un serveur complet, et c'est rapide à mettre en place.
2. Nginx en production :
Rôle : En production, Nginx prend le rôle de proxy inverse (reverse proxy) pour les requêtes HTTP. Il reçoit les requêtes sur le port 80 (ou 443 pour HTTPS) et les redirige vers le frontend ou le backend, selon le chemin demandé.
Comment ça marche ? : Les requêtes vers /api sont redirigées vers le backend Django (par exemple, http://backend:8000), et les requêtes restantes sont envoyées vers le frontend (par exemple, http://frontend:5173 ou vers des fichiers statiques).
Avantage : Nginx est optimisé pour servir des fichiers statiques et gérer des requêtes en production, offrant ainsi une meilleure performance et sécurité.


Application principale (Frontend) :

Copyhttps://localhost:1026

C'est votre point d'entrée principal via Nginx qui sert votre application frontend
Toutes les routes frontend seront accessibles via cette URL de base


API Backend (via Nginx proxy) :

Copyhttps://localhost:1026/api/[vos-routes]

Vos endpoints d'API seront accessibles via ce préfixe
Nginx fait suivre ces requêtes vers http://back:8000/


Admin Django :

Copyhttps://localhost:1026/admin/

Interface d'administration Django


Accès directs aux services (développement) :


Frontend Vite : http://localhost:5173
Backend Django : http://localhost:8000
PostgreSQL : localhost:5432

Connexion via : postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}
Note : Cet accès direct à la base de données n'est recommandé qu'en développement




Fichiers statiques et média :

Copyhttps://localhost:1026/static/[nom-fichier]
https://localhost:1026/media/[nom-fichier]
Points importants à noter :

L'accès principal à l'application se fait via le port 1026 en HTTPS (SSL)
Les autres ports (5173, 8000, 5432) sont exposés principalement pour le développement
À l'intérieur du réseau Docker, les services communiquent via leurs noms de conteneur (back, front, database)


ERROR: 

ProgrammingError at /admin/

relation "django_session" does not exist
LINE 1: ...ession_data", "django_session"."expire_date" FROM "django_se...
                                                             ^

Request Method:GETRequest URL:https://localhost/admin/Django Version:4.2.7Exception Type:ProgrammingErrorException Value:

relation "django_session" does not exist
LINE 1: ...ession_data", "django_session"."expire_date" FROM "django_se...
                                                             ^

Exception Location:/usr/local/lib/python3.10/site-packages/psycopg/cursor.py, line 723, in executeRaised during:django.contrib.admin.sites.indexPython Executable:/usr/local/bin/python3.10Python Version:3.10.16Python Path:

['.',
 '/usr/local/bin',
 '/usr/local/lib/python310.zip',
 '/usr/local/lib/python3.10',
 '/usr/local/lib/python3.10/lib-dynload',
 '/usr/local/lib/python3.10/site-packages']

Server time:Fri, 17 Jan 2025 11:37:28 +0000

## Docker ##

## docker-compose ##

we enter the args if we want to pass arguments to the dockerfile. if they are not defined in the dockerfile and not used at build time, they are not useful. if arguments are defined and congifured at runtime (in environment), we dont need to specify the args at the build phase.

commandes:

docker volume rm $(docker volume ls -q) = remove all the volumes
docker system prune -a = remove all the images, containers, networks and volumes
docker rmi $(docker images -q) = remove all the images

docker exec -it backend python manage.py makemigrations = faire les migrations a partir du docker
docker exec -it backend python manage.py migrate 
good practice: 

- error  ! nginx Warning pull access denied for trans_server, repository does not exist =>  use the same version of the image in the dockerfile and in the docker-compose file. do not rename the image in the docker-compose file.

## HTTPS Protocol:

API = Application Programming Interface
REST API = A set of rules that developers follow when creating their API.
REST stands for Representational State Transfer, which is an architectural style for networked hypermedia applications.
RESTful API = An API that follows the rules of REST.
HTTP is a stateless protocol, so each request from a client to a server must contain all the information needed by the server to understand the request, without any reference to previous requests.
CRUD = Create, Read, Update, Delete.
HTTP Process:
The client sends a request to the server.
The server sends a response to the client.
A typical HTTP message:
Start line (request line or status line) = The first line of the message.
Headers = Key-value pairs that provide information about the message.
Body = The data that is sent in the message.
Request and Response Differences:
Request:

Start line: Method (POST, GET, PUT, DELETE), URL, HTTP version.
Headers: Key-value pairs that provide information about the request.
Example: Host, User-Agent, Accept, Accept-Language, Accept-Encoding, Connection, Cookie.
Body: The data that is sent in the message.
Response:

Start line: HTTP version, status code, reason phrase.
Headers: Key-value pairs that provide information about the response.
Example: Server, Date, Content-Type, Content-Length, Connection.
Body: The data that is sent in the message.
The Navigator Encodes the Data in the Request, Depending on the Method:
GET and DELETE: The data is encoded in the URL.
POST and PUT: The data is encoded in the body of the request.
Fetch API (Replacement of AJAX) in JavaScript
The Fetch API allows making requests to a server from a web page and performing CRUD operations.

Example (POST request with Fetch):

javascript
Copy code
const formData = new FormData();  // Create a new FormData object
formData.append('choice', '1');   // Add data to the form

fetch('/polls/vote/', {
    method: 'POST',  // Specify the HTTP method (POST in this case)
    body: formData,  // Send the data in the body of the request
    headers: {
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,  // For CSRF security (if Django)
    }
})
.then(response => response.json())
.then(data => {
    console.log('Success:', data);  // Display the server response
})
.catch(error => {
    console.error('Error:', error);  // Handle errors
});

On the Server-Side:
The Ninja framework will serve the client requests by picking the correct view and returning the appropriate response.

python packages:
https://docs.python.org/3/tutorial/modules.html#tut-packages

a module is a file containing Python definitions and statements. The file name is the module name with the suffix .py appended. Within a module, the module’s name (as a string) is available as the value of the global variable __name__.

The __init__.py files are required to make Python treat directories containing the file as packages 

__all__ : if defined, all submodules will be imported from the parent packaging when douin from package import *

1. Create a project: 
django-admin startproject mysite

2. Create an app:
python manage.py startapp polls

3. Add the view with the name (the endpoint).if "" as first argument, it is the default view

4. Add the url to the app

5. Add the url to the project

6. create and migrate  all the apps with database (list in installed apps in settings.py) with the command python manage.py migrate

7. check the database. if SQLite, use the command python manage.py dbshell

8. once in the shell, you can use SQL commands to check the database (e.g. .tables to see the tables)

9. create a model in the app

10. create the migration file with the command
' python manage.py makemigrations polls (makemigration = update)'

Other commands:
 'python manage.py check' = check for problems in the project without making migrations'
 'python manage.py sqlmigrate polls 0001' = check the SQL code that will be executed
 'python manage.py shell' = open the python shell

11. create an admin superuser
'python manage.py createsuperuser'

12. add the model to the admin interface (in the app admin.py)


## Django Template Language (DTL): ##

Tags¶
Tags provide arbitrary logic in the rendering process.

This definition is deliberately vague. For example, a tag can output content, serve as a control structure e.g. an “if” statement or a “for” loop, grab content from a database, or even enable access to other template tags.

Tags are surrounded by {% and %} like this:

{% %} : Balises de contrôle (logique).
{{ }} : Balises d'affichage des variables ou résultats.

{% csrf_token %} template tag. This is used to prevent Cross Site Request Forgerie (in french: protection contre les requêtes intersites) attacks.

pk : primary key (id) = the unique identifier of a model instance
ex: in pk=reporter.pk, reporter is the model instance and pk is the primary key
reporter = Reporter.objects.get(pk=reporter.pk) = get the reporter with the primary key reporter.pk

expression query : a query that returns a value from the database
F() = a class that allows to reference model field values directly in the database
ex: from django.db.models import F
Entry.objects.update(n_pingbacks=F('n_pingbacks') + 1) = increment the n_pingbacks field of all the entries by 1

F() therefore can offer performance advantages by:

getting the database, rather than Python, to do work

reducing the number of queries some operations requir
Another useful benefit of F() is that having the database - rather than Python - update a field’s value avoids a race condition, by using refresh_from_db().

get_queryset : a method that returns a queryset of objects that will be used to render the view

foreignKey : a field that allows to create a relationship between two models

## Python ## :

Methods types:
instance : a method that is called on an instance of a class. use of self as first argument. 
class : a method that is called on a class. use of cls as first argument.
static : a method that is called on a class but does not have access to the class or instance. no first argument.


Type de méthode	Premier paramètre	Accès à l'objet	Quand l'utiliser
Méthode d'instance	self	✅ Oui	Manipuler les attributs de l'objet
Méthode de classe	cls	❌ Objet non, ✅ Classe	Travailler avec les attributs de classe
Méthode statique	Aucun	❌ Non	Fonction indépendante, organisée dans la classe

En Django, un manager est un objet qui gère les requêtes au niveau de la classe de modèle (c'est-à-dire au niveau de la table en base de données), tandis que les opérations sur les instances (lignes dans la table) se font via les méthodes sur ces instances.

## summary vmt model ##
1. View: a function that handle the http request, interacts with the model and send a response http, usually rendered with a template

2. model: a representation of a table in a database. it defines the database structure that we want to stock and manipulate

3. template: a file that contains the html code that will be rendered by the view

use the PRG (Post/Redirect/Get) pattern:
use httpresponseRedirect to avoid the form to be sent twice if the user refresh the page after submitting the form (the browser will send the form again)



todo:
migration when mouting the docker
make all dockers up

admin:
login: admin
password: password


## daily report ##

change to gunicorn instead of daphne so that we can use the django admin interface on localhost:8000/admin

info from settings.py is linked to the .env file to avoid hardcoding the values

DEBUG = int(os.environ.get('DEBUG', default=0))
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
CORS_ALLOW_ALL_ORIGINS = True  # En développement seulement


serving static and media files from the back end:
- in settings.py, I specify the path to the static and media files, from the local location.
from static files to static
from media to media
- in docker compose,
    - I specify the volumes "named volumes" to store the static and media files
      - "static_volume":/app/static
      - "media_volume":/app/media
    - I specify where to put these static and media files in the nginx container
    - I specify them in volumes to say that they are shared between the containers
- in nginx.conf, I specify the location of the static and media files
        location /static/ {
            alias /app/static/;
        }

#/media/ pointe vers /app/media/ dans le conteneur, qui est lié au dossier ./back/media via le volume.
        location /media/ {
            alias /app/media/;
        }

this allows to acces to the media files from the url:
http://localhost:1026/media/avatars/avatar.jpg

## docker:

Service	Port Docker	Port Exposé	Rôle
Nginx	80	8080	Proxy inverse vers frontend/API
Django	8000	Non exposé	API backend (via Nginx)
Vite.js	Non exposé	Servi par Nginx	Frontend (build statique)
PostgreSQL	5432	Non exposé	Base de données (backend only)


Si des services qui ne devraient pas être exposés le sont, cela crée plusieurs risques de sécurité importants :

Pour Django (8000) si exposé :


Accès direct à l'API en contournant le proxy Nginx
Contournement potentiel des règles de sécurité (CORS, rate limiting, etc.)
Risque d'attaques directes sur le framework Django


Pour PostgreSQL (5432) si exposé :


Tentatives de connexion directes à la base de données
Risques de brute force sur les mots de passe
Possibilité d'exfiltration de données
Vulnérabilité aux attaques par déni de service

Dans une architecture sécurisée :

Seul le port 80/443 de Nginx devrait être exposé
Tous les autres services devraient communiquer uniquement via le réseau Docker interne
Les connexions externes passent obligatoirement par Nginx qui agit comme point d'entrée unique et sécurisé