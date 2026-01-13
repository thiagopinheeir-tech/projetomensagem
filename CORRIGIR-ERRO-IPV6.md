# 🔧 Corrigir Erro ENETUNREACH (IPv6)

## ❌ Erro Atual
```
Error: connect ENETUNREACH 2600:1f1e:75b:4b16:cce:f47b:a990:71b0:5432
```

Este erro ocorre quando a `DATABASE_URL` contém um endereço IPv6 ao invés do hostname do Supabase.

---

## ✅ Solução Automática (Já Implementada)

O código agora detecta automaticamente endereços IPv6 na `DATABASE_URL` e os substitui pelo hostname do Supabase.

**Aguarde 1-2 minutos** após o deploy para o Railway aplicar a correção.

---

## 🔧 Solução Manual (Se a Automática Não Funcionar)

### Passo 1: Obter a URL Correta do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Clique em **"Connect"** ou **"Connection string"**
5. **IMPORTANTE:** Use a opção **"Connection pooling"** ou **"Session mode"**
6. Copie a URL que aparece

### Passo 2: Verificar o Formato da URL

A URL deve ter este formato:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**OU** (formato direto):
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**❌ NÃO deve conter:**
- Endereços IPv6 (ex: `2600:1f1e:...`)
- Endereços IPv4 diretos
- Apenas números e dois pontos

**✅ Deve conter:**
- Hostname do Supabase (ex: `db.hhhifxikyhvruwvmaduq.supabase.co`)
- Ou pooler (ex: `aws-0-us-east-1.pooler.supabase.com`)

### Passo 3: Atualizar no Railway

1. Acesse: https://railway.app
2. Vá no serviço `projetomensagem`
3. Clique em **Variables**
4. Encontre a variável `DATABASE_URL`
5. Clique nos **3 pontos** → **Edit**
6. **Substitua o valor** pela URL correta do Supabase (sem IPs)
7. **IMPORTANTE:** Substitua `[YOUR-PASSWORD]` pela senha real do banco
8. Clique em **Save**
9. Aguarde 1-2 minutos para redeploy

---

## 🔍 Como Identificar se a URL Está Errada

### ❌ URL ERRADA (com IPv6):
```
postgresql://postgres:senha@[2600:1f1e:75b:4b16:cce:f47b:a990:71b0]:5432/postgres
```

### ✅ URL CORRETA (com hostname):
```
postgresql://postgres:senha@db.hhhifxikyhvruwvmaduq.supabase.co:5432/postgres
```

### ✅ URL CORRETA (com pooler):
```
postgresql://postgres.xxxxx:senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## 📋 Checklist

- [ ] `DATABASE_URL` no Railway usa hostname (não IP)
- [ ] URL começa com `postgresql://`
- [ ] Contém `db.xxxxx.supabase.co` ou `pooler.supabase.com`
- [ ] Senha está correta (substituiu `[YOUR-PASSWORD]`)
- [ ] Aguardou 1-2 minutos após atualizar
- [ ] Verificou logs do Railway (não deve mais aparecer `ENETUNREACH`)

---

## 🧪 Testar a Conexão

Após atualizar, verifique os logs do Railway:

1. Railway → serviço `projetomensagem` → **Logs**
2. Procure por:
   - ✅ **SUCESSO:** `✅ Usando DATABASE_URL para conexão`
   - ✅ **SUCESSO:** `✅ Database connection test passed`
   - ❌ **ERRO:** `ENETUNREACH` (se ainda aparecer, a URL ainda está errada)

---

## 💡 Dica: Usar Connection Pooling

O Supabase oferece **Connection Pooling** que é mais eficiente:

1. No Supabase → Settings → Database
2. Use a opção **"Connection pooling"** (porta 6543)
3. Esta URL geralmente não tem problemas com IPv6

---

## 🚨 Se Ainda Não Funcionar

1. **Verifique se `SUPABASE_URL` está configurado no Railway:**
   - Railway → Variables → `SUPABASE_URL`
   - Deve ser: `https://hhhifxikyhvruwvmaduq.supabase.co`
   - Isso ajuda o código a detectar o project ID automaticamente

2. **Use Connection Pooling do Supabase:**
   - Mais estável e eficiente
   - Geralmente resolve problemas de conectividade

3. **Verifique a senha do banco:**
   - Certifique-se de que a senha na `DATABASE_URL` está correta
   - Pode ser resetada no Supabase → Settings → Database
