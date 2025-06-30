#!/bin/bash

if [ ! -f .env ]; then
    echo "No .env detected!"
    exit 1
fi
HOST_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}');
if ! grep -qE "^HOST_IP=" .env; then
    printf "\n# IP Of the host machine\nHOST_IP=$HOST_IP" >> .env
    echo "Host IP $HOST_IP was added to the .env"
else
    sed -i -E "s/^HOST_IP=.*/HOST_IP=$HOST_IP/" .env
    echo "Host IP was updated in the .env with $HOST_IP"
fi

