const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Usar SERVICE_KEY para operações de escrita (bypass RLS)
// Se não tiver SERVICE_KEY, usar ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  SUPABASE_URL ou chaves não configuradas. Usando modo offline.');
  module.exports = { supabase: null, isConfigured: false };
} else {
  // Usar service key se disponível (bypass RLS para operações admin)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  if (process.env.SUPABASE_SERVICE_KEY) {
    console.log('✅ Usando SUPABASE_SERVICE_KEY (bypass RLS)');
  } else {
    console.warn('⚠️  Usando SUPABASE_ANON_KEY (pode ter problemas com RLS)');
  }
  
  module.exports = {
    supabase,
    isConfigured: true,
    
    // Helper para autenticação
    auth: {
      signUp: async (email, password) => {
        return supabase.auth.signUp({ email, password });
      },
      signInWithPassword: async (email, password) => {
        return supabase.auth.signInWithPassword({ email, password });
      },
      signOut: async () => {
        return supabase.auth.signOut();
      },
      getUser: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
      }
    },
    
    // Helper para dados
    db: {
      // Usuários
      getUser: async (userId) => {
        return supabase.from('users').select('*').eq('id', userId).single();
      },
      createUser: async (userData) => {
        return supabase.from('users').insert([userData]);
      },
      updateUser: async (userId, updates) => {
        return supabase.from('users').update(updates).eq('id', userId);
      },
      
      // Conversas
      getConversations: async (userId) => {
        return supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      },
      getConversationMessages: async (conversationId) => {
        return supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
      },
      createMessage: async (messageData) => {
        return supabase.from('messages').insert([messageData]);
      },
      
      // Histórico de chat
      getChatHistory: async (phone, limit = 10) => {
        return supabase
          .from('chat_history')
          .select('*')
          .eq('phone', phone)
          .order('created_at', { ascending: false })
          .limit(limit);
      },
      saveChatMessage: async (phone, userMessage, aiResponse) => {
        return supabase.from('chat_history').insert([{
          phone,
          user_message: userMessage,
          ai_response: aiResponse,
          created_at: new Date().toISOString()
        }]);
      },
      
      // Configurações do Chatbot
      getChatbotConfig: async () => {
        // Buscar a primeira configuração (assumindo sistema single-tenant por enquanto)
        const { data, error } = await supabase
          .from('configurations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          return { data: null, error };
        }
        
        return { data: data || null, error: null };
      },
      
      saveChatbotConfig: async (config, userId = null) => {
        // Upsert: inserir ou atualizar configuração
        let query = supabase
          .from('configurations')
          .select('id');
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data: existing } = await query.limit(1).single();
        
        const configData = {
          ...config,
          updated_at: new Date().toISOString()
        };
        
        if (userId) {
          configData.user_id = userId;
        }
        
        if (existing) {
          if (userId) {
            return supabase
              .from('configurations')
              .update(configData)
              .eq('id', existing.id)
              .eq('user_id', userId);
          } else {
            return supabase
              .from('configurations')
              .update(configData)
              .eq('id', existing.id);
          }
        } else {
          return supabase
            .from('configurations')
            .insert([configData]);
        }
      },
      
      // Configurações de API (OpenAI)
      getAPIConfig: async (userId) => {
        // Se não temos userId, buscar primeira configuração
        if (userId) {
          return supabase
            .from('configurations')
            .select('openai_api_key, model, temperature, max_tokens, custom_prompt')
            .eq('user_id', userId)
            .single();
        } else {
          return supabase
            .from('configurations')
            .select('openai_api_key, model, temperature, max_tokens, custom_prompt')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        }
      },
      
      saveAPIConfig: async (userId, config) => {
        const configData = {
          openai_api_key: config.openai_key_encrypted || config.openai_api_key,
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          custom_prompt: config.custom_prompt,
          updated_at: new Date().toISOString()
        };
        
        if (userId) {
          // Verificar se já existe
          const { data: existing } = await supabase
            .from('configurations')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (existing) {
            return supabase
              .from('configurations')
              .update(configData)
              .eq('user_id', userId);
          } else {
            return supabase
              .from('configurations')
              .insert([{ ...configData, user_id: userId }]);
          }
        } else {
          // Buscar primeira configuração e atualizar
          const { data: existing } = await supabase
            .from('configurations')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (existing) {
            return supabase
              .from('configurations')
              .update(configData)
              .eq('id', existing.id);
          } else {
            return supabase
              .from('configurations')
              .insert([configData]);
          }
        }
      },
      
      // Configurações gerais (compatibilidade)
      getConfig: async (userId) => {
        return supabase
          .from('configurations')
          .select('*')
          .eq('user_id', userId)
          .single();
      },
      updateConfig: async (userId, config) => {
        return supabase
          .from('configurations')
          .update(config)
          .eq('user_id', userId);
      },
      
      // Estatísticas de conversas
      getConversationStats: async () => {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*');
        
        if (error) return { stats: null, error };
        
        const stats = {
          total_conversations: data.length,
          unique_contacts: new Set(data.map(d => d.phone)).size,
          by_date: {}
        };
        
        data.forEach(record => {
          const date = new Date(record.created_at).toISOString().split('T')[0];
          if (!stats.by_date[date]) {
            stats.by_date[date] = { count: 0, contacts: new Set() };
          }
          stats.by_date[date].count++;
          stats.by_date[date].contacts.add(record.phone);
        });
        
        // Converter Sets para números antes de retornar
        Object.keys(stats.by_date).forEach(date => {
          stats.by_date[date].unique_contacts = stats.by_date[date].contacts.size;
          delete stats.by_date[date].contacts; // Remover Set, manter apenas o número
        });
        
        return { stats, error: null };
      },
      
      // Conversas recentes (melhorado)
      getRecentConversations: async (limit = 20) => {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit * 5); // Buscar mais para agrupar
        
        if (error) return { data: [], error };
        
        // Agrupar por telefone
        const grouped = {};
        data.forEach(record => {
          if (!grouped[record.phone]) {
            grouped[record.phone] = {
              phone: record.phone,
              user_message: record.user_message,
              ai_response: record.ai_response,
              created_at: record.created_at,
              total_messages: 0
            };
          }
          grouped[record.phone].total_messages++;
        });
        
        const conversations = Object.values(grouped)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, limit);
        
        return { data: conversations, error: null };
      }
    }
  };
}
