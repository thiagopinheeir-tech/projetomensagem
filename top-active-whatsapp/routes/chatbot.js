const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const chatbotController = require('../controllers/chatbotController');

// Obter configuração atual do chatbot
router.get('/config', authMiddleware, chatbotController.getConfig);

// Atualizar configuração do chatbot
router.put('/config', authMiddleware, chatbotController.updateConfig);

// Habilitar/desabilitar chatbot
router.post('/toggle', authMiddleware, chatbotController.toggleChatbot);

// Estatísticas do chatbot
router.get('/stats', authMiddleware, chatbotController.getStats);

// Listar conversas recentes
router.get('/conversations', authMiddleware, chatbotController.getConversations);

// Histórico de conversa com um número específico
router.get('/conversations/:phone', authMiddleware, chatbotController.getConversationHistory);

module.exports = router;
