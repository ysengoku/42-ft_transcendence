# image contains the PostgreSQL database, no need to set it up like for inception

FROM postgres:16.0-bookworm

COPY healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

# Exposer le port 5432 pour PostgreSQL
EXPOSE 5432

# Configurer la vérification de l'état
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD ["healthcheck.sh"]