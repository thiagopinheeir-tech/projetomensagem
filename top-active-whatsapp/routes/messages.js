const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const whatsapp = require('../services/whatsapp');
const { query } = require('../config/database');

// Enviar mensagem simples
router.post('/send-simple', authMiddleware, async (req, res) => {
  try {
    const { phone, message } = req.body;
    const userId = req.user.id;

    // Validações
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone e message são obrigatórios' 
      });
    }

    if (!whatsapp.getStatus().ready) {
      return res.status(503).json({ 
        success: false, 
        message: 'WhatsApp não conectado. Escaneie o QR code primeiro.' 
      });
    }

    // Enviar mensagem via WhatsApp
    const whatsappResult = await whatsapp.sendMessage(phone, message);
    
    // Salvar no banco de dados
    const dbResult = await query(
      `INSERT INTO messages (user_id, phone, message, status, sent_at)
       VALUES ($1, $2, $3, 'sent', CURRENT_TIMESTAMP)
       RETURNING id, uuid, phone, message, status, sent_at`,
      [userId, phone, message]
    );

    const savedMessage = dbResult.rows[0];

    res.json({
      success: true,
      message: '✅ Mensagem enviada com sucesso!',
      data: {
        id: savedMessage.id,
        uuid: savedMessage.uuid,
        phone: savedMessage.phone,
        message: savedMessage.message,
        status: savedMessage.status,
        sentAt: savedMessage.sent_at,
        whatsappId: whatsappResult.id
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    
    // Tentar salvar como failed no banco
    try {
      const userId = req.user.id;
      await query(
        `INSERT INTO messages (user_id, phone, message, status, error_message, created_at)
         VALUES ($1, $2, $3, 'failed', $4, CURRENT_TIMESTAMP)`,
        [userId, req.body.phone, req.body.message, error.message]
      );
    } catch (dbError) {
      console.error('Erro ao salvar mensagem falhada:', dbError);
    }

    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao enviar mensagem'
    });
  }
});

// Status do WhatsApp
router.get('/status', authMiddleware, (req, res) => {
  try {
    const status = whatsapp.getStatus();
    res.json({
      success: true,
      connected: status.ready,
      authenticated: status.authenticated,
      ready: status.ready,
      hasQRCode: !!status.qrCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do WhatsApp'
    });
  }
});

// Obter QR Code (para exibir no frontend)
router.get('/qr', authMiddleware, (req, res) => {
  try {
    const qrCode = whatsapp.getQRCode();
    
    if (!qrCode) {
      return res.json({
        success: false,
        message: 'Nenhum QR code disponível. WhatsApp já pode estar conectado ou aguardando nova autenticação.',
        connected: whatsapp.getStatus().ready
      });
    }

    res.json({
      success: true,
      qrCode: qrCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter QR code'
    });
  }
});

// Histórico de mensagens
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, uuid, phone, message, status, sent_at, error_message, created_at
       FROM messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM messages WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      messages: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de mensagens'
    });
  }
});

module.exports = router;
