# 🔧 Resolver Erro de Conexão Frontend → Backend

## ❌ Erro Atual
```
Não foi possível conectar ao servidor em https://projetomensagem-production.up.railway.app
```

---

## 🔍 Passo 1: Verificar se o Backend está Rodando

### No Railway:
1. Acesse: https://railway.app
2. Vá no serviço `projetomensagem`
3. Clique em **"Logs"** (aba no topo)
4. Procure por:
   - ✅ **SUCESSO:** `✅ 🚀 JT DEV NOCODE 2.0 Started on port 5000`
   - ❌ **ERRO:** `❌ Database error` ou `ECONNREFUSED` ou `Error: listen EADDRINUSE`

### Se o backend NÃO está rodando:
- Verifique os logs para ver qual erro está ocorrendo
- Verifique se todas as variáveis de ambiente estão configuradas
- Aguarde 1-2 minutos após adicionar variáveis (Railway faz redeploy automático)

---

## 🔍 Passo 2: Verificar a URL do Backend

### No Vercel (Frontend):
1. Acesse: https://vercel.com
2. Vá no seu projeto do frontend
3. Clique em **Settings** → **Environment Variables**
4. Verifique a variável `VITE_API_URL`:
   - ✅ **CORRETO:** `https://projetomensagem-production.up.railway.app`
   - ❌ **ERRADO:** `_https://projetomensagem-production.up.railway.app` (com underscore no início)
   - ❌ **ERRADO:** `https://projetomensagem-production.up.railway.app/` (com barra no final)
   - ❌ **ERRADO:** `projetomensagem-production.up.railway.app` (sem https://)

### Se a URL estiver errada:
1. Edite a variável `VITE_API_URL`
2. Remova espaços, underscores ou barras extras
3. Deve ser exatamente: `https://projetomensagem-production.up.railway.app`
4. Salve e aguarde o redeploy (1-2 minutos)

---

## 🔍 Passo 3: Verificar CORS no Railway

### No Railway:
1. Acesse: https://railway.app
2. Vá no serviço `projetomensagem`
3. Clique em **Variables**
4. Verifique a variável `CORS_ORIGIN`:
   - ✅ **CORRETO:** `*` (permite todas as origens)
   - ✅ **CORRETO:** URL específica do seu frontend no Vercel
   - ❌ **ERRADO:** Não existe ou está vazia

### Se CORS_ORIGIN não estiver configurado:
1. Clique em **"New Variable"**
2. **Name:** `CORS_ORIGIN`
3. **Value:** `*` (ou URL específica do frontend)
4. **Environment:** Production
5. Clique em **"Add"**
6. Aguarde 1-2 minutos para redeploy

---

## 🔍 Passo 4: Testar a URL do Backend Diretamente

### No Navegador:
1. Abra uma nova aba
2. Acesse: `https://projetomensagem-production.up.railway.app/health`
3. **Esperado:** Deve retornar JSON com `{ "status": "ok" }` ou similar
4. **Se der erro:**
   - ❌ **404 Not Found:** Backend não está rodando ou rota não existe
   - ❌ **Connection Refused:** Backend não está acessível
   - ❌ **Timeout:** Backend está demorando muito para responder

### Se não funcionar:
- Verifique os logs do Railway para ver o que está acontecendo
- Verifique se o backend iniciou corretamente

---

## 🔍 Passo 5: Verificar Variáveis de Ambiente no Railway

### Verifique se TODAS estas variáveis estão configuradas:

- [ ] `DATABASE_URL` ✅ (já configurado)
- [ ] `SUPABASE_URL` ✅ (já configurado)
- [ ] `SUPABASE_SERVICE_KEY` ✅ (já configurado)
- [ ] `JWT_SECRET` ✅ (já configurado)
- [ ] `ENCRYPTION_KEY` ✅ (já configurado)
- [ ] `CORS_ORIGIN` ⚠️ (verificar se está configurado)

### Se alguma estiver faltando:
- Adicione no Railway → Variables → New Variable
- Aguarde 1-2 minutos para redeploy

---

## 🔍 Passo 6: Verificar Console do Navegador

### No Frontend:
1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por mensagens de erro:
   - `❌ Erro de conexão:` - Mostra detalhes do erro
   - `🔗 API URL configurada:` - Mostra a URL que está sendo usada
   - `CORS policy` - Indica problema de CORS

### Erros comuns no console:
- **`CORS policy`:** Problema de CORS - configure `CORS_ORIGIN` no Railway
- **`Network Error`:** Backend não está acessível - verifique se está rodando
- **`ECONNREFUSED`:** Backend não está respondendo - verifique logs do Railway

---

## ✅ Checklist de Resolução

1. [ ] Backend está rodando no Railway (verificar logs)
2. [ ] `VITE_API_URL` no Vercel está correta (sem espaços/underscores)
3. [ ] `CORS_ORIGIN` no Railway está configurado (`*` ou URL específica)
4. [ ] URL do backend responde em `/health` no navegador
5. [ ] Todas as variáveis obrigatórias estão configuradas no Railway
6. [ ] Console do navegador não mostra erros de CORS

---

## 🚨 Solução Rápida (Se Nada Funcionar)

1. **No Railway:**
   - Vá em **Variables**
   - Adicione/verifique `CORS_ORIGIN` = `*`
   - Aguarde 2 minutos

2. **No Vercel:**
   - Vá em **Settings** → **Environment Variables**
   - Verifique `VITE_API_URL` = `https://projetomensagem-production.up.railway.app`
   - Remova qualquer espaço ou caractere extra
   - Aguarde 2 minutos

3. **Teste novamente:**
   - Limpe o cache do navegador (Ctrl+Shift+Delete)
   - Tente criar conta novamente

---

## 📞 Se Ainda Não Funcionar

Envie:
1. Screenshot dos **Logs do Railway** (últimas 20 linhas)
2. Screenshot do **Console do Navegador** (F12 → Console)
3. Screenshot das **Variables do Railway** (mostrando CORS_ORIGIN)
4. Screenshot das **Environment Variables do Vercel** (mostrando VITE_API_URL)
