FROM node:20-alpine AS base

# Installation des dépendances système
RUN apk add --no-cache netcat-openbsd

# Répertoire de travail
WORKDIR /app

# Installation des dépendances
COPY package.json package-lock.json ./
RUN npm ci

# Copie des fichiers du projet
COPY . .

# Ajouter les permissions d'exécution au script d'initialisation
RUN chmod +x init-container.sh

# Génération du client Prisma
RUN npx prisma generate

# Build de l'application Next.js
RUN npm run build

# Démarrage de l'application
CMD ["npm", "start"]

# Expose le port 3000
EXPOSE 3000 