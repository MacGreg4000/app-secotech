@echo off
setlocal

:MENU
cls
echo ===================================================
echo             MENU PRINCIPAL APPSECOTECH
echo ===================================================
echo.
echo  1. Créer une sauvegarde du code source (backup-app-tar.bat)
echo.
echo  0. Quitter
echo.
echo ===================================================
echo.

set /p CHOIX="Entrez votre choix (0-1): "

if "%CHOIX%"=="1" cmd /k backup-app-tar.bat
if "%CHOIX%"=="0" exit

goto MENU