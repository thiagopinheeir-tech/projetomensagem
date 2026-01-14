# ⚡ Correção Rápida: Chatbot IA com Erro

## 🔍 Diagnóstico em 3 Passos

### 1️⃣ Verificar se API Key está salva

Execute no Supabase SQL Editor:
```sql
SELECT 
  user_id,
  provider,
  is_active,
  LENGTH(api_key_encrypted) as key_length
FROM user_api_keys
WHERE provider = 'openai' AND is_active = true;
```

**Se retornar 0 linhas:** API key não está salva → Vá para Passo 2

**Se retornar linhas:** API key está salva → Vá para Passo 3

---

### 2️⃣ Salvar API Key (se não estiver salva)

1. Acesse **"Chaves e Integrações"** no frontend
2. Seção **"OpenAI"**
3. Cole sua **API Key da OpenAI**
4. Clique em **"Salvar"**
5. **Aguarde mensagem de sucesso**

---

### 3️⃣ Reconectar WhatsApp (OBRIGATÓRIO)

**IMPORTANTE:** Após salvar a API key, você DEVE reconectar o WhatsApp para o chatbot reinicializar.

1. Acesse **"WhatsApp"** no frontend
2. Clique em **"Desconectar"** (se estiver conectado)
3. Clique em **"Conectar"**
4. Escaneie o **QR code**
5. **Aguarde conectar**

---

### 4️⃣ Verificar Logs

Após reconectar, verifique os logs do Railway:

**✅ Deve aparecer:**
```
✅ [initChatbot] API key do usuário 2 carregada do banco
✅ OpenAI API configurado (API key do usuário)
✅ Chatbot IA inicializado e pronto!
```

**❌ Se aparecer:**
```
⚠️ Nenhuma API de IA configurada
⚠️ Chatbot IA desabilitado (OPENAI_API_KEY não configurada)
```

**Solução:** Verifique se a API key está salva (Passo 1) e reconecte (Passo 3)

---

### 5️⃣ Testar

1. Envie uma mensagem via WhatsApp: **"Olá"**
2. Verifique os logs:
   ```
   🚀 Chamando generateWithOpenAI...
   ✅ Resposta da OpenAI recebida: ...
   ```
3. Deve receber uma resposta inteligente (não fallback)

---

## 🚨 Erros Comuns

### Erro: "Invalid API key"
- **Solução:** Verifique se a API key está correta. Gere nova key na OpenAI se necessário.

### Erro: "Insufficient quota"
- **Solução:** Adicione créditos em https://platform.openai.com/account/billing

### Erro: "API não configurada"
- **Solução:** 
  1. Salve a API key em "Chaves e Integrações"
  2. **Reconecte o WhatsApp** (passo crítico!)

---

## ✅ Checklist Rápido

- [ ] API Key salva em "Chaves e Integrações" → "OpenAI"
- [ ] API Key verificada no banco (script SQL)
- [ ] WhatsApp **reconectado** após salvar
- [ ] Logs mostram: `✅ [initChatbot] API key do usuário X carregada`
- [ ] Teste de mensagem funciona

---

**⚠️ LEMBRE-SE:** Sempre reconecte o WhatsApp após salvar a API key!

---

**Última atualização:** 14/01/2026
