# 🔧 Corrigir Erro de Conexão Frontend-Backend

## ❌ Erro: "Não foi possível conectar ao servidor"

Este erro acontece quando o frontend não consegue se conectar ao backend.

---

## ✅ Solução 1: Verificar Variável de Ambiente no Vercel

### Passo 1: Acessar Configurações do Vercel

1. Acesse: https://vercel.com
2. Vá no seu projeto
3. Clique em **Settings** (ícone de engrenagem)
4. Vá em **Environment Variables**

### Passo 2: Verificar/Criar Variável

**Verifique se existe:**
- `VITE_API_URL` = `https://projetomensagem-production.up.railway.app`

**Se não existir:**
1. Clique em **"Add New"**
2. **Name:** `VITE_API_URL`
3. **Value:** `https://projetomensagem-production.up.railway.app`
4. **Environment:** Selecione **Production** (e Development se quiser)
5. Clique em **Save**

### Passo 3: Fazer Redeploy

1. Vá em **Deployments**
2. Clique nos **3 pontinhos** do último deploy
3. Clique em **"Redeploy"**
4. Aguarde 2-3 minutos

---

## ✅ Solução 2: Configurar CORS no Railway

### Passo 1: Adicionar Variável CORS_ORIGIN

1. Acesse: https://railway.app
2. Vá no seu projeto
3. Clique no serviço `projetomensagem`
4. Vá em **Variables**
5. Adicione:

**Name:** `CORS_ORIGIN`
**Value:** `https://seu-projeto.vercel.app` (substitua pela URL do seu frontend no Vercel)

**OU** para permitir todas as origens (menos seguro, mas funciona):
**Value:** `*`

### Passo 2: Reiniciar o Serviço

1. Vá em **Settings**
2. Clique em **"Restart"** ou aguarde o deploy automático

---

## ✅ Solução 3: Verificar se Backend está Online

### Teste 1: Acessar URL do Backend

Abra no navegador:
```
https://projetomensagem-production.up.railway.app
```

**Deve retornar:**
```json
{
  "success": true,
  "message": "JT DEV NOCODE API v2.0",
  ...
}
```

### Teste 2: Testar Endpoint de Registro

Abra no navegador:
```
https://projetomensagem-production.up.railway.app/api/auth/register
```

**Deve retornar erro de método (isso é normal, significa que o endpoint existe)**

---

## ✅ Solução 4: Verificar Console do Navegador

1. Abra o frontend no navegador
2. Pressione **F12** (ou clique direito → Inspecionar)
3. Vá na aba **Console**
4. Tente criar a conta novamente
5. Veja se há erros de CORS ou conexão

**Erros comuns:**
- `CORS policy`: Problema de CORS (Solução 2)
- `Network Error`: Backend offline ou URL errada (Solução 1)
- `ECONNREFUSED`: Backend não está rodando (verificar Railway)

---

## 🔍 Checklist Rápido

- [ ] `VITE_API_URL` configurada no Vercel?
- [ ] URL do backend está correta? (`https://projetomensagem-production.up.railway.app`)
- [ ] Frontend foi redeployado após adicionar variável?
- [ ] `CORS_ORIGIN` configurado no Railway?
- [ ] Backend está online? (testar URL no navegador)
- [ ] Console do navegador mostra algum erro específico?

---

## 📞 Se ainda não funcionar

1. Verifique os logs do Railway (Settings → Logs)
2. Verifique os logs do Vercel (Deployments → View Function Logs)
3. Teste a URL do backend diretamente no navegador
4. Verifique se a variável `VITE_API_URL` está sendo usada (console do navegador)
