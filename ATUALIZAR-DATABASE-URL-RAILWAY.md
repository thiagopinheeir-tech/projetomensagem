# 🔧 Atualizar DATABASE_URL no Railway (Solução Manual)

## ⚠️ Problema
A `DATABASE_URL` no Railway contém um endereço IPv6 que não funciona:
```
postgresql://postgres:senha@2600:1f1e:75b:4b16:cce:f47b:a990:71b0:5432/postgres
```

## ✅ Solução: Usar Hostname do Supabase

### Passo 1: Obter a URL Correta do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Clique em **"Connect"** ou procure por **"Connection string"**
5. **IMPORTANTE:** Use a opção que mostra o **hostname** (não IP)
6. A URL deve ter este formato:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.hhhifxikyhvruwvmaduq.supabase.co:5432/postgres
   ```

### Passo 2: Atualizar no Railway

1. Acesse: https://railway.app
2. Vá no serviço **`projetomensagem`**
3. Clique na aba **"Variables"** (no topo)
4. Encontre a variável **`DATABASE_URL`**
5. Clique nos **3 pontos** (⋯) ao lado → **"Edit"**
6. **Substitua o valor** pela URL correta do Supabase
7. **IMPORTANTE:** Substitua `[YOUR-PASSWORD]` pela senha real do banco
8. Clique em **"Save"**
9. Aguarde 1-2 minutos para o Railway fazer redeploy

### Passo 3: Verificar se Funcionou

1. Railway → serviço `projetomensagem` → **Logs**
2. Procure por:
   - ✅ **SUCESSO:** `✅ Usando DATABASE_URL para conexão`
   - ✅ **SUCESSO:** `✅ Database connection test passed`
   - ❌ **ERRO:** Se ainda aparecer `ENETUNREACH`, a URL ainda está errada

---

## 📋 Formato Correto da URL

### ✅ CORRETO (com hostname):
```
postgresql://postgres:SUA_SENHA@db.hhhifxikyhvruwvmaduq.supabase.co:5432/postgres
```

### ❌ ERRADO (com IPv6):
```
postgresql://postgres:senha@2600:1f1e:75b:4b16:cce:f47b:a990:71b0:5432/postgres
```

### ❌ ERRADO (com IPv4):
```
postgresql://postgres:senha@192.168.1.1:5432/postgres
```

---

## 🔍 Como Identificar se Está Correto

A URL correta deve conter:
- ✅ `db.` seguido de letras/números
- ✅ `.supabase.co`
- ✅ **NÃO** deve ter apenas números e dois pontos (IPv6)
- ✅ **NÃO** deve ter apenas números e pontos (IPv4)

---

## 💡 Dica: Usar Connection Pooling

Para melhor performance e estabilidade, use o **Connection Pooling** do Supabase:

1. No Supabase → Settings → Database
2. Use a opção **"Connection pooling"** (porta 6543)
3. A URL será algo como:
   ```
   postgresql://postgres.xxxxx:senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Esta URL geralmente não tem problemas com IPv6

---

## ⚠️ Importante

- **NUNCA** compartilhe a senha do banco
- **SEMPRE** use o hostname do Supabase (não IPs)
- **VERIFIQUE** os logs após atualizar para confirmar que funcionou

---

## 🚨 Se Ainda Não Funcionar

1. **Verifique se `SUPABASE_URL` está configurado:**
   - Railway → Variables → `SUPABASE_URL`
   - Deve ser: `https://hhhifxikyhvruwvmaduq.supabase.co`
   - Isso ajuda o código a detectar o project ID automaticamente

2. **Verifique a senha:**
   - Certifique-se de que a senha na `DATABASE_URL` está correta
   - Pode ser resetada no Supabase → Settings → Database

3. **Use Connection Pooling:**
   - Mais estável e eficiente
   - Geralmente resolve problemas de conectividade
