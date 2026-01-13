# GUIA DE IMPLEMENTAÇÃO DAS ROTAS RESTANTES

Este arquivo contém exemplos de implementação para as rotas que faltam. Use como base para completar seu backend.

## 📨 routes/messages.js (EXEMPLO)

```javascript
import express from 'express';
import { query } from '../config/database.js';
import { messageLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Enviar mensagem simples
router.post('/send-simple', messageLimiter, async (req, res) => {
  try {
    const { phone, message, attachment_url } = req.body;
    const userId = req.user.id;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone and message are required'
      });
    }

    // Salvar mensagem no banco
    const result = await query(
      `INSERT INTO messages (user_id, phone, message_type, content, attachments, status)
       VALUES ($1, $2, 'simple', $3, $4, 'pending')
       RETURNING id, uuid, status, created_at`,
      [userId, phone, message, JSON.stringify({ url: attachment_url })]
    );

    // Aqui você integraria com WhatsApp Cloud API
    // await sendWhatsAppMessage(phone, message, attachment_url);

    res.json({
      success: true,
      message: 'Message queued for sending',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Enviar múltiplas mensagens
router.post('/send-multiple', messageLimiter, async (req, res) => {
  try {
    const { contacts, message_template, interval, attachment_url } = req.body;
    const userId = req.user.id;

    if (!contacts || !Array.isArray(contacts) || !message_template) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array and message_template are required'
      });
    }

    let sentCount = 0;

    // Processar cada contato
    for (const contact of contacts) {
      // Substituir variáveis
      let finalMessage = message_template;
      finalMessage = finalMessage.replace('[NOME]', contact.name || '');
      finalMessage = finalMessage.replace('[VAR1]', contact.var1 || '');
      finalMessage = finalMessage.replace('[VAR2]', contact.var2 || '');

      // Salvar mensagem
      await query(
        `INSERT INTO messages (user_id, phone, message_type, content, variables, status)
         VALUES ($1, $2, 'multiple', $3, $4, 'pending')`,
        [userId, contact.phone, finalMessage, JSON.stringify(contact)]
      );

      sentCount++;

      // Aguardar intervalo antes da próxima
      if (interval) {
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
      }
    }

    res.json({
      success: true,
      message: `${sentCount} messages queued for sending`,
      sent_count: sentCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Histórico de mensagens
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let sqlQuery = 'SELECT * FROM messages WHERE user_id = $1';
    const params = [userId];

    if (status) {
      sqlQuery += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    sqlQuery += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sqlQuery, params);

    res.json({
      success: true,
      messages: result.rows,
      pagination: {
        total: result.rows.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## 👥 routes/contacts.js (EXEMPLO)

```javascript
import express from 'express';
import multer from 'multer';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Listar contatos
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let sqlQuery = 'SELECT * FROM contacts WHERE user_id = $1';
    const params = [userId];

    if (search) {
      sqlQuery += ' AND (name ILIKE $' + (params.length + 1) + ' OR phone ILIKE $' + (params.length + 1) + ')';
      params.push(`%${search}%`);
    }

    if (status) {
      sqlQuery += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    sqlQuery += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sqlQuery, params);

    // Contar total
    const countQuery = 'SELECT COUNT(*) FROM contacts WHERE user_id = $1';
    const countResult = await query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      contacts: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Criar contato
