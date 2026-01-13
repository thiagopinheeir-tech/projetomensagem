# 🚂 Guia Completo: Deploy no Railway.app

## 📋 Pré-requisitos

- ✅ Conta no GitHub (para conectar repositório)
- ✅ Conta no Railway.app (criar em https://railway.app)
- ✅ Cartão de crédito (não cobra se não exceder $5/mês)
- ✅ Código no GitHub (ou GitLab/Bitbucket)

---

## 🚀 Passo a Passo Completo

### **1. Preparar Repositório no GitHub**

Se ainda não tem o código no GitHub:

```bash
# No diretório do projeto
git init
git add .
git commit -m "Initial commit - Railway deploy ready"

# Criar repositório no GitHub e depois:
git remote add origin https://github.com/seu-usuario/top-active-whatsapp.git
git branch -M main
git push -u origin main
```

---

### **2. Criar Conta no Railway**

1. Acesse: **https://railway.app**
2. Clique em **"Start a New Project"**
3. Faça login com **GitHub**
4. Autorize Railway a acessar seus repositórios

---

### **3. Criar Novo Projeto**

1. No dashboard do Railway, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha seu repositório: `top-active-whatsapp`
4. Railway vai detectar automaticamente que é Node.js

---

### **4. Configurar Variáveis de Ambiente**

No dashboard do Railway, vá em **Settings → Variables** e adicione:

#### **Variáveis Obrigatórias:**

```env
# Banco de Dados (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/database
# OU se usar Supabase:
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_KEY=sua-service-key

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-min-32-caracteres
JWT_EXPIRATION=7d

# Criptografia (OBRIGATÓRIO)
ENCRYPTION_KEY=sua-chave-hex-de-64-caracteres
# Gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# URLs (serão preenchidas depois)
FRONTEND_URL=https://seu-frontend.vercel.app
BACKEND_URL=https://seu-app.railway.app
CORS_ORIGIN=https://seu-frontend.vercel.app

# Porta (Railway define automaticamente via PORT)
PORT=5000
NODE_ENV=production
```

#### **Variáveis Opcionais (se usar):**

```env
# Google OAuth (se não configurar no perfil)
GOOGLE_OAUTH_CLIENT_ID=seu-client-id
GOOGLE_OAUTH_CLIENT_SECRET=seu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://seu-app.railway.app/api/google/oauth/callback

# OpenAI (se não configurar por usuário)
OPENAI_API_KEY=sk-...
```

**⚠️ IMPORTANTE:** 
- Não commite essas variáveis no Git!
- Railway mantém elas seguras
- Use `railway variables` para gerenciar via CLI se preferir

---

### **5. Configurar Build e Start**

Railway detecta automaticamente, mas você pode verificar em **Settings → Build & Deploy**:

- **Build Command:** `npm install` (ou deixar vazio, Railway faz automaticamente)
- **Start Command:** `node server.js`
- **Root Directory:** `.` (raiz do projeto)

---

### **6. Configurar Portas e Networking**

#### **6.1. Porta HTTP (5000)**

1. Vá em **Settings → Networking**
2. Clique em **"Generate Domain"** (Railway cria URL automática)
3. Ou adicione domínio customizado em **"Custom Domain"**

#### **6.2. Porta WebSocket (5001)**

⚠️ **IMPORTANTE:** Railway suporta WebSocket, mas precisa configurar:

1. Vá em **Settings → Networking**
2. Adicione porta pública:
   - **Port:** `5001`
   - **Protocol:** `TCP`
   - **Type:** `Public`

Ou configure no código para usar a mesma porta do HTTP (mais simples):

---

### **7. Ajustar Código para Railway**

#### **7.1. Atualizar server.js para usar PORT do Railway**

Railway define `PORT` automaticamente. Verifique se seu `server.js` usa:

```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ 🚀 Top Active WhatsApp 2.0 Started on port ${PORT}`);
});
```

#### **7.2. WebSocket na mesma porta (Recomendado)**

Para simplificar, você pode fazer WebSocket usar a mesma porta HTTP:

**services/websocket.js:**
```javascript
initialize(port = null) {
  // Usar PORT do ambiente ou porta padrão
  const wsPort = port || process.env.PORT || 5001;
  this.wss = new WebSocket.Server({ port: wsPort });
  // ...
}
```

**server.js:**
```javascript
// Inicializar WebSocket na mesma porta ou porta separada
const WS_PORT = process.env.WS_PORT || process.env.PORT || 5001;
```

#### **7.3. Atualizar CORS**

**server.js:**
```javascript
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
```

---

### **8. Deploy**

Railway faz deploy automaticamente quando você faz push no Git!

**Ou fazer deploy manual:**

1. No dashboard, clique em **"Deploy"**
2. Ou via CLI:
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Deploy
railway up
```

---

### **9. Verificar Deploy**

