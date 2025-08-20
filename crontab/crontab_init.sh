#!/bin/bash

echo "Creating environment..."
printenv > /etc/environment
echo "Environment was created successefully!"
exec "$@"
