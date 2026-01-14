const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const googleOAuthController = require('../controllers/googleOAuthController');

// OAuth start (precisa estar autenticado para saber qual usuário está conectando)
router.get('/oauth/start', authMiddleware, requireUserId, googleOAuthController.start);

// Callback do Google (não tem Bearer token; valida via state assinado)
router.get('/oauth/callback', googleOAuthController.callback);


// Status simples (se token existe)
router.get('/status', authMiddleware, requireUserId, googleOAuthController.status);

// Remover credenciais do Google (desconectar)
router.delete('/disconnect', authMiddleware, requireUserId, googleOAuthController.disconnect);

module.exports = router;

