# 🔑 Como Adicionar Cada Variável no Railway - Passo a Passo

## 📍 ONDE ADICIONAR: Railway.app

**Todas as variáveis devem ser adicionadas no Railway, não no Supabase!**

---

## 🗄️ VARIÁVEL 1: DATABASE_URL

### ✅ Onde Obter (Supabase):
1. Supabase → Settings → **Database**
2. Clique em **"Connect"**
3. Copie a URL que aparece
4. Substitua `[YOUR-PASSWORD]` pela senha real

### 📍 Onde Adicionar (Railway):
1. Acesse: https://railway.app
2. Vá no serviço `projetomensagem`
3. Clique em **Variables**
4. Clique em **"New Variable"**
5. **Name:** `DATABASE_URL`
6. **Value:** Cole a URL completa (ex: `postgresql://postgres:SENHA@db.hhhifxikyhvruwvmaduq.supabase.co:5432/postgres`)
7. **Environment:** Production
8. Clique em **"Add"**

---

## 🔐 VARIÁVEL 2: SUPABASE_URL

### ✅ Onde Obter (Supabase):
1. Supabase → Settings → **API**
2. Procure por **"Project URL"**
3. Copie a URL (ex: `https://hhhifxikyhvruwvmaduq.supabase.co`)

### 📍 Onde Adicionar (Railway):
1. Railway → serviço `projetomensagem` → **Variables**
2. Clique em **"New Variable"**
3. **Name:** `SUPABASE_URL`
4. **Value:** Cole a URL (ex: `https://hhhifxikyhvruwvmaduq.supabase.co`)
5. **Environment:** Production
6. Clique em **"Add"**

---

## 🔑 VARIÁVEL 3: SUPABASE_SERVICE_KEY

### ✅ Onde Obter (Supabase):
1. Supabase → Settings → **API**
2. Procure por **"Secret keys"** ou **"Service Role Key"**
3. ⚠️ **IMPORTANTE:** Use a **"Service Role Key"** (não a "anon key")
4. Clique no ícone de **olho** 👁️ para revelar a chave
5. Clique no ícone de **copiar** 📋 para copiar

### 📍 Onde Adicionar (Railway):
1. Railway → serviço `projetomensagem` → **Variables**
2. Clique em **"New Variable"**
3. **Name:** `SUPABASE_SERVICE_KEY`
4. **Value:** Cole a chave completa (começa com `eyJhbGc...`)
5. **Environment:** Production
6. Clique em **"Add"**

---

## 🔐 VARIÁVEL 4: JWT_SECRET

### ✅ Como Gerar:
**Opção 1: Via Terminal (Recomendado)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Opção 2: Manual**
- Use qualquer string aleatória de pelo menos 32 caracteres
- Exemplo: `minha_chave_jwt_secreta_super_segura_123456789`

### 📍 Onde Adicionar (Railway):
1. Railway → serviço `projetomensagem` → **Variables**
2. Clique em **"New Variable"**
3. **Name:** `JWT_SECRET`
4. **Value:** Cole a chave gerada
5. **Environment:** Production
6. Clique em **"Add"**

---

## 🔐 VARIÁVEL 5: ENCRYPTION_KEY

### ✅ Como Gerar:
**Opção 1: Via Terminal (Recomendado)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
*(Execute novamente para gerar uma chave diferente da JWT_SECRET)*

**Opção 2: Manual**
- Use qualquer string aleatória de pelo menos 32 caracteres
- Exemplo: `minha_chave_encryption_super_segura_987654321`

### 📍 Onde Adicionar (Railway):
1. Railway → serviço `projetomensagem` → **Variables**
2. Clique em **"New Variable"**
3. **Name:** `ENCRYPTION_KEY`
4. **Value:** Cole a chave gerada
5. **Environment:** Production
6. Clique em **"Add"**

---

## 🌐 VARIÁVEL 6: CORS_ORIGIN (Opcional mas Recomendado)

### ✅ Valor:
- **Opção 1 (Permitir todas):** `*`
- **Opção 2 (Específico):** URL do seu frontend no Vercel
  - Exemplo: `https://seu-projeto.vercel.app`

### 📍 Onde Adicionar (Railway):
1. Railway → serviço `projetomensagem` → **Variables**
2. Clique em **"New Variable"**
3. **Name:** `CORS_ORIGIN`
4. **Value:** `*` (ou URL específica)
5. **Environment:** Production
6. Clique em **"Add"**

---

## 📋 Resumo Visual

### No Supabase (OBTER as keys):
- **Settings → Database** → Connection string → `DATABASE_URL`
- **Settings → API** → Project URL → `SUPABASE_URL`
- **Settings → API** → Service Role Key → `SUPABASE_SERVICE_KEY`

### No Railway (ADICIONAR as variáveis):
- **Serviço `projetomensagem`** → **Variables** → **New Variable**
- Adicione uma por uma:
  1. `DATABASE_URL`
  2. `SUPABASE_URL`
  3. `SUPABASE_SERVICE_KEY`
  4. `JWT_SECRET`
  5. `ENCRYPTION_KEY`
  6. `CORS_ORIGIN`

---

## ✅ Checklist Final

- [ ] `DATABASE_URL` adicionada no Railway
- [ ] `SUPABASE_URL` adicionada no Railway
- [ ] `SUPABASE_SERVICE_KEY` adicionada no Railway
- [ ] `JWT_SECRET` gerada e adicionada no Railway
- [ ] `ENCRYPTION_KEY` gerada e adicionada no Railway
- [ ] `CORS_ORIGIN` adicionada no Railway (opcional)
- [ ] Aguardou redeploy (1-2 minutos)
- [ ] Verificou logs do Railway
- [ ] Testou criar conta no frontend

---

## 🎯 Ordem Recomendada

1. ✅ `DATABASE_URL` (já feito!)
2. `SUPABASE_URL` (obter no Supabase → Settings → API)
3. `SUPABASE_SERVICE_KEY` (obter no Supabase → Settings → API)
4. `JWT_SECRET` (gerar)
5. `ENCRYPTION_KEY` (gerar)
6. `CORS_ORIGIN` (opcional: usar `*`)
