#!/bin/bash

python manage.py reset_connection_counters

exec "$@"
