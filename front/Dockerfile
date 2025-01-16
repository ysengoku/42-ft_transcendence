# Utilisation de l'image officielle Node.js
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le package.json et le package-lock.json (si il existe)
COPY ./app/package.json ./app/package-lock.json* ./

# Installer les dépendances
RUN npm install

# Copier tout le reste de l'application dans le conteneur
COPY ./app /app

# Exposer le port de l'application front-end (port  par défaut pour un projet Vite)
EXPOSE 5173

# Lancer l'application en mode développement
CMD ["npm", "run", "dev"]
