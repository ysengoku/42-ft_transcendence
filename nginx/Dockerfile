# Use official Nginx image as the base
FROM nginx:alpine

# Copy the custom nginx.conf into the container
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static files into the appropriate directory for Nginx
COPY ./ /usr/share/nginx/html

# Expose port 1026
EXPOSE 1026

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]