router.post('/', async (req, res) => {
  try {
    const { phone, name, email, address } = req.body;
    const userId = req.user.id;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone is required'
      });
    }

    const result = await query(
      `INSERT INTO contacts (user_id, uuid, phone, name, email, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [userId, uuidv4(), phone, name, email, address]
    );

    res.status(201).json({
      success: true,
      contact: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Importar contatos (CSV)
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    // Aqui você processaria o CSV
    // const contacts = await parseCSV(file.path);
    // for (const contact of contacts) {
    //   await query(INSERT...)
    // }

    res.json({
      success: true,
      message: 'Contacts imported successfully',
      imported_count: 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Deletar contato
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## 🤖 routes/chatbots.js (EXEMPLO)

```javascript
import express from 'express';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Listar chatbots
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM chatbots WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      chatbots: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Criar chatbot
router.post('/', async (req, res) => {
  try {
    const { name, type, greeting_message, config } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }

    const result = await query(
      `INSERT INTO chatbots (user_id, uuid, name, type, greeting_message, config, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'inactive')
       RETURNING *`,
      [userId, uuidv4(), name, type, greeting_message, JSON.stringify(config || {})]
    );

    res.status(201).json({
      success: true,
      chatbot: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Testar chatbot com GPT
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const chatbot = await query(
      'SELECT * FROM chatbots WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (chatbot.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chatbot not found'
      });
    }

    const bot = chatbot.rows[0];

    if (bot.type === 'gpt') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: bot.config.prompt || 'You are a helpful assistant'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1000
      });

      return res.json({
        success: true,
        response: response.choices[0].message.content
      });
    }

    // Para chatbots regular, buscar regras
    const rules = await query(
      'SELECT * FROM chatbot_rules WHERE chatbot_id = $1',
      [id]
    );

    const rule = rules.rows.find(r =>
      message.toLowerCase().includes(r.trigger.toLowerCase())
    );

    res.json({
      success: true,
      response: rule ? rule.response : bot.greeting_message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## 📊 routes/analytics.js (EXEMPLO)

```javascript
import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // Total de mensagens enviadas
    const messagesResult = await query(
      `SELECT COUNT(*) as count, status 
       FROM messages 
       WHERE user_id = $1 
       GROUP BY status`,
      [userId]
    );

    // Total de contatos
    const contactsResult = await query(
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = $1',
      [userId]
    );

    // Total de grupos
    const groupsResult = await query(
      'SELECT COUNT(*) as count FROM groups WHERE user_id = $1',
      [userId]
    );

    // Chatbots ativos
    const chatbotsResult = await query(
      "SELECT COUNT(*) as count FROM chatbots WHERE user_id = $1 AND status = 'active'",
      [userId]
    );

    res.json({
      success: true,
      stats: {
        messages_sent: messagesResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        total_contacts: parseInt(contactsResult.rows[0]?.count || 0),
        total_groups: parseInt(groupsResult.rows[0]?.count || 0),
        active_chatbots: parseInt(chatbotsResult.rows[0]?.count || 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## 🔧 services/whatsappService.js (EXEMPLO)

```javascript
import axios from 'axios';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export async function sendMessage(phone, message, attachmentUrl = null) {
  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone.replace(/\D/g, ''),
      type: attachmentUrl ? 'document' : 'text',
      text: !attachmentUrl ? { body: message } : undefined,
      document: attachmentUrl ? {
        link: attachmentUrl,
        caption: message
      } : undefined
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id,
      timestamp: response.data.messages[0].timestamp
    };
  } catch (error) {
    console.error('❌ WhatsApp send error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function validateNumber(phone) {
  // Implementar validação de número
  // Retorna: { valid: boolean, country: string }
  return { valid: /^55\d{10,11}$/.test(phone), country: 'BR' };
}
```

## 🧠 services/openaiService.js (EXEMPLO)

```javascript
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateChatbotResponse(prompt, userMessage, conversationHistory = []) {
  try {
    const messages = [
      { role: 'system', content: prompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
      temperature: 0.7
    });

    return {
      success: true,
      response: response.choices[0].message.content,
      usage: response.usage
    };
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 📝 PRÓXIMAS IMPLEMENTAÇÕES

1. **Completar rotas restantes** (users.js, groups.js, validator.js)
2. **Integração WhatsApp Cloud API** em whatsappService.js
3. **Processamento de CSV** em csvService.js
4. **Sistema de filas** com Bull/Redis para envios em massa
5. **Webhooks** para receber status de mensagens
6. **Testes unitários** com Jest
7. **Deploy** em Docker/AWS/GCP
8. **Documentação Swagger/OpenAPI**

---

**Use estes exemplos como base para implementar as rotas restantes!**
