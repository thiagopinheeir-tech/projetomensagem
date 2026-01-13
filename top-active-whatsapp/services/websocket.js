const WebSocket = require('ws');
const conversationManager = require('./conversation-manager');

class WebSocketManager {
  constructor() {
    this.clients = new Map(); // userId -> ws
    this.wss = null;
  }

  initialize(port = 5001) {
    this.wss = new WebSocket.Server({ port });
    
    this.wss.on('connection', async (ws, req) => {
      try {
        const url = new URL(req.url, `http://localhost:${port}`);
        const userId = url.searchParams.get('user');
        
        if (!userId) {
          ws.close(1008, 'User ID required');
          return;
        }

        console.log(`🔌 WebSocket conectado: User ${userId}`);
        this.clients.set(userId, ws);

        // Enviar histórico inicial (filtrado por userId)
        try {
          const conversations = await conversationManager.getRecentConversations(20, userId);
          ws.send(JSON.stringify({
            type: 'init',
            conversations: conversations || []
          }));
        } catch (err) {
          console.error('Erro ao buscar conversas iniciais:', err);
        }

        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            await this.handleMessage(userId, data);
          } catch (err) {
            console.error('Erro ao processar mensagem:', err);
          }
        });

        ws.on('close', () => {
          console.log(`🔌 WebSocket desconectado: User ${userId}`);
          this.clients.delete(userId);
        });

        ws.on('error', (error) => {
          console.error(`❌ WebSocket erro User ${userId}:`, error);
          this.clients.delete(userId);
        });

      } catch (err) {
        console.error('❌ Erro na conexão WebSocket:', err);
        ws.close(1011, 'Internal server error');
      }
    });

    console.log(`🚀 WebSocket server iniciado na porta ${port}`);
  }

  broadcast(type, data, userId = null) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });

    if (userId) {
      // Broadcast para usuário específico
      const ws = this.clients.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } else {
      // Broadcast para todos os clientes conectados
      this.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  async handleMessage(userId, data) {
    switch (data.type) {
      case 'get_conversation':
        // Passar userId para isolar dados
        const history = await conversationManager.getHistory(data.phone, 100, userId);
        this.broadcast('conversation_history', { phone: data.phone, history }, userId);
        break;
      
      case 'ping':
        this.broadcast('pong', {}, userId);
        break;
      
      default:
        console.log('Tipo de mensagem desconhecido:', data.type);
    }
  }

  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

module.exports = wsManager;