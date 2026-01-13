const { query } = require('../config/database');
const { supabase, db, isConfigured } = require('../config/supabase');
const customerDataExtractor = require('./customer-data-extractor');

class ConversationManager {
  async getRecentConversations(limit = 20, userId = null) {
    try {
      // Tentar buscar do Supabase primeiro
      if (isConfigured && supabase) {
        let supabaseQuery = supabase
          .from('chat_history')
          .select('phone, user_message, ai_response, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Filtrar por userId se fornecido
        if (userId) {
          supabaseQuery = supabaseQuery.eq('user_id', userId);
        }
        
        const { data: supabaseData, error } = await supabaseQuery;
        if (!error && supabaseData && supabaseData.length > 0) {
          // Agrupar por telefone
          const grouped = {};
          supabaseData.forEach(conv => {
            if (!grouped[conv.phone]) {
              grouped[conv.phone] = {
                id: conv.phone.replace(/\D/g, ''),
                phone: conv.phone,
                name: `Contato ${conv.phone.slice(-4)}`,
                lastMessage: conv.user_message || conv.ai_response,
                lastMessageTime: conv.created_at,
                status: 'open',
                unread: 0
              };
            }
          });
          return Object.values(grouped).slice(0, limit);
        }
      }
      
      // Fallback: buscar do PostgreSQL local
      let queryText = `
        SELECT 
          c.phone,
          c.user_message,
          c.ai_response,
          c.created_at,
          COUNT(*) OVER (PARTITION BY c.phone) as total_messages
        FROM conversations c
        WHERE c.created_at > NOW() - INTERVAL '7 days'`;
      let params = [];
      
      // Adicionar filtro por userId se fornecido
      if (userId) {
        queryText += ` AND c.user_id = $1`;
        params.push(userId);
        queryText += ` ORDER BY c.created_at DESC LIMIT $2`;
        params.push(limit);
      } else {
        queryText += ` ORDER BY c.created_at DESC LIMIT $1`;
        params.push(limit);
      }
      
      const result = await query(queryText, params);

      // Agrupar por telefone, pegar a conversa mais recente de cada
      const grouped = {};
      result.rows.forEach(row => {
        if (!grouped[row.phone]) {
          grouped[row.phone] = {
            id: row.phone.replace(/\D/g, ''),
            phone: row.phone,
            name: `Contato ${row.phone.slice(-4)}`, // Nome placeholder
            lastMessage: row.user_message || row.ai_response,
            lastMessageTime: row.created_at,
            status: 'open',
            unread: 0,
          };
        }
      });

      return Object.values(grouped).slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar conversas recentes:', error);
      return [];
    }
  }

  async saveMessage(phone, userMessage, aiResponse, chatbotId = null, userId = null, chatbotConfig = null) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      // Buscar histórico para extração de dados
      const history = await this.getHistory(cleanPhone, 10);
      
      // Obter serviços: priorizar servicesConfig (barbearia) ou services (array de strings)
      let availableServices = [];
      const servicesConfig = chatbotConfig?.servicesConfig || [];
      if (servicesConfig && Array.isArray(servicesConfig) && servicesConfig.length > 0) {
        // servicesConfig é array de objetos {name, durationMinutes, price}
        availableServices = servicesConfig.map(s => s.name || s).filter(Boolean);
      } else if (chatbotConfig?.services && Array.isArray(chatbotConfig.services) && chatbotConfig.services.length > 0) {
        // services é array de strings
        availableServices = chatbotConfig.services;
      }
      
      // Salvar no Supabase primeiro (primário)
      if (isConfigured && supabase) {
        // Incluir userId se fornecido
        const { error } = await supabase
          .from('chat_history')
          .insert([{
            phone: cleanPhone,
            user_message: userMessage,
            ai_response: aiResponse,
            user_id: userId || null,
            chatbot_id: chatbotId || null
          }]);
        
        if (!error) {
          console.log(`💾 Conversa salva no Supabase: ${cleanPhone}${userId ? ` (user: ${userId})` : ''}`);
          // Criar lead automaticamente se não existir (após salvar com sucesso)
          await this.createLeadIfNotExists(cleanPhone, userMessage, userId);
          // Processar e salvar dados do cliente
          await customerDataExtractor.processCustomerData(cleanPhone, userMessage, history, userId, availableServices, servicesConfig);
        } else {
          console.warn(`⚠️  Erro ao salvar no Supabase:`, error);
          // Se falhar no Supabase, tentar PostgreSQL local
          try {
            await query(
              `INSERT INTO conversations (phone, user_message, ai_response, chatbot_id, user_id, created_at) 
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [cleanPhone, userMessage, aiResponse, chatbotId || null, userId || null]
            );
            console.log(`💾 Conversa salva no PostgreSQL (fallback): ${cleanPhone}${userId ? ` (user: ${userId})` : ''}`);
            // Criar lead após salvar
            await this.createLeadIfNotExists(cleanPhone, userMessage, userId);
            // Processar e salvar dados do cliente
            await customerDataExtractor.processCustomerData(cleanPhone, userMessage, history, userId, availableServices, servicesConfig);
          } catch (pgError) {
            console.error('❌ Erro ao salvar no PostgreSQL (fallback):', pgError);
            throw pgError;
          }
        }
      } else {
        // Se Supabase não configurado, usar PostgreSQL local
            await query(
              `INSERT INTO conversations (phone, user_message, ai_response, chatbot_id, user_id, created_at) 
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [cleanPhone, userMessage, aiResponse, chatbotId || null, userId || null]
            );
        // Criar lead automaticamente se não existir
        await this.createLeadIfNotExists(cleanPhone, userMessage);
        // Processar e salvar dados do cliente
        await customerDataExtractor.processCustomerData(cleanPhone, userMessage, history, userId, availableServices, servicesConfig);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  async createLeadIfNotExists(phone, userMessage, userId = null) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      if (isConfigured && supabase) {
        // Verificar se já existe lead (filtrar por userId se fornecido)
        let leadQuery = supabase
          .from('leads')
          .select('id')
          .eq('phone', cleanPhone);
        
        if (userId) {
          leadQuery = leadQuery.eq('user_id', userId);
        }
        
        const { data: existingLeads, error: checkError } = await leadQuery.limit(1);

        if (existingLeads && existingLeads.length > 0) {
          // Lead já existe, não criar novamente
          return;
        }

        // Verificar histórico de conversas para confirmar se é primeira mensagem
        // Se já salvamos a mensagem acima, vamos contar quantas mensagens existem
        // Se for apenas 1, é primeira vez
        let countQuery = supabase
          .from('chat_history')
          .select('id', { count: 'exact', head: true })
          .eq('phone', cleanPhone);
        
        if (userId) {
          countQuery = countQuery.eq('user_id', userId);
        }
        
        const { count, error: countError } = await countQuery;

        // Se count <= 1, é primeira mensagem (acabamos de salvar uma)
        if (count !== null && count <= 1) {
          // Criar novo lead no Supabase
          const { error: createError } = await supabase
            .from('leads')
            .insert([{
              phone: cleanPhone,
              name: `Contato ${cleanPhone.slice(-4)}`,
              source: 'whatsapp',
              status: 'new',
              stage: 'new',
              notes: userMessage ? `Primeira mensagem: ${userMessage.substring(0, 200)}` : null,
              priority: 'medium',
              user_id: userId || null
            }]);

          if (!createError) {
            console.log(`📋 ✅ Lead criado automaticamente no Supabase: ${cleanPhone}`);
          } else {
            console.warn(`⚠️  Erro ao criar lead no Supabase:`, createError);
          }
        }
      } else {
        // Fallback: PostgreSQL local
        let existingQuery = 'SELECT id FROM leads WHERE phone = $1';
        let existingParams = [cleanPhone];
        
        if (userId) {
          existingQuery += ' AND user_id = $2';
          existingParams.push(userId);
        }
        existingQuery += ' LIMIT 1';
        
        const existingResult = await query(existingQuery, existingParams);

        if (existingResult.rows.length > 0) {
          // Lead já existe
          return;
        }

        // Verificar quantas mensagens existem para este telefone
        let countQuery = 'SELECT COUNT(*) as count FROM conversations WHERE phone = $1';
        let countParams = [cleanPhone];
        
        if (userId) {
          countQuery += ' AND user_id = $2';
          countParams.push(userId);
        }
        
        const countResult = await query(countQuery, countParams);

        const messageCount = parseInt(countResult.rows[0]?.count || 0);

        // Se tiver apenas 1 mensagem (a que acabamos de salvar), criar lead
        if (messageCount <= 1) {
          await query(
            `INSERT INTO leads (phone, name, source, status, stage, notes, priority, user_id)
             VALUES ($1, $2, 'whatsapp', 'new', 'new', $3, 'medium', $4)`,
            [cleanPhone, `Contato ${cleanPhone.slice(-4)}`, userMessage ? `Primeira mensagem: ${userMessage.substring(0, 200)}` : null, userId || null]
          );
          console.log(`📋 ✅ Lead criado automaticamente no PostgreSQL: ${cleanPhone}`);
        }
      }
    } catch (error) {
      // Não falhar se não conseguir criar lead (não crítico)
      console.warn(`⚠️  Erro ao criar lead automaticamente: ${error.message}`);
    }
  }

  async getHistory(phone, limit = 10, userId = null) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      // Tentar buscar do Supabase primeiro (primário)
      if (isConfigured && supabase) {
        let supabaseQuery = supabase
          .from('chat_history')
          .select('user_message, ai_response, created_at')
          .eq('phone', cleanPhone)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Filtrar por userId se fornecido
        if (userId) {
          supabaseQuery = supabaseQuery.eq('user_id', userId);
        }
        
        const { data, error } = await supabaseQuery;
        if (!error && data && data.length > 0) {
          return data.reverse().map(row => ({
            user_message: row.user_message,
            ai_response: row.ai_response,
            timestamp: row.created_at
          }));
        }
      }
      
      // Fallback: buscar do PostgreSQL local
      let queryText = `SELECT user_message, ai_response, created_at
         FROM conversations 
         WHERE phone = $1`;
      let params = [cleanPhone];
      
      // Adicionar filtro por userId se fornecido
      if (userId) {
        queryText += ` AND user_id = $2`;
        params.push(userId);
        queryText += ` ORDER BY created_at DESC LIMIT $3`;
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

  async getStats() {
    try {
      // Tentar buscar do Supabase primeiro
      if (isConfigured && supabase) {
        const { stats, error } = await db.getConversationStats();
        if (!error && stats && stats.by_date) {
          // Converter formato do Supabase para o formato esperado
          return Object.entries(stats.by_date).map(([date, data]) => ({
            date: new Date(date),
            total_conversations: data.count,
            unique_contacts: data.unique_contacts || 0
          })).sort((a, b) => b.date - a.date).slice(0, 30);
        }
      }
      
      // Fallback: buscar do PostgreSQL local
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
