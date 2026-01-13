const WebSocket = require('ws');
const conversationManager = require('./conversation-manager');

class WebSocketManager {
  constructor() {
    this.clients = new Map(); // userId -> ws
    this.wss = null;
  }

  initialize(portOrServer = 5001) {
    // Se receber um servidor HTTP (Express), usar ele. Senão, criar servidor separado
    if (typeof portOrServer === 'object' && portOrServer.listen) {
      // É um servidor HTTP - anexar WebSocket a ele
      this.wss = new WebSocket.Server({ server: portOrServer, path: '/ws' });
      console.log(`🚀 WebSocket server anexado ao servidor HTTP`);
    } else {
      // É uma porta - criar servidor separado (modo desenvolvimento)
      this.wss = new WebSocket.Server({ port: portOrServer });
      console.log(`🚀 WebSocket server iniciado na porta ${portOrServer}`);
    }
    
    this.wss.on('connection', async (ws, req) => {
      try {
        const url = new URL(req.url, `http://localhost:${typeof portOrServer === 'number' ? portOrServer : 5000}`);
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

  }

  broadcast(type, data, userId = null) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'websocket.js:73',message:'broadcast ENTRY',data:{type:type,userId:userId,connectedUsers:Array.from(this.clients.keys()),totalClients:this.clients.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (userId) {
      // Broadcast para usuário específico
      const userIdStr = String(userId);
      const ws = this.clients.get(userIdStr);
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log(`📡 [WebSocket] Enviando mensagem tipo '${type}' para usuário ${userIdStr}`);
        ws.send(message);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'websocket.js:82',message:'broadcast sent to specific user',data:{type:type,userId:userIdStr,readyState:ws.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } else {
        console.warn(`⚠️ [WebSocket] Usuário ${userIdStr} não está conectado ou WebSocket não está aberto (readyState: ${ws?.readyState})`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'websocket.js:85',message:'broadcast FAILED - user not connected',data:{type:type,userId:userIdStr,hasClient:!!ws,readyState:ws?.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }
    } else {
      // Broadcast para todos os clientes conectados
      let sentCount = 0;
      this.clients.forEach((ws, uid) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        }
      });
      console.log(`📡 [WebSocket] Enviando mensagem tipo '${type}' para ${sentCount} cliente(s)`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'websocket.js:95',message:'broadcast sent to all users',data:{type:type,sentCount:sentCount,totalClients:this.clients.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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