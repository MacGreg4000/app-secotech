@echo off
title Configuration MySQL pour AppSecotech
color 0A
cls

echo ===================================================
echo Configuration MySQL pour AppSecotech - Solution Unique
echo ===================================================
echo.
echo IMPORTANT: Cette fenetre ne doit pas etre fermee pendant la configuration.
echo Si vous rencontrez des problemes, appuyez sur une touche pour continuer.
echo.
pause

:MENU_PRINCIPAL
cls
echo ===================================================
echo MENU PRINCIPAL
echo ===================================================
echo.
echo 1. Trouver l'installation MySQL
echo 2. Creer la base de donnees
echo 3. Configurer le fichier .env.local
echo 4. Installer les dependances et configurer Prisma
echo 5. Quitter
echo.
set /p CHOIX=Votre choix (1-5): 

if "%CHOIX%"=="1" goto TROUVER_MYSQL
if "%CHOIX%"=="2" goto CREER_BDD
if "%CHOIX%"=="3" goto CONFIGURER_ENV
if "%CHOIX%"=="4" goto INSTALLER_DEPS
if "%CHOIX%"=="5" goto FIN

echo Choix invalide. Veuillez reessayer.
pause
goto MENU_PRINCIPAL

:TROUVER_MYSQL
cls
echo ===================================================
echo RECHERCHE DE L'INSTALLATION MYSQL
echo ===================================================
echo.

set MYSQL_TROUVE=0

echo Verification des chemins d'installation standard...
echo.

if exist "C:\Program Files\MySQL" (
  echo [TROUVE] C:\Program Files\MySQL
  dir /b "C:\Program Files\MySQL"
  set MYSQL_TROUVE=1
) else (
  echo [NON TROUVE] C:\Program Files\MySQL
)

echo.
echo Appuyez sur une touche pour continuer la recherche...
pause

if exist "C:\Program Files (x86)\MySQL" (
  echo [TROUVE] C:\Program Files (x86)\MySQL
  dir /b "C:\Program Files (x86)\MySQL"
  set MYSQL_TROUVE=1
) else (
  echo [NON TROUVE] C:\Program Files (x86)\MySQL
)

echo.
echo Verification des chemins specifiques...
echo.
echo Appuyez sur une touche pour continuer...
pause

set MYSQL_92_PATH="C:\Program Files\MySQL\MySQL Server 9.2\bin\mysql.exe"
if exist %MYSQL_92_PATH% (
  echo [TROUVE] %MYSQL_92_PATH%
  set MYSQL_TROUVE=1
  set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 9.2\bin"
) else (
  echo [NON TROUVE] %MYSQL_92_PATH%
)

echo.
echo Appuyez sur une touche pour continuer la recherche...
pause

set MYSQL_80_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if exist %MYSQL_80_PATH% (
  echo [TROUVE] %MYSQL_80_PATH%
  set MYSQL_TROUVE=1
  if not defined MYSQL_PATH set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin"
) else (
  echo [NON TROUVE] %MYSQL_80_PATH%
)

echo.
if %MYSQL_TROUVE%==1 (
  echo MySQL a ete trouve sur votre systeme!
  if defined MYSQL_PATH (
    echo Chemin detecte: %MYSQL_PATH%
    echo.
    echo Voulez-vous utiliser ce chemin? (O/N)
    set /p UTILISER_CHEMIN=
    if /i "%UTILISER_CHEMIN%"=="O" goto MENU_PRINCIPAL
  )
) else (
  echo MySQL n'a pas ete trouve automatiquement.
)

echo.
echo Veuillez entrer manuellement le chemin complet vers le dossier bin de MySQL
echo (par exemple: C:\Program Files\MySQL\MySQL Server 9.2\bin)
echo.
set /p MYSQL_PATH=Chemin vers le dossier bin de MySQL: 

set MYSQL_EXE="%MYSQL_PATH%\mysql.exe"
if not exist %MYSQL_EXE% (
  echo.
  echo ERREUR: mysql.exe n'a pas ete trouve dans le dossier specifie.
  echo Veuillez verifier le chemin et reessayer.
  echo.
  pause
  goto TROUVER_MYSQL
)

echo.
echo MySQL trouve a: %MYSQL_EXE%
echo Ce chemin sera utilise pour les operations suivantes.
echo.
pause
goto MENU_PRINCIPAL

:CREER_BDD
cls
echo ===================================================
echo CREATION DE LA BASE DE DONNEES
echo ===================================================
echo.

if not defined MYSQL_PATH (
  echo Erreur: Chemin MySQL non defini.
  echo Veuillez d'abord trouver l'installation MySQL (option 1).
  echo.
  pause
  goto MENU_PRINCIPAL
)

echo Creation de la base de donnees appsecotech...
echo.
set /p MYSQL_ROOT_PASSWORD=Entrez le mot de passe root MySQL: 

echo CREATE DATABASE IF NOT EXISTS appsecotech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; > temp-create-db.sql

echo Execution de la commande SQL...
%MYSQL_PATH%\mysql.exe -u root -p%MYSQL_ROOT_PASSWORD% < temp-create-db.sql

