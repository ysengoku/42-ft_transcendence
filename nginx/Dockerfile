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

# RUNTIME FOR DEVELOPMENT #
FROM base AS development
COPY ./nginx/nginx.dev.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g" ,"daemon off;"]

# BUILD FOR PRODUCTION #
FROM node:22-alpine AS build-frontend
WORKDIR /app

COPY ../front/app/package*.json ./
RUN npm install

COPY ../front/app/src ./src
COPY ../front/app/public ./public
COPY ../front/app/index.html ./
COPY ../front/app/vite.config.js ./
RUN npm run build

# RUNTIME FOR PRODUCTION #
FROM base AS production

COPY --from=build-frontend /app/dist /app/dist
COPY ./nginx/nginx.prod.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g" ,"daemon off;"]
