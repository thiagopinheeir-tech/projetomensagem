# 🔧 Correção: Erros no Agendamento

## 📋 Problemas Identificados

### 1. ❌ Erro: `Endpoint não encontrado` na API Premium Shears

**Erro:**
```
❌ [apiRequest] Erro na requisição: Endpoint não encontrado
GET https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/api/appointments/check-availability
```

**Causa:** URL duplicando `/api/`
- URL base: `https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api`
- Endpoint: `/api/appointments/check-availability`
- Resultado: `/api/api/appointments/check-availability` ❌

**Solução:**
- ✅ Endpoints corrigidos para não incluir `/api/` no início
- ✅ URL base tratada para remover `/api` do final se existir

---

### 2. ⚠️ Chatbot IA não disponível

**Erro:**
```
🤖 [558282212126] Resposta enviada: Desculpe, o serviço de IA não está disponível no momento.
```

**Causa:** API key da OpenAI não está sendo carregada ou chatbot não está inicializado.

**Solução:**
1. Verificar se API key está salva:
   ```sql
   SELECT * FROM user_api_keys 
   WHERE provider = 'openai' AND is_active = true;
   ```

2. Se não estiver salva:
   - Acesse "Chaves e Integrações" → "OpenAI"
   - Cole sua API key
   - Clique em "Salvar"

3. Reconectar WhatsApp (se necessário):
   - Acesse "WhatsApp"
   - Clique em "Desconectar"
   - Clique em "Conectar"
   - Escaneie o QR code

---

### 3. ⚠️ OpenAI não configurado para áudio

**Erro:**
```
⚠️  OpenAI não configurado. Não é possível processar áudio.
```

**Causa:** Mesma do problema 2 - API key não configurada.

**Solução:** Mesma do problema 2.

---

## 🔧 Correções Aplicadas

### 1. `services/premium-shears-scheduler.js`

**Antes:**
```javascript
const response = await apiRequest(userId, 'GET', `/api/appointments/check-availability?${params.toString()}`);
```

**Depois:**
```javascript
const response = await apiRequest(userId, 'GET', `/appointments/check-availability?${params.toString()}`);
```

**Endpoints corrigidos:**
- ✅ `/api/appointments` → `/appointments`
- ✅ `/api/appointments/available-slots` → `/appointments/available-slots`
- ✅ `/api/appointments/check-availability` → `/appointments/check-availability`
- ✅ `/api/appointments/:id` → `/appointments/:id`

**URL base tratada:**
- ✅ Remove `/api` do final da URL base se existir
- ✅ Garante que endpoints começam com `/`

---

## 📝 URLs Corretas

### URL Base Configurada:
```
https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api
```

### Endpoints (sem `/api/` no início):
- ✅ `POST /appointments`
- ✅ `GET /appointments/available-slots`
- ✅ `GET /appointments/check-availability`
- ✅ `DELETE /appointments/:id`

### URLs Finais:
- ✅ `POST https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments`
- ✅ `GET https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/available-slots`
- ✅ `GET https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/check-availability`
- ✅ `DELETE https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/:id`

---

## 🧪 Como Testar

### Teste 1: Verificar Disponibilidade

1. Envie mensagem via WhatsApp: **"Quero agendar um corte para amanhã às 14h"**
2. Verifique os logs:
   ```
   📡 [apiRequest] GET https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/check-availability?startTime=...
   ✅ [apiRequest] Resposta recebida
   ```
3. Não deve aparecer: `❌ Endpoint não encontrado`

### Teste 2: Criar Agendamento

1. Complete o fluxo de agendamento via WhatsApp
2. Verifique os logs:
   ```
   📡 [apiRequest] POST https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments
   ✅ Agendamento criado com sucesso
   ```
3. Verifique se o agendamento aparece no Premium Shears

---

## ✅ Checklist de Verificação

- [x] Endpoints corrigidos (removido `/api/` do início)
- [x] URL base tratada (remove `/api` do final se existir)
- [ ] API key da OpenAI configurada
- [ ] WhatsApp reconectado (se necessário)
- [ ] Teste de agendamento realizado
- [ ] Logs verificados (sem erros de endpoint)

---

## 🚨 Próximos Passos

1. **Configurar API key da OpenAI:**
   - Acesse "Chaves e Integrações" → "OpenAI"
   - Cole sua API key
   - Salve

2. **Reconectar WhatsApp (se necessário):**
   - Acesse "WhatsApp"
   - Reconecte

3. **Testar Agendamento:**
   - Envie mensagem: "Quero agendar um corte para amanhã às 14h"
   - Verifique se funciona

---

**Última atualização:** 14/01/2026
