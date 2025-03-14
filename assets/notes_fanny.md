## what I did

- a docker which work for development and production with django, vite and nginx
- a docker compose that applies the migrations
- a makefile that has emhanced features like showing the logs, make dev, make prod, reload nginx
- a nginx .conf that created aliases so all is at the same level : app. the static and media files are served by nginx
a nginx conf that prevents ddos attacks
- the nginx cache
- github actions that test the code and deploy it. and test can be done by installing act.
- oauth2 with 42 api and github
- 2fa with email
- forgot password 

## nginx

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

<!--
C'est votre point d'entrée principal via Nginx qui sert votre application frontend
Toutes les routes frontend seront accessibles via cette URL de base -->

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

## docker-compose

we enter the args if we want to pass arguments to the dockerfile. if they are not defined in the dockerfile and not used at build time, they are not useful. if arguments are defined and congifured at runtime (in environment), we dont need to specify the args at the build phase.

commandes:

docker volume rm $(docker volume ls -q) = remove all the volumes
docker system prune -a = remove all the images, containers, networks and volumes
docker rmi $(docker images -q) = remove all the images

docker exec -it backend python manage.py makemigrations = faire les migrations a partir du docker
docker exec -it backend python manage.py migrate
good practice:

- error ! nginx Warning pull access denied for trans_server, repository does not exist => use the same version of the image in the dockerfile and in the docker-compose file. do not rename the image in the docker-compose file.

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
const formData = new FormData(); // Create a new FormData object
formData.append('choice', '1'); // Add data to the form

fetch('/polls/vote/', {
method: 'POST', // Specify the HTTP method (POST in this case)
body: formData, // Send the data in the body of the request
headers: {
'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, // For CSRF security (if Django)
}
})
.then(response => response.json())
.then(data => {
console.log('Success:', data); // Display the server response
})
.catch(error => {
console.error('Error:', error); // Handle errors
});

On the Server-Side:
The Ninja framework will serve the client requests by picking the correct view and returning the appropriate response.

python packages:
https://docs.python.org/3/tutorial/modules.html#tut-packages

a module is a file containing Python definitions and statements. The file name is the module name with the suffix .py appended. Within a module, the module’s name (as a string) is available as the value of the global variable **name**.

The **init**.py files are required to make Python treat directories containing the file as packages

**all** : if defined, all submodules will be imported from the parent packaging when douin from package import \*

1. Create a project:
   django-admin startproject server

2. Create an app:
   python manage.py startapp polls

3. Add the view with the name (the endpoint).if "" as first argument, it is the default view

4. Add the url to the app

5. Add the url to the project

6. create and migrate all the apps with database (list in installed apps in settings.py) with the command python manage.py migrate

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

## Django Template Language (DTL):

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

Type de méthode Premier paramètre Accès à l'objet Quand l'utiliser
Méthode d'instance self ✅ Oui Manipuler les attributs de l'objet
Méthode de classe cls ❌ Objet non, ✅ Classe Travailler avec les attributs de classe
Méthode statique Aucun ❌ Non Fonction indépendante, organisée dans la classe

