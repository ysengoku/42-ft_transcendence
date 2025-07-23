FROM nginx:alpine AS base
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/transcendance.key \
    -out /etc/nginx/ssl/transcendance.crt \
    -subj "/C=FR/ST=RA/L=Lyon/O=42/OU=faboussa/CN=localhost" \
    && chmod 644 /etc/nginx/ssl/transcendance.crt \
    && chmod 644 /etc/nginx/ssl/transcendance.key

RUN mkdir -p /app/dist

EXPOSE 1026

FROM base AS developement
COPY nginx.dev.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g" ,"daemon off;"]

FROM base AS production
COPY nginx.prod.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g" ,"daemon off;"]
