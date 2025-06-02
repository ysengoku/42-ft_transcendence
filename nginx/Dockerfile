FROM nginx:alpine

ARG NODE_ENV

# Install OpenSSL and generate certificates
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/transcendance.key \
    -out /etc/nginx/ssl/transcendance.crt \
    -subj "/C=FR/ST=RA/L=Lyon/O=42/OU=faboussa/CN=localhost" \
    && chmod 644 /etc/nginx/ssl/transcendance.crt \
    && chmod 644 /etc/nginx/ssl/transcendance.key

# COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.dev.conf /etc/nginx/nginx.dev.conf
COPY nginx.prod.conf /etc/nginx/nginx.prod.conf

RUN if [ "$NODE_ENV" = "production" ]; then \
      cp /etc/nginx/nginx.prod.conf /etc/nginx/nginx.conf; \
    else \
      cp /etc/nginx/nginx.dev.conf  /etc/nginx/nginx.conf; \
    fi

# Créer le répertoire pour les fichiers statiques
RUN mkdir -p /app/dist

EXPOSE 1026