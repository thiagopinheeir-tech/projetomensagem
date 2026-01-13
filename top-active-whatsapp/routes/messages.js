const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const whatsappManager = require('../services/whatsapp-manager');
const { query } = require('../config/database');

// Enviar mensagem simples
router.post('/send-simple', authMiddleware, requireUserId, async (req, res) => {
  try {
    const { phone, message } = req.body;
    const userId = req.userId;

    // Validações
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone e message são obrigatórios' 
      });
    }

    // Verificar se WhatsApp está conectado para este usuário
    if (!whatsappManager.isReady(userId)) {
      return res.status(503).json({ 
        success: false, 
        message: 'WhatsApp não conectado. Conecte seu WhatsApp primeiro.' 
      });
    }

    // Enviar mensagem via WhatsApp (instância do usuário)
    const whatsappResult = await whatsappManager.sendMessage(userId, phone, message);
    
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
router.get('/status', authMiddleware, requireUserId, async (req, res) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/messages.js:82',message:'GET /status ENTRY',data:{userId:req.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F1'})}).catch(()=>{});
    // #endregion
    const status = await whatsappManager.getStatus(req.userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/messages.js:85',message:'GET /status EXIT',data:{statusReady:status.isReady,statusStatus:status.status,hasQRCode:!!status.qrCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F1'})}).catch(()=>{});
    // #endregion
    res.json({
      success: true,
      connected: status.isReady || status.status === 'ready',
      authenticated: status.isReady || status.status === 'ready',
      ready: status.isReady || status.status === 'ready',
      hasQRCode: !!status.qrCode
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/messages.js:95',message:'GET /status ERROR',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F1'})}).catch(()=>{});
    // #endregion
    console.error('❌ Erro ao obter status do WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do WhatsApp: ' + error.message
    });
  }
});

// Obter QR Code (para exibir no frontend)
router.get('/qr', authMiddleware, requireUserId, async (req, res) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/messages.js:101',message:'GET /qr ENTRY',data:{userId:req.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F2'})}).catch(()=>{});
    // #endregion
    const qrCode = await whatsappManager.getQRCode(req.userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/messages.js:104',message:'GET /qr EXIT',data:{hasQRCode:!!qrCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F2'})}).catch(()=>{});
    // #endregion
    
    if (!qrCode) {
      const status = await whatsappManager.getStatus(req.userId);
      return res.json({
        success: false,
        message: 'Nenhum QR code disponível. WhatsApp já pode estar conectado ou aguardando nova autenticação.',
        connected: status.isReady || status.status === 'ready'
      });
    }

    res.json({
      success: true,
      qrCode: qrCode
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/messages.js:119',message:'GET /qr ERROR',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F2'})}).catch(()=>{});
    // #endregion
    console.error('❌ Erro ao obter QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter QR code: ' + error.message
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
