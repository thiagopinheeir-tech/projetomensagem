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

### Passo 1: Preparar o Frontend

1. **Acesse:** https://vercel.com
2. **Faça login** com sua conta GitHub
3. **Clique em:** "Add New Project"
4. **Selecione o repositório:** `thiagopinheeir-tech/projetomensagem`

### Passo 2: Configurar o Projeto

**Root Directory:**
```
top-active-whatsapp/frontend
```

**Build Command:**
```bash
npm install && npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```bash
npm install
```

### Passo 3: Variáveis de Ambiente

Adicione estas variáveis no Vercel:

**VITE_API_URL:**
```
https://seu-backend.railway.app
```
*(Substitua `seu-backend.railway.app` pela URL do seu backend no Railway)*

**VITE_WS_PORT:** (Opcional - apenas para desenvolvimento local)
```
5001
```
*(Em produção, o WebSocket usa a mesma URL do backend no path `/ws`)*

### Passo 4: Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. O Vercel vai gerar uma URL (ex: `https://seu-projeto.vercel.app`)

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
