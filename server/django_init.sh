#!/bin/bash

python ./manage.py runworker matchmaking -v 3 &

exec "$@"
