#!/bin/bash

# Définir le chemin de l'application
APP_DIR="/volume1/homes/gregory/www/app-secotech"
NPM_PATH="/usr/local/bin/npm"

# Se déplacer dans le répertoire de l'application
cd $APP_DIR

# Vérifier si l'application est déjà en cours d'exécution
if [ -f "app.pid" ] && ps -p $(cat app.pid) > /dev/null; then
    echo "L'application est déjà en cours d'exécution"
    exit 0
fi

# Démarrer l'application en arrière-plan
echo "Démarrage de l'application..."
nohup $NPM_PATH run start > app.log 2>&1 &

# Sauvegarder le PID
echo $! > app.pid

echo "Application démarrée avec succès"
echo "Les logs sont disponibles dans app.log" 