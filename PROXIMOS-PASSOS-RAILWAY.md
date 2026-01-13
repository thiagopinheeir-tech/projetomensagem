# 🚀 Próximos Passos no Railway (Projeto Já Vinculado)

## ✅ Você já fez:
- ✅ Vinculou o projeto ao Railway
- ✅ Serviço "projetomensagem" criado

## 📋 O que fazer AGORA (sem baixar nada):

### **1. Configurar Variáveis de Ambiente** ⚠️ OBRIGATÓRIO

1. No Railway, clique no serviço **"projetomensagem"**
2. Vá na aba **"Variables"** (ou **Settings → Variables**)
3. Clique em **"New Variable"** e adicione uma por uma:

#### **Variáveis OBRIGATÓRIAS:**

```env
# Banco de Dados (escolha UMA opção)

# Opção 1: Se usar Supabase (recomendado)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_KEY=sua-service-key

# Opção 2: Se usar PostgreSQL direto
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT (OBRIGATÓRIO)
JWT_SECRET=seu-jwt-secret-super-seguro-minimo-32-caracteres
JWT_EXPIRATION=7d

# Criptografia (OBRIGATÓRIO - gere uma chave)
ENCRYPTION_KEY=sua-chave-hex-de-64-caracteres

# Para gerar ENCRYPTION_KEY, execute no terminal:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ambiente
NODE_ENV=production
PORT=5000
```

#### **Variáveis OPCIONAIS (adicionar depois):**

```env
# URLs (preencher depois que tiver a URL do Railway)
FRONTEND_URL=https://seu-frontend.vercel.app
CORS_ORIGIN=https://seu-frontend.vercel.app

# Google OAuth (se não configurar por usuário)
GOOGLE_OAUTH_CLIENT_ID=seu-client-id
GOOGLE_OAUTH_CLIENT_SECRET=seu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://seu-app.railway.app/api/google/oauth/callback
```

---

### **2. Configurar Build e Start**

1. No serviço, vá em **"Settings"**
2. Verifique/Configure:
   - **Build Command:** Deixe vazio (Railway detecta automaticamente)
   - **Start Command:** `node server.js`
   - **Root Directory:** `.` (raiz)

---

### **3. Fazer Deploy**

Railway faz deploy automaticamente quando você faz push no Git, mas você pode forçar:

1. Vá na aba **"Deployments"**
2. Clique em **"Redeploy"** (se houver deploy anterior)
3. Ou faça um pequeno commit e push no Git:
   ```bash
   git commit --allow-empty -m "Trigger Railway deploy"
   git push
   ```

---

### **4. Verificar Deploy**

1. Vá na aba **"Deployments"**
2. Clique no deploy mais recente
3. Veja os **Logs** para verificar se iniciou corretamente
4. Procure por: `✅ 🚀 Top Active WhatsApp 2.0 Started`

---

### **5. Obter URL do Backend**

1. Vá em **"Settings" → "Networking"**
2. Clique em **"Generate Domain"** (se ainda não tiver)
3. Railway vai gerar uma URL tipo: `projetomensagem-production.up.railway.app`
4. **Copie essa URL** - você vai precisar para o frontend

---

### **6. Testar Backend**

1. Acesse: `https://sua-url.railway.app/health`
2. Deve retornar JSON com status "ok"
3. Se funcionar, backend está rodando! ✅

---

## ⚠️ Problemas Comuns

### **Serviço continua offline:**

1. **Verifique variáveis:**
   - `ENCRYPTION_KEY` está configurada?
   - `JWT_SECRET` está configurada?
   - Banco de dados está acessível?

2. **Verifique logs:**
   - Aba **"Logs"** ou **"Deployments" → View Logs**
   - Procure por erros em vermelho

3. **Erro comum:** "ENCRYPTION_KEY is required"
   - Adicione a variável `ENCRYPTION_KEY` nas Variables

### **Deploy falha:**

1. Verifique se `package.json` tem script `start`
2. Verifique se `server.js` existe na raiz
3. Veja logs para erro específico

### **Banco de dados não conecta:**

1. Verifique se `DATABASE_URL` ou credenciais Supabase estão corretas
2. Teste conexão localmente primeiro
3. Verifique se banco está acessível (não bloqueado por firewall)

---

## 📝 Checklist Rápido

- [ ] Variáveis de ambiente configuradas (ENCRYPTION_KEY, JWT_SECRET, DATABASE)
- [ ] Start Command configurado: `node server.js`
- [ ] Deploy realizado
- [ ] Logs mostram "Started on port"
- [ ] URL gerada em Networking
- [ ] Health check funcionando (`/health`)

---

## 🎯 Próximo Passo Após Backend Funcionar

Depois que o backend estiver rodando:

1. **Deploy do Frontend no Vercel:**
   - Acesse: https://vercel.com
   - New Project → Import seu repositório
   - Root Directory: `frontend`
   - Variável: `VITE_API_URL=https://sua-url.railway.app/api`

2. **Atualizar URLs no Railway:**
   - Adicione `FRONTEND_URL` e `CORS_ORIGIN` com URL do Vercel

---

## 💡 Dica

**NÃO precisa baixar nada!** Tudo é feito pela interface web do Railway.

Se quiser usar CLI (opcional):
```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

Mas a interface web é mais fácil! 😊

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique logs no Railway
2. Verifique se todas variáveis estão configuradas
3. Teste `/health` endpoint
4. Veja se há erros nos logs

**Boa sorte! 🚀**
