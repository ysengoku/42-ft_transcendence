# Use official Nginx image as the base
FROM nginx:alpine

# Set environment variables for Nginx configuration path (optional)
ENV NGINX_CONF_PATH=/etc/nginx/nginx.conf

# Copy the custom nginx.conf into the container
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static files into the appropriate directory for Nginx
COPY ./dist /usr/share/nginx/html

# Expose port 1026
EXPOSE 1026

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
