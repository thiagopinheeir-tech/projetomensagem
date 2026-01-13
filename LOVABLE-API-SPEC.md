# Especificação de API REST para Integração Premium Shears Scheduler

## Contexto
Este documento contém as especificações completas para criar uma API REST no sistema **premium-shears-sched** que será consumida pelo sistema de WhatsApp (JT DEV NOCODE). A API deve permitir criar, consultar e gerenciar agendamentos de forma programática.

---

## Endpoints Necessários

### 1. POST /api/appointments
**Descrição:** Cria um novo agendamento no sistema.

**Request Body:**
```json
{
  "clientName": "João Silva",
  "phone": "5582999999999",
  "service": "Corte + Barba",
  "startTime": "2026-01-15T14:00:00Z",
  "endTime": "2026-01-15T14:45:00Z",
  "notes": "Cliente prefere cabelo curto" // opcional
}
```

**Response (Sucesso - 201):**
```json
{
  "success": true,
  "appointmentId": "123",
  "appointment": {
    "id": "123",
    "clientName": "João Silva",
    "phone": "5582999999999",
    "service": "Corte + Barba",
    "startTime": "2026-01-15T14:00:00Z",
    "endTime": "2026-01-15T14:45:00Z",
    "status": "confirmed",
    "notes": "Cliente prefere cabelo curto"
  }
}
```

**Response (Erro - 400):**
```json
{
  "success": false,
  "error": "Horário já está ocupado",
  "message": "Já existe um agendamento neste horário"
}
```

**Validações:**
- `clientName`: obrigatório, string não vazia
- `phone`: obrigatório, string no formato internacional (ex: 5582999999999)
- `service`: obrigatório, string não vazia
- `startTime`: obrigatório, ISO 8601 datetime string
- `endTime`: obrigatório, ISO 8601 datetime string, deve ser posterior a `startTime`
- Verificar se o horário está disponível antes de criar

---

### 2. GET /api/appointments/available-slots
**Descrição:** Retorna uma lista de horários disponíveis dentro de um período.

**Query Parameters:**
- `from` (obrigatório): Data/hora inicial no formato ISO 8601 (ex: `2026-01-15T08:00:00Z`)
- `to` (obrigatório): Data/hora final no formato ISO 8601 (ex: `2026-01-15T18:00:00Z`)
- `durationMinutes` (obrigatório): Duração do serviço em minutos (ex: `45`)
- `intervalMinutes` (opcional): Intervalo mínimo entre agendamentos em minutos (padrão: `0`)

**Exemplo de Request:**
```
GET /api/appointments/available-slots?from=2026-01-15T08:00:00Z&to=2026-01-15T18:00:00Z&durationMinutes=45&intervalMinutes=15
```

**Response (200):**
```json
{
  "success": true,
  "slots": [
    {
      "startISO": "2026-01-15T09:00:00Z",
      "startLocal": "15/01/2026 09:00",
      "endISO": "2026-01-15T09:45:00Z",
      "endLocal": "15/01/2026 09:45"
    },
    {
      "startISO": "2026-01-15T10:00:00Z",
      "startLocal": "15/01/2026 10:00",
      "endISO": "2026-01-15T10:45:00Z",
      "endLocal": "15/01/2026 10:45"
    },
    {
      "startISO": "2026-01-15T14:00:00Z",
      "startLocal": "15/01/2026 14:00",
      "endISO": "2026-01-15T14:45:00Z",
      "endLocal": "15/01/2026 14:45"
    }
  ]
}
```

**Lógica:**
- Considerar horários de funcionamento do estabelecimento
- Excluir horários já ocupados por outros agendamentos
- Respeitar `intervalMinutes` entre agendamentos
- Retornar slots ordenados cronologicamente

---

### 3. GET /api/appointments/check-availability
**Descrição:** Verifica se um horário específico está disponível.

**Query Parameters:**
- `startTime` (obrigatório): Data/hora inicial no formato ISO 8601
- `durationMinutes` (obrigatório): Duração do serviço em minutos
- `intervalMinutes` (opcional): Intervalo mínimo entre agendamentos (padrão: `0`)

