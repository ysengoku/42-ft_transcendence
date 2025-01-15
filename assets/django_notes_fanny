HTTPS Protocol:

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