En Django, un manager est un objet qui gère les requêtes au niveau de la classe de modèle (c'est-à-dire au niveau de la table en base de données), tandis que les opérations sur les instances (lignes dans la table) se font via les méthodes sur ces instances.

## summary vmt model

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


## docker:

Service Port Docker Port Exposé Rôle
Nginx 80 8080 Proxy inverse vers frontend/API
Django 8000 Non exposé API backend (via Nginx)
Vite.js Non exposé Servi par Nginx Frontend (build statique)
PostgreSQL 5432 Non exposé Base de données (backend only)

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

2 categories of docker:

- stateful: database mysql
- stateless: https protocol: same actions are realized

docker images -a = see all images present on the machine
docker ps = check if containers are active
docker pull = have the latest official image
docker system prune = clean all including images, caches, network, containers
--detach (-d) = the service is not attached to the container and so
other containers can be launched
docker volume rm $(docker volume ls -q) = remove all the volumes
docker system prune -a = remove all the images, containers, networks and volumes
docker rmi $(docker images -q) = remove all the images

docker run -d openclassrooms/star_wars tail -f /dev/null = maintient le conteneur en veille
sans se terminer 

---

docker-compose up -d = demarrer lensemble des conteneurs. -d pour les faire tourner en tache de front_dist_volume
docker-compose ps => affiche le retour ADD CONTENT
docker-compose stop
docker-compose down

docker-compose config => permet de valider la syntaxe du fichier

COPY ./requirements.txt /app/requirements.txt =>

À gauche (./requirements.txt) :fichier local que vous souhaitez copier. Le ./ indique qu'il se trouve dans le répertoire courant où le Dockerfile est situé.

À droite (/app/requirements.txt) : l emplacement où vous voulez que le fichier soit copié dans l'image Docker.

docker exec -it backend python manage.py makemigration = faire les migrations a partir du docker

good practice:

- error ! nginx Warning pull access denied for trans_server, repository does not exist => use the same version of the image in the dockerfile and in the docker-compose file. do not rename the image in the docker-compose file.

upload a file from the frontend to the backend with django ninja and javascript:

1. your frontend is sending a multipart/form-data request: To upload a file, you need to use multipart/form-data encoding. Ensure your fetch request is sending the file properly in the formData object:

TODO

Faire le bind mount sur sgoinfre

## Ruff

`ruff check <directory>` = lint the directory for any styling errors
`ruff check --fix <directory>` = fix style errors that can be fixed

`ruff format <directory>` = format the directory

`ruff format` is different from `ruff check --fix` because it only formats the code and does not fix any styling errors.

## ACT to test github actions

Configurer Act :

Crée un fichier .secrets à la racine de ton projet pour y définir les secrets utilisés dans ton workflow :

DB_NAME=mydatabase
DB_USER=myusername
DB_PASSWORD=mypassword
DATABASE_URL=postgresql://myusername:mypassword@localhost:5432/mydatabase

Assure-toi que ton fichier .env est présent dans le dossier server ou à la racine selon ta configuration.

Lancer le workflow :

workflow back:

act -j backend

workflow front:
act -j build -W ./github/workflows/front.yaml

-W permet de spécifier le chemin du fichier YAML du workflow à exécuter.

-j backend correspond au nom de ton job dans le fichier YAML (ici, backend).

## Formatter

Prettier : C'est un formatter qui s'assure que le code est formaté de manière cohérente (espaces, indentation, sauts de ligne, etc.). Il ne se soucie pas de la logique du code, mais uniquement de son apparence.
ESLint : C'est un linter qui analyse le code pour détecter les erreurs, les mauvaises pratiques, les incohérences, et appliquer des règles de style plus strictes (comme l'interdiction d'utiliser des variables non utilisées ou des fonctions mal nommées).

I everybody  ! 
yesterday I presentented my work on oauth2,  with 42api (requested) and github (which i decided to add)

Eldar will be changing the database a bit to create a new field for connection type (github, 42api, regular) and make the username no longer unique. (which is a bit of work because the username was unique, so some changes have to be done along). 

Eldar asked me to research if github api was providing refresh tokens (the 42 api does not provide any).

 in fact, github api offers 2 type of oauth2 flows : the traditionnal oauth one, and a github one, more complex, dedicated to complex CI. 

cf picture :  i have created a traditionnal oauth connection with github. in the traditionnal one it is no question of refresh token. 

# 2FA:
TOTP app = Time-based One-Time Password


vite prod:
rm -rf node_modules/.vite
npm run build



Meeting Report ( please comment if modification or additionnal comment needed)
- App name confirmed: Peacemakers : Ponggers edition
- Visual identity defined : Gold - Brown - Orange (day mode)
- Font confirmed: Texas Tango for stylized font + Crimson pro for regular
- On profile: Texas Tango on Wanted - title - star txt + maybe nickname
- Joke about Joe the uncatchable made by Eldar
- Next steps for the project defined

TODO for Celia
- mid-March: Confirm the colors for day-Mode + Confirm the colors for night-Mode (Blue - Purple - Pink?)
- March: Work on remote Player + tournament with Eldar
- April: Game customization + AI
- May: Drawings expected:
- Landing Page: a day background + a night background. (!) clouds will be passing on the picture as done momently.
- other drawings needed ( homepage, ...)
- Pistol + fire when click ( though I personnaly like the current firing)


TODO for Fanny
- Feb: install Redis
- End-March: Do online status
- April: Support on modules I have made + Docker Prod + presentation of the project

TODO for Melodie
- Mid-March: Define protocol with Yuko for live chat + learn Django channels and ORM
- April: do Live chat + notifications

Todo for Eldar:
- March: Work on remote Player + tournament with Celia
- Help everybody XD

Todo for Yuko:
- Mid march: change all fonts + app name
- Mid-March: define a protocol with Melodie for live chat
- March: create Figma design and confirm them with Celia. Ask Celia if some sketches are needed
   - Pages to create for info:
      - home page: was supposed to be 3js but will be more simple 
         -> Figma to be done
- April: finish front end components and pages
      - Dual menu
      - Dual (users list)
      - Dual (waiting)
      - Dual (match start)
      - Dual (match finished - winner)
      - Dual (match finished - loser)
      - Tournament subscribe
      - Waiting Room Tournament
      - Tournament Tree
      - Tournament (win)
      - Tournament (lose)
      - Tournament (champion)
      - Live Chat: UI exists, routes and components related to endpoints need to be implemented

Figjam to add pictures and inspiration: 
https://www.figma.com/board/DRobeokeHLoM8U8bvd96gA/ft_transcendence-Concept-%26-Style-Board?node-id=0-1&p=f&t=VSJFMxGMNQVQzelB-0

Figma:
https://www.figma.com/design/bIKKWAFQjcnPiEDc63jWa1/ft_transcendence?node-id=0-1&p=f&t=e49KbRQ10iVVR48b-0
