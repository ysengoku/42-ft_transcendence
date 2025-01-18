FROM nginx:alpine

# Install OpenSSL, create SSL directory, and generate certificates
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/transcendance.key \
    -out /etc/nginx/ssl/transcendance.crt \
    -subj "/C=FR/ST=RA/L=Lyon/O=42/OU=faboussa/CN=localhost" \
    && chmod 644 /etc/nginx/ssl/transcendance.crt \
    && chmod 644 /etc/nginx/ssl/transcendance.key

# Copy the custom nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 1026

CMD ["nginx", "-g", "daemon off;"]