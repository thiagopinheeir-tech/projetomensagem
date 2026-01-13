# Arquitetura Multi-User - Acesso Remoto

## 📋 Visão Geral

O sistema **já está preparado** para múltiplos usuários acessarem remotamente (sem estar na mesma rede) e cada um vincular:
- ✅ Seu próprio **WhatsApp**
- ✅ Seu próprio **Google Calendar**
- ✅ Suas próprias **credenciais de API** (OpenAI)

## 🏗️ Arquitetura Atual

### 1. **Multi-Tenancy (Isolamento por Usuário)**

O sistema utiliza isolamento por `user_id`:

```
┌─────────────────────────────────────────┐
│         Backend (Servidor Único)        │
│  Porta 5000 (API) / 5001 (WebSocket)   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌─────────────┐     │
│  │  User 1     │  │  User 2     │     │
│  │  - WhatsApp │  │  - WhatsApp │     │
│  │  - Google   │  │  - Google   │     │
│  │  - OpenAI   │  │  - OpenAI   │     │
│  └─────────────┘  └─────────────┘     │
│                                         │
│  Banco de Dados (PostgreSQL/Supabase)  │
│  - Dados isolados por user_id          │
└─────────────────────────────────────────┘
         ↑                    ↑
    User 1 (Internet)    User 2 (Internet)
```

### 2. **Como Funciona**

#### **Acesso dos Usuários:**
1. **Registro/Login:**
   - Cada usuário cria sua conta via `/api/auth/register`
   - Recebe um JWT token para autenticação
   - Cada usuário tem um `user_id` único

2. **Isolamento de Dados:**
   - Todas as queries filtram por `user_id`
   - Cada usuário vê apenas seus próprios dados
   - WhatsApp, Google Calendar e API keys são isolados

3. **WhatsApp por Usuário:**
   - Cada usuário conecta seu próprio WhatsApp
   - Sessões isoladas: `.wwebjs_auth/user_{userId}/`
   - Um usuário não vê mensagens de outro

4. **Google Calendar por Usuário:**
   - Cada usuário conecta sua própria conta Google
   - Tokens OAuth isolados por `user_id`
   - Cada usuário gerencia seu próprio calendário

## 🌐 Acesso Remoto (Sem Estar na Mesma Rede)

### **Opções de Deploy:**

#### **1. Servidor na Nuvem (Recomendado)**

```
┌─────────────────────────────────┐
│   Servidor Cloud (VPS/Cloud)    │
│   - AWS EC2                     │
│   - DigitalOcean                │
│   - Linode                      │
│   - Azure VM                    │
│   - Google Cloud Compute        │
└─────────────────────────────────┘
              ↓
    ┌───────────────────┐
    │  Domínio Público  │
    │  (ex: api.seudominio.com) │
    └───────────────────┘
              ↓
    ┌───────────────────┐
    │  Usuários (Internet) │
    │  - Qualquer lugar   │
    │  - Qualquer rede    │
    └───────────────────┘
```

**Configuração necessária:**

1. **Variáveis de Ambiente (.env):**
```env
# URL pública do backend (deve ser acessível via internet)
FRONTEND_URL=https://app.seudominio.com
BACKEND_URL=https://api.seudominio.com

# Ou para desenvolvimento:
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

2. **CORS (server.js):**
```javascript
// Já configurado para aceitar requisições de qualquer origem em produção
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

3. **WebSocket (frontend/src/pages/Dashboard.jsx):**
```javascript
// Atualizar para URL pública
const ws = new WebSocket(`wss://api.seudominio.com:5001?user=${user.id}`);
```

#### **2. Supabase (Backend como Serviço)**

Se usar Supabase para o banco de dados:
- ✅ Banco na nuvem (acessível de qualquer lugar)
- ✅ RLS (Row Level Security) para isolamento
- ⚠️ Backend ainda precisa estar acessível

#### **3. Deploy do Frontend + Backend**

**Opções:**

1. **Vercel/Netlify (Frontend) + VPS (Backend)**
   - Frontend: Deploy estático (Vercel/Netlify)
   - Backend: VPS na nuvem

2. **Docker Compose em VPS**
   - Tudo rodando em um servidor
   - Backend + Frontend + PostgreSQL

3. **Kubernetes (Produção)**
   - Escalável para muitos usuários
   - Requer mais configuração

## 🔐 Segurança para Acesso Remoto

### **1. HTTPS (Obrigatório em Produção)**

```bash
# Usar reverse proxy (Nginx/Caddy) com SSL
# Exemplo com Nginx:
server {
    listen 443 ssl;
    server_name api.seudominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### **2. Autenticação JWT**

Já implementado:
- ✅ Tokens JWT com expiração
- ✅ Middleware `authMiddleware` em todas as rotas
- ✅ Validação de token em cada requisição

### **3. Rate Limiting**

Já implementado:
- ✅ Limite de requisições por IP
- ✅ Proteção contra brute force

### **4. Criptografia de Credenciais**

Já implementado:
- ✅ API Keys criptografadas (AES-256-GCM)
- ✅ Google OAuth tokens criptografados
- ✅ `ENCRYPTION_KEY` obrigatória

## 📝 Passo a Passo para Deploy Remoto

### **1. Preparar Servidor**

```bash
# No servidor VPS (Ubuntu/Debian)
sudo apt update
sudo apt install nodejs npm postgresql nginx certbot

# Clonar repositório
git clone <seu-repositorio>
cd top-active-whatsapp

# Instalar dependências
npm install
```

### **2. Configurar Banco de Dados**

```bash
# Opção 1: PostgreSQL local
sudo -u postgres createdb top_active_whatsapp
sudo -u postgres psql top_active_whatsapp < sql/schema.sql

# Opção 2: Supabase (recomendado)
# Use as credenciais do Supabase no .env
```

### **3. Configurar .env**

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/top_active_whatsapp
# OU
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-key
SUPABASE_SERVICE_KEY=sua-service-key

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro
JWT_EXPIRATION=7d

# Criptografia
ENCRYPTION_KEY=sua-chave-hex-64-caracteres

# URLs Públicas
FRONTEND_URL=https://app.seudominio.com
BACKEND_URL=https://api.seudominio.com

# Portas
PORT=5000
WS_PORT=5001
```

### **4. Configurar Nginx (Reverse Proxy)**

```nginx
# /etc/nginx/sites-available/top-active-whatsapp

# Backend API
server {
    listen 80;
    server_name api.seudominio.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# WebSocket
server {
    listen 5001;
    server_name api.seudominio.com;
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### **5. SSL com Let's Encrypt**

```bash
sudo certbot --nginx -d api.seudominio.com
```

### **6. Atualizar Frontend**

No arquivo `frontend/src/lib/axios.js`:
```javascript
const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'https://api.seudominio.com/api',
  // ...
});
```

No `frontend/.env`:
```env
VITE_API_URL=https://api.seudominio.com/api
```

### **7. Process Manager (PM2)**

```bash
# Instalar PM2
npm install -g pm2

# Criar arquivo ecosystem.config.js
module.exports = {
  apps: [{
    name: 'top-active-whatsapp',
    script: 'server.js',
    env: {
      NODE_ENV: 'production'
    }
  }]
};

# Iniciar
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## ✅ Checklist para Deploy Remoto

- [ ] Servidor configurado (VPS/Cloud)
- [ ] Banco de dados acessível (PostgreSQL/Supabase)
- [ ] Variáveis de ambiente configuradas
- [ ] HTTPS configurado (SSL/TLS)
- [ ] Nginx configurado como reverse proxy
- [ ] Frontend atualizado com URL pública
- [ ] Process manager (PM2) configurado
- [ ] Firewall configurado (portas 80, 443, 5001)
- [ ] Backup automático configurado
- [ ] Monitoramento configurado

## 🚀 Como Usuários Acessam

### **1. Primeiro Acesso:**
1. Acessar `https://app.seudominio.com`
2. Clicar em "Registrar"
3. Criar conta (email + senha)
4. Login automático

### **2. Configurar Credenciais:**
1. Acessar "Configurações"
2. Adicionar OpenAI API Key
3. Conectar Google Calendar
4. Conectar WhatsApp (QR Code)

### **3. Usar o Sistema:**
- Cada usuário vê apenas seus dados
- WhatsApp isolado por usuário
- Google Calendar isolado por usuário
- Mensagens isoladas por usuário

## ⚠️ Limitações e Considerações

### **1. WhatsApp Web**
- Cada usuário precisa escanear QR Code do próprio WhatsApp
- Sessão mantida no servidor (`.wwebjs_auth/user_{userId}/`)
- ⚠️ Se o servidor reiniciar, pode precisar reconectar

### **2. Recursos do Servidor**
- Cada instância WhatsApp consome memória
- Para muitos usuários, considerar:
  - Mais RAM
  - Escalabilidade horizontal
  - Docker/Kubernetes

### **3. Banco de Dados**
- Supabase: Escalável, limitado por plano
- PostgreSQL local: Precisa gerenciar backups

### **4. Google OAuth**
- Cada usuário precisa autorizar acesso
- Tokens armazenados criptografados
- Refresh tokens automáticos

## 📊 Estimativa de Recursos

Para **10 usuários simultâneos**:
- RAM: 2-4GB
- CPU: 2-4 cores
- Disco: 20-50GB
- Banda: 100Mbps

Para **100 usuários simultâneos**:
- RAM: 8-16GB
- CPU: 4-8 cores
- Disco: 100-200GB
- Banda: 1Gbps

## 🔄 Próximos Passos

1. **Deploy em Servidor Cloud:**
   - Escolher provedor (AWS, DigitalOcean, etc.)
   - Configurar servidor
   - Deploy do código

2. **Configurar Domínio:**
   - Registrar domínio
   - Configurar DNS
   - SSL/HTTPS

3. **Testar Multi-User:**
   - Criar múltiplas contas
   - Testar isolamento
   - Verificar performance

4. **Monitoramento:**
   - Logs
   - Métricas
   - Alertas

## 📚 Referências

- [Documentação Multi-Tenant](./MULTI-TENANT-SETUP.md)
- [Configuração Supabase](./SUPABASE-SETUP.md)
- [Guia de Instalação](./INSTALLATION-GUIDE.md)
