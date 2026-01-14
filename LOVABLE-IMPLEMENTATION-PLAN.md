# 📋 Plano de Implementação do Lovable - Análise e Validação

## ✅ Status Atual (conforme análise do Lovable)

| Endpoint | Status | Observações |
|----------|--------|-------------|
| POST /appointments | ✅ Existe | Precisa ajustes: retornar 409 para horário ocupado |
| GET /appointments/available-slots | ✅ Existe | Funcional |
| GET /appointments/check-availability | ✅ Existe | Funcional |
| DELETE /appointments/:id | ✅ Existe | Funcional |
| **Webhook para UI** | ❌ Falta | **Precisa implementar** |
| **Autenticação API Key** | ❌ Falta | **Precisa implementar** |

---

## 🎯 Plano do Lovable - Validação

### 1. ✅ Autenticação via API Key (Opcional)

**O que o Lovable vai fazer:**
- Criar função `validateApiKey()` que:
  - Lê header `Authorization: Bearer <API_KEY>`
  - Valida contra secret `API_KEY` configurado
  - Retorna `true` se não houver API Key (opcional)
  - Retorna `true` se API Key for válida
  - Retorna `false` se API Key for inválida

**✅ Está correto conforme nossa especificação!**

---

### 2. ✅ Corrigir POST /appointments

**O que o Lovable vai fazer:**
- Ajustar código HTTP para `409` quando horário ocupado (atualmente retorna 400)
- Garantir que resposta inclui `code: "SLOT_OCCUPIED"` corretamente
- Manter estrutura de resposta exata conforme especificação

**✅ Está correto! Precisa retornar:**
```json
{
  "success": false,
  "error": "Horário indisponível - já existe um agendamento neste período",
  "code": "SLOT_OCCUPIED"
}
```
**Com status HTTP 409 (Conflict)**

---

### 3. ✅ Implementar Webhook para Agendamentos via UI

**O que o Lovable vai fazer:**

#### 3.1 Função de Webhook com Retry
```javascript
async function callWebhookWithRetry(payload, maxRetries = 3, delayMs = 5000) {
  const webhookUrl = 'https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) return true;
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error(`Webhook attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  return false;
}
```

**✅ Perfeito! Está exatamente como especificamos:**
- 3 tentativas
- 5 segundos de intervalo
- Não bloqueia criação do agendamento se falhar

#### 3.2 Payload do Webhook
```json
{
  "appointmentId": "uuid",
  "clientName": "Nome do Cliente",
  "phone": "5511999999999",
  "service": "Nome do Serviço",
  "startTime": "2026-01-16T10:00:00.000Z",
  "endTime": "2026-01-16T10:30:00.000Z",
  "userId": "uuid-do-usuario",  // ✅ CRÍTICO: está incluído
  "notes": "Observações opcionais"
}
```

**✅ Está correto! O `userId` está incluído, que é essencial para multi-tenancy.**

#### 3.3 Integração nos Componentes

**Booking.tsx e QuickBookingDialog.tsx:**
- Chamar webhook apenas quando `booking_type` NÃO for `'api'`
- Chamar webhook quando `booking_type` for `'online'` ou `'local'`
- Não bloquear navegação se webhook falhar

**✅ Lógica correta!**
- Agendamentos via nossa API: `booking_type = 'api'` → **NÃO** chamar webhook
- Agendamentos via UI Premium Shears: `booking_type = 'online'` ou `'local'` → **CHAMAR** webhook

---

### 4. ✅ Novo Endpoint: POST /notify-webhook

**O que o Lovable vai fazer:**
- Criar endpoint `POST /notify-webhook` na edge function
- Recebe dados do agendamento do frontend
- Executa lógica de retry em background
- Retorna imediatamente para não bloquear UI

**💡 Observação:** Esta é uma boa abordagem! O frontend chama este endpoint interno, que por sua vez chama o webhook externo com retry. Isso mantém a responsabilidade de retry no backend.

**✅ Aprovado!**

---

## 📊 Resumo dos Endpoints Finais

| Endpoint | Método | Função | Status |
|----------|--------|--------|--------|
| `/appointments` | POST | Criar agendamento | ✅ Ajustar |
| `/appointments/available-slots` | GET | Listar slots disponíveis | ✅ OK |
| `/appointments/check-availability` | GET | Verificar disponibilidade | ✅ OK |
| `/appointments/:id` | DELETE | Cancelar agendamento | ✅ OK |
| `/notify-webhook` | POST | Chamar webhook (interno) | 🆕 Novo |

---

## 🔄 Fluxo Completo (conforme plano do Lovable)

```
Usuário agenda via UI Premium Shears
       |
       v
