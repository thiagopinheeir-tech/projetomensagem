@echo off
setlocal enabledelayedexpansion

cls
color 0A
echo.
echo ========================================================
echo   JT DEV NOCODE 2.0 - Desktop App
echo   Inicializacao Completa (DB + Templates + App)
echo ========================================================
echo.

cd /d "%~dp0"

REM ========================================================
REM [1/10] Verificar Node.js
REM ========================================================
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Node.js nao encontrado!
    echo        Instale Node.js a partir de https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

REM ========================================================
REM [2/10] Verificar/criar arquivo .env e ENCRYPTION_KEY
REM ========================================================
if not exist ".env" (
    echo [INFO] Arquivo .env nao encontrado. Criando a partir do env.example...
    if exist "env.example" (
        copy /Y env.example .env >nul
        echo [OK] Arquivo .env criado! Configure suas variaveis de ambiente.
    ) else (
        echo [AVISO] env.example nao encontrado. Continuando sem .env...
    )
) else (
    echo [OK] Arquivo .env encontrado
)

REM Verificar ENCRYPTION_KEY
findstr /C:"ENCRYPTION_KEY" .env >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] ENCRYPTION_KEY nao encontrada no .env
    echo         Gerando chave automaticamente...
    node -e "const crypto=require('crypto');const fs=require('fs');const key=crypto.randomBytes(32).toString('hex');fs.appendFileSync('.env','\nENCRYPTION_KEY='+key+'\n');console.log('ENCRYPTION_KEY gerada e adicionada ao .env')"
    if %errorlevel% equ 0 (
        echo [OK] ENCRYPTION_KEY gerada e adicionada ao .env
    ) else (
        echo [AVISO] Nao foi possivel gerar ENCRYPTION_KEY automaticamente
        echo         Adicione manualmente: ENCRYPTION_KEY=chave_hex_64_caracteres
    )
) else (
    echo [OK] ENCRYPTION_KEY encontrada no .env
)

REM ========================================================
REM [3/10] Verificar Docker (opcional)
REM ========================================================
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Docker nao encontrado - usando banco externo ou local
    echo         Para usar Docker: https://www.docker.com/products/docker-desktop
    set DOCKER_AVAILABLE=0
) else (
    echo [OK] Docker encontrado
    set DOCKER_AVAILABLE=1
)

REM ========================================================
REM [4/10] Iniciar banco de dados (Docker)
REM ========================================================
if %DOCKER_AVAILABLE%==1 (
    echo [INFO] Iniciando PostgreSQL com Docker...
    call npm run db:up
    if %errorlevel% neq 0 (
        echo [AVISO] Erro ao iniciar Docker. Continuando...
    ) else (
        echo [OK] Banco de dados iniciado
        timeout /t 3 /nobreak >nul
    )
) else (
    echo [PULADO] Docker nao disponivel - pulando inicializacao do banco
)

REM ========================================================
REM [5/10] Inicializar schema do banco de dados
REM ========================================================
echo [INFO] Criando tabelas e estrutura do banco...
call npm run db:init
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao inicializar schema. Continuando...
) else (
    echo [OK] Schema do banco inicializado
)

REM ========================================================
REM [6/10] Executar migração multi-tenant
REM ========================================================
echo [INFO] Executando migração multi-tenant...
node scripts/run-migration.js
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao executar migração. Verifique os logs acima.
    echo         Continuando... (pode ser que a migração já tenha sido executada)
) else (
    echo [OK] Migração multi-tenant executada
)

REM ========================================================
REM [7/10] Popular templates do chatbot
REM ========================================================
echo [INFO] Carregando templates de negocios (barbearia, manicure, etc)...
call npm run chatbot:seed-templates
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao carregar templates. Continuando...
) else (
    echo [OK] Templates do chatbot carregados
)

REM ========================================================
REM [8/10] Verificar/instalar dependencias
REM ========================================================
if not exist "node_modules" (
    echo [INFO] node_modules nao encontrado. Instalando dependencias do backend...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Erro ao instalar dependencias do backend!
        pause
        exit /b 1
    )
    echo [OK] Dependencias do backend instaladas
) else (
    echo [OK] Dependencias do backend encontradas
)

if not exist "frontend\node_modules" (
    echo [INFO] Instalando dependencias do frontend...
    cd frontend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [AVISO] Erro ao instalar dependencias do frontend. Continuando...
    ) else (
        echo [OK] Dependencias do frontend instaladas
    )
) else (
    echo [OK] Dependencias do frontend encontradas
)

REM ========================================================
REM [9/10] Iniciar Backend (Node.js)
REM ========================================================
echo [INFO] Iniciando servidor backend na porta 5000...
echo        Aguarde alguns segundos...

REM Iniciar backend em uma janela separada
start "JT DEV NOCODE - Backend" cmd /k "node launcher.js"

REM Aguardar backend iniciar
timeout /t 5 /nobreak >nul

echo [OK] Backend iniciado (porta 5000)
echo.

REM ========================================================
REM [10/10] Iniciar aplicacao Desktop (Electron)
REM ========================================================
echo [INFO] Iniciando JT DEV NOCODE Desktop...
echo        Aguarde alguns segundos...
echo.

REM Verificar se Electron esta instalado
call npm list electron >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Electron nao encontrado. Instalando...
    call npm install electron --save-dev
)

REM Iniciar Electron
call npm run electron

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] A aplicacao fechou com erro.
    echo.
    echo Problemas comuns:
    echo - Verifique se o PostgreSQL esta rodando (docker-compose up -d)
    echo - Verifique se as variaveis de ambiente estao configuradas (.env)
    echo - Verifique se o backend esta rodando na porta 5000
    echo - Verifique os logs acima para mais detalhes
    echo.
    pause
)