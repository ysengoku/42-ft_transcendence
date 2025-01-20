FROM node:18-alpine AS production

WORKDIR /app

COPY ./app/package*.json ./
RUN npm install
COPY ./app ./app

# Construire les fichiers statiques
RUN npm run build

# Stage de développement
FROM node:18-alpine AS development

WORKDIR /app

COPY ./app/package*.json ./
RUN npm install
COPY ./app ./app

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]