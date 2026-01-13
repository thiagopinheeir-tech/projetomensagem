const { query } = require('../config/database');
const { convertUserIdForTable } = require('../utils/userId-converter');

class ConversationManager {
  async saveMessage(phone, userMessage, aiResponse, chatbotId = null, userId = null) {
    try {
      // Limpar número do telefone
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      // Converter userId se fornecido
      let convertedUserId = null;
      if (userId) {
        // Normalizar userId: converter string para número se necessário
        let normalizedUserId = userId;
        if (typeof userId === 'string' && /^\d+$/.test(userId)) {
          normalizedUserId = parseInt(userId, 10);
        }
        
        try {
          convertedUserId = await convertUserIdForTable('conversations', normalizedUserId);
        } catch (convertError) {
          console.error(`❌ [ConversationManager] Erro ao converter userId ${userId} para saveMessage:`, convertError.message);
          convertedUserId = null;
        }
      }
      
      await query(
        `INSERT INTO conversations (phone, user_message, ai_response, chatbot_id, user_id, created_at) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [cleanPhone, userMessage, aiResponse, chatbotId || null, convertedUserId]
      );
      
      console.log(`💾 Conversa salva: ${cleanPhone}${userId ? ` (user: ${userId})` : ''}`);
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  async getHistory(phone, limit = 10, userId = null) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      // Converter userId se fornecido
      let convertedUserId = null;
      if (userId) {
        // Normalizar userId: converter string para número se necessário
        let normalizedUserId = userId;
        if (typeof userId === 'string' && /^\d+$/.test(userId)) {
          normalizedUserId = parseInt(userId, 10);
        }
        
        try {
          convertedUserId = await convertUserIdForTable('conversations', normalizedUserId);
        } catch (convertError) {
          console.error(`❌ [ConversationManager] Erro ao converter userId ${userId} para getHistory:`, convertError.message);
          convertedUserId = null;
        }
      }
      
      let queryText = `SELECT user_message, ai_response, created_at
         FROM conversations 
         WHERE phone = $1`;
      let params = [cleanPhone];
      
      // Adicionar filtro por userId se fornecido
      if (convertedUserId !== null) {
        queryText += ` AND user_id = $2`;
        params.push(convertedUserId);
        queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
      } else {
        queryText += ` ORDER BY created_at DESC LIMIT $2`;
        params.push(limit);
      }
      
      const result = await query(queryText, params);

      // Retornar em ordem cronológica (mais antigo primeiro)
      return result.rows.reverse().map(row => ({
        user_message: row.user_message,
        ai_response: row.ai_response,
        timestamp: row.created_at
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  async getStats(userId = null) {
    try {
      // Converter userId se fornecido
      let convertedUserId = null;
      if (userId) {
        // Normalizar userId: converter string para número se necessário
        let normalizedUserId = userId;
        if (typeof userId === 'string' && /^\d+$/.test(userId)) {
          normalizedUserId = parseInt(userId, 10);
        }
        
        try {
          convertedUserId = await convertUserIdForTable('conversations', normalizedUserId);
        } catch (convertError) {
          console.error(`❌ [ConversationManager] Erro ao converter userId ${userId} para getStats:`, convertError.message);
          convertedUserId = null;
        }
      }
      
      let queryText = `SELECT 
          COUNT(*) as total_conversations,
          COUNT(DISTINCT phone) as unique_contacts,
          DATE_TRUNC('day', created_at) as date
         FROM conversations`;
      
      let params = [];
      if (convertedUserId !== null) {
        queryText += ` WHERE user_id = $1`;
        params.push(convertedUserId);
      }
      
      queryText += ` GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY date DESC
         LIMIT 30`;

      const result = await query(queryText, params);

      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return [];
    }
  }

  async getRecentConversations(limit = 20, userId = null) {
    try {
      // Converter userId se fornecido
      let convertedUserId = null;
      if (userId) {
        // Normalizar userId: converter string para número se necessário
        let normalizedUserId = userId;
        if (typeof userId === 'string' && /^\d+$/.test(userId)) {
          normalizedUserId = parseInt(userId, 10);
        }
        
        try {
          convertedUserId = await convertUserIdForTable('conversations', normalizedUserId);
          console.log(`🔍 [ConversationManager] userId convertido: ${userId} (${typeof userId}) -> ${convertedUserId} (${typeof convertedUserId})`);
        } catch (convertError) {
          console.error(`❌ [ConversationManager] Erro ao converter userId ${userId}:`, convertError.message);
          // Se a conversão falhar, tentar usar null para não quebrar a query
          convertedUserId = null;
        }
      }
      
      let queryText = `SELECT 
          c.phone, 
          c.user_message, 
          c.ai_response, 
          c.created_at,
          c.id
         FROM conversations c`;
      
      let params = [];
      if (convertedUserId !== null) {
        queryText += ` WHERE c.user_id = $1`;
        params.push(convertedUserId);
        queryText += ` ORDER BY c.created_at DESC LIMIT $2`;
        params.push(limit);
      } else {
        queryText += ` ORDER BY c.created_at DESC LIMIT $1`;
        params.push(limit);
      }

      const result = await query(queryText, params);

      // Agrupar por telefone e retornar formato esperado pelo frontend
      const grouped = {};
      result.rows.forEach(row => {
        const phone = row.phone;
        if (!grouped[phone] || new Date(row.created_at) > new Date(grouped[phone].lastMessageTime)) {
          grouped[phone] = {
            id: row.id || phone.replace(/\D/g, ''),
            phone: phone,
            lastMessage: row.user_message || row.ai_response,
            lastMessageTime: row.created_at,
            status: 'open',
            unread: 0
          };
        }
      });

      return Object.values(grouped).slice(0, limit);
    } catch (error) {
      console.error('❌ Erro ao buscar conversas recentes:', error);
      return [];
    }
  }
}

module.exports = new ConversationManager();
