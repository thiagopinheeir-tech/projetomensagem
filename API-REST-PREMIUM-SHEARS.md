# 🔌 API REST Premium Shears Scheduler

Esta é a **API REST que o Lovable está criando** no projeto **Premium Shears Scheduler** para integrar com nosso sistema de WhatsApp.

---

## 📍 URL Base da API

A URL base será fornecida pelo Lovable após a implementação. Geralmente será algo como:
```
https://seu-dominio-premium-shears.com/api
```
ou
```
https://premium-shears-xxx.lovable.app/api
```

**Você precisa perguntar ao Lovable qual é a URL base da API após a implementação estar pronta.**

---

## 🔑 Autenticação

**Header (Opcional):**
```
Authorization: Bearer {API_KEY}
```

- A API Key é **opcional** - alguns usuários podem não usar
- Se não houver API Key no header, a API ainda deve funcionar

---

## 📋 Endpoints da API REST

### 1. **POST /api/appointments**
**Cria um novo agendamento no Premium Shears**

**Request:**
```bash
POST /api/appointments
Content-Type: application/json
Authorization: Bearer {API_KEY} (opcional)

{
  "clientName": "João Silva",
  "phone": "5511999999999",
  "service": "Corte + Barba",
  "startTime": "2026-01-15T14:30:00.000Z",
  "endTime": "2026-01-15T15:00:00.000Z",
  "notes": "Cliente prefere corte curto" (opcional)
}
```

**Response Sucesso (201):**
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

**Response Erro (409 - Horário ocupado):**
```json
{
  "success": false,
  "error": "Horário indisponível - já existe um agendamento neste período",
  "code": "SLOT_OCCUPIED"
}
```

---

### 2. **GET /api/appointments/available-slots**
**Lista todos os horários disponíveis em um período**

**Request:**
```bash
GET /api/appointments/available-slots?from=2026-01-15T09:00:00.000Z&to=2026-01-15T20:00:00.000Z&durationMinutes=30&intervalMinutes=15
Authorization: Bearer {API_KEY} (opcional)
```

**Query Parameters:**
- `from` (obrigatório): Data/hora inicial ISO 8601
- `to` (obrigatório): Data/hora final ISO 8601
- `durationMinutes` (obrigatório): Duração do serviço em minutos
- `intervalMinutes` (opcional): Intervalo mínimo entre agendamentos

**Response (200):**
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

---

### 3. **GET /api/appointments/check-availability**
**Verifica se um horário específico está disponível**

**Request:**
```bash
GET /api/appointments/check-availability?startTime=2026-01-15T14:30:00.000Z&durationMinutes=30&intervalMinutes=15
Authorization: Bearer {API_KEY} (opcional)
```

**Query Parameters:**
- `startTime` (obrigatório): Data/hora a verificar ISO 8601
- `durationMinutes` (obrigatório): Duração do serviço em minutos
- `intervalMinutes` (opcional): Intervalo mínimo entre agendamentos

**Response Disponível (200):**
```json
{
  "success": true,
  "available": true,
  "message": "Horário disponível"
}
```

**Response Indisponível (200):**
```json
{
  "success": true,
  "available": false,
  "message": "Horário ocupado ou fora do horário de funcionamento",
  "reason": "SLOT_OCCUPIED"
}
```

---

### 4. **DELETE /api/appointments/:id**
**Cancela/deleta um agendamento**

**Request:**
```bash
DELETE /api/appointments/abc123-def456-ghi789
Authorization: Bearer {API_KEY} (opcional)
```

**Response Sucesso (200):**
```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso",
  "appointmentId": "abc123-def456-ghi789"
}
```

**Response Erro (404):**
```json
{
  "success": false,
  "error": "Agendamento não encontrado"
}
```

---

## 🔔 Webhook (Implementado pelo Premium Shears)

O Premium Shears deve chamar nosso webhook quando um agendamento for criado **diretamente na interface** (não via nossa API):

