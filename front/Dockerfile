FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY ./app/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY ./app ./app

# Build the application first
RUN npm run build

EXPOSE 5173

# Use a shell form to run both the build and dev server
CMD npm run build && npm run dev -- --host 0.0.0.0