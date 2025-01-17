#!/bin/bash
set -e
PGPASSWORD=$POSTGRES_PASSWORD psql -h database -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1" > /dev/null
if [ $? -ne 0 ]; then
  echo "Database is not healthy"
  exit 1
fi
echo "Database is healthy"
exit 0
