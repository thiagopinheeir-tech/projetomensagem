# 🔍 Diagnóstico: Erros no Chatbot IA

## 📋 Checklist de Verificação

### 1. ✅ Verificar se a API Key está salva corretamente

**Onde configurar:**
- Frontend: "Chaves e Integrações" → Seção "OpenAI"
- Campo: "API Key"
- Provider: `openai` (deve ser salvo na tabela `user_api_keys`)

**Verificar no banco:**
```sql
SELECT user_id, provider, is_active, created_at 
FROM user_api_keys 
WHERE provider = 'openai' AND is_active = true;
```

---

### 2. ✅ Verificar se o Chatbot está sendo reinicializado após salvar

**Após salvar a API Key:**
- O sistema deve reinicializar o chatbot automaticamente
- Verifique logs: `✅ [initChatbot] API key do usuário X carregada do banco`

**Se não reinicializar:**
- Pode ser necessário reconectar o WhatsApp para forçar reinicialização

---

### 3. ✅ Verificar logs de erro específicos

**Erros comuns e soluções:**

#### Erro 1: "API não configurada ou OpenAI não disponível"
```
⚠️ API não configurada ou OpenAI não disponível. apiProvider: none, openai: false
```

**Causa:** API key não está sendo carregada

**Solução:**
1. Verificar se a API key está salva em `user_api_keys` com `provider = 'openai'`
2. Verificar se `is_active = true`
3. Verificar se o `user_id` está correto
4. Reconectar WhatsApp para reinicializar chatbot

---

#### Erro 2: "Erro ao gerar resposta OpenAI"
```
❌ Erro ao gerar resposta OpenAI: [mensagem de erro]
```

**Possíveis causas:**
- API key inválida ou expirada
- Limite de crédito da OpenAI esgotado
- Modelo inválido
- Problema de rede

**Solução:**
1. Verificar se a API key está válida no dashboard da OpenAI
2. Verificar créditos disponíveis
3. Verificar se o modelo está correto (ex: `gpt-4o-mini`)
4. Verificar logs completos do erro

---

#### Erro 3: "OPENAI_API_KEY não configurada"
```
⚠️ OPENAI_API_KEY não configurada. Chatbot IA não funcionará.
```

**Causa:** Sistema não encontrou a API key

**Solução:**
1. Verificar se a API key está salva em `user_api_keys`
2. Verificar se o `user_id` está correto
3. Verificar se a descriptografia está funcionando
4. Reconectar WhatsApp

---

### 4. ✅ Fluxo de Carregamento da API Key

O sistema busca a API key nesta ordem:

1. **Tabela `user_api_keys`** (provider = 'openai')
   ```sql
   SELECT api_key_encrypted FROM user_api_keys 
   WHERE user_id = $1 AND provider = 'openai' AND is_active = true
   ```

2. **Tabela `chatbot_profiles`** (compatibilidade)
   ```sql
   SELECT openai_api_key_encrypted FROM chatbot_profiles 
   WHERE user_id = $1 AND is_active = true
   ```

3. **Variável de ambiente** (fallback)
   ```javascript
   process.env.OPENAI_API_KEY
   ```

---

### 5. ✅ Como Verificar se Está Funcionando

**Logs esperados (sucesso):**
```
✅ [initChatbot] API key do usuário 2 carregada do banco
✅ OpenAI API configurado (API key do usuário)
✅ Chatbot IA inicializado e pronto!
```

**Quando gerar resposta:**
```
🚀 Chamando generateWithOpenAI...
✅ Resposta da OpenAI recebida: [resposta]
```

**Logs de erro:**
```
❌ Erro ao gerar resposta OpenAI: [erro]
⚠️ API não configurada ou OpenAI não disponível
```

---

### 6. ✅ Passos para Corrigir

#### Passo 1: Verificar se API Key está salva

1. Acesse "Chaves e Integrações"
2. Verifique se a API Key da OpenAI está configurada
3. Se não estiver, configure e salve

#### Passo 2: Verificar no banco de dados

Execute no Supabase SQL Editor:
```sql
SELECT 
  user_id, 
  provider, 
  is_active, 
  created_at,
  LENGTH(api_key_encrypted) as key_length
FROM user_api_keys 
WHERE provider = 'openai' AND is_active = true;
```

**Resultado esperado:**
- Pelo menos 1 linha com `is_active = true`
- `key_length` deve ser > 0

#### Passo 3: Reconectar WhatsApp

