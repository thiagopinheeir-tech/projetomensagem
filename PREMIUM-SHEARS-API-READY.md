# ✅ Premium Shears API - Implementação Completa

## 🎉 Status: IMPLEMENTADO E PRONTO PARA USO!

**Data de Conclusão:** 13/01/2026

---

## 🔗 URL Base da API

```
https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api
```

**Todos os endpoints estão disponíveis em:** `{URL_BASE}/...`

---

## ✅ Endpoints Implementados

### 1. **POST /api/appointments**
Criar agendamento

**URL Completa:**
```
POST https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ps_test_key_123456 (opcional)
```

---

### 2. **GET /api/appointments/available-slots**
Listar horários disponíveis

**URL Completa:**
```
GET https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/available-slots?from=2026-01-15T09:00:00.000Z&to=2026-01-15T20:00:00.000Z&durationMinutes=30
```

---

### 3. **GET /api/appointments/check-availability**
Verificar disponibilidade

**URL Completa:**
```
GET https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/check-availability?startTime=2026-01-15T14:30:00.000Z&durationMinutes=30
```

---

### 4. **DELETE /api/appointments/:id**
Cancelar agendamento

**URL Completa:**
```
DELETE https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments/{id}
```

---

### 5. **POST /api/notify-webhook** (Interno)
Chamar webhook para nosso sistema

**URL Completa:**
```
POST https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/notify-webhook
```

---

## 🔑 Autenticação

**API Key Configurada no Lovable:**
```
ps_test_key_123456
```

**Como usar:**
- Adicionar header: `Authorization: Bearer ps_test_key_123456`
- Autenticação é **OPCIONAL** - a API funciona sem ela também

---

## 🔔 Webhook

**URL do Webhook (nosso sistema):**
```
https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created
```

**Características:**
- ✅ Retry automático: 3 tentativas
- ✅ Intervalo: 5 segundos entre tentativas
- ✅ Não bloqueia criação do agendamento se falhar
- ✅ Inclui `userId` no payload (crítico para multi-tenancy)

---

## 📝 Como Configurar no Frontend

### Passo 1: Acessar "Chaves e Integrações"

1. Faça login no sistema
2. Vá para **"Chaves e Integrações"**
3. Encontre a seção **"Sistema de Agendamento"**

### Passo 2: Configurar URL da API

**Campo "URL da API":**
```
https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api
```

### Passo 3: Configurar API Key

**Campo "API Key":**
```
ps_test_key_123456
```

### Passo 4: Ativar

- Marque o checkbox **"Usar Premium Shears Scheduler"**
- Clique em **"Salvar"**

---

## 🧪 Como Testar

### Teste 1: Criar Agendamento via WhatsApp

1. Envie mensagem via WhatsApp para o bot
2. Peça para agendar um horário
3. O sistema deve criar o agendamento no Premium Shears
4. Verifique se o agendamento aparece no Premium Shears

### Teste 2: Criar Agendamento via UI Premium Shears

1. Acesse a interface do Premium Shears
2. Crie um agendamento manualmente
3. Verifique se o webhook é chamado (logs do Railway)
4. Verifique se nossa API recebe a notificação
5. Verifique se a barbearia recebe notificação no WhatsApp

### Teste 3: Listar Horários Disponíveis

1. Use o chatbot via WhatsApp
2. Peça horários disponíveis
3. O sistema deve buscar slots do Premium Shears
4. Deve apresentar opções de horários

---

## ✅ Checklist de Funcionalidades

- [x] POST /appointments - Criar agendamento
- [x] GET /appointments/available-slots - Listar slots disponíveis
- [x] GET /appointments/check-availability - Verificar disponibilidade
- [x] DELETE /appointments/:id - Cancelar agendamento
- [x] POST /notify-webhook - Webhook interno
- [x] Autenticação via API Key (opcional)
- [x] Webhook com retry (3 tentativas, 5s intervalo)
- [x] userId incluído no webhook
- [x] Status 409 para horário ocupado
- [x] Código de erro SLOT_OCCUPIED

---

## 📊 Resumo da Integração

```
Nosso Sistema (WhatsApp/IA)
       |
       v
POST https://hpjqsbmcotrljlknvbrr.supabase.co/functions/v1/api/appointments
Authorization: Bearer ps_test_key_123456
       |
       v
Premium Shears API
       |
       +-- Cria agendamento
       +-- Retorna appointmentId
       |
       v
Nosso Sistema salva no banco
```

---

```
Premium Shears UI (Interface Web)
       |
       v
Usuário cria agendamento
       |
       v
Frontend chama POST /notify-webhook
       |
       v
Premium Shears Edge Function
       |
       +-- Retry 3x com 5s intervalo
       |
       v
POST https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created
       |
       v
Nosso Sistema recebe webhook
       |
       +-- Salva no banco
       +-- Envia notificação WhatsApp para barbearia
```

---

## 🔧 Configuração Técnica

### Variáveis de Ambiente (Lovable)

- **API_KEY:** `ps_test_key_123456`
- **WHATSAPP_WEBHOOK_URL:** `https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created`

### Variáveis de Ambiente (Nosso Sistema)

As configurações são salvas por usuário no banco de dados:
- `premium_shears_api_url`: URL da API
- `premium_shears_api_key_encrypted`: API Key criptografada
- `use_premium_shears_scheduler`: Flag para ativar/desativar
- `barbearia_phone`: Número da barbearia para notificações

---

## 📞 Referências

- Especificação completa: `API-REST-PREMIUM-SHEARS.md`
- Prompt enviado ao Lovable: `PROMPT-LOVABLE.txt`
- Análise do plano: `LOVABLE-IMPLEMENTATION-PLAN.md`
- Configuração da API Key: `LOVABLE-API-KEY-CONFIGURED.md`

---

## 🚀 Próximos Passos

1. ✅ **API Implementada** - Concluído
2. ⏳ **Configurar no Frontend** - Próximo passo
3. ⏳ **Testar Integração** - Após configuração
4. ⏳ **Validar userId no Webhook** - Durante testes
5. ⏳ **Ajustar se necessário** - Conforme feedback

---

**Status:** ✅ PRONTO PARA CONFIGURAÇÃO E TESTES!

**Última atualização:** 13/01/2026
