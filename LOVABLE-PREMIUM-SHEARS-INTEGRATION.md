# 🎯 ESPECIFICAÇÃO COMPLETA: Integração Premium Shears Scheduler

## 📋 CONTEXTO

Você precisa implementar uma API REST completa no projeto **Premium Shears Scheduler** para integrar com nosso sistema de WhatsApp e IA. O sistema Premium Shears será usado para gerenciar agendamentos de uma barbearia, e nosso sistema irá:

1. **Criar agendamentos** automaticamente quando clientes agendarem via WhatsApp
2. **Verificar horários disponíveis** para sugerir opções aos clientes
3. **Receber notificações** quando agendamentos forem criados diretamente no Premium Shears (via webhook)
4. **Cancelar agendamentos** quando necessário

## 🔐 REQUISITOS DE AUTENTICAÇÃO E SEGURANÇA

- A API deve suportar autenticação via **API Key** (Bearer Token) no header `Authorization`
- A API Key é **opcional** - alguns usuários podem não usar
- Se não houver API Key, ainda deve funcionar (mas pode adicionar validações extras)
- Cada usuário terá sua própria API Key configurada no nosso sistema

## 🌐 ENDPOINTS NECESSÁRIOS

### 1. POST /api/appointments
**Descrição:** Cria um novo agendamento no sistema Premium Shears

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {API_KEY} (opcional)
```

**Request Body:**
```json
{
  "clientName": "João Silva",
  "phone": "5511999999999",
  "service": "Corte + Barba",
  "startTime": "2026-01-15T14:30:00.000Z",
  "endTime": "2026-01-15T15:00:00.000Z",
  "notes": "Cliente prefere corte curto" (opcional)
}
```

**Validações:**
- `phone`: obrigatório, apenas números com código do país
- `service`: obrigatório, string
- `startTime`: obrigatório, ISO 8601 datetime
- `endTime`: obrigatório, ISO 8601 datetime, deve ser após `startTime`
- `clientName`: obrigatório, string
- Verificar se o horário está disponível (não conflita com outros agendamentos)
- Verificar horário de funcionamento (ex: 9h-20h)
- Verificar intervalo entre agendamentos se configurado

**Response (Sucesso - 201):**
```json
{
  "success": true,
  "appointmentId": "abc123-def456-ghi789",
  "appointment": {
    "id": "abc123-def456-ghi789",
    "clientName": "João Silva",
    "phone": "5511999999999",
    "service": "Corte + Barba",
    "startTime": "2026-01-15T14:30:00.000Z",
    "endTime": "2026-01-15T15:00:00.000Z",
    "status": "confirmed",
    "notes": "Cliente prefere corte curto"
  },
  "message": "Agendamento criado com sucesso"
}
```

**Response (Erro - 400/409):**
```json
{
  "success": false,
  "error": "Horário indisponível - já existe um agendamento neste período",
  "code": "SLOT_OCCUPIED"
}
```

**Códigos de Status:**
- `201 Created`: Agendamento criado com sucesso
- `400 Bad Request`: Dados inválidos (campos faltando, formato incorreto)
- `409 Conflict`: Horário ocupado/indisponível
- `401 Unauthorized`: API Key inválida (se autenticação for obrigatória)
- `500 Internal Server Error`: Erro interno do servidor

---

### 2. GET /api/appointments/available-slots
**Descrição:** Lista todos os horários disponíveis em um período

**Headers:**
```
Authorization: Bearer {API_KEY} (opcional)
```

**Query Parameters:**
- `from`: ISO 8601 datetime (obrigatório) - início do período
- `to`: ISO 8601 datetime (obrigatório) - fim do período
- `durationMinutes`: número (obrigatório) - duração do serviço em minutos
- `intervalMinutes`: número (opcional) - intervalo mínimo entre agendamentos

**Exemplo de Requisição:**
```
GET /api/appointments/available-slots?from=2026-01-15T09:00:00.000Z&to=2026-01-15T20:00:00.000Z&durationMinutes=30&intervalMinutes=15
```

**Response (Sucesso - 200):**
```json
{
  "success": true,
  "slots": [
    {
      "startISO": "2026-01-15T09:00:00.000Z",
      "startLocal": "15/01/2026 09:00"
    },
    {
      "startISO": "2026-01-15T09:30:00.000Z",
      "startLocal": "15/01/2026 09:30"
    },
    {
      "startISO": "2026-01-15T10:00:00.000Z",
      "startLocal": "15/01/2026 10:00"
    }
  ]
}
```

**Validações:**
- `from` e `to` devem ser válidos e `to` deve ser após `from`
- `durationMinutes` deve ser > 0
- Considerar horário de funcionamento (ex: 9h-20h)
- Considerar pausa para almoço se configurado
- Considerar agendamentos já existentes
- Considerar intervalo entre agendamentos
- Considerar dias da semana (ex: não funcionar domingo)

**Response (Erro - 400):**
```json
{
  "success": false,
  "error": "Parâmetros inválidos",
  "details": "from e to são obrigatórios"
}
```

---

### 3. GET /api/appointments/check-availability
**Descrição:** Verifica se um horário específico está disponível

**Headers:**
```
Authorization: Bearer {API_KEY} (opcional)
```

**Query Parameters:**
- `startTime`: ISO 8601 datetime (obrigatório) - horário a verificar
- `durationMinutes`: número (obrigatório) - duração do serviço em minutos
- `intervalMinutes`: número (opcional) - intervalo mínimo entre agendamentos

**Exemplo de Requisição:**
```
GET /api/appointments/check-availability?startTime=2026-01-15T14:30:00.000Z&durationMinutes=30&intervalMinutes=15
```

**Response (Disponível - 200):**
```json
{
  "success": true,
  "available": true,
  "message": "Horário disponível"
}
```

**Response (Indisponível - 200):**
```json
{
  "success": true,
  "available": false,
  "message": "Horário ocupado ou fora do horário de funcionamento",
  "reason": "SLOT_OCCUPIED" // ou "OUTSIDE_HOURS", "INVALID_TIME"
}
```

**Validações:**
- Verificar se não há conflito com agendamentos existentes
- Verificar se está dentro do horário de funcionamento
- Verificar se o horário não está no passado
- Considerar intervalo entre agendamentos

---

### 4. DELETE /api/appointments/:id
**Descrição:** Cancela/deleta um agendamento

**Headers:**
```
Authorization: Bearer {API_KEY} (opcional)
```

**URL Parameters:**
- `id`: ID do agendamento (obrigatório)

**Exemplo de Requisição:**
```
DELETE /api/appointments/abc123-def456-ghi789
```

**Response (Sucesso - 200):**
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso",
  "appointmentId": "abc123-def456-ghi789"
}
```

