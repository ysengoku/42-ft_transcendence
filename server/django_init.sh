#!/bin/bash
exec "$@" &

python ./manage.py runworker matchmaking &

wait -n

exit $?
