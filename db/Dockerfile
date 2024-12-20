
# image contains the PostgreSQL database, no need to set it up like for inception

FROM postgres:16.0-bookworm

COPY healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

# Exposer le port 5432 pour PostgreSQL
EXPOSE 5432
