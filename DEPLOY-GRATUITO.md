# 🆓 Guia de Deploy Gratuito - Multi-User

## 📋 Melhores Alternativas Gratuitas

### ✅ **Opção 1: Render.com + Supabase (RECOMENDADO)**

**Por quê?**
- ✅ Render: Backend gratuito (750h/mês)
- ✅ Supabase: Banco de dados gratuito (500MB, ilimitado requests)
- ✅ Frontend: Vercel/Netlify (gratuito)
- ✅ SSL automático
- ✅ Deploy automático via Git
- ✅ Sem necessidade de servidor VPS

#### **Configuração:**

**1. Backend no Render.com:**
```
Serviço: Web Service
- Runtime: Node
- Build Command: npm install
- Start Command: node server.js
- Environment Variables:
  - PORT=10000 (automático)
  - DATABASE_URL=postgresql://... (Supabase)
  - JWT_SECRET=seu-secret
  - ENCRYPTION_KEY=sua-chave
  - CORS_ORIGIN=https://seu-frontend.vercel.app
```

**Limites do Plano Gratuito:**
- ✅ 750 horas/mês (suficiente se rodar 24/7)
- ✅ SSL automático
- ⚠️ Dorme após 15min de inatividade (reconecta automaticamente)
- ⚠️ Sem escalabilidade automática

**2. Banco de Dados - Supabase (Já usando):**
```
Plano Free:
- ✅ 500MB de armazenamento
- ✅ Requests ilimitados
- ✅ 500MB bandwidth/dia
- ✅ SSL incluído
- ✅ Backups automáticos
```

**3. Frontend - Vercel (Gratuito):**
```
Deploy via Git:
- ✅ Build automático
- ✅ SSL automático
- ✅ CDN global
- ✅ Sem limites de bandwidth
```

**Custo Total: R$ 0,00** 💰

---

### ✅ **Opção 2: Railway.app + Supabase**

**Por quê?**
- ✅ Railway: $5 grátis/mês (suficiente para testes)
- ✅ Deploy via Git
- ✅ SSL automático
- ✅ Logs em tempo real

**Limites:**
- ✅ $5 grátis/mês
- ⚠️ Requer cartão de crédito (mas não cobra)
- ⚠️ Podem cobrar se exceder

**Custo: R$ 0,00 - R$ 30,00/mês** (depende do uso)

---

### ✅ **Opção 3: Fly.io (Gratuito)**

**Por quê?**
- ✅ 3 VMs pequenas grátis
- ✅ 3GB shared-cpu-1x
- ✅ 160GB volumes grátis
- ✅ SSL automático

**Limites:**
- ✅ 3 VMs grátis
- ⚠️ Requer configuração Docker
- ⚠️ Mais complexo de configurar

**Custo: R$ 0,00** 💰

---

### ✅ **Opção 4: Oracle Cloud Always Free**

**Por quê?**
- ✅ 2 VMs grátis para sempre (Ampere A1)
- ✅ 1/8 OCPU, 1GB RAM cada
- ✅ 200GB de armazenamento
- ✅ 10TB egress/mês
- ✅ Sem expiração (sempre gratuito)

**Limites:**
- ✅ Permanente (não expira)
- ⚠️ Requer configuração manual
- ⚠️ Interface mais complexa
- ⚠️ Limite de 2 VMs

**Custo: R$ 0,00** 💰 (Permanente)

---

### ✅ **Opção 5: Google Cloud Run (Free Tier)**

**Por quê?**
- ✅ 2 milhões de requests grátis/mês
- ✅ 360,000 GB-segundos/mês
- ✅ SSL automático
- ✅ Escala para zero quando não usa

**Limites:**
- ✅ Até 2 milhões requests/mês
- ⚠️ Requer container Docker
- ⚠️ Requer cartão de crédito

**Custo: R$ 0,00** 💰 (dentro dos limites)

---

## 🏆 **RECOMENDAÇÃO FINAL**