**Response (Erro - 404):**
```json
{
  "success": false,
  "error": "Agendamento não encontrado"
}
```

**Validações:**
- Verificar se o agendamento existe
- Verificar se o agendamento pertence ao usuário correto (se multi-tenant)
- Opcional: permitir cancelamento apenas com X horas de antecedência

---

## 🔔 WEBHOOK: Notificar nosso sistema

### POST /api/webhooks/appointment-created (NO NOSSO SISTEMA)
**IMPORTANTE:** Este endpoint está no **NOSSO sistema**, mas o **Premium Shears** deve chamá-lo quando um agendamento for criado diretamente no Premium Shears (não via nossa API).

**URL Completa do Webhook:**
```
https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created
```

**Quando chamar:**
- Quando um agendamento for criado diretamente no sistema Premium Shears (via interface web, app mobile, etc)
- **NÃO** chamar quando o agendamento vier da nossa API (evitar duplicação)

**Headers:**
```
Content-Type: application/json
```

**Request Body (OBRIGATÓRIO enviar para nosso sistema):**
```json
{
  "appointmentId": "abc123-def456-ghi789",
  "clientName": "Maria Santos",
  "phone": "5511888888888",
  "service": "Corte",
  "startTime": "2026-01-16T10:00:00.000Z",
  "endTime": "2026-01-16T10:30:00.000Z",
  "userId": "user-uuid-or-id", // ID do usuário que possui o Premium Shears (será enviado pelo nosso sistema na criação, ou você deve ter uma forma de identificar)
  "notes": "Primeira vez" // opcional
}
```

**Campos Obrigatórios:**
- `appointmentId`: ID único do agendamento no Premium Shears
- `phone`: Telefone do cliente (apenas números com código do país)
- `service`: Nome do serviço
- `startTime`: ISO 8601 datetime
- `endTime`: ISO 8601 datetime
- `userId`: ID do usuário (você precisa ter uma forma de identificar qual usuário/estabelecimento criou o agendamento)

**Como obter o `userId`:**
- Opção 1: Quando nosso sistema criar um agendamento via API, você pode armazenar o `userId` junto com o `appointmentId`
- Opção 2: Ter uma tabela de configuração que mapeia cada estabelecimento/usuario Premium Shears para um `userId` do nosso sistema
- Opção 3: Enviar `userId` como parte da autenticação/contexto

**Response Esperado (do nosso sistema):**
```json
{
  "success": true,
  "message": "Agendamento processado com sucesso",
  "appointmentId": "abc123-def456-ghi789"
}
```

**Tratamento de Erros:**
- Se nosso sistema retornar erro, fazer retry (ex: 3 tentativas com intervalo de 5 segundos)
- Logar erros para depuração
- Não bloquear a criação do agendamento no Premium Shears se o webhook falhar

