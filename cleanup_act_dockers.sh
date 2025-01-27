#!/bin/bash

# Lister tous les conteneurs avec "act" dans leur nom et les supprimer
docker ps -a --filter "name=act" -q | while read container_id; do
  if [ -n "$container_id" ]; then
    echo "Stopping and removing container: $container_id"
    docker stop $container_id
    docker rm $container_id
  fi
done

echo "Cleanup of 'act' containers completed."

