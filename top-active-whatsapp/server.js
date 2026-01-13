require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const chatbotRoutes = require('./routes/chatbot');
const conversationsRoutes = require('./routes/conversations');
const configRoutes = require('./routes/config');
const whatsappRoutes = require('./routes/whatsapp');
const crmRoutes = require('./routes/crm');
const calendarRoutes = require('./routes/calendar');
const googleRoutes = require('./routes/google');
const automationRoutes = require('./routes/automations');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (necessário para Railway e outros serviços que usam proxy reverso)
// Usar 1 ao invés de true para ser mais seguro (apenas 1 hop)
app.set('trust proxy', 1);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configurar CORS
let corsOptions = {
  credentials: true
};

if (process.env.CORS_ORIGIN) {
  if (process.env.CORS_ORIGIN.trim() === '*') {
    // Permitir todas as origens
    corsOptions.origin = true;
  } else {
    // Permitir origens específicas (separadas por vírgula)
    corsOptions.origin = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }
} else {
  // Default: localhost para desenvolvimento
  corsOptions.origin = ['http://localhost:3000', 'http://localhost:5173'];
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(logger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', limiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'JT DEV NOCODE API v2.0',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages',
      chatbot: '/api/chatbot',
      conversations: '/api/conversations',
      config: '/api/config',
      whatsapp: '/api/whatsapp',
      crm: '/api/crm',
      calendar: '/api/calendar',
      google: '/api/google',
      automations: '/api/automations',
      apiKeys: '/api/api-keys'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/api-keys', require('./routes/api-keys'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use(errorHandler);

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
});

try {
  const server = app.listen(PORT, () => {
    console.log(`✅ 🚀 JT DEV NOCODE 2.0 Started on port ${PORT}`);
    console.log(`📱 Health: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/register`);
    console.log(`👤 Users: http://localhost:${PORT}/api/users/profile`);
    console.log(`💬 Messages: http://localhost:${PORT}/api/messages/send-simple`);
    
    // Inicializar WebSocket Server anexado ao servidor HTTP (mesma porta)
    // Isso funciona melhor no Railway que expõe apenas uma porta
    try {
      const wsManager = require('./services/websocket');
      // Passar o servidor HTTP para o WebSocket usar a mesma porta
      wsManager.initialize(server);
    } catch (wsError) {
      console.error('❌ Erro ao inicializar WebSocket:', wsError);
    }
    
    // WhatsApp agora é gerenciado por usuário via WhatsAppManager
    // Não inicializar instância única - cada usuário inicializa sua própria via API
    console.log(`\n📱 WhatsApp Manager pronto. Usuários podem conectar via /api/whatsapp/connect`);
  });
} catch (error) {
  console.error('❌ Erro crítico ao iniciar servidor:', error);
  console.error(error.stack);
  process.exit(1);
}
