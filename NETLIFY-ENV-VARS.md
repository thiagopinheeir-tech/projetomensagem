# Configurar Variáveis de Ambiente no Netlify

## Problema
O frontend está tentando conectar a `localhost:5000`, o que não funciona quando hospedado no Netlify. É necessário configurar a URL do backend (Railway).

## Solução: Configurar VITE_API_URL no Netlify

### Passo 1: Obter URL do Backend (Railway)
1. Acesse seu projeto no Railway: https://railway.app
2. Vá em **Settings** → **Domains**
3. Copie a URL do seu backend (ex: `https://seu-projeto.up.railway.app`)

### Passo 2: Configurar no Netlify Dashboard

1. Acesse: https://app.netlify.com
2. Selecione seu site
3. Vá em: **Site settings** → **Environment variables**
4. Clique em **Add a variable**
5. Adicione:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://seu-projeto.up.railway.app` (substitua pela URL real do Railway)
6. Clique em **Save**

### Passo 3: Fazer Novo Deploy

Após adicionar a variável:
1. Vá em **Deploys**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Trigger deploy** → **Deploy site**
4. OU faça um novo commit/push para trigger automático

## Verificação

Após o deploy, abra o console do navegador (F12) e verifique:
- Deve aparecer: `🔗 API URL configurada: https://seu-projeto.up.railway.app`
- Não deve mais aparecer: `localhost:5000`

## Variáveis Opcionais (se necessário)

Se você usar WebSocket separado:
- **Key:** `VITE_WS_PORT`
- **Value:** `5001` (ou a porta que você usa)

## Importante

⚠️ **Variáveis que começam com `VITE_` são expostas no frontend!**
- Não coloque senhas ou tokens secretos em variáveis `VITE_*`
- Apenas URLs públicas e configurações não sensíveis

## Exemplo de Configuração

```
VITE_API_URL = https://top-active-whatsapp-production.up.railway.app
```

## Troubleshooting

### Erro: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
- ✅ Verifique se `VITE_API_URL` está configurada no Netlify
- ✅ Verifique se a URL está correta (sem espaços, com https://)
- ✅ Faça um novo deploy após adicionar a variável

### Erro: "CORS policy"
- ✅ Verifique se o backend (Railway) tem `CORS_ORIGIN` configurado com a URL do Netlify
- ✅ Exemplo: `CORS_ORIGIN=https://seu-site.netlify.app`