if %errorlevel% equ 0 (
  echo.
  echo Base de donnees appsecotech creee avec succes!
  set BDD_CREEE=1
) else (
  echo.
  echo Erreur lors de la creation de la base de donnees.
  echo Verifiez que le mot de passe est correct et que MySQL est en cours d'execution.
  set BDD_CREEE=0
)

del temp-create-db.sql

echo.
pause
goto MENU_PRINCIPAL

:CONFIGURER_ENV
cls
echo ===================================================
echo CONFIGURATION DU FICHIER .ENV.LOCAL
echo ===================================================
echo.

if not defined MYSQL_PATH (
  echo Erreur: Chemin MySQL non defini.
  echo Veuillez d'abord trouver l'installation MySQL (option 1).
  echo.
  pause
  goto MENU_PRINCIPAL
)

if not defined MYSQL_ROOT_PASSWORD (
  echo Mot de passe MySQL non defini.
  set /p MYSQL_ROOT_PASSWORD=Entrez le mot de passe root MySQL: 
)

echo Creation/mise a jour du fichier .env.local...
echo.

echo # Base de donnees > .env.local
echo DATABASE_URL="mysql://root:%MYSQL_ROOT_PASSWORD%@localhost:3306/appsecotech" >> .env.local
echo. >> .env.local
echo # NextAuth >> .env.local
echo NEXTAUTH_URL="http://localhost:3000" >> .env.local
echo NEXTAUTH_SECRET="un_secret_tres_securise_pour_nextauth_123456789" >> .env.local
echo. >> .env.local
echo # Autres variables >> .env.local
echo NODE_ENV="development" >> .env.local

echo.
echo Fichier .env.local cree/mis a jour avec succes!
echo.
pause
goto MENU_PRINCIPAL

:INSTALLER_DEPS
cls
echo ===================================================
echo INSTALLATION DES DEPENDANCES ET CONFIGURATION PRISMA
echo ===================================================
echo.

echo Cette etape va:
echo 1. Installer les dependances npm
echo 2. Generer le client Prisma
echo 3. Appliquer les migrations Prisma
echo 4. Creer un utilisateur administrateur
echo.
echo Voulez-vous continuer? (O/N)
set /p CONTINUER_INSTALL=

if /i not "%CONTINUER_INSTALL%"=="O" goto MENU_PRINCIPAL

echo.
echo Installation des dependances...
call npm install
call npm install bcryptjs --save
call npm install @types/bcryptjs --save-dev

echo.
echo Generation du client Prisma...
call npx prisma generate

echo.
echo Application des migrations...
call npx prisma migrate dev --name init

echo.
echo Creation d'un utilisateur administrateur...
echo const { PrismaClient } = require('@prisma/client'); > temp-create-admin.js
echo const bcrypt = require('bcryptjs'); >> temp-create-admin.js
echo. >> temp-create-admin.js
echo const prisma = new PrismaClient(); >> temp-create-admin.js
echo. >> temp-create-admin.js
echo async function main() { >> temp-create-admin.js
echo   try { >> temp-create-admin.js
echo     const hashedPassword = await bcrypt.hash('Admin123!', 10); >> temp-create-admin.js
echo     const admin = await prisma.user.upsert({ >> temp-create-admin.js
echo       where: { email: 'admin@example.com' }, >> temp-create-admin.js
echo       update: {}, >> temp-create-admin.js
echo       create: { >> temp-create-admin.js
echo         email: 'admin@example.com', >> temp-create-admin.js
echo         name: 'Administrateur', >> temp-create-admin.js
echo         password: hashedPassword, >> temp-create-admin.js
echo         role: 'ADMIN' >> temp-create-admin.js
echo       } >> temp-create-admin.js
echo     }); >> temp-create-admin.js
echo     console.log('Utilisateur administrateur cree:', admin); >> temp-create-admin.js
echo   } catch (error) { >> temp-create-admin.js
echo     console.error('Erreur:', error); >> temp-create-admin.js
echo   } finally { >> temp-create-admin.js
echo     await prisma.$disconnect(); >> temp-create-admin.js
echo   } >> temp-create-admin.js
echo } >> temp-create-admin.js
echo. >> temp-create-admin.js
echo main(); >> temp-create-admin.js

echo Execution du script...
node temp-create-admin.js

echo Suppression du fichier temporaire...
del temp-create-admin.js

echo.
echo Installation et configuration terminees!
echo.
pause
goto MENU_PRINCIPAL

:FIN
cls
echo ===================================================
echo CONFIGURATION TERMINEE
echo ===================================================
echo.
echo Recapitulatif:
echo.
if defined MYSQL_PATH echo - MySQL trouve a: %MYSQL_PATH%
if defined BDD_CREEE (
  if %BDD_CREEE%==1 (
    echo - Base de donnees appsecotech creee avec succes
  ) else (
    echo - Erreur lors de la creation de la base de donnees
  )
)
echo.
echo Vous pouvez maintenant demarrer l'application avec:
echo npm run dev
echo.
echo Identifiants de connexion:
echo Email: admin@example.com
echo Mot de passe: Admin123!
echo.
echo Voulez-vous demarrer l'application maintenant? (O/N)
set /p DEMARRER_APP=

if /i "%DEMARRER_APP%"=="O" (
  echo Demarrage de l'application...
  call npm run dev
) else (
  echo Au revoir!
  echo.
  echo Appuyez sur une touche pour quitter...
  pause
)

exit /b 