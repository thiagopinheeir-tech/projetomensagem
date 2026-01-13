# 🚀 GUIA COMPLETO DE INSTALAÇÃO E DEPLOYMENT - TOP ACTIVE WHATSAPP 2.0

## 📋 PRÉ-REQUISITOS

- **Node.js** 18+ (https://nodejs.org/)
- **PostgreSQL** 14+ (https://www.postgresql.org/)
- **Redis** 7+ (https://redis.io/)
- **Docker** e **Docker Compose** (opcional, para containerização)
- **Git** para clonar o repositório

---

## 🏠 OPÇÃO 1: INSTALAÇÃO LOCAL (RECOMENDADO PARA DESENVOLVIMENTO)

### 1.1 Clonar e Preparar o Projeto

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/top-active-whatsapp.git
cd top-active-whatsapp

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```

### 1.2 Configurar Banco de Dados PostgreSQL

```bash
# No terminal PostgreSQL (psql)
CREATE DATABASE top_active_whatsapp;
CREATE USER top_active WITH PASSWORD 'sua_senha_segura';
ALTER ROLE top_active WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE top_active_whatsapp TO top_active;
```

Ou usando linha de comando:

```bash
createdb -U postgres top_active_whatsapp
psql -U postgres -d top_active_whatsapp -c "CREATE USER top_active WITH PASSWORD 'sua_senha_segura';"
psql -U postgres -d top_active_whatsapp -c "GRANT ALL PRIVILEGES ON DATABASE top_active_whatsapp TO top_active;"
```

### 1.3 Configurar arquivo .env

Editar `.env` com suas configurações:

```env
# Servidor
PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000

# Banco de dados
DATABASE_URL=postgresql://top_active:sua_senha_segura@localhost:5432/top_active_whatsapp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=top_active_whatsapp
DB_USER=top_active
DB_PASSWORD=sua_senha_segura

# JWT (gere uma chave segura)
JWT_SECRET=gere_uma_chave_aleatoria_segura_aqui_min_32_caracteres
JWT_EXPIRATION=7d

# WhatsApp Cloud API (Obter em https://developers.facebook.com)
WHATSAPP_API_URL=https://graph.instagram.com/v18.0
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id

# OpenAI (Obter em https://platform.openai.com)
OPENAI_API_KEY=sk-your_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS (URLs permitidas)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### 1.4 Inicializar Banco de Dados

```bash
npm run migrate
```

Isso criará todas as tabelas automaticamente.

### 1.5 Iniciar Servidor

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

Server deve estar rodando em `http://localhost:5000`

### 1.6 Testar API

```bash
# Verificar saúde
curl http://localhost:5000/health

# Registrar novo usuário
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "full_name": "Test User",
    "company_name": "Test Company"
  }'
```

---

## 🐳 OPÇÃO 2: DOCKER COMPOSE (RECOMENDADO PARA PRODUÇÃO)

### 2.1 Preparar Projeto

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/top-active-whatsapp.git
cd top-active-whatsapp

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com variáveis de produção
nano .env
```

### 2.2 Iniciar com Docker Compose

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f api

# Parar serviços
docker-compose down
```

Docker Compose irá:
- ✅ Criar banco PostgreSQL
- ✅ Criar cache Redis
- ✅ Iniciar API Node.js
- ✅ Criar PgAdmin para gerenciar BD

### 2.3 Acessar Serviços

```
API: http://localhost:5000
PgAdmin: http://localhost:5050
  - Email: admin@example.com
  - Senha: admin123
```

### 2.4 Verificar Saúde

```bash
# Health check
curl http://localhost:5000/health

# Ver logs
docker-compose logs api

# Parar e remover tudo
docker-compose down -v
```

---

## ☁️ OPÇÃO 3: DEPLOY EM PRODUÇÃO

### 3.1 Deploy em AWS EC2

```bash
# 1. Conectar ao servidor
ssh -i seu-chave.pem ubuntu@seu-ip-elastico

# 2. Instalar dependências
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib redis-server

# 3. Clonar projeto
git clone https://github.com/seu-usuario/top-active-whatsapp.git
cd top-active-whatsapp

# 4. Instalar dependências Node
npm install --production

# 5. Configurar .env com variáveis de produção
nano .env

# 6. Iniciar com PM2 (gerenciador de processos)
npm install -g pm2
pm2 start server.js --name "top-active-api"
pm2 startup
pm2 save

# 7. Configurar Nginx como reverse proxy
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/default
```

Nginx config:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 8. Configurar SSL com Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com

# 9. Reiniciar Nginx
sudo systemctl restart nginx
```

### 3.2 Deploy em Vercel (Serverless)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Fazer login
vercel login

# 3. Fazer deploy
vercel deploy

# Ou para produção
vercel deploy --prod
```

Criar `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret",
    "WHATSAPP_API_TOKEN": "@whatsapp_api_token",
    "OPENAI_API_KEY": "@openai_api_key"
  }
}
```

### 3.3 Deploy em Heroku

```bash
# 1. Instalar Heroku CLI
npm install -g heroku

# 2. Login
heroku login

# 3. Criar app
heroku create seu-app-name

# 4. Adicionar banco PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# 5. Configurar variáveis de ambiente
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=sua_chave_segura
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set WHATSAPP_API_TOKEN=...

# 6. Deploy
git push heroku main

# 7. Verificar logs
heroku logs --tail
```

---

## 🔧 CONFIGURAÇÃO AVANÇADA

### Integração WhatsApp Cloud API

1. Acessar https://developers.facebook.com
2. Criar aplicação Business
3. Configurar WhatsApp Business Account
4. Gerar access token
5. Adicionar ao `.env`:
```env
WHATSAPP_API_TOKEN=EAAxxxxx...
WHATSAPP_PHONE_ID=1234567890
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321
```

### Integração OpenAI

1. Acessar https://platform.openai.com
2. Criar API key
3. Configurar no `.env`:
```env
OPENAI_API_KEY=sk-proj-xxxxx...
OPENAI_MODEL=gpt-4
```

### Configurar Webhooks WhatsApp

Adicionar URL de webhook em configurações do app Facebook:
```
https://seu-dominio.com/api/webhooks/whatsapp
```

---

## 📊 MONITORAMENTO EM PRODUÇÃO

### PM2 Dashboard
```bash
# Instalar módulo de monitoramento
pm2 install pm2-auto-pull

# Ver status
pm2 status

# Monitor em tempo real
pm2 monitor
```

### Logs
```bash
# Ver logs em tempo real
tail -f logs/combined.log

# Limpar logs antigos
find logs -type f -mtime +30 -delete
```

### Backup PostgreSQL
```bash
# Fazer backup
pg_dump -U top_active top_active_whatsapp > backup.sql

# Restaurar
psql -U top_active top_active_whatsapp < backup.sql
```

---

## ✅ CHECKLIST DE SEGURANÇA

- [ ] JWT_SECRET configurado com valor seguro (min 32 caracteres)
- [ ] Database password seguro e único
- [ ] HTTPS/SSL ativado em produção
- [ ] CORS configurado apenas para domínios permitidos
- [ ] Rate limiting ativado
- [ ] Helmet.js para security headers
- [ ] Senhas de usuários com bcrypt
- [ ] Variáveis sensíveis em .env (não em git)
- [ ] Backups automáticos do banco
- [ ] Logs centralizados
- [ ] Monitoramento ativo
- [ ] Atualizações de segurança aplicadas

---

## 🆘 TROUBLESHOOTING

### Erro: "ECONNREFUSED 127.0.0.1:5432"
```bash
# PostgreSQL não está rodando
sudo service postgresql restart
# ou com Docker
docker-compose restart postgres
```

### Erro: "ECONNREFUSED 127.0.0.1:6379"
```bash
# Redis não está rodando
redis-server
# ou com Docker
docker-compose restart redis
```

### Erro: "JWT_SECRET not configured"
```bash
# Gerar chave segura
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Adicionar ao .env
```

### Database conexão recusada
```bash
# Verificar credenciais em .env
# Verificar se PostgreSQL está rodando
psql -U postgres -c "SELECT 1"
```

### Porta 5000 já em uso
```bash
# Mudar porta em .env
PORT=5001

# Ou matar processo usando porta
lsof -i :5000
kill -9 <PID>
```

---

## 📱 PRÓXIMOS PASSOS

1. ✅ **Backend API** → COMPLETO
2. 🔄 **Frontend Integration** → Conectar React ao backend
3. 🔗 **WhatsApp Integration** → Integrar API oficial
4. 🤖 **IA Implementation** → Completar chatbots GPT
5. 📊 **Analytics Dashboard** → Gráficos e relatórios
6. 💳 **Payment Integration** → Stripe/Asaas
7. 📧 **Email Service** → SendGrid/AWS SES
8. 🔔 **Notifications** → Push notifications
9. 📈 **Scaling** → Load balancing e cache
10. 🚀 **Production Release** → Launch!

---

## 📞 SUPORTE

- Documentação: https://seu-dominio.com/docs
- Issues: https://github.com/seu-usuario/top-active-whatsapp/issues
- Discord: https://discord.gg/seu-servidor

---

**Top Active WhatsApp 2.0 - Ready to Scale! 🚀**
