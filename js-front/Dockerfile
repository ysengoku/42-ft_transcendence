# Use a Node.js image for the frontend
FROM node:16-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY ./front/package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && npm install

# Install Bootstrap
RUN npm install bootstrap

# Copy the rest of the frontend files into the container
COPY ./front .

# Expose port 80 for the frontend
EXPOSE 80

# Command to start the frontend (you can adjust this depending on your setup)
CMD ["npm", "start"]
