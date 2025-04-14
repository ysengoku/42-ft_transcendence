#!/bin/bash

# Reset connection counters
python manage.py reset_connection_counters

# Start the server
exec "$@"
