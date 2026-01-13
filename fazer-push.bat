@echo off
echo ========================================
echo   Fazendo Commit e Push do Codigo
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Verificando se Git esta instalado...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Git nao encontrado no PATH!
    echo.
    echo Por favor, use o GitHub Desktop:
    echo 1. Abra GitHub Desktop
    echo 2. Verifique se aparece services/whatsapp.js modificado
    echo 3. Commit e Push
    pause
    exit /b 1
)

echo [2/5] Verificando se e um repositorio Git...
git rev-parse --git-dir >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: Nao e um repositorio Git!
    echo.
    echo O repositorio Git pode estar em outro lugar.
    echo.
    echo SOLUCAO: Use o GitHub Desktop:
    echo 1. Abra GitHub Desktop
    echo 2. Selecione o repositorio: thiagopinheeir-tech/projetomensagem
    echo 3. Verifique se aparece services/whatsapp.js modificado
    echo 4. Commit e Push
    echo.
    pause
    exit /b 1
)

echo [3/5] Verificando status do repositorio...
git status --short >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO ao verificar status do repositorio!
    pause
    exit /b 1
)

echo [4/5] Adicionando arquivo modificado...
git add services/whatsapp.js
if %errorlevel% neq 0 (
    echo ERRO ao adicionar arquivo!
    pause
    exit /b 1
)

echo [5/6] Fazendo commit...
git commit -m "Fix: Prevent WhatsApp auto-initialization without userId"
if %errorlevel% neq 0 (
    echo AVISO: Nenhuma mudanca para commitar ou commit ja foi feito.
)

echo [6/6] Fazendo push para GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo AVISO: Push falhou. Verifique:
    echo - Se esta conectado ao GitHub
    echo - Se tem permissoes
    echo - Se o branch esta correto (main)
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCESSO! Push realizado!
echo ========================================
echo.
echo Aguarde 1-2 minutos e verifique no Railway.
pause
