#!/bin/sh

# Attendre que la base de données soit prête
echo "🔄 Attente de la connexion à la base de données..."
while ! nc -z db 3306; do
  sleep 1
done
echo "✅ Base de données connectée !"

# Exécuter les migrations
echo "🔄 Exécution des migrations Prisma..."
npx prisma migrate deploy
echo "✅ Migrations terminées !"

# Initialiser les données d'administration
echo "🔄 Création de l'utilisateur administrateur..."
npm run create-admin
echo "✅ Utilisateur administrateur créé !"

# Alimentation des tâches administratives
echo "🔄 Initialisation des tâches administratives..."
npm run seed:admin-tasks
echo "✅ Tâches administratives initialisées !"

echo "🚀 Initialisation terminée - L'application est prête !"
exit 0 