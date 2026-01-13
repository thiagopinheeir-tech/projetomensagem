@echo off
setlocal enabledelayedexpansion

REM Script de build simplificado - cria um wrapper do Electron

echo Preparando aplicativo...

REM Copiar arquivo .env pro build
copy .env dist\app\ >nul 2>&1

REM Criar pasta dist/app se não existir
if not exist "dist\app" mkdir "dist\app"

REM Copiar arquivos importantes
xcopy /E /I /Y "frontend\dist" "dist\app\frontend\dist" >nul 2>&1
copy "electron-main.js" "dist\app\" >nul 2>&1
copy "preload.js" "dist\app\" >nul 2>&1
copy "launcher.js" "dist\app\" >nul 2>&1
copy "server.js" "dist\app\" >nul 2>&1
copy ".env" "dist\app\" >nul 2>&1

echo Build preparado!