**Exemplo de Request:**
```
GET /api/appointments/check-availability?startTime=2026-01-15T14:00:00Z&durationMinutes=45&intervalMinutes=15
```

**Response (200):**
```json
{
  "success": true,
  "available": true,
  "message": "Horário disponível"
}
```

**Response (quando ocupado):**
```json
{
  "success": true,
  "available": false,
  "message": "Horário já está ocupado",
  "conflictingAppointment": {
    "id": "456",
    "clientName": "Maria Santos",
    "startTime": "2026-01-15T13:30:00Z",
    "endTime": "2026-01-15T14:30:00Z"
  }
}
```

---

### 4. DELETE /api/appointments/:id
**Descrição:** Cancela/deleta um agendamento existente.

**Path Parameters:**
- `id` (obrigatório): ID do agendamento a ser cancelado

**Exemplo de Request:**
```
DELETE /api/appointments/123
```

**Response (Sucesso - 200):**
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso",
  "appointmentId": "123"
}
```

**Response (Erro - 404):**
```json
{
  "success": false,
  "error": "Agendamento não encontrado",
  "message": "O agendamento com ID 123 não foi encontrado"
}
```

---

## Webhook de Notificação (Opcional - para integração bidirecional)

### POST /api/webhooks/appointment-created (interno)
**Descrição:** Quando um agendamento for criado diretamente no sistema premium-shears-sched (via interface web/widget), este endpoint interno deve ser chamado para notificar o sistema de WhatsApp.

**Nota:** Este é um endpoint interno que o próprio sistema premium-shears-sched deve chamar após criar um agendamento.

**Request Body:**
```json
{
  "appointmentId": "123",
  "clientName": "João Silva",
  "phone": "5582999999999",
  "service": "Corte + Barba",
  "startTime": "2026-01-15T14:00:00Z",
  "endTime": "2026-01-15T14:45:00Z",
  "userId": 2 // opcional, se o sistema tiver multi-tenant
}
```

**Ação:**
Após criar um agendamento no sistema premium-shears-sched (via interface), o sistema deve:
1. Chamar o webhook externo do sistema de WhatsApp: `POST {WEBHOOK_URL}/api/webhooks/premium-shears/appointment-created`
2. Onde `WEBHOOK_URL` é configurável (ex: `https://projetomensagem-production.up.railway.app`)

**Código de exemplo (para adicionar após criar agendamento):**
```javascript
// Após criar agendamento com sucesso
const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || 'https://projetomensagem-production.up.railway.app';
const webhookPayload = {
  appointmentId: newAppointment.id,
  clientName: newAppointment.clientName,
  phone: newAppointment.phone,
  service: newAppointment.service,
  startTime: newAppointment.startTime,
  endTime: newAppointment.endTime,
  userId: newAppointment.userId // se aplicável
};

try {
  await fetch(`${webhookUrl}/api/webhooks/premium-shears/appointment-created`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload)
  });
} catch (error) {
  console.error('Erro ao chamar webhook:', error);
  // Não falhar a criação do agendamento se o webhook falhar
}
```

---

## Estrutura de Dados Esperada

### Agendamento (Appointment)
```typescript
interface Appointment {
  id: string | number;
  clientName: string;
  phone: string; // Formato internacional: 5582999999999
  service: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  status: 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Tratamento de Erros

Todos os endpoints devem retornar respostas consistentes:

**Formato de Erro Padrão:**
```json
{
  "success": false,
  "error": "Código do erro",
  "message": "Mensagem descritiva do erro"
}
```

**Códigos HTTP:**
- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Erro de validação ou dados inválidos
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor

---

## Considerações de Implementação

1. **Autenticação (Opcional):**
   - Se necessário, adicionar autenticação via API Key ou JWT
   - Header: `Authorization: Bearer {token}` ou `X-API-Key: {key}`

2. **Validação de Horários:**
   - Verificar se o horário está dentro do horário de funcionamento
   - Considerar feriados e dias de fechamento
   - Verificar conflitos com agendamentos existentes

3. **Formato de Telefone:**
   - Aceitar telefones no formato internacional (ex: 5582999999999)
   - Normalizar para formato consistente antes de salvar

4. **Timezone:**
   - Todas as datas devem ser em UTC (ISO 8601 com Z)
   - Converter para timezone local quando necessário para exibição

5. **Performance:**
   - Usar índices no banco de dados para consultas por data/hora
   - Cachear horários de funcionamento se possível

---

## Exemplo de Implementação (Node.js/Express)

```javascript
// routes/api/appointments.js
const express = require('express');
const router = express.Router();