Frontend cria agendamento (booking_type = 'online' ou 'local')
       |
       v
Agendamento criado com sucesso no banco
       |
       v
Frontend chama edge function POST /notify-webhook
       |
       v
Edge function tenta enviar para webhook externo:
  https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created
       |
       +-- Sucesso: Log de confirmação
       |
       +-- Falha: Retry 3x com 5s de intervalo
       |
       v
Usuário continua navegando (não bloqueado)
```

**✅ Fluxo perfeito! Está alinhado com nossa arquitetura.**

---

## ✅ Validação Final

### ✅ Pontos Corretos:
1. ✅ Autenticação API Key **opcional** (conforme especificação)
2. ✅ Webhook **não bloqueia** criação do agendamento
3. ✅ Retry de **3 tentativas com 5 segundos** de intervalo
4. ✅ `userId` **incluído no payload** do webhook (CRÍTICO para multi-tenancy)
5. ✅ Webhook chamado **apenas para agendamentos via UI** (não via API)
6. ✅ Código HTTP **409** para horário ocupado
7. ✅ Código de erro **SLOT_OCCUPIED** na resposta

### ⚠️ Pontos a Observar:

1. **userId no Webhook:**
   - O Lovable menciona que `userId` será o ID do barbeiro que criou o agendamento
   - **IMPORTANTE:** Precisamos garantir que o `userId` corresponde ao `userId` do nosso sistema (multi-tenant)
   - Se o Premium Shears tem seus próprios usuários, precisamos de uma tabela de mapeamento ou forma de identificar qual `userId` do nosso sistema corresponde a qual usuário do Premium Shears

2. **Configuração do Webhook URL:**
   - Atualmente está hardcoded: `https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created`
   - Ideal seria configurável via variável de ambiente
   - Mas está OK para começar

3. **API Key Secret:**
   - O Lovable menciona usar secret `API_KEY`
   - Precisamos confirmar como cada usuário terá sua própria API Key (se necessário)
   - Pode ser que a API Key seja única por usuário/estabelecimento

---

## 🎯 Conclusão

**✅ O PLANO DO LOVABLE ESTÁ CORRETO E ALINHADO COM NOSSA ESPECIFICAÇÃO!**

O Lovable identificou corretamente:
- O que já existe
- O que precisa ser ajustado
- O que precisa ser criado

A implementação proposta segue exatamente nossa especificação em `PROMPT-LOVABLE.txt`.

---

## 📝 Próximos Passos Após Implementação do Lovable

1. **Obter URL Base da API:**
   - Perguntar ao Lovable: "Qual é a URL base da API REST? (ex: `https://xxx.lovable.app/api`)"

2. **Configurar no Frontend:**
   - Acessar "Chaves e Integrações" → "Sistema de Agendamento"
   - Colar a URL base da API
   - Configurar API Key (se necessário)

3. **Testar Integração:**
   - Criar agendamento via WhatsApp (nossa API)
   - Criar agendamento via UI Premium Shears
   - Verificar se webhook está sendo chamado corretamente
   - Verificar se notificações chegam na barbearia

4. **Validar userId:**
   - Confirmar que o `userId` enviado no webhook corresponde ao usuário correto do nosso sistema
   - Ajustar mapeamento se necessário

---

**Última atualização:** 13/01/2026 - 21:30
