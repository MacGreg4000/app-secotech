@echo off
setlocal enabledelayedexpansion

echo Création d'une sauvegarde de l'application AppSecotech avec tar...

:: Définir le nom du fichier de sauvegarde avec la date et l'heure
set TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=!TIMESTAMP: =0!
set BACKUP_NAME=AppSecotech_Backup_%TIMESTAMP%.tar

:: Créer le dossier de sauvegarde s'il n'existe pas
if not exist ".\backups" mkdir ".\backups"

echo Création de l'archive tar (cela peut prendre quelques instants)...

:: Utiliser la commande tar pour créer une archive
tar -cf .\backups\%BACKUP_NAME% --exclude="node_modules" --exclude=".next" --exclude="backups" .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Erreur lors de la création de l'archive.
    echo.
) else (
    echo.
    echo Sauvegarde terminée avec succès!
    echo Fichier de sauvegarde: .\backups\%BACKUP_NAME%
    echo.
    
    :: Afficher la taille du fichier de sauvegarde
    for %%I in (.\backups\%BACKUP_NAME%) do (
        set "size=%%~zI"
        if !size! GTR 0 (
            set /a "size_kb=!size!/1024"
            if !size_kb! LSS 1024 (
                echo Taille de la sauvegarde: !size_kb! Ko
            ) else (
                set /a "size_mb=!size_kb!/1024"
                echo Taille de la sauvegarde: !size_mb! Mo
            )
        ) else (
            echo Taille de la sauvegarde: 0 Ko
        )
    )
)

echo.
echo N'oubliez pas de copier ce fichier sur un support externe ou un service cloud pour plus de sécurité.
echo.

pause 