### **Para Começar Agora (Mais Fácil):**
**Render.com + Supabase + Vercel**

Por quê?
1. ✅ **Mais fácil de configurar** (apenas Git push)
2. ✅ **100% gratuito** (dentro dos limites)
3. ✅ **SSL automático**
4. ✅ **Deploy automático**
5. ✅ **Já está usando Supabase**

### **Para Produção/Usuários Múltiplos:**
**Oracle Cloud Always Free + Supabase**

Por quê?
1. ✅ **Gratuito para sempre** (sem expiração)
2. ✅ **Mais recursos** (2 VMs, 2GB RAM total)
3. ✅ **Sem limites de tempo** (não dorme)
4. ✅ **Melhor para múltiplos usuários**

---

## 📝 **Passo a Passo: Render.com (Recomendado)**

### **1. Preparar Código**

Criar `render.yaml` na raiz:
```yaml
services:
  - type: web
    name: top-active-whatsapp-api
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false  # Adicionar manualmente
      - key: JWT_SECRET
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
      - key: CORS_ORIGIN
        value: https://seu-frontend.vercel.app
      - key: FRONTEND_URL
        value: https://seu-frontend.vercel.app
      - key: BACKEND_URL
        sync: false  # Será preenchido automaticamente
```

### **2. Deploy no Render.com**

1. **Criar conta:** https://render.com (usando GitHub)
2. **New → Web Service**
3. **Conectar repositório GitHub**
4. **Configurar:**
   - Name: `top-active-whatsapp-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: `Free`

5. **Adicionar Environment Variables:**
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=seu-jwt-secret-aqui
   ENCRYPTION_KEY=sua-chave-hex-64-caracteres
   CORS_ORIGIN=https://seu-frontend.vercel.app
   FRONTEND_URL=https://seu-frontend.vercel.app
   PORT=10000
   ```

6. **Deploy:** Clique em "Create Web Service"

### **3. Configurar WebSocket (Render)**

Render não suporta WebSocket no plano gratuito diretamente. Alternativas:

**Opção A: Usar apenas REST (mais simples)**
- Remover WebSocket do frontend
- Usar polling (requests periódicos)

**Opção B: Usar serviço separado (Fly.io)**
- Deploy WebSocket no Fly.io (gratuito)
- Backend no Render.com

**Opção C: Usar Oracle Cloud (recomendado)**
- Deploy completo no Oracle Cloud (suporta WebSocket)

### **4. Deploy Frontend (Vercel)**

1. **Criar conta:** https://vercel.com (usando GitHub)
2. **New Project → Import Git Repository**
3. **Configurar:**
   - Framework: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables:**
   ```
   VITE_API_URL=https://top-active-whatsapp-api.onrender.com/api
   ```

5. **Deploy:** Clique em "Deploy"

### **5. Configurar Supabase**

Já configurado? Verificar:
- ✅ Database URL no `.env` do Render
- ✅ Service Key configurada
- ✅ RLS (Row Level Security) ativado

---

## 🚀 **Passo a Passo: Oracle Cloud (Permanente)**

### **1. Criar Conta Oracle Cloud**

1. Acesse: https://cloud.oracle.com
2. Clique em "Start for Free"
3. Preencha dados (requer cartão, mas não cobra)
4. Crie sempre free account

### **2. Criar Instância VM**

1. **Menu → Compute → Instances**
2. **Create Instance**
3. **Configurar:**
   - Name: `top-active-whatsapp`
   - Image: `Canonical Ubuntu 22.04`
   - Shape: `VM.Standard.A1.Flex`
     - OCPUs: 1
     - Memory: 1GB
   - Networking: Criar VCN (Virtual Cloud Network)
   - SSH Keys: Gerar/fazer upload

4. **Create**

### **3. Configurar Servidor**

Conectar via SSH:
```bash
ssh opc@<ip-publico>
```

