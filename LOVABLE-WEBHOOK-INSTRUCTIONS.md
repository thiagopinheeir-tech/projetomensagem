# 🔔 Instruções Importantes: Webhook e Notificações

## ⚠️ CRÍTICO: Sistema de Notificações

### ❌ NÃO FAÇA:
- **NÃO** notificar o barbeiro diretamente quando um agendamento for criado
- **NÃO** enviar WhatsApp/SMS direto do Premium Shears para o barbeiro
- **NÃO** criar notificações próprias na interface do Premium Shears para o barbeiro

### ✅ FAÇA:
- **SEMPRE** chamar o webhook do nosso sistema quando um agendamento for criado via UI
- Deixar **NOSSO SISTEMA** ser responsável por todas as notificações
- **NOSSO SISTEMA** notifica tanto o cliente quanto o barbeiro

---

## 🔄 Fluxo Correto de Notificações

```
Cliente agenda via Premium Shears UI
       |
       v
Agendamento criado no banco Premium Shears
       |
       v
Premium Shears chama webhook: POST /api/notify-webhook
       |
       v
Edge Function chama webhook externo:
POST https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created
       |
       v
NOSSO SISTEMA recebe webhook
       |
       +-- Salva agendamento no nosso banco
       |
       +-- Envia notificação para CLIENTE via WhatsApp
       |
       +-- Envia notificação para BARBEIRO via WhatsApp (número configurado)
       |
       v
✅ Notificações enviadas pelo NOSSO SISTEMA
```

---

## 📋 Por Que Isso?

1. **Centralização**: Todas as notificações vêm de um único sistema
2. **Configuração**: O barbeiro configura o número de notificações no nosso sistema
3. **Multi-tenancy**: Cada usuário tem seu próprio número de notificações
4. **Consistência**: Mesmo formato de mensagem para todos os agendamentos
5. **Controle**: Facilita desabilitar/abilitar notificações

---

## ✅ Checklist de Implementação

Quando implementar o webhook no Premium Shears:

- [ ] ✅ Chamar webhook apenas quando agendamento for criado via **UI** (não via nossa API)
- [ ] ✅ Incluir **userId** no payload (crítico para multi-tenancy)
- [ ] ✅ Não notificar barbeiro diretamente do Premium Shears
- [ ] ✅ Deixar nosso sistema fazer todas as notificações
- [ ] ✅ Retry de 3 tentativas com 5 segundos se webhook falhar
- [ ] ✅ Não bloquear criação do agendamento se webhook falhar

---

## 🔍 Como Verificar

### Se o Premium Shears está fazendo corretamente:

1. **Criar agendamento via UI Premium Shears**
2. **Verificar logs do Railway:**
   - Deve aparecer: `📥 [webhook] Recebido agendamento do Premium Shears`
   - Deve aparecer: `✅ [webhook] Notificação enviada via WhatsApp` (cliente)
   - Deve aparecer: `✅ [webhook] Notificação enviada para barbearia` (barbeiro)

### Se o Premium Shears está fazendo ERRADO:

- ❌ Barbeiro recebe notificação direta do Premium Shears
- ❌ Notificação chega antes do webhook ser processado
- ❌ Notificação tem formato diferente das nossas
- ❌ Barbeiro recebe notificação mas não aparece nos logs do nosso sistema

---

## 📝 Payload do Webhook

O Premium Shears deve enviar exatamente este payload:

```json
{
  "appointmentId": "uuid-do-agendamento",
  "clientName": "Nome do Cliente",
  "phone": "5511999999999",
  "service": "Corte + Barba",
  "startTime": "2026-01-16T10:00:00.000Z",
  "endTime": "2026-01-16T10:30:00.000Z",
  "userId": "uuid-do-usuario-nosso-sistema",  // CRÍTICO
  "notes": "Observações opcionais"
}
```

**Nosso sistema então:**
1. Salva o agendamento
2. Envia confirmação para o **cliente** (phone no payload)
3. Envia notificação para o **barbeiro** (número configurado no frontend)

---

## 🚨 IMPORTANTE

**O Premium Shears NÃO deve ter nenhuma funcionalidade de notificação própria para o barbeiro.**

**Todas as notificações devem passar pelo nosso sistema via webhook.**

---

**Última atualização:** 13/01/2026
