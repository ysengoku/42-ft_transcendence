#!/bin/bash
PGPASSWORD=$POSTGRES_PASSWORD psql -h database -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1" > /dev/null
