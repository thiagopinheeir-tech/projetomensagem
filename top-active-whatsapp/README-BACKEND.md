# TOP ACTIVE WHATSAPP 2.0 - DOCUMENTAÇÃO COMPLETA DO BACKEND

## 📋 Estrutura do Projeto

```
top-active-whatsapp/
├── config/
│   ├── database.js          # PostgreSQL connection & initialization
│   └── redis.js             # Redis cache configuration
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── logger.js            # Request logging
│   ├── rateLimiter.js       # Rate limiting
│   └── errorHandler.js      # Error handling
├── routes/
│   ├── auth.js              # Registration & Login
│   ├── users.js             # User management
│   ├── messages.js          # Message sending
│   ├── contacts.js          # Contact management
│   ├── groups.js            # Group management
│   ├── chatbots.js          # Chatbot operations
│   ├── validator.js         # Number validation
│   └── analytics.js         # Analytics & reports
├── services/
│   ├── whatsappService.js   # WhatsApp API integration
│   ├── openaiService.js     # OpenAI GPT integration
│   └── csvService.js        # CSV parsing & export
├── utils/
│   ├── validators.js        # Input validation
│   ├── helpers.js           # Helper functions
│   └── constants.js         # Constants
├── migrations/
│   └── migrate.js           # Database migrations
├── seeds/
│   └── seed.js              # Initial data seeding
├── uploads/                 # File upload directory
├── logs/                    # Application logs
├── .env.example             # Environment variables template
├── package.json             # Dependencies
└── server.js                # Express server entry point
```

## 🔌 API ENDPOINTS

### AUTENTICAÇÃO (Public)

#### POST /api/auth/register
Registra novo usuário
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "João Silva",
  "company_name": "Minha Empresa"
}
```
Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "uuid": "abc123...",
    "email": "user@example.com",
    "plan": "free"
  },
  "token": "eyJhbGc..."
}
```

#### POST /api/auth/login
Autentica usuário
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### GET /api/auth/verify
Verifica validade do token (Header: Authorization: Bearer TOKEN)

---

### USUÁRIOS (Protected)

#### GET /api/users/profile
Retorna perfil do usuário autenticado
Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "João Silva",
    "company_name": "Minha Empresa",
    "plan": "free",
    "created_at": "2026-01-06T12:00:00Z"
  }
}
```

#### PUT /api/users/profile
Atualiza perfil
```json
{
  "full_name": "João Pedro Silva",
  "company_name": "Nova Empresa",
  "phone": "5511999999999"
}
```

#### PUT /api/users/api-keys
Atualiza chaves de API
```json
{
  "whatsapp_api_token": "your_token_here",
  "openai_api_key": "sk-..."
}
```

#### POST /api/users/upload-avatar
Upload de foto de perfil (multipart/form-data)

---

### MENSAGENS (Protected)

#### POST /api/messages/send-simple
Envia mensagem simples
```json
{
  "phone": "5511999999999",
  "message": "Olá, tudo bem?",
  "attachment_url": "https://..."
}
```

#### POST /api/messages/send-multiple
Envia múltiplas mensagens via CSV
```json
{
  "contacts": [
    {
      "phone": "5511999999999",
      "name": "João",
      "var1": "valor1"
    }
  ],
  "message_template": "Olá [NOME], você tem [VAR1]",
  "interval": 5,
  "attachment_url": "https://..."
}
```

#### GET /api/messages/history
Retorna histórico de mensagens
Query params:
- `page`: 1
- `limit`: 20
- `status`: pending, sent, delivered, failed

Response:
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "phone": "5511999999999",
      "message": "Olá",
      "status": "delivered",
      "sent_at": "2026-01-06T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

#### GET /api/messages/:id
Retorna detalhes de uma mensagem

#### DELETE /api/messages/:id
Deleta uma mensagem

---

### CONTATOS (Protected)

#### POST /api/contacts/import
Importa contatos via CSV
```json
{
  "file": FormData,
  "validate_whatsapp": true
}
```

#### GET /api/contacts
Lista contatos do usuário
Query params:
- `page`: 1
- `limit`: 50
- `search`: buscar por nome/número
- `status`: active, inactive

Response:
```json
{
  "success": true,
  "contacts": [
    {
      "id": 1,
      "uuid": "abc123...",
      "phone": "5511999999999",
      "name": "João Silva",
      "email": "joao@example.com",
      "status": "active",
      "has_whatsapp": true,
      "created_at": "2026-01-06T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1
  }
}
```

#### POST /api/contacts
Cria novo contato
```json
{
  "phone": "5511999999999",
  "name": "João Silva",
  "email": "joao@example.com",
  "address": "Rua X, 123"
}
```

#### PUT /api/contacts/:id
Atualiza contato

#### DELETE /api/contacts/:id
Deleta contato

#### POST /api/contacts/extract
Extrai contatos do WhatsApp Web (requer integração Baileys)
```json
{
  "auto_validate": true
}
```

#### POST /api/contacts/send-message
Envia mensagem para contatos selecionados
```json
{
  "contact_ids": [1, 2, 3],
  "message": "Olá [NOME]!",
  "attachment_url": "https://..."
}
```

#### GET /api/contacts/export
Exporta contatos em CSV

---

### GRUPOS (Protected)

#### GET /api/groups
Lista grupos do usuário

#### POST /api/groups/extract
Extrai grupos do WhatsApp Web
```json
{
  "include_archived": true
}
```

#### GET /api/groups/:id/members
Lista membros de um grupo

#### POST /api/groups/:id/extract-members
Extrai membros de um grupo específico

#### POST /api/groups/send-message
Envia mensagem para grupos
```json
{
  "group_ids": [1, 2],
  "message": "Mensagem para grupo",
  "attachment_url": "https://..."
}
```

#### POST /api/groups/:id/send-to-members
Envia DM para todos os membros do grupo
```json
{
  "message": "Mensagem privada",
  "exclude_admins": false
}
```

---

### VALIDADOR (Protected)

#### POST /api/validator/validate
Valida lista de números WhatsApp
```json
{
  "file": FormData,
  "country_code": "55"
}
```

#### GET /api/validator/results/:id
Retorna resultados de validação anterior
```json
{
  "success": true,
  "validation": {
    "id": 1,
    "total_numbers": 1000,
    "valid_numbers": 856,
    "invalid_numbers": 144,
    "success_rate": 85.6,
    "valid_list": ["5511999999999", ...]
  }
}
```

#### GET /api/validator/export/:id
Exporta números válidos em CSV

---

### CHATBOTS (Protected)

#### GET /api/chatbots
Lista chatbots do usuário

#### POST /api/chatbots
Cria novo chatbot
```json
{
  "name": "Meu Chatbot",
  "type": "regular",
  "greeting_message": "Olá! Como posso ajudar?",
  "config": {}
}
```

#### PUT /api/chatbots/:id
Atualiza chatbot

#### DELETE /api/chatbots/:id
Deleta chatbot

#### POST /api/chatbots/:id/activate
Ativa chatbot
```json
{
  "status": "active"
}
```

#### POST /api/chatbots/:id/deactivate
Desativa chatbot

#### POST /api/chatbots/:id/rules
Adiciona regra ao chatbot regular
```json
{
  "trigger": "1",
  "response": "Você selecionou a opção 1"
}
```

#### GET /api/chatbots/:id/conversations
Lista conversas do chatbot

#### GET /api/chatbots/:id/conversations/:contactId
Retorna histórico de conversa com contato

#### POST /api/chatbots/:id/test
Testa chatbot (simula conversa)
```json
{
  "message": "Olá",
  "conversation_id": "optional"
}
```

---

### ANALÍTICAS (Protected)

#### GET /api/analytics/dashboard
Retorna estatísticas do dashboard
Response:
```json
{
  "success": true,
  "stats": {
    "messages_sent_today": 125,
    "messages_sent_week": 856,
    "messages_sent_month": 3421,
    "total_contacts": 312,
    "total_groups": 28,
    "active_chatbots": 3,
    "delivery_rate": 94.5
  }
}
```

#### GET /api/analytics/messages
Relatório de mensagens
Query params: `period` (day, week, month, year)
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-01-06",
      "sent": 125,
      "delivered": 118,
      "failed": 7,
      "rate": 94.4
    }
  ]
}
```

#### GET /api/analytics/contacts
Relatório de contatos
```json
{
  "success": true,
  "data": {
    "total": 312,
    "active": 290,
    "inactive": 22,
    "with_whatsapp": 289,
    "without_whatsapp": 23
  }
}
```

#### GET /api/analytics/chatbots
Relatório de chatbots
```json
{
  "success": true,
  "data": [
    {
      "chatbot_id": 1,
      "name": "Chatbot Vendas",
      "type": "sales",
      "conversations": 145,
      "revenue": 2850.00,
      "active": true
    }
  ]
}
```

#### GET /api/analytics/export
Exporta relatórios em PDF/CSV
Query params: `type` (pdf, csv), `period` (day, week, month, year)

---

## 🔐 AUTENTICAÇÃO

Todos os endpoints protegidos requerem:
```
Header: Authorization: Bearer YOUR_JWT_TOKEN
```

Token JWT contém:
- `id`: ID do usuário
- `uuid`: UUID único do usuário
- `email`: Email do usuário
- `iat`: Issued at (timestamp)
- `exp`: Expiration time

---

## 📊 ESTRUTURA DE DADOS

### User
```sql
- id (PK)
- uuid (UNIQUE)
- email (UNIQUE)
- password (hashed)
- full_name
- company_name
- phone
- plan (free, pro, enterprise)
- status (active, suspended)
- whatsapp_api_token
- openai_api_key
- created_at
- updated_at
```

### Contact
```sql
- id (PK)
- uuid (UNIQUE)
- user_id (FK)
- phone
- name
- email
- last_name
- address
- city, state, zip_code
- variables (JSONB)
- status
- has_whatsapp
- created_at
- updated_at
```

### Message
```sql
- id (PK)
- uuid (UNIQUE)
- user_id (FK)
- contact_id (FK)
- group_id (FK)
- message_type
- content
- attachments (JSONB)
- variables (JSONB)
- status (pending, sent, delivered, failed)
- sent_at
- delivered_at
- read_at
- error_message
- created_at
```

### Chatbot
```sql
- id (PK)
- uuid (UNIQUE)
- user_id (FK)
- name
- type (regular, sales, gpt)
- greeting_message
- tone
- business_description
- status (active, inactive)
- config (JSONB)
- created_at
- updated_at
```

---

## 🚀 INSTALAÇÃO E USO

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar .env
```bash
cp .env.example .env
# Edite .env com suas configurações
```

### 3. Inicializar banco de dados
```bash
npm run migrate
npm run seed
```

### 4. Iniciar servidor
```bash
npm run dev          # Desenvolvimento
npm start            # Produção
```

### 5. Verificar saúde
```bash
curl http://localhost:5000/health
```

---

## 📦 INTEGRAÇÕES EXTERNAS

### WhatsApp Cloud API
- Endpoint: `https://graph.instagram.com/v18.0`
- Requer: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- Função: Enviar mensagens via API oficial

### OpenAI GPT
- Endpoint: `https://api.openai.com/v1`
- Requer: `OPENAI_API_KEY`
- Modelos: gpt-3.5-turbo, gpt-4, gpt-4-turbo

### Baileys (WhatsApp Web)
- Alternativa para WhatsApp sem API oficial
- Requer: `BAILEYS_ENABLED=true`
- ⚠️ Pode resultar em ban - use com cautela

---

## 🔒 SEGURANÇA

- ✅ Passwords hash com bcryptjs (10 rounds)
- ✅ JWT authentication com expiração
- ✅ Rate limiting (100 req/15 min)
- ✅ CORS configurado
- ✅ Helmet.js para headers de segurança
- ✅ Input validation e sanitization
- ✅ SQL injection protection (prepared statements)
- ✅ HTTPS recomendado em produção

---

## 📝 EXEMPLO DE USO COMPLETO

```bash
# 1. Registrar
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123",
    "full_name": "João Silva"
  }'

# Resposta: { "token": "eyJhbGc...", "user": {...} }

# 2. Importar contatos
curl -X POST http://localhost:5000/api/contacts/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@contacts.csv"

# 3. Enviar mensagem
curl -X POST http://localhost:5000/api/messages/send-multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [...],
    "message_template": "Olá [NOME]!",
    "interval": 5
  }'

# 4. Ver analíticas
curl -X GET http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🛠️ VARIÁVEIS DE AMBIENTE

```env
# Servidor
PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000

# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/top_active
DB_HOST=localhost
DB_PORT=5432
DB_NAME=top_active_whatsapp
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRATION=7d

# WhatsApp
WHATSAPP_API_URL=https://graph.instagram.com/v18.0
WHATSAPP_API_TOKEN=your_token
WHATSAPP_PHONE_ID=your_phone_id

# OpenAI
OPENAI_API_KEY=sk-your_key
OPENAI_MODEL=gpt-4

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📞 SUPORTE

Para dúvidas ou sugestões, abra uma issue no repositório.

---

**Top Active WhatsApp 2.0 - Backend API v2.0.0**
*Desenvolvido para automação profissional no WhatsApp*
