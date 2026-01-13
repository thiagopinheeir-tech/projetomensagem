@echo off
echo ========================================
echo   PUSH AUTOMATICO - WhatsApp Fix
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando arquivo...
if not exist "services\whatsapp.js" (
    echo ERRO: Arquivo whatsapp.js nao encontrado!
    pause
    exit /b 1
)

echo [2/3] Verificando se tem a correcao...
findstr /C:"NÃO inicializar automaticamente sem userId" "services\whatsapp.js" >nul
if %errorlevel% neq 0 (
    echo ERRO: Correcao nao encontrada no arquivo!
    echo O arquivo precisa ter a verificacao de userId.
    pause
    exit /b 1
)

echo [3/3] Arquivo esta correto! Agora faca o push:
echo.
echo ========================================
echo   INSTRUCOES PARA PUSH:
echo ========================================
echo.
echo 1. Abra GitHub Desktop
echo 2. Selecione o repositorio: projetomensagem
echo 3. Verifique se aparece services/whatsapp.js modificado
echo 4. Mensagem: Fix: Prevent WhatsApp auto-initialization without userId
echo 5. Commit to main
echo 6. Push origin
echo.
echo OU use VS Code:
echo 1. Pressione Ctrl+Shift+G
echo 2. Clique no + ao lado de whatsapp.js
echo 3. Mensagem: Fix: Prevent WhatsApp auto-initialization without userId
echo 4. Commit (checkmark)
echo 5. Push (seta para cima)
echo.
pause
