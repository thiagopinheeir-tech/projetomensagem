# 🚀 Guia de Deploy do Frontend - JT DEV NOCODE

## Opções de Deploy Gratuito

### 1. **Vercel** (Recomendado - Mais fácil)
- ✅ Gratuito
- ✅ Deploy automático via GitHub
- ✅ HTTPS automático
- ✅ CDN global

### 2. **Netlify**
- ✅ Gratuito
- ✅ Deploy automático via GitHub
- ✅ HTTPS automático

---

## 📋 Deploy no Vercel (Recomendado)

### Passo 1: Criar o Projeto

1. **Acesse:** https://vercel.com
2. **Faça login** com sua conta GitHub
3. **Clique em:** "Add New Project" (ou "New Project")
4. **Selecione o repositório:** `thiagopinheeir-tech/projetomensagem`
5. **Clique em:** "Import"

### Passo 2: Configurar ANTES do Deploy

**IMPORTANTE:** Antes de clicar em "Deploy", configure as opções abaixo na tela de configuração:

**1. Framework Preset:**
- Deixe como **"Other"** ou **"Vite"** (se aparecer)

**2. Root Directory:**
- Clique em **"Edit"** ou **"Configure"** ao lado de "Root Directory"
- Digite: `top-active-whatsapp/frontend`
- Ou clique em **"Browse"** e navegue até a pasta `top-active-whatsapp/frontend`

**3. Build Command:**
- Deixe como está ou digite: `npm run build`

**4. Output Directory:**
- Digite: `dist`

**5. Install Command:**
- Deixe como: `npm install`

### Passo 3: Adicionar Variáveis de Ambiente

**Na mesma tela de configuração, role até "Environment Variables":**

1. Clique em **"Add"** ou **"Add Variable"**
2. Adicione:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://seu-backend.railway.app`
     *(Substitua pela URL real do seu backend no Railway)*
3. Clique em **"Add"** novamente para adicionar (opcional):
   - **Name:** `VITE_WS_PORT`
   - **Value:** `5001`

### Passo 4: Fazer o Deploy

1. Clique em **"Deploy"** (botão azul no final da página)
2. Aguarde 2-3 minutos enquanto o Vercel faz o build
3. Quando terminar, o Vercel vai mostrar uma URL (ex: `https://seu-projeto.vercel.app`)

---

### ⚠️ Se não encontrar "Root Directory" na tela inicial:

**Opção A: Configurar DEPOIS do primeiro deploy**

1. Faça o deploy normalmente (mesmo que dê erro)
2. Vá em **Settings** (ícone de engrenagem) do projeto
3. Vá em **"Build & Development Settings"**
4. Role até **"Root Directory"**
5. Clique em **"Edit"**
6. Digite: `top-active-whatsapp/frontend`
7. Clique em **"Save"**
8. Vá em **"Deployments"** e clique nos 3 pontinhos do último deploy
9. Clique em **"Redeploy"**

**Opção B: Usar vercel.json (MAIS FÁCIL)**

O arquivo `vercel.json` já está criado em `top-active-whatsapp/frontend/vercel.json`.

**Para usar:**
1. No Vercel, quando selecionar o repositório, ele vai detectar automaticamente
2. **OU** configure manualmente:
   - Root Directory: `top-active-whatsapp/frontend`
   - O Vercel vai ler o `vercel.json` automaticamente

---

## 📋 Deploy no Netlify

### Passo 1: Preparar

1. **Acesse:** https://netlify.com
2. **Faça login** com GitHub
3. **Clique em:** "Add new site" → "Import an existing project"
4. **Selecione:** `thiagopinheeir-tech/projetomensagem`

### Passo 2: Configurar

**Base directory:**
```
top-active-whatsapp/frontend
```

**Build command:**
```bash
npm run build
```

**Publish directory:**
```
dist
```

### Passo 3: Variáveis de Ambiente

Adicione no Netlify:
- `VITE_API_URL` = `https://seu-backend.railway.app`
- `VITE_WS_PORT` = `5001` (Opcional - apenas para desenvolvimento local)

---

## 🔧 Obter URL do Backend (Railway)

1. Acesse o Railway: https://railway.app
2. Vá no seu projeto
3. Clique no serviço `projetomensagem`
4. Vá em **Settings** → **Networking**
5. Copie a **Public Domain** (ex: `projetomensagem-production.up.railway.app`)
6. Use essa URL como `VITE_API_URL`

---

## ✅ Após o Deploy

1. **Frontend:** `https://seu-frontend.vercel.app`
2. **Backend:** `https://seu-backend.railway.app`

**Teste:**
- Acesse o frontend
- Faça login/registro
- Conecte seu WhatsApp
- Tudo deve funcionar! 🎉

---

## 🔄 Atualizações Automáticas

Tanto Vercel quanto Netlify fazem deploy automático quando você faz `git push` para o GitHub!