**URL do Webhook (nosso sistema):**
```
POST https://projetomensagem-production.up.railway.app/api/webhooks/premium-shears/appointment-created
```

**Payload que o Premium Shears deve enviar:**
```json
{
  "appointmentId": "abc123-def456-ghi789",
  "clientName": "Maria Santos",
  "phone": "5511888888888",
  "service": "Corte",
  "startTime": "2026-01-16T10:00:00.000Z",
  "endTime": "2026-01-16T10:30:00.000Z",
  "userId": "user-uuid-or-id",  // CRÍTICO: ID do usuário
  "notes": "Primeira vez" (opcional)
}
```

---

## 📝 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Erro de validação / Dados inválidos |
| `401` | Não autorizado (API Key inválida - se autenticação obrigatória) |
| `404` | Recurso não encontrado |
| `409` | Conflito / Horário ocupado |
| `500` | Erro interno do servidor |

---

## 🔍 Como Testar a API

### 1. Testar Criação de Agendamento
```bash
curl -X POST https://URL-DO-PREMIUM-SHEARS/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_API_KEY" \
  -d '{
    "clientName": "João Silva",
    "phone": "5511999999999",
    "service": "Corte",
    "startTime": "2026-01-20T14:30:00.000Z",
    "endTime": "2026-01-20T15:00:00.000Z"
  }'
```

### 2. Testar Listagem de Slots
```bash
curl -X GET "https://URL-DO-PREMIUM-SHEARS/api/appointments/available-slots?from=2026-01-20T09:00:00.000Z&to=2026-01-20T20:00:00.000Z&durationMinutes=30" \
  -H "Authorization: Bearer SUA_API_KEY"
```

### 3. Testar Verificação de Disponibilidade
```bash
curl -X GET "https://URL-DO-PREMIUM-SHEARS/api/appointments/check-availability?startTime=2026-01-20T14:30:00.000Z&durationMinutes=30" \
  -H "Authorization: Bearer SUA_API_KEY"
```

### 4. Testar Cancelamento
```bash
curl -X DELETE https://URL-DO-PREMIUM-SHEARS/api/appointments/abc123-def456 \
  -H "Authorization: Bearer SUA_API_KEY"
```

---

## ✅ Checklist de Implementação (Lovable)

- [ ] POST /api/appointments - Criar agendamento
- [ ] GET /api/appointments/available-slots - Listar slots disponíveis
- [ ] GET /api/appointments/check-availability - Verificar disponibilidade
- [ ] DELETE /api/appointments/:id - Cancelar agendamento
- [ ] Webhook: Chamar nosso sistema quando agendamento for criado via UI
- [ ] Autenticação opcional via API Key
- [ ] Validações de dados e horários
- [ ] Tratamento de erros consistente

---

## 🔗 Integração com Nosso Sistema

Nossa integração (no arquivo `services/premium-shears-scheduler.js`) já está pronta para consumir esta API:

- ✅ Cria agendamentos via `POST /api/appointments`
- ✅ Lista slots via `GET /api/appointments/available-slots`
- ✅ Verifica disponibilidade via `GET /api/appointments/check-availability`
- ✅ Cancela agendamentos via `DELETE /api/appointments/:id`
- ✅ Recebe webhooks em `/api/webhooks/premium-shears/appointment-created`

**Tudo que você precisa fazer é:**
1. Obter a **URL base da API** do Lovable
2. Configurar no frontend em **"Chaves e Integrações"**
3. Configurar a **API Key** (se aplicável)
4. Testar a conexão

---

## 📞 Próximos Passos

1. **Perguntar ao Lovable**: "Qual é a URL base da API REST que você criou?"
2. **Configurar no Frontend**: Adicionar a URL em "Chaves e Integrações" → "Sistema de Agendamento"
3. **Testar Endpoints**: Usar os exemplos de curl acima para testar
4. **Configurar Webhook**: Certificar que o Premium Shears está chamando nosso webhook

---

**Última atualização:** 13/01/2026
