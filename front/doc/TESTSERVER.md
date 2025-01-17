1. Install Python if it's not installed
2. Insert command `python3 -m venv .venv`. This command creates virtual Python environment for the packages.
3. do `. .venv/bin/activate`
4. `pip install -r requirements.txt`
5. go the server directory and run `./manage.py makemigrations && ./manage.py migrate`
6. Create an admin `./manage.py createsuperuser`
7.  `./manage.py runserver`. Server should run on localhost:8000

Add dummy data as admin
GO to `localhost:8000/admin`

Activate
`source .venv/bin/activate`

Desactivate .venv
`desactivate`