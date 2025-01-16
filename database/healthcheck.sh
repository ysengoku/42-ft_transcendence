#!/bin/bash

# Vérifier si PostgreSQL est en cours d'exécution
pg_isready -U $POSTGRES_USER -d $POSTGRES_DB -h $DATABASE_HOST -p $DATABASE_PORT