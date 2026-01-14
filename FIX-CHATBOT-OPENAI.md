# 🔧 Correção: Erros no Chatbot IA com OpenAI

## 🔍 Diagnóstico Rápido

### Passo 1: Verificar se API Key está salva

Execute no Supabase SQL Editor: `sql/verify-openai-api-key.sql`

Ou execute diretamente:
```sql
SELECT 
  user_id,
  provider,
  is_active,
  LENGTH(api_key_encrypted) as key_length
FROM user_api_keys
WHERE provider = 'openai' AND is_active = true;
```

**Resultado esperado:**
- Pelo menos 1 linha com `is_active = true`
- `key_length` deve ser > 0

---

### Passo 2: Verificar Logs do Railway

Procure por estas mensagens nos logs:

**✅ Sucesso:**
```
✅ [initChatbot] API key do usuário 2 carregada do banco
✅ OpenAI API configurado (API key do usuário)
✅ Chatbot IA inicializado e pronto!
```

**❌ Erro:**
```
⚠️ [initChatbot] Erro ao buscar API key do usuário X: ...
⚠️ Nenhuma API de IA configurada
❌ Erro ao gerar resposta OpenAI: ...
```

---

## 🔧 Soluções Comuns

### Problema 1: API Key não está sendo carregada

**Sintomas:**
- Logs mostram: `⚠️ Nenhuma API de IA configurada`
- Chatbot não responde com IA

**Solução:**

1. **Verificar se está salva:**
   ```sql
   SELECT * FROM user_api_keys 
   WHERE provider = 'openai' AND is_active = true;
   ```

2. **Se não estiver salva:**
   - Acesse "Chaves e Integrações" → "OpenAI"
   - Cole sua API key da OpenAI
   - Clique em "Salvar"

3. **Reconectar WhatsApp:**
   - Acesse "WhatsApp"
   - Clique em "Desconectar" (se conectado)
   - Clique em "Conectar"
   - Escaneie o QR code
   - Verifique logs após conectar

---

### Problema 2: API Key inválida ou expirada

**Sintomas:**
- Logs mostram: `❌ Erro ao gerar resposta OpenAI: Invalid API key`
- Erro 401 da OpenAI

**Solução:**

1. **Verificar API key no dashboard da OpenAI:**
   - Acesse https://platform.openai.com/api-keys
   - Verifique se a key está ativa
   - Se necessário, gere uma nova key

2. **Atualizar no sistema:**
   - Acesse "Chaves e Integrações" → "OpenAI"
   - Cole a nova API key
   - Clique em "Salvar"

3. **Reconectar WhatsApp** para reinicializar

---

### Problema 3: Limite de crédito esgotado

**Sintomas:**
- Logs mostram: `❌ Erro ao gerar resposta OpenAI: Insufficient quota`
- Erro 429 ou 402 da OpenAI

**Solução:**

1. **Verificar créditos:**
   - Acesse https://platform.openai.com/account/billing
   - Verifique créditos disponíveis
   - Adicione créditos se necessário

2. **Aguardar reset** (se for rate limit por minuto/hora)

---

### Problema 4: Modelo inválido

**Sintomas:**
- Logs mostram: `❌ Erro ao gerar resposta OpenAI: Model not found`
- Erro 404 da OpenAI

**Solução:**

1. **Verificar modelo configurado:**
   - Acesse "Chaves e Integrações" → "Configurações Técnicas de IA"
   - Verifique o modelo (deve ser: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, ou `gpt-3.5-turbo`)

2. **Ajustar se necessário:**
   - Modelo recomendado: `gpt-4o-mini` (mais barato e rápido)
   - Salve a configuração

---

### Problema 5: Chatbot não reinicializa após salvar

**Sintomas:**
- API key salva, mas chatbot ainda não funciona
- Logs não mostram: `✅ [initChatbot] API key do usuário X carregada`

**Solução:**

1. **Reconectar WhatsApp:**
   - Acesse "WhatsApp"
   - Clique em "Desconectar"
   - Clique em "Conectar"
   - Escaneie o QR code

2. **Verificar logs após conectar:**
   - Deve aparecer: `✅ [initChatbot] API key do usuário X carregada`

---

## 🧪 Teste Completo

### 1. Verificar API Key no Banco
```sql
SELECT 
  user_id,
  provider,
  is_active,
  created_at
FROM user_api_keys
WHERE provider = 'openai' AND is_active = true;
```

### 2. Reconectar WhatsApp
- Desconectar e reconectar
- Verificar logs

### 3. Enviar Mensagem de Teste
- Enviar: "Olá"
- Verificar logs:
  ```
  🚀 Chamando generateWithOpenAI...
  ✅ Resposta da OpenAI recebida: ...
  ```

### 4. Verificar Resposta
- Deve receber resposta inteligente (não fallback)
- Não deve aparecer: "Desculpe, o serviço de IA não está disponível"

---

## 📋 Checklist de Correção

- [ ] API Key salva em `user_api_keys` com `provider = 'openai'`
- [ ] `is_active = true` na tabela
- [ ] API Key válida (testada no dashboard OpenAI)
- [ ] Créditos disponíveis na OpenAI
- [ ] Modelo correto configurado (`gpt-4o-mini`)
- [ ] WhatsApp reconectado após salvar API key
- [ ] Logs mostram: `✅ [initChatbot] API key do usuário X carregada`
- [ ] Logs mostram: `✅ OpenAI API configurado`
- [ ] Teste de mensagem funciona

---

## 🔍 Comandos SQL Úteis

### Ver todas as API keys:
```sql
SELECT 
  u.id,
  u.email,
  uak.provider,
  uak.is_active,
  uak.created_at
FROM users u
LEFT JOIN user_api_keys uak ON u.id = uak.user_id
WHERE uak.provider = 'openai'
ORDER BY u.id;
```

### Ativar API key manualmente:
```sql
UPDATE user_api_keys
SET is_active = true, updated_at = CURRENT_TIMESTAMP
WHERE user_id = 2 AND provider = 'openai';
```

### Desativar API key:
```sql
UPDATE user_api_keys
SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE user_id = 2 AND provider = 'openai';
```

---

## 🚨 Erros Específicos e Soluções

### Erro: "Invalid API key"
- **Causa:** API key incorreta ou expirada
- **Solução:** Gerar nova key na OpenAI e atualizar no sistema

### Erro: "Insufficient quota"
- **Causa:** Sem créditos na conta OpenAI
- **Solução:** Adicionar créditos em https://platform.openai.com/account/billing

### Erro: "Model not found"
- **Causa:** Modelo não existe ou não está disponível
- **Solução:** Usar modelo válido: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, ou `gpt-3.5-turbo`

### Erro: "Rate limit exceeded"
- **Causa:** Muitas requisições em pouco tempo
- **Solução:** Aguardar alguns minutos e tentar novamente

---

## 📞 Próximos Passos

1. **Execute o script SQL** para verificar se a API key está salva
2. **Verifique os logs do Railway** para identificar o erro específico
3. **Siga a solução** correspondente ao erro encontrado
4. **Teste novamente** enviando uma mensagem

---

**Última atualização:** 14/01/2026