// POST /api/appointments
router.post('/appointments', async (req, res) => {
  try {
    const { clientName, phone, service, startTime, endTime, notes } = req.body;
    
    // Validações
    if (!clientName || !phone || !service || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Campos obrigatórios: clientName, phone, service, startTime, endTime'
      });
    }

    // Verificar disponibilidade
    const isAvailable = await checkAvailability(startTime, endTime);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        error: 'SLOT_OCCUPIED',
        message: 'Horário já está ocupado'
      });
    }

    // Criar agendamento
    const appointment = await createAppointment({
      clientName,
      phone,
      service,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes
    });

    res.status(201).json({
      success: true,
      appointmentId: appointment.id,
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// GET /api/appointments/available-slots
router.get('/appointments/available-slots', async (req, res) => {
  try {
    const { from, to, durationMinutes, intervalMinutes = 0 } = req.query;
    
    if (!from || !to || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'Parâmetros obrigatórios: from, to, durationMinutes'
      });
    }

    const slots = await getAvailableSlots({
      from: new Date(from),
      to: new Date(to),
      durationMinutes: parseInt(durationMinutes),
      intervalMinutes: parseInt(intervalMinutes)
    });

    res.json({
      success: true,
      slots: slots.map(slot => ({
        startISO: slot.start.toISOString(),
        startLocal: formatLocalDateTime(slot.start),
        endISO: slot.end.toISOString(),
        endLocal: formatLocalDateTime(slot.end)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// GET /api/appointments/check-availability
router.get('/appointments/check-availability', async (req, res) => {
  try {
    const { startTime, durationMinutes, intervalMinutes = 0 } = req.query;
    
    if (!startTime || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'Parâmetros obrigatórios: startTime, durationMinutes'
      });
    }

    const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60000);
    const isAvailable = await checkAvailability(startTime, endTime, intervalMinutes);
    const conflicting = isAvailable ? null : await findConflictingAppointment(startTime, endTime);

    res.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Horário disponível' : 'Horário já está ocupado',
      conflictingAppointment: conflicting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// DELETE /api/appointments/:id
router.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAppointment(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Agendamento com ID ${id} não foi encontrado`
      });
    }

    res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      appointmentId: id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
```

---

## Instruções para o Lovable

1. **Criar os 4 endpoints principais** conforme especificado acima
2. **Implementar validações** de dados e disponibilidade de horários
3. **Adicionar tratamento de erros** consistente
4. **Implementar webhook de notificação** (chamar webhook externo após criar agendamento via interface)
5. **Testar todos os endpoints** com dados de exemplo
6. **Documentar** a URL base da API para configuração no sistema de WhatsApp

---

## Variáveis de Ambiente Necessárias

```env
# URL do webhook do sistema de WhatsApp (para notificações)
WHATSAPP_WEBHOOK_URL=https://projetomensagem-production.up.railway.app

# Porta do servidor (se aplicável)
PORT=3000
```

---

## Checklist de Implementação

- [ ] POST /api/appointments - Criar agendamento
- [ ] GET /api/appointments/available-slots - Listar horários disponíveis
- [ ] GET /api/appointments/check-availability - Verificar disponibilidade
- [ ] DELETE /api/appointments/:id - Cancelar agendamento
- [ ] Webhook de notificação (chamar após criar agendamento via interface)
- [ ] Validações de dados
- [ ] Tratamento de erros
- [ ] Testes com dados de exemplo
- [ ] Documentação da URL base da API

---

**Fim da Especificação**
