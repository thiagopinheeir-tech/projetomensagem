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

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(logger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', limiter);

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ 🚀 Top Active WhatsApp 2.0 Started on port ${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/register`);
  console.log(`👤 Users: http://localhost:${PORT}/api/users/profile`);
  console.log(`💬 Messages: http://localhost:${PORT}/api/messages/send-simple`);
  
  // Inicializar WhatsApp após servidor estar pronto (delay para evitar race conditions)
  setTimeout(() => {
    console.log(`\n📱 Inicializando WhatsApp Web...`);
    console.log(`📱 Escaneie o QR code que aparecerá abaixo para conectar!\n`);
    const whatsappService = require('./services/whatsapp');
    
    // Inicializar chatbot primeiro
    whatsappService.initChatbot();
    
    // Inicializar WhatsApp
    whatsappService.initialize();
  }, 2000);
});