---

## 📝 EXEMPLO DE IMPLEMENTAÇÃO (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();

// POST /api/appointments
router.post('/api/appointments', async (req, res) => {
  try {
    const { clientName, phone, service, startTime, endTime, notes } = req.body;

    // Validações
    if (!phone || !service || !startTime || !endTime || !clientName) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: phone, service, startTime, endTime, clientName'
      });
    }

    // Validar formato de data
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Datas inválidas'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'endTime deve ser após startTime'
      });
    }

    // Verificar se horário está disponível
    const isAvailable = await checkAvailability(startTime, endTime);
    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        error: 'Horário indisponível - já existe um agendamento neste período',
        code: 'SLOT_OCCUPIED'
      });
    }

    // Verificar horário de funcionamento
    const hour = start.getHours();
    if (hour < 9 || hour >= 20) {
      return res.status(400).json({
        success: false,
        error: 'Horário fora do funcionamento (9h-20h)'
      });
    }

    // Criar agendamento no banco de dados
    const appointmentId = await createAppointment({
      clientName,
      phone: phone.replace(/\D/g, ''), // Apenas números
      service,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: notes || null,
      status: 'confirmed'
    });

    // Resposta
    res.status(201).json({
      success: true,
      appointmentId,
      appointment: {
        id: appointmentId,
        clientName,
        phone,
        service,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: 'confirmed',
        notes: notes || null
      },
      message: 'Agendamento criado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// GET /api/appointments/available-slots
router.get('/api/appointments/available-slots', async (req, res) => {
  try {
    const { from, to, durationMinutes, intervalMinutes = 0 } = req.query;

    // Validações
    if (!from || !to || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: from, to, durationMinutes'
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const duration = parseInt(durationMinutes);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || duration <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos'
      });
    }

    // Buscar slots disponíveis
    const slots = await getAvailableSlots({
      from: fromDate,
      to: toDate,
      durationMinutes: duration,
      intervalMinutes: parseInt(intervalMinutes) || 0
    });

    // Formatar resposta
    const formattedSlots = slots.map(slot => ({
      startISO: slot.start.toISOString(),
      startLocal: slot.start.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    res.json({
      success: true,
      slots: formattedSlots
    });

  } catch (error) {
    console.error('Erro ao buscar slots:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// GET /api/appointments/check-availability
router.get('/api/appointments/check-availability', async (req, res) => {
  try {
    const { startTime, durationMinutes, intervalMinutes = 0 } = req.query;

    if (!startTime || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: startTime, durationMinutes'
      });
    }

    const start = new Date(startTime);
    const duration = parseInt(durationMinutes);

    if (isNaN(start.getTime()) || duration <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos'
      });
    }

    // Verificar disponibilidade
    const available = await checkSlotAvailability({
      startTime: start,
      durationMinutes: duration,
      intervalMinutes: parseInt(intervalMinutes) || 0
    });

    res.json({
      success: true,
      available: available.isAvailable,
      message: available.isAvailable ? 'Horário disponível' : available.reason,
      reason: available.reason || null
    });

  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// DELETE /api/appointments/:id
router.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID do agendamento é obrigatório'
      });
    }

    // Verificar se existe
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado'
      });
    }

    // Deletar/Cancelar
    await cancelAppointment(id);

    res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      appointmentId: id
    });

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// FUNÇÃO: Chamar webhook do nosso sistema quando agendamento for criado diretamente
async function notifyWhatsAppSystem(appointmentData, userId) {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || 
    'https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appointmentId: appointmentData.id,
        clientName: appointmentData.clientName,
        phone: appointmentData.phone,
        service: appointmentData.service,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        userId: userId, // IMPORTANTE: incluir userId
        notes: appointmentData.notes || null
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('Erro ao notificar sistema WhatsApp:', result);
      // Retry lógica aqui se necessário
    } else {
      console.log('✅ Sistema WhatsApp notificado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao chamar webhook:', error);
    // Não bloquear criação do agendamento se webhook falhar
  }
}

// Exemplo: Ao criar agendamento via interface (não via API nossa)
async function createAppointmentViaUI(appointmentData, userId) {
  // Criar no banco
  const appointment = await createAppointmentInDatabase(appointmentData);
  
  // Notificar nosso sistema via webhook
  await notifyWhatsAppSystem(appointment, userId);
  
  return appointment;
}

