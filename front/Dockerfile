# Utiliser une image de base Node.js pour le frontend
FROM node:16-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier package.json et package-lock.json (si présent)
COPY package*.json ./

# Nettoyer le cache npm et installer les dépendances
RUN npm cache clean --force && npm install

# Installer Bootstrap
RUN npm install bootstrap

# Copier le reste des fichiers du frontend dans le conteneur
COPY . .

# Exposer le port 1025 pour le frontend
EXPOSE 1025

# Commande pour démarrer le frontend
CMD ["npm", "start"]
