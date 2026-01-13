# Guia de Configuração Multi-Tenant

## ✅ Implementação Concluída

O sistema foi transformado em uma plataforma SaaS multi-tenant onde cada cliente tem:
- ✅ Sessão WhatsApp isolada
- ✅ Credenciais próprias (OpenAI API Key, Google OAuth)
- ✅ Dados completamente isolados por `user_id`
- ✅ Criptografia de credenciais sensíveis

## 📋 Próximos Passos

### 1. Executar Migração do Banco de Dados

**IMPORTANTE:** Execute a migração antes de iniciar o sistema:

```bash
# Conecte ao PostgreSQL e execute:
psql -U seu_usuario -d seu_banco -f sql/migrate-to-multi-tenant.sql
```

Ou via Supabase SQL Editor:
- Copie o conteúdo de `sql/migrate-to-multi-tenant.sql`
- Cole no SQL Editor do Supabase
- Execute

### 2. Configurar Variável de Ambiente

Adicione no seu `.env`:

```env
# Chave de criptografia (OBRIGATÓRIO)
# Gere uma chave segura: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=sua_chave_hex_de_64_caracteres_aqui
```

**⚠️ IMPORTANTE:** 
- Esta chave é crítica para descriptografar credenciais
- Se perder, todas as credenciais criptografadas serão perdidas
- Guarde em local seguro

### 3. Reiniciar o Servidor

```bash
# Parar o servidor atual
# Depois iniciar novamente
npm start
# ou
node server.js
```

### 4. Testar Multi-Tenant

Execute o script de teste:

```bash
node scripts/test-multi-tenant.js
```

Este script irá:
- Criar 2 usuários de teste
- Criar API keys isoladas
- Criar conversas isoladas
- Validar que os dados estão isolados

### 5. Primeiro Acesso (Cliente)

1. **Registrar novo cliente:**
   - Acesse `/login` ou `/register`
   - Crie uma conta (ex: `thiagowdw1@hotmail.com`)

2. **Configurar credenciais:**
   - Acesse `/settings`
   - Adicione OpenAI API Key
   - Conecte Google Calendar

3. **Conectar WhatsApp:**
   - Acesse `/whatsapp-connection`
   - Clique em "Conectar WhatsApp"
   - Escaneie o QR code

4. **Configurar Chatbot:**
   - Acesse `/chatbot`
   - Configure seu perfil de chatbot
   - Ative o perfil

## 🔐 Segurança

### Criptografia
- Todas as credenciais sensíveis são criptografadas usando AES-256-GCM
- A chave `ENCRYPTION_KEY` deve ser mantida em segredo
- Nunca commite a chave no repositório

### Isolamento de Dados
- Todas as queries filtram por `user_id`
- Middleware `requireUserId` garante que `req.userId` está presente
- Validações de ownership em operações UPDATE/DELETE

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:
- `services/encryption.js` - Serviço de criptografia
- `services/whatsapp-manager.js` - Gerenciador de múltiplas instâncias WhatsApp
- `middleware/data-isolation.js` - Middleware de isolamento
- `routes/api-keys.js` - Rotas para gerenciar API keys
- `sql/migrate-to-multi-tenant.sql` - Script de migração
- `frontend/src/pages/Settings.jsx` - Página de configurações
- `frontend/src/pages/WhatsAppConnection.jsx` - Página de conexão WhatsApp
- `scripts/test-multi-tenant.js` - Script de teste

### Arquivos Modificados:
- `services/whatsapp.js` - Agora aceita `userId` no construtor
- `services/ai-chatbot.js` - Usa API key do usuário
- `services/google-calendar-oauth.js` - Suporta múltiplos usuários
- `services/conversation-manager.js` - Filtra por `user_id`
- `services/automation-service.js` - Filtra por `user_id`
- `routes/whatsapp.js` - Rotas por usuário
- `routes/conversations.js` - Filtra por `user_id`
- `routes/messages.js` - Usa WhatsAppManager
- `controllers/chatbotController.js` - Usa WhatsAppManager
- `controllers/crmController.js` - Filtra por `user_id`
- `controllers/googleOAuthController.js` - Usa novo serviço de criptografia
- `server.js` - Não inicializa WhatsApp único
- `frontend/src/App.jsx` - Rotas para Settings e WhatsAppConnection
- `frontend/src/components/Sidebar.jsx` - Links para novas páginas

## 🧪 Testes

### Teste Manual:
1. Crie 2 contas diferentes
2. Configure API keys diferentes em cada uma
3. Conecte WhatsApps diferentes
4. Verifique que os dados estão isolados

### Teste Automatizado:
```bash
node scripts/test-multi-tenant.js
```

## ⚠️ Problemas Conhecidos

1. **Dados existentes:** Se você já tinha dados antes da migração, eles foram atribuídos ao primeiro usuário (admin). Você pode redistribuir manualmente se necessário.

2. **WhatsApp antigo:** Se você tinha uma sessão WhatsApp conectada antes, ela pode estar no diretório `.wwebjs_auth/default`. As novas sessões estarão em `.wwebjs_auth/user_{userId}/`.

## 🚀 Pronto para Produção

Após executar a migração e configurar `ENCRYPTION_KEY`, o sistema está pronto para:
- Múltiplos clientes simultâneos
- Cada cliente com sua própria sessão WhatsApp
- Credenciais isoladas e criptografadas
- Dados completamente separados
