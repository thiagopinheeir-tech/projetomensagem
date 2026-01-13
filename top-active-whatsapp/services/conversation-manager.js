const { query } = require('../config/database');

class ConversationManager {
  async saveMessage(phone, userMessage, aiResponse, chatbotId = null) {
    try {
      // Limpar número do telefone
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      await query(
        `INSERT INTO conversations (phone, user_message, ai_response, chatbot_id, created_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [cleanPhone, userMessage, aiResponse, chatbotId || null]
      );
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  async getHistory(phone, limit = 10) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      const result = await query(
        `SELECT user_message, ai_response, created_at
         FROM conversations 
         WHERE phone = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [cleanPhone, limit]
      );

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

  async getStats() {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_conversations,
          COUNT(DISTINCT phone) as unique_contacts,
          DATE_TRUNC('day', created_at) as date
         FROM conversations
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY date DESC
         LIMIT 30`
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return [];
    }
  }

  async getRecentConversations(limit = 20) {
    try {
      const result = await query(
        `SELECT phone, user_message, ai_response, created_at
         FROM conversations
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar conversas recentes:', error);
      return [];
    }
  }
}

module.exports = new ConversationManager();
