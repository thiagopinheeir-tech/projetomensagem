# 🗄️ Configurar Banco de Dados no Railway

## 📋 Passo 1: Obter URL do Banco de Dados (Supabase)

### Opção A: Usar Supabase (Recomendado - Gratuito)

1. **Acesse:** https://supabase.com
2. **Faça login** na sua conta
3. **Selecione seu projeto** (ou crie um novo)
4. **Vá em:** Settings (ícone de engrenagem) → **Database**
5. **Role até:** "Connection string"
6. **Selecione:** "URI" (não "Session mode" ou "Transaction mode")
7. **Copie a URL** que aparece, exemplo:
   ```
   postgresql://postgres:[SENHA]@db.xxxxx.supabase.co:5432/postgres
   ```
8. **⚠️ IMPORTANTE:** Substitua `[SENHA]` pela senha real do seu banco
   - A senha está em: Settings → Database → Database password
   - Ou você pode resetar a senha se não souber

**URL final deve ser algo assim:**
```
postgresql://postgres.xxxxx:SUA_SENHA_AQUI@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## 📋 Passo 2: Adicionar DATABASE_URL no Railway

1. **Acesse:** https://railway.app
2. **Vá no seu projeto** `enthusiastic-flow`
3. **Clique no serviço** `projetomensagem`
4. **Vá em:** **Variables** (aba no topo)
5. **Clique em:** **"New Variable"** ou **"Add Variable"**
6. **Configure:**
   - **Name:** `DATABASE_URL`
   - **Value:** Cole a URL completa do Supabase (do Passo 1)
   - **Environment:** Selecione **Production** (e Development se quiser)
7. **Clique em:** **"Add"** ou **"Save"**

---

## 📋 Passo 3: Verificar Outras Variáveis Necessárias

Verifique se estas variáveis também estão configuradas no Railway:

### Variáveis Obrigatórias:

1. **SUPABASE_URL**
   - Obtenha em: Supabase → Settings → API
   - Formato: `https://xxxxx.supabase.co`

2. **SUPABASE_SERVICE_KEY** (ou SUPABASE_ANON_KEY)
   - Obtenha em: Supabase → Settings → API
   - Use **Service Role Key** (não a anon key)
   - Formato: `eyJhbGc...` (chave longa)

3. **JWT_SECRET**
   - Gere uma chave segura:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Ou use qualquer string aleatória de pelo menos 32 caracteres

4. **ENCRYPTION_KEY**
   - Gere uma chave segura:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Ou use qualquer string aleatória de pelo menos 32 caracteres

### Variáveis Opcionais (mas recomendadas):

5. **CORS_ORIGIN**
   - Value: `*` (permite todas as origens)
   - OU a URL específica do seu frontend no Vercel

6. **OPENAI_API_KEY** (se quiser usar IA)
   - Obtenha em: https://platform.openai.com/api-keys

---

## 📋 Passo 4: Verificar se Funcionou

1. **Aguarde 1-2 minutos** para o Railway fazer redeploy
2. **Vá em:** Railway → seu serviço → **Logs**
3. **Procure por:**
   - ✅ `✅ Usando DATABASE_URL para conexão` (se aparecer)
   - ✅ `✅ 🚀 JT DEV NOCODE 2.0 Started on port 5000`
   - ❌ Se aparecer `❌ Database error` ou `ECONNREFUSED`, a URL está errada

---

## 🔍 Como Obter a URL do Supabase (Passo a Passo Visual)

1. **Acesse:** https://supabase.com/dashboard
2. **Clique no seu projeto**
3. **No menu lateral esquerdo, clique em:** ⚙️ **Settings**
4. **Clique em:** **Database** (no submenu)
5. **Role a página até:** **"Connection string"**
6. **Selecione a aba:** **"URI"**
7. **Copie a string** que aparece
8. **Substitua `[YOUR-PASSWORD]`** pela senha real do banco
   - A senha está logo acima, em **"Database password"**
   - Se não souber, clique em **"Reset database password"**

**Exemplo de URL:**
```
postgresql://postgres.xxxxx:SUA_SENHA@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## ⚠️ Problemas Comuns

### Erro: "ECONNREFUSED"
- **Causa:** URL do banco está errada ou senha incorreta
- **Solução:** Verifique se a senha na URL está correta

### Erro: "SSL required"
- **Causa:** Supabase requer SSL
- **Solução:** A URL já deve incluir SSL automaticamente, mas verifique se está usando a URL correta

### Erro: "Database does not exist"
- **Causa:** Nome do banco está errado na URL
- **Solução:** Use `postgres` como nome do banco (padrão do Supabase)

---

## ✅ Checklist Final

- [ ] URL do Supabase copiada
- [ ] Senha substituída na URL
- [ ] `DATABASE_URL` adicionada no Railway
- [ ] `SUPABASE_URL` configurada no Railway
- [ ] `SUPABASE_SERVICE_KEY` configurada no Railway
- [ ] `JWT_SECRET` configurada no Railway
- [ ] `ENCRYPTION_KEY` configurada no Railway
- [ ] Aguardou redeploy (1-2 minutos)
- [ ] Verificou logs do Railway
- [ ] Backend conectou ao banco com sucesso
