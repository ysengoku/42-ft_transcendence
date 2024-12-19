# Utiliser l'image officielle PostgreSQL
FROM postgres:15

# Copier les scripts d'initialisation (si nécessaire)
COPY ./database/init.sql /docker-entrypoint-initdb.d/

# Exposer le port 5432 pour PostgreSQL
EXPOSE 5432
