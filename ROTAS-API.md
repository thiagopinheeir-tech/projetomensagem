# 📋 Rotas da API - Top Active WhatsApp

## ✅ Rotas Disponíveis:

### **Raiz:**
- `GET /` - Informações da API e rotas disponíveis

### **Health Check:**
- `GET /health` - Status do servidor e banco de dados

### **Autenticação:**
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter usuário atual
- `POST /api/auth/logout` - Logout

### **Usuários:**
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil

### **Mensagens:**
- `POST /api/messages/send-simple` - Enviar mensagem simples
- `GET /api/messages` - Listar mensagens

### **Chatbot:**
- `GET /api/chatbot/config` - Configurações do chatbot
- `PUT /api/chatbot/config` - Atualizar configurações

### **Conversas:**
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/:id` - Detalhes da conversa

### **WhatsApp:**
- `POST /api/whatsapp/connect` - Conectar WhatsApp
- `GET /api/whatsapp/status` - Status da conexão
- `POST /api/whatsapp/disconnect` - Desconectar

### **Google Calendar:**
- `GET /api/google/oauth/start` - Iniciar OAuth Google
- `GET /api/google/calendars` - Listar calendários
- `POST /api/google/calendar/select` - Selecionar calendário

### **CRM:**
- `GET /api/crm/customers` - Listar clientes
- `POST /api/crm/customers` - Criar cliente

### **Automações:**
- `GET /api/automations` - Listar automações
- `POST /api/automations` - Criar automação

### **API Keys:**
- `GET /api/api-keys` - Listar chaves API
- `POST /api/api-keys` - Adicionar chave API

---

## 🧪 Testar:

### **1. Raiz (informações):**
```
GET https://sua-url-railway.app/
```

### **2. Health Check:**
```
GET https://sua-url-railway.app/health
```

### **3. Registrar usuário:**
```
POST https://sua-url-railway.app/api/auth/register
Content-Type: application/json

{
  "email": "teste@example.com",
  "password": "senha123",
  "full_name": "Teste User",
  "company_name": "Teste Company"
}
```

---

## ⚠️ Erro "Route not found":

Se você receber `{"success":false,"message":"Route not found"}`:

1. **Verifique se a rota começa com `/api/`** (para rotas da API)
2. **Use `/health`** para testar se o servidor está funcionando
3. **Use `/`** para ver todas as rotas disponíveis

---

## 🔗 Exemplo de URLs:

Se sua URL Railway for: `https://projetomensagem-production.up.railway.app`

- ✅ `https://projetomensagem-production.up.railway.app/` - Informações
- ✅ `https://projetomensagem-production.up.railway.app/health` - Health check
- ✅ `https://projetomensagem-production.up.railway.app/api/auth/register` - Registrar

---

**Agora você pode testar `/` ou `/health` no navegador!** 🚀
