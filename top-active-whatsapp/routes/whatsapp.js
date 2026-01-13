const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const whatsappManager = require('../services/whatsapp-manager');

/**
 * GET /api/whatsapp/status/:userId
 * Verifica o status de autenticação do WhatsApp para um usuário
 */
router.get('/status/:userId', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.userId;

    // Validar que o usuário está acessando seu próprio status
    if (String(requestedUserId) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    const status = await whatsappManager.getStatus(requestedUserId);
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/whatsapp/status
 * Status do WhatsApp do usuário logado
 */
router.get('/status', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const status = await whatsappManager.getStatus(req.userId);
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/whatsapp/connect/:userId
 * Inicia conexão WhatsApp para um usuário específico
 */
router.post('/connect/:userId', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.userId;

    // Validar que o usuário está conectando seu próprio WhatsApp
    if (String(requestedUserId) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    const { profileId } = req.body;

    await whatsappManager.initializeForUser(requestedUserId, profileId);

    res.json({
      success: true,
      message: 'Conexão WhatsApp iniciada. Escaneie o QR code quando aparecer.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/whatsapp/connect
 * Inicia conexão WhatsApp para o usuário logado
 */
router.post('/connect', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/whatsapp.js:84',message:'POST /connect ENTRY',data:{userId:req.userId,profileId:req.body.profileId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { profileId } = req.body;

    console.log(`📱 [API] Iniciando conexão WhatsApp para usuário ${req.userId}`);
    await whatsappManager.initializeForUser(req.userId, profileId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/whatsapp.js:90',message:'POST /connect EXIT',data:{userId:req.userId,initialized:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    res.json({
      success: true,
      message: 'Conexão WhatsApp iniciada. Escaneie o QR code quando aparecer.'
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/whatsapp.js:95',message:'POST /connect ERROR',data:{userId:req.userId,errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    next(error);
  }
});

/**
 * GET /api/whatsapp/qr/:userId
 * Obtém QR code para um usuário específico
 */
router.get('/qr/:userId', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.userId;

    // Validar que o usuário está acessando seu próprio QR code
    if (String(requestedUserId) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    const qrCode = await whatsappManager.getQRCode(requestedUserId);
    res.json({
      success: true,
      qrCode: qrCode || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/whatsapp/qr
 * Obtém QR code do usuário logado
 */
router.get('/qr', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const qrCode = await whatsappManager.getQRCode(req.userId);
    res.json({
      success: true,
      qrCode: qrCode || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/whatsapp/logout/:userId
 * Desconecta a sessão do WhatsApp de um usuário
 */
router.post('/logout/:userId', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.userId;

    // Validar que o usuário está desconectando seu próprio WhatsApp
    if (String(requestedUserId) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    await whatsappManager.removeInstance(requestedUserId);

    res.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/whatsapp/logout
 * Desconecta a sessão do WhatsApp do usuário logado
 */
router.post('/logout', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    await whatsappManager.removeInstance(req.userId);

    res.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/whatsapp/all-statuses
 * Obtém status de todas as instâncias (apenas para admin/debug)
 */
router.get('/all-statuses', authMiddleware, async (req, res, next) => {
  try {
    // TODO: Adicionar verificação de admin se necessário
    const statuses = await whatsappManager.getAllStatuses();
    res.json({
      success: true,
      statuses
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
