#!/bin/bash

# Définir le chemin de l'application
APP_DIR="/volume1/homes/gregory/www/app-secotech"

# Se déplacer dans le répertoire de l'application
cd $APP_DIR

# Arrêter l'application
if [ -f "app.pid" ]; then
    PID=$(cat app.pid)
    if ps -p $PID > /dev/null; then
        echo "Arrêt de l'application..."
        kill $PID
        rm app.pid
        echo "Application arrêtée avec succès"
    else
        echo "L'application n'est pas en cours d'exécution"
        rm app.pid
    fi
else
    echo "Aucun PID trouvé, l'application n'est probablement pas en cours d'exécution"
fi 