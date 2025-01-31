
## Docker commands:

docker volume rm $(docker volume ls -q) = remove all the volumes
docker system prune -a = remove all the images, containers, networks and volumes
docker rmi $(docker images -q) = remove all the images

docker exec -it backend python manage.py makemigrations = fmake migrations
docker exec -it backend python manage.py migrate
good practice:

- error ! nginx Warning pull access denied for trans_server, repository does not exist => use the same version of the image in the dockerfile and in the docker-compose file. do not rename the image in the docker-compose file.
- ERROR: for database  Cannot create container for service database: Conflict. => use docker rmi $(docker images -q)