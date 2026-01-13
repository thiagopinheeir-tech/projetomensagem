# 🚀 Integração Supabase - Top Active WhatsApp

## 📋 O que foi implementado?

✅ **Instalado**: `@supabase/supabase-js` - SDK oficial do Supabase  
✅ **Criado**: `config/supabase.js` - Cliente e helpers  
✅ **Integrado**: `services/conversation-manager.js` - Salva dados no Supabase  
✅ **Schema SQL**: `sql/supabase-setup.sql` - Tabelas e índices  
✅ **Env Example**: Variáveis de ambiente adicionadas  

---

## 🔧 Como Configurar?

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Clique em **New Project**
3. Preencha os dados:
   - **Name**: `top-active-whatsapp`
   - **Database Password**: Use uma senha forte
   - **Region**: Escolha a mais próxima
4. Aguarde a criação (~2 min)

### 2. Obter Chaves de Acesso

1. Vá para **Settings → API**
2. Copie:
   - `Project URL` → `SUPABASE_URL`
   - `anon key` → `SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_KEY` (para admin)

### 3. Configurar Variáveis de Ambiente

Edite `.env` na raiz do projeto:

```bash
# ============ SUPABASE ============
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=seu-token-anonimo
SUPABASE_SERVICE_KEY=seu-token-servico
```

### 4. Criar Schema no Supabase

1. Abra o **SQL Editor** no Dashboard do Supabase
2. Copie TODO o conteúdo de `sql/supabase-setup.sql`
3. Cole no editor
4. Clique em **Run**

✅ Pronto! Tabelas, índices e políticas de segurança criadas.

---

## 📊 Estrutura de Dados

### Tabelas Principais

| Tabela | Descrição | Campos |
|--------|-----------|--------|
| **users** | Usuários do sistema | id, email, name, phone, subscription_plan |
| **configurations** | Configurações por usuário | user_id, whatsapp_number, openai_api_key, business_name |
| **chat_history** | Histórico de conversas | phone, user_message, ai_response, created_at |
| **conversations** | Threads de conversas | user_id, phone, subject, status |
| **messages** | Mensagens individuais | conversation_id, sender, content, media_url |
| **contacts** | Contatos de clientes | user_id, phone, name, tags, last_message_date |
| **campaigns** | Campanhas de mensagens | user_id, name, message_template, target_contacts |
| **audit_logs** | Logs de auditoria | user_id, action, resource_type, created_at |

---

## 🔐 Segurança - Row Level Security (RLS)

Todas as tabelas têm RLS ativado. Usuários só acessam seus próprios dados:

```sql
-- Exemplo: Usuário só vê suas próprias conversas
CREATE POLICY "Users can only access their conversations" 
ON conversations FOR ALL USING (auth.uid() = user_id);
```

---

## 💻 Como Usar no Backend?

### Exemplo 1: Salvar Mensagem de Chat

```javascript
const { db } = require('../config/supabase');

// Salvar conversa
await db.saveChatMessage(
  '5511999999999',  // phone
  'Olá, tudo bem?',  // user_message
  'Tudo bem sim! Como posso ajudar?'  // ai_response
);
```

### Exemplo 2: Buscar Histórico

```javascript
const { db } = require('../config/supabase');

// Buscar últimas 10 mensagens
const { data } = await db.getChatHistory('5511999999999', 10);
console.log(data);
// [
//   { phone: '55...', user_message: '...', ai_response: '...', created_at: '...' },
//   ...
// ]
```

### Exemplo 3: Atualizar Configuração

```javascript
const { db } = require('../config/supabase');

await db.updateConfig(userId, {
  whatsapp_number: '5511999999999',
  business_name: 'Minha Empresa',
  enable_chatbot: true
});
```

---

## 📱 Frontend - Acessar Dados

### Setup no Frontend (React)

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Exemplo: Buscar Mensagens Recentes

```javascript
import { supabase } from './lib/supabase';

async function getRecientMessages(phone) {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) console.error(error);
  return data;
}
```

### Real-time Subscriptions

```javascript
import { supabase } from './lib/supabase';

// Escutar novas mensagens em tempo real
supabase
  .channel('chat_history_channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_history' },
    (payload) => {
      console.log('Nova mensagem:', payload.new);
      // Atualizar UI aqui
    }
  )
  .subscribe();
```

---

## 🚀 Deployment em Produção

### 1. Usar Service Role Key com Segurança

Para operações privilegiadas (admin), use a `service_role_key` APENAS no backend:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
```

### 2. Configurar CORS no Supabase

1. Vá para **Settings → API**
2. Adicione seus domínios em **CORS Allowed Origins**:
   ```
   http://localhost:3000
   https://seu-dominio.com
   https://www.seu-dominio.com
   ```

### 3. Backups Automáticos

1. Vá para **Settings → Backups**
2. Habilite backups automáticos
3. Configure retenção (default: 7 dias)

---

## 📈 Monitoramento e Logs

### Acessar Logs no Supabase

1. Vá para **Logs** no Dashboard
2. Filtre por tipo: SQL, API, Functions, etc.

### Exemplo de Query de Monitoramento

```sql
-- Ver top 10 usuários mais ativos
SELECT 
  user_id,
  COUNT(*) as message_count,
  MAX(created_at) as last_activity
FROM chat_history
GROUP BY user_id
ORDER BY message_count DESC
LIMIT 10;
```

---

## ⚡ Performance Tips

1. **Índices Criados** ✅ (chat_history.phone, created_at, etc.)
2. **Paginate grandes resultados**:
   ```javascript
   const { data } = await supabase
     .from('chat_history')
     .select('*')
     .range(0, 19); // Primeiras 20
   ```
3. **Usar RLS** ✅ (automático, reduz carga)

---

## 🐛 Troubleshooting

### ❌ "SUPABASE_URL não configurado"

**Solução**: Verifique `.env`:
```bash
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAi...
```

### ❌ "auth.uid() não funciona"

**Solução**: Use `service_role_key` para operações de admin ou configure autenticação.

### ❌ "CORS error"

**Solução**: Adicione seu domínio em **Settings → API → CORS Allowed Origins**.

---

## 📚 Links Úteis

- [Supabase Docs](https://supabase.com/docs)
- [SDK JavaScript](https://supabase.com/docs/reference/javascript/start)
- [SQL Editor Guide](https://supabase.com/docs/guides/database/overview)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Próximos Passos

1. ✅ Configure `.env` com chaves Supabase
2. ✅ Execute o SQL no Supabase Dashboard
3. ✅ Teste conexão: `npm run dev`
4. ✅ Envie uma mensagem no WhatsApp e verifique em `supabase.com/dashboard`
5. ✅ Configure CORS para deploy
6. ✅ Habilite backups automáticos

---

**Supabase integrado com sucesso! 🎉**
