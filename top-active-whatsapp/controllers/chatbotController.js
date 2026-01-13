const whatsapp = require('../services/whatsapp');
const ConversationManager = require('../services/conversation-manager');

const getConfig = async (req, res, next) => {
  try {
    const config = whatsapp.getChatbotConfig();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Chatbot não inicializado'
      });
    }

    res.json({
      success: true,
      config: config,
      enabled: whatsapp.chatbotEnabled
    });
  } catch (error) {
    next(error);
  }
};

const updateConfig = async (req, res, next) => {
  try {
    const {
      businessName,
      businessDescription,
      services,
      tone,
      model,
      temperature,
      maxTokens,
      defaultResponses,
      specialInstructions,
      greetingMessage,
      farewellMessage
    } = req.body;

    const newConfig = {
      businessName,
      businessDescription,
      services: Array.isArray(services) ? services : services?.split(',').map(s => s.trim()),
      tone,
      model,
      temperature: temperature ? parseFloat(temperature) : undefined,
      maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
      defaultResponses,
      specialInstructions,
      greetingMessage,
      farewellMessage
    };

    // Remover campos undefined
    Object.keys(newConfig).forEach(key => {
      if (newConfig[key] === undefined) {
        delete newConfig[key];
      }
    });

    whatsapp.updateChatbotConfig(newConfig);

    res.json({
      success: true,
      message: 'Configuração do chatbot atualizada com sucesso',
      config: whatsapp.getChatbotConfig()
    });
  } catch (error) {
    next(error);
  }
};

const toggleChatbot = async (req, res, next) => {
  try {
    const { enabled } = req.body;

    if (enabled) {
      whatsapp.enableChatbot();
    } else {
      whatsapp.disableChatbot();
    }

    res.json({
      success: true,
      message: `Chatbot ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`,
      enabled: whatsapp.chatbotEnabled
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await ConversationManager.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const conversations = await ConversationManager.getRecentConversations(limit);
    
    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    next(error);
  }
};

const getConversationHistory = async (req, res, next) => {
  try {
    const { phone } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }

    const history = await ConversationManager.getHistory(phone, limit);
    
    res.json({
      success: true,
      history: history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConfig,
  updateConfig,
  toggleChatbot,
  getStats,
  getConversations,
  getConversationHistory
};