1. **Logs:** Vá em **"Deployments" → Clique no deploy → "View Logs"**
2. **URL:** Railway gera URL automática: `seu-app.railway.app`
3. **Health Check:** Acesse `https://seu-app.railway.app/health`

---

### **10. Configurar Frontend**

#### **10.1. Deploy Frontend no Vercel**

1. Acesse: **https://vercel.com**
2. **New Project → Import Git Repository**
3. Selecione seu repositório
4. **Configure:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

#### **10.2. Variáveis de Ambiente no Vercel**

No Vercel, adicione:

```env
VITE_API_URL=https://seu-app.railway.app/api
```

#### **10.3. Atualizar WebSocket no Frontend**

**frontend/src/pages/Dashboard.jsx:**
```javascript
// Obter URL do backend do .env ou usar URL do Railway
const API_URL = import.meta.env.VITE_API_URL || 'https://seu-app.railway.app';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

useEffect(() => {
  if (!user?.id) return;

  // Conectar ao WebSocket
  const ws = new WebSocket(`${WS_URL}:5001?user=${user.id}`);
  // Ou se usar mesma porta:
  // const ws = new WebSocket(`${WS_URL.replace('/api', '')}?user=${user.id}`);
  
  // ... resto do código
}, [user]);
```

---

### **11. Atualizar URLs no Railway**

Depois que o frontend estiver no ar, atualize no Railway:

```env
FRONTEND_URL=https://seu-frontend.vercel.app
CORS_ORIGIN=https://seu-frontend.vercel.app
```

Railway vai fazer redeploy automaticamente.

---

## 🔧 Troubleshooting

### **Erro: "Port already in use"**

Railway define `PORT` automaticamente. Certifique-se de usar:
```javascript
const PORT = process.env.PORT || 5000;
```

### **Erro: "WebSocket connection failed"**

1. Verifique se porta 5001 está configurada em **Networking**
2. Ou use WebSocket na mesma porta HTTP (mais simples)
3. Verifique CORS está permitindo origem do frontend

### **Erro: "Database connection failed"**

1. Verifique `DATABASE_URL` ou credenciais Supabase
2. Verifique se banco está acessível (não bloqueado por firewall)
3. Teste conexão localmente primeiro

### **App não inicia**

1. Verifique logs em **Deployments → View Logs**
2. Verifique se `ENCRYPTION_KEY` está configurada
3. Verifique se todas variáveis obrigatórias estão definidas

### **Deploy lento**

1. Railway faz build a cada push
2. Use `.railwayignore` para ignorar arquivos desnecessários:
```
node_modules
.git
.env
*.log
dist
frontend/dist
```

---

## 📊 Monitoramento

### **Ver Métricas:**

1. **Dashboard → Metrics**
   - CPU usage
   - Memory usage
   - Network traffic
   - Request count

### **Ver Logs:**

1. **Deployments → View Logs**
   - Logs em tempo real
   - Filtros por nível (info, error, warn)

### **Alertas:**

Configure alertas em **Settings → Notifications** para:
- Deploy falhado
- Alto uso de recursos
- Erros críticos

---

## 💰 Custos

### **Plano Gratuito:**
- ✅ $5 grátis/mês
- ✅ Suficiente para começar
- ✅ Sem cobrança se não exceder

### **Estimativa de Uso:**
- **10 usuários:** ~$2-3/mês
- **50 usuários:** ~$5-8/mês
- **100+ usuários:** Pode precisar upgrade

### **Monitorar Uso:**
- **Dashboard → Usage**
- Acompanhe uso em tempo real
- Configure alertas de limite

---

## ✅ Checklist Final

- [ ] Código no GitHub
- [ ] Conta Railway criada
- [ ] Projeto criado e conectado ao repositório
- [ ] Variáveis de ambiente configuradas
- [ ] Portas configuradas (5000 e 5001)
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando (`/health`)
- [ ] Frontend deployado no Vercel
- [ ] Frontend conectado ao backend Railway
- [ ] WebSocket testado e funcionando
- [ ] Testado com múltiplos usuários

---

## 🎯 Próximos Passos

1. ✅ Deploy backend no Railway
2. ✅ Deploy frontend no Vercel
3. ✅ Testar com 2-3 usuários
4. ✅ Monitorar uso e custos
5. ✅ Configurar domínio customizado (opcional)

---

## 🔗 Links Úteis

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Railway CLI: https://docs.railway.app/develop/cli
- Vercel: https://vercel.com

---

## 💡 Dicas Finais

1. **Use Railway CLI** para gerenciar variáveis facilmente
2. **Monitore logs** regularmente para detectar problemas
3. **Configure alertas** para ser notificado de problemas
4. **Teste localmente** antes de fazer deploy
5. **Use `.railwayignore`** para acelerar builds

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique logs no Railway
2. Verifique variáveis de ambiente
3. Teste endpoints manualmente
4. Consulte documentação: https://docs.railway.app

**Boa sorte com o deploy! 🚀**