1. Acesse "WhatsApp" no frontend
2. Clique em "Desconectar" (se conectado)
3. Clique em "Conectar"
4. Escaneie o QR code
5. Verifique os logs após conectar

**Logs esperados:**
```
✅ [initChatbot] API key do usuário X carregada do banco
✅ OpenAI API configurado (API key do usuário)
✅ Chatbot IA inicializado e pronto!
```

#### Passo 4: Testar o Chatbot

1. Envie uma mensagem via WhatsApp
2. Verifique os logs do Railway
3. Deve aparecer:
   ```
   🚀 Chamando generateWithOpenAI...
   ✅ Resposta da OpenAI recebida: ...
   ```

---

### 7. ✅ Problemas Comuns

#### Problema 1: API Key não está sendo carregada

**Sintomas:**
- Logs mostram: `⚠️ Nenhuma API de IA configurada`
- Chatbot não responde com IA

**Solução:**
1. Verificar se está salva em `user_api_keys` com `provider = 'openai'`
2. Verificar se `is_active = true`
3. Verificar se o `user_id` está correto
4. Reconectar WhatsApp

---

#### Problema 2: API Key inválida

**Sintomas:**
- Logs mostram: `❌ Erro ao gerar resposta OpenAI: Invalid API key`
- Erro 401 da OpenAI

**Solução:**
1. Verificar se a API key está correta
2. Verificar se não expirou
3. Gerar nova API key na OpenAI
4. Atualizar no frontend

---

#### Problema 3: Limite de crédito esgotado

**Sintomas:**
- Logs mostram: `❌ Erro ao gerar resposta OpenAI: Insufficient quota`
- Erro 429 da OpenAI

**Solução:**
1. Verificar créditos no dashboard da OpenAI
2. Adicionar créditos se necessário
3. Aguardar reset do limite (se for rate limit)

---

#### Problema 4: Modelo inválido

**Sintomas:**
- Logs mostram: `❌ Erro ao gerar resposta OpenAI: Model not found`
- Erro 404 da OpenAI

**Solução:**
1. Verificar se o modelo está correto (ex: `gpt-4o-mini`)
2. Verificar se o modelo está disponível na sua conta OpenAI
3. Ajustar modelo em "Chaves e Integrações" → "Configurações Técnicas de IA"

---

### 8. ✅ Comandos SQL Úteis

#### Verificar API Key salva:
```sql
SELECT 
  u.id as user_id,
  u.email,
  uak.provider,
  uak.is_active,
  uak.created_at,
  LENGTH(uak.api_key_encrypted) as key_length
FROM users u
LEFT JOIN user_api_keys uak ON u.id = uak.user_id AND uak.provider = 'openai'
WHERE uak.is_active = true;
```

#### Verificar se há API key para um usuário específico:
```sql
SELECT 
  provider,
  is_active,
  created_at,
  updated_at
FROM user_api_keys
WHERE user_id = 2 AND provider = 'openai';
```

#### Ativar API key manualmente (se necessário):
```sql
UPDATE user_api_keys
SET is_active = true, updated_at = CURRENT_TIMESTAMP
WHERE user_id = 2 AND provider = 'openai';
```

---

### 9. ✅ Debug Avançado

#### Adicionar logs temporários

No arquivo `services/whatsapp.js`, linha ~107, adicione logs:

```javascript
async initChatbot(userId = null) {
  console.log(`🔍 [initChatbot] Iniciando para userId: ${userId}`);
  
  let openaiApiKey = null;
  
  if (userId) {
    // ... código existente ...
    console.log(`🔍 [initChatbot] API key encontrada: ${openaiApiKey ? 'SIM' : 'NÃO'}`);
    if (openaiApiKey) {
      console.log(`🔍 [initChatbot] API key preview: ${openaiApiKey.substring(0, 10)}...`);
    }
  }
  
  // ... resto do código ...
}
```

---

## 🎯 Ação Imediata

**Para diagnosticar o problema agora:**

1. **Verifique os logs do Railway** procurando por:
   - `❌ Erro ao gerar resposta OpenAI`
   - `⚠️ API não configurada`
   - `✅ [initChatbot] API key do usuário X carregada`

2. **Verifique no banco:**
   ```sql
   SELECT * FROM user_api_keys WHERE provider = 'openai' AND is_active = true;
   ```

3. **Reconecte o WhatsApp** para forçar reinicialização do chatbot

4. **Teste enviando uma mensagem** e verifique os logs

---

**Última atualização:** 14/01/2026
