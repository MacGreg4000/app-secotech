# Déploiement d'Appsecotech sur NAS Synology

Ce guide explique comment déployer l'application Appsecotech sur un NAS Synology à l'aide de Docker.

## Prérequis

1. Un NAS Synology avec Docker installé
2. Accès SSH au NAS (activé via Panneau de configuration > Terminal & SNMP)
3. Git installé sur le NAS (installable via le Centre de paquets)

## Étapes de déploiement

### 1. Cloner le dépôt sur votre NAS

Connectez-vous à votre NAS via SSH et clonez le dépôt :

```bash
ssh admin@ip_du_nas
cd /volume1/docker
git clone https://github.com/psychogenelive/app-secotech.git
cd app-secotech
```

### 2. Configurer les variables d'environnement

Modifiez le fichier `.env.docker` pour définir vos propres variables d'environnement :

```bash
nano .env.docker
```

Modifiez les valeurs suivantes :
- `MYSQL_PASSWORD` : mot de passe pour l'utilisateur MySQL
- `MYSQL_ROOT_PASSWORD` : mot de passe pour l'utilisateur root MySQL
- `NEXTAUTH_URL` : URL d'accès à l'application (exemple : http://192.168.1.100:3000)
- `NEXTAUTH_SECRET` : une chaîne aléatoire pour sécuriser l'authentification

### 3. Déployer l'application avec Docker Compose

```bash
# Copier le fichier .env.docker vers .env pour Docker Compose
cp .env.docker .env

# Lancer les conteneurs
docker-compose up -d
```

### 4. Initialiser la base de données

La première fois, vous devez initialiser la base de données et créer un utilisateur administrateur :

```bash
# Méthode recommandée : utiliser le service d'initialisation
docker-compose run --rm init

# OU, alternativement, exécuter le script manuellement dans le conteneur principal
# docker exec -it appsecotech sh -c "./init-container.sh"
```

### 5. Accéder à l'application

Ouvrez votre navigateur et accédez à l'URL définie dans `NEXTAUTH_URL` (par exemple : http://192.168.1.100:3000)

Connectez-vous avec les identifiants administrateur par défaut :
- Email : admin@appsecotech.com
- Mot de passe : Admin123!

**Important** : Changez ce mot de passe immédiatement après votre première connexion.

## Utilisation de l'interface Docker de Synology

Si vous préférez utiliser l'interface graphique de Synology plutôt que la ligne de commande :

1. Ouvrez DSM (Synology DiskStation Manager)
2. Allez dans le Centre de paquets et assurez-vous que Docker est installé
3. Ouvrez l'application Docker
4. Allez dans "Registre" et recherchez "mysql"
5. Téléchargez l'image MySQL 8.0
6. Allez dans "Image" et créez un conteneur à partir de l'image MySQL
7. Configurez le conteneur MySQL selon les paramètres de `.env.docker`
8. Construisez l'image Appsecotech en utilisant le Dockerfile
9. Créez un conteneur à partir de l'image Appsecotech
10. Connectez les deux conteneurs au même réseau

## Sauvegarde et restauration

### Sauvegarde de la base de données

```bash
docker exec appsecotech-mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" appsecotech' > backup_$(date +%Y%m%d).sql
```

### Restauration de la base de données

```bash
cat backup_20250101.sql | docker exec -i appsecotech-mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" appsecotech'
```

## Mise à jour de l'application

Pour mettre à jour l'application avec les dernières modifications du dépôt :

```bash
cd /volume1/docker/app-secotech
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Résolution des problèmes

### L'application ne démarre pas

Vérifiez les logs :

```bash
docker logs appsecotech
```

### Problèmes de base de données

Vérifiez les logs de la base de données :

```bash
docker logs appsecotech-mysql
```

### Réinitialisation

Si vous avez besoin de tout réinitialiser :

```bash
docker-compose down -v
docker-compose up -d
docker-compose run --rm init
``` 