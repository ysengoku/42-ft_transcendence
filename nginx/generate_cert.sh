#!/bin/bash

# Create ssl directory if it doesn't exist
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/transcendance.key 2048

# Generate CSR (Certificate Signing Request)
openssl req -new -key ssl/transcendance.key -out ssl/transcendance.csr \
    -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=Transcendence/CN=nginx"

# Generate self-signed certificate valid for 365 days
openssl x509 -req -days 365 -in ssl/transcendance.csr \
    -signkey ssl/transcendance.key -out ssl/transcendance.crt

# Create PEM format certificate (needed for Python)
cat ssl/transcendance.crt ssl/transcendance.key > ssl/transcendance.pem

# Set appropriate permissions
chmod 644 ssl/transcendance.key ssl/transcendance.crt ssl/transcendance.pem 