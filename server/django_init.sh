#!/bin/bash

set -e

echo "Running server in $NODE_ENV mode."

python manage.py reset_connection_counters

python manage.py makemigrations --noinput && python manage.py migrate --noinput

exec "$@" &

if [ "$NODE_ENV" = "production" ]; then
    python manage.py runworker game &
    python manage.py runworker tournament &
    echo "Workers were successefully launched!"
fi

wait -n

exit $?