module.exports = router;
```

---

## 🗄️ ESTRUTURA DE DADOS SUGERIDA

```sql
-- Tabela de agendamentos
CREATE TABLE appointments (
  id VARCHAR(255) PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  service VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  notes TEXT,
  user_id VARCHAR(255), -- ID do usuário do nosso sistema (se multi-tenant)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_phone ON appointments(phone);

-- Tabela de configurações (horário de funcionamento, etc)
CREATE TABLE scheduler_config (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE,
  open_hour INTEGER DEFAULT 9,
  close_hour INTEGER DEFAULT 20,
  lunch_start_hour INTEGER DEFAULT 12,
  lunch_end_hour INTEGER DEFAULT 13,
  days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=domingo, 1=segunda, etc
  default_service_duration INTEGER DEFAULT 30, -- minutos
  interval_between_appointments INTEGER DEFAULT 15, -- minutos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **Endpoint POST /api/appointments** criado e funcionando
  - [ ] Validações de campos obrigatórios
  - [ ] Validação de horário disponível
  - [ ] Validação de horário de funcionamento
  - [ ] Criação no banco de dados
  - [ ] Retorno correto com appointmentId

- [ ] **Endpoint GET /api/appointments/available-slots** criado e funcionando
  - [ ] Busca slots disponíveis no período
  - [ ] Considera horário de funcionamento
  - [ ] Considera agendamentos existentes
  - [ ] Formata resposta corretamente

- [ ] **Endpoint GET /api/appointments/check-availability** criado e funcionando
  - [ ] Verifica se horário específico está livre
  - [ ] Retorna true/false corretamente

- [ ] **Endpoint DELETE /api/appointments/:id** criado e funcionando
  - [ ] Verifica existência do agendamento
  - [ ] Cancela/deleta corretamente
  - [ ] Retorna resposta apropriada

- [ ] **Webhook para nosso sistema** implementado
  - [ ] Chama webhook quando agendamento é criado via UI
  - [ ] Inclui userId corretamente
  - [ ] Tratamento de erros e retry
  - [ ] Não bloqueia criação se webhook falhar

- [ ] **Autenticação via API Key** (opcional mas recomendado)
  - [ ] Validação de Bearer Token
  - [ ] Retorno de erro 401 se inválido

- [ ] **Multi-tenancy** (se necessário)
  - [ ] Isolamento de dados por usuário
  - [ ] userId em todas as operações

---

## 🔍 CENÁRIOS DE TESTE

### Teste 1: Criar Agendamento
```bash
POST /api/appointments
{
  "clientName": "João Silva",
  "phone": "5511999999999",
  "service": "Corte",
  "startTime": "2026-01-20T14:30:00.000Z",
  "endTime": "2026-01-20T15:00:00.000Z"
}

# Esperado: 201 Created com appointmentId
```

### Teste 2: Tentar Criar em Horário Ocupado
```bash
POST /api/appointments
{
  "clientName": "Maria Santos",
  "phone": "5511888888888",
  "service": "Barba",
  "startTime": "2026-01-20T14:30:00.000Z", # Mesmo horário do anterior
  "endTime": "2026-01-20T15:00:00.000Z"
}

# Esperado: 409 Conflict com mensagem de horário ocupado
```

### Teste 3: Listar Slots Disponíveis
```bash
GET /api/appointments/available-slots?from=2026-01-20T09:00:00.000Z&to=2026-01-20T20:00:00.000Z&durationMinutes=30

# Esperado: 200 OK com array de slots disponíveis
```

### Teste 4: Verificar Disponibilidade
```bash
GET /api/appointments/check-availability?startTime=2026-01-20T10:00:00.000Z&durationMinutes=30

# Esperado: 200 OK com {"available": true} ou {"available": false}
```

### Teste 5: Cancelar Agendamento
```bash
DELETE /api/appointments/{appointmentId}

# Esperado: 200 OK com mensagem de sucesso
```

---

## 🚨 IMPORTANTE

1. **userId é CRÍTICO**: Sempre inclua o `userId` no webhook para nosso sistema poder isolar dados por usuário
2. **Horário de Funcionamento**: Considere horário comercial (ex: 9h-20h) e pausa para almoço
3. **Formato de Data**: Sempre use ISO 8601 (ex: `2026-01-15T14:30:00.000Z`)
4. **Telefone**: Sempre limpar para apenas números com código do país
5. **Webhook**: Chamar apenas quando agendamento for criado via UI Premium Shears, NÃO quando vier da nossa API

---

## 📞 DÚVIDAS OU PROBLEMAS?

Se tiver dúvidas sobre:
- Formato de dados específico
- Lógica de validação
- Webhook e userId
- Multi-tenancy

Consulte este documento ou me avise para esclarecimentos adicionais.

---

**🎯 OBJETIVO FINAL:** Criar uma API completa que permita nosso sistema criar, verificar e cancelar agendamentos no Premium Shears, e que notifique nosso sistema quando agendamentos forem criados diretamente no Premium Shears.
