# 🔧 Correção: Erros Identificados nos Logs

## 📋 Problemas Encontrados

### 1. ❌ Erro: `column "user_id" does not exist` na tabela `automation_menu_state`

**Erro:**
```
❌ Database error: error: column "user_id" does not exist
at AutomationService.handleMenuResponse
```

**Causa:** A tabela `automation_menu_state` no Supabase não tem a coluna `user_id`, mas o código está tentando usá-la.

**Solução:**

1. **Execute o script SQL** no Supabase SQL Editor:
   ```sql
   -- Arquivo: sql/fix-automation-menu-state.sql
   ```

2. **Ou execute diretamente:**
   ```sql
   ALTER TABLE automation_menu_state 
   ADD COLUMN IF NOT EXISTS user_id UUID;
   
   CREATE INDEX IF NOT EXISTS idx_automation_menu_state_user_id 
   ON automation_menu_state(user_id);
   
   ALTER TABLE automation_menu_state 
   DROP CONSTRAINT IF EXISTS automation_menu_state_phone_key;
   
   ALTER TABLE automation_menu_state 
   ADD CONSTRAINT automation_menu_state_phone_user_id_unique 
   UNIQUE(phone, user_id);
   ```

3. **Código corrigido:** O código agora faz fallback quando `user_id` não existe.

---

### 2. ❌ Erro: `permission denied for table configurations`

**Erro:**
```
Erro ao salvar status no Supabase: {
  code: '42501',
  message: 'permission denied for table configurations'
}
```

**Causa:** O `saveChatbotConfig` não estava passando o `user_id` corretamente.

**Solução:**

1. **Código corrigido:** O `saveChatbotConfig` agora aceita `userId` como parâmetro.

2. **Verificar SERVICE_KEY:**
   - Certifique-se de que `SUPABASE_SERVICE_KEY` está configurado no Railway
   - Verifique os logs: deve aparecer `✅ Usando SUPABASE_SERVICE_KEY (bypass RLS)`

3. **Se o erro persistir:**
   - Execute o script: `sql/fix-all-permissions-supabase.sql`
   - Ou desabilite RLS na tabela `configurations`:
     ```sql
     ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;
     ```

---

### 3. ⚠️ Chatbot IA retornando "serviço não disponível"

**Log:**
```
🤖 [558282212126] Resposta gerada: Desculpe, o serviço de IA não está disponível no momento.
```

**Causa:** API key da OpenAI não está sendo carregada ou chatbot não está inicializado.

**Solução:**

1. **Verificar se API key está salva:**
   ```sql
   SELECT 
     user_id,
     provider,
     is_active,
     LENGTH(api_key_encrypted) as key_length
   FROM user_api_keys
   WHERE provider = 'openai' AND is_active = true;
   ```

2. **Se não estiver salva:**
   - Acesse "Chaves e Integrações" → "OpenAI"
   - Cole sua API key
   - Clique em "Salvar"

3. **Reconectar WhatsApp:**
   - Acesse "WhatsApp"
   - Clique em "Desconectar"
   - Clique em "Conectar"
   - Escaneie o QR code

4. **Verificar logs após conectar:**
   - Deve aparecer: `✅ [initChatbot] API key do usuário X carregada`
   - Deve aparecer: `✅ OpenAI API configurado`

---

## 🔧 Correções Aplicadas

### 1. `services/automation-service.js`
- ✅ Adicionado fallback quando `user_id` não existe na tabela
- ✅ Tratamento de erro ao buscar menu sem `user_id`
- ✅ Tratamento de erro ao deletar menu sem `user_id`

### 2. `config/supabase.js`
- ✅ `saveChatbotConfig` agora aceita `userId` como parâmetro
- ✅ Inclui `user_id` no `configData` quando fornecido

### 3. `controllers/chatbotController.js`
- ✅ `toggleChatbot` agora passa `userId` para `saveChatbotConfig`
- ✅ Converte `userId` para UUID antes de salvar

### 4. `sql/fix-automation-menu-state.sql`
- ✅ Script SQL para adicionar coluna `user_id` na tabela `automation_menu_state`

---

## 📝 Próximos Passos

### 1. Executar Script SQL

Execute no Supabase SQL Editor:
```sql
-- Arquivo: sql/fix-automation-menu-state.sql
```

### 2. Verificar SERVICE_KEY

Verifique se `SUPABASE_SERVICE_KEY` está configurado no Railway:
- Acesse Railway → Seu projeto → Variables
- Verifique se `SUPABASE_SERVICE_KEY` está presente
- Se não estiver, adicione a chave do Supabase

### 3. Reconectar WhatsApp

Após aplicar as correções:
1. Desconecte o WhatsApp
2. Reconecte o WhatsApp
3. Verifique os logs

### 4. Testar

1. Envie uma mensagem via WhatsApp
2. Verifique se não há mais erros nos logs
3. Verifique se o chatbot responde corretamente

---

## ✅ Checklist de Verificação

- [ ] Script SQL executado (`sql/fix-automation-menu-state.sql`)
- [ ] `SUPABASE_SERVICE_KEY` configurado no Railway
- [ ] Logs mostram: `✅ Usando SUPABASE_SERVICE_KEY (bypass RLS)`
- [ ] API key da OpenAI salva em `user_api_keys`
- [ ] WhatsApp reconectado após correções
- [ ] Logs não mostram mais erro de `user_id` não existe
- [ ] Logs não mostram mais erro de `permission denied`
- [ ] Chatbot responde corretamente

---

**Última atualização:** 14/01/2026
