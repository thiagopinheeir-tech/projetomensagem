# ✅ Checklist de Variáveis do Railway

## 🗄️ Variáveis Obrigatórias para o Backend Funcionar

### 1. ✅ DATABASE_URL
- **Status:** ✅ Configurado
- **Valor:** `postgresql://postgres:SENHA@db.hhhifxikyhvruwvmaduq.supabase.co:5432/postgres`

### 2. SUPABASE_URL
- **Onde obter:** Supabase → Settings → API → Project URL
- **Formato:** `https://hhhifxikyhvruwvmaduq.supabase.co`
- **Status:** ⚠️ Precisa configurar

### 3. SUPABASE_SERVICE_KEY (ou SUPABASE_ANON_KEY)
- **Onde obter:** Supabase → Settings → API → Service Role Key
- **⚠️ Use SERVICE ROLE KEY** (não a anon key)
- **Formato:** `eyJhbGc...` (chave longa)
- **Status:** ⚠️ Precisa configurar

### 4. JWT_SECRET
- **Gerar:** Execute no terminal:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Ou use:** Qualquer string aleatória de pelo menos 32 caracteres
- **Status:** ⚠️ Precisa configurar

### 5. ENCRYPTION_KEY
- **Gerar:** Execute no terminal:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Ou use:** Qualquer string aleatória de pelo menos 32 caracteres
- **Status:** ⚠️ Precisa configurar

### 6. CORS_ORIGIN (Opcional mas recomendado)
- **Value:** `*` (permite todas as origens)
- **OU:** URL específica do seu frontend no Vercel
- **Status:** ⚠️ Recomendado configurar

---

## 📋 Como Configurar no Railway

1. **Acesse:** https://railway.app
2. **Vá no serviço** `projetomensagem`
3. **Clique em:** **Variables**
4. **Para cada variável acima:**
   - Clique em **"New Variable"**
   - Cole o **Name** e **Value**
   - Selecione **Production**
   - Clique em **"Add"**

---

## 🔍 Como Obter SUPABASE_URL e SUPABASE_SERVICE_KEY

1. **Acesse:** https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá em:** Settings → **API**
4. **Anote:**
   - **Project URL** → Use como `SUPABASE_URL`
   - **Service Role Key** → Use como `SUPABASE_SERVICE_KEY`
   - ⚠️ **NÃO use a "anon key"**, use a "service role key"

---

## ✅ Após Configurar Todas as Variáveis

1. **Aguarde 1-2 minutos** para o Railway fazer redeploy
2. **Verifique os logs:**
   - Railway → seu serviço → **Logs**
   - Procure por: `✅ 🚀 JT DEV NOCODE 2.0 Started on port 5000`
   - **NÃO deve aparecer:** `❌ Database error` ou `ECONNREFUSED`
3. **Teste criar conta no frontend**

---

## 🎯 Ordem de Prioridade

1. ✅ **DATABASE_URL** - Já configurado!
2. **SUPABASE_URL** - Importante para funcionalidades do Supabase
3. **SUPABASE_SERVICE_KEY** - Importante para funcionalidades do Supabase
4. **JWT_SECRET** - Obrigatório para autenticação
5. **ENCRYPTION_KEY** - Obrigatório para criptografia de tokens
6. **CORS_ORIGIN** - Recomendado para frontend funcionar