Instalar dependências:
```bash
sudo apt update
sudo apt install -y nodejs npm postgresql-client nginx certbot python3-certbot-nginx

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Clonar repositório:
```bash
git clone <seu-repositorio>
cd top-active-whatsapp
npm install
```

Configurar `.env`:
```bash
nano .env
```

```env
DATABASE_URL=postgresql://user:pass@supabase-host:5432/db
JWT_SECRET=seu-jwt-secret
ENCRYPTION_KEY=sua-chave-hex
CORS_ORIGIN=https://seu-frontend.vercel.app
FRONTEND_URL=https://seu-frontend.vercel.app
PORT=5000
NODE_ENV=production
```

### **4. Configurar Nginx**

```bash
sudo nano /etc/nginx/sites-available/top-active-whatsapp
```

```nginx
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
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/top-active-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **5. SSL com Let's Encrypt**

```bash
sudo certbot --nginx -d api.seudominio.com
```

### **6. Process Manager (PM2)**

```bash
npm install -g pm2

pm2 start server.js --name top-active-whatsapp
pm2 save
pm2 startup
```

### **7. Firewall (Security List)**

No Oracle Cloud Console:
1. **Networking → Virtual Cloud Networks**
2. Selecione sua VCN
3. **Security Lists → Default Security List**
4. **Add Ingress Rules:**
   - Source: 0.0.0.0/0
   - IP Protocol: TCP
   - Destination Port Range: 80, 443, 5001

---

## 📊 **Comparação de Opções**

| Característica | Render.com | Oracle Cloud | Railway | Fly.io |
|----------------|-----------|--------------|---------|--------|
| **Custo** | R$ 0,00 | R$ 0,00 (sempre) | R$ 0-30/mês | R$ 0,00 |
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Recursos** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **WebSocket** | ❌ | ✅ | ✅ | ✅ |
| **SSL** | ✅ Auto | ✅ Manual | ✅ Auto | ✅ Auto |
| **Uptime** | ⚠️ Dorme | ✅ 24/7 | ✅ 24/7 | ✅ 24/7 |
| **Expiração** | ❌ Sempre | ✅ Nunca | ⚠️ 12 meses | ✅ Sempre |

---

## 💡 **Recomendação por Cenário**

### **Para Testes/Protótipo:**
→ **Render.com** (mais fácil, deploy rápido)

### **Para Produção/Usuários Reais:**
→ **Oracle Cloud Always Free** (gratuito para sempre, mais recursos)

### **Para Escala (Futuro):**
→ **Railway.app** ou **Fly.io** (melhor escalabilidade)

---

## ⚠️ **Limitações dos Planos Gratuitos**

### **Render.com:**
- ⚠️ Dorme após 15min de inatividade
- ⚠️ Pode demorar para acordar (cold start)
- ⚠️ Limite de 750h/mês (suficiente se rodar 24/7)
- ⚠️ Sem WebSocket (precisa alternativo)

### **Oracle Cloud:**
- ⚠️ Requer configuração manual
- ⚠️ Interface mais complexa
- ⚠️ Requer cartão de crédito (não cobra)

### **Supabase (Free):**
- ⚠️ 500MB de armazenamento
- ⚠️ 500MB bandwidth/dia
- ⚠️ Máximo 500MB de banco

---

## 🎯 **Conclusão**

**Para começar HOJE (mais fácil):**
→ **Render.com + Supabase + Vercel** = R$ 0,00

**Para PRODUÇÃO (permanente):**
→ **Oracle Cloud + Supabase + Vercel** = R$ 0,00 (para sempre)

---

## 📚 **Próximos Passos**

1. Escolher opção (Render.com recomendado para começar)
2. Configurar variáveis de ambiente
3. Fazer deploy do backend
4. Fazer deploy do frontend
5. Testar com múltiplos usuários

---

## 🔗 **Links Úteis**

- Render.com: https://render.com
- Oracle Cloud: https://cloud.oracle.com
- Supabase: https://supabase.com
- Vercel: https://vercel.com
- Railway: https://railway.app
- Fly.io: https://fly.io
