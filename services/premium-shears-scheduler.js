const { query } = require('../config/database');
const { supabase, isConfigured } = require('../config/supabase');
const encryption = require('./encryption');

/**
 * Busca configuração do Premium Shears Scheduler para um usuário específico
 */
async function getSchedulerConfig(userId) {
  if (!userId) {
    throw new Error('userId é obrigatório');
  }

  // Tentar buscar do Supabase primeiro
  if (isConfigured) {
    try {
      const { data: supabaseConfig, error } = await supabase
        .from('configurations')
        .select('premium_shears_api_url, premium_shears_api_key_encrypted, use_premium_shears_scheduler')
        .eq('user_id', userId)
        .single();

      if (!error && supabaseConfig) {
        let apiKey = null;
        if (supabaseConfig.premium_shears_api_key_encrypted) {
          try {
            apiKey = encryption.decrypt(supabaseConfig.premium_shears_api_key_encrypted);
          } catch (decryptError) {
            console.warn('⚠️ [getSchedulerConfig] Erro ao descriptografar API key:', decryptError.message);
          }
        }

        return {
          apiUrl: supabaseConfig.premium_shears_api_url || null,
          apiKey: apiKey,
          enabled: supabaseConfig.use_premium_shears_scheduler || false
        };
      }
    } catch (error) {
      console.warn('⚠️ [getSchedulerConfig] Erro ao buscar do Supabase:', error.message);
    }
  }

  // Fallback: buscar do PostgreSQL local
  try {
    const result = await query(
      `SELECT premium_shears_api_url, premium_shears_api_key_encrypted, use_premium_shears_scheduler
       FROM config_ai
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { apiUrl: null, apiKey: null, enabled: false };
    }

    const config = result.rows[0];
    let apiKey = null;
    if (config.premium_shears_api_key_encrypted) {
      try {
        apiKey = encryption.decrypt(config.premium_shears_api_key_encrypted);
      } catch (decryptError) {
        console.warn('⚠️ [getSchedulerConfig] Erro ao descriptografar API key:', decryptError.message);
      }
    }

    return {
      apiUrl: config.premium_shears_api_url || null,
      apiKey: apiKey,
      enabled: config.use_premium_shears_scheduler || false
    };
  } catch (error) {
    console.error('❌ [getSchedulerConfig] Erro ao buscar configuração:', error);
    throw error;
  }
}

/**
 * Faz uma requisição HTTP para a API do Premium Shears
 */
async function apiRequest(userId, method, endpoint, body = null) {
  const config = await getSchedulerConfig(userId);

  if (!config.enabled || !config.apiUrl) {
    const err = new Error('Premium Shears Scheduler não configurado para este usuário. Configure em Chaves e Integrações.');
    err.statusCode = 400;
    throw err;
  }

  // Remover /api do final da URL base se existir, pois os endpoints já incluem /api
  // Mas na verdade, a URL base já termina com /api, então os endpoints devem começar sem /api
  let baseUrl = config.apiUrl.replace(/\/$/, '');
  // Se a URL base termina com /api, remover para evitar duplicação
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/api$/, '');
  }
  // Garantir que o endpoint começa com /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const options = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`📡 [apiRequest] ${method} ${url}`);
    console.log(`📡 [apiRequest] Headers:`, { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'não fornecido' });
    if (body) {
      console.log(`📡 [apiRequest] Body:`, JSON.stringify(body).substring(0, 200));
    }
    
    const response = await fetch(url, options);
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      console.error(`❌ [apiRequest] Erro ao parsear JSON:`, {
        status: response.status,
        statusText: response.statusText,
        body: text.substring(0, 500)
      });
      throw new Error(`Resposta inválida da API: ${text.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error(`❌ [apiRequest] Erro na resposta:`, {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(data).substring(0, 300)
      });
      const error = new Error(data.message || data.error || `HTTP ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    console.log(`✅ [apiRequest] Resposta OK:`, JSON.stringify(data).substring(0, 300));
    return data;
  } catch (error) {
    console.error(`❌ [apiRequest] Erro na requisição:`, {
      message: error.message,
      statusCode: error.statusCode,
      url
    });
    if (error.statusCode) {
      throw error;
    }
    const httpError = new Error(`Erro ao comunicar com Premium Shears API: ${error.message}`);
    httpError.statusCode = 500;
    throw httpError;
  }
}

/**
 * Formata data para string local (dd/MM/yyyy HH:mm)
 */
function formatLocalDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = {
  /**
   * Cria um agendamento no Premium Shears Scheduler
   */
  async createAppointment({ userId, name, phone, service, startISO, durationMinutes, intervalMinutes = 0, notes }) {
    if (!userId || !name || !phone || !service || !startISO || !durationMinutes) {
      const err = new Error('Parâmetros obrigatórios: userId, name, phone, service, startISO, durationMinutes');
      err.statusCode = 400;
      throw err;
    }

    const start = new Date(startISO);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const body = {
      clientName: name,
      phone: phone,
      service: service,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: notes || null
    };

    const response = await apiRequest(userId, 'POST', '/appointments', body);

    return {
      eventId: response.appointmentId || response.appointment?.id,
      htmlLink: null,
      start: start.toISOString(),
      end: end.toISOString()
    };
  },

  /**
   * Lista horários disponíveis
   */
  async getAvailableSlots({ userId, fromISO, toISO, durationMinutes, intervalMinutes = 0 }) {
    if (!userId || !fromISO || !toISO || !durationMinutes) {
      const err = new Error('Parâmetros obrigatórios: userId, fromISO, toISO, durationMinutes');
      err.statusCode = 400;
      throw err;
    }

    const params = new URLSearchParams({
      from: fromISO,
      to: toISO,
      durationMinutes: String(durationMinutes)
    });

    if (intervalMinutes > 0) {
      params.append('intervalMinutes', String(intervalMinutes));
    }

    const response = await apiRequest(userId, 'GET', `/appointments/available-slots?${params.toString()}`);

    return (response.slots || []).map(slot => ({
      startISO: slot.startISO,
      startLocal: slot.startLocal || formatLocalDateTime(slot.startISO)
    }));
  },

  /**
   * Verifica se um horário está disponível
   */
  async isSlotFree({ userId, startISO, durationMinutes, intervalMinutes = 0 }) {
    if (!userId || !startISO || !durationMinutes) {
      const err = new Error('Parâmetros obrigatórios: userId, startISO, durationMinutes');
      err.statusCode = 400;
      throw err;
    }

    console.log(`🔍 [PremiumShears] Verificando disponibilidade:`, {
      userId,
      startISO,
      durationMinutes,
      intervalMinutes
    });

    const params = new URLSearchParams({
      startTime: startISO,
      durationMinutes: String(durationMinutes)
    });

    if (intervalMinutes > 0) {
      params.append('intervalMinutes', String(intervalMinutes));
    }

    try {
      const response = await apiRequest(userId, 'GET', `/appointments/check-availability?${params.toString()}`);
      
      console.log(`📊 [PremiumShears] Resposta da verificação:`, {
        available: response.available,
        response: JSON.stringify(response).substring(0, 200)
      });

      const isAvailable = response.available === true;
      console.log(`✅ [PremiumShears] Slot ${isAvailable ? 'DISPONÍVEL' : 'INDISPONÍVEL'}`);
      
      return isAvailable;
    } catch (error) {
      console.error('❌ [PremiumShears] Erro ao verificar disponibilidade:', {
        error: error.message,
        startISO,
        durationMinutes
      });
      
      // Se o erro for "não configurado", retornar false
      if (error.message.includes('não configurado')) {
        return false;
      }
      
      // Para outros erros, assumir disponível para não bloquear agendamentos
      console.warn('⚠️ [PremiumShears] Assumindo slot disponível devido a erro');
      return true;
    }
  },

  /**
   * Cancela/deleta um agendamento
   */
  async deleteAppointment({ userId, eventId }) {
    if (!userId || !eventId) {
      const err = new Error('Parâmetros obrigatórios: userId, eventId');
      err.statusCode = 400;
      throw err;
    }

    await apiRequest(userId, 'DELETE', `/appointments/${eventId}`);

    return { success: true };
  },

  /**
   * Verifica se o usuário tem Premium Shears configurado
   */
  async isConfiguredForUser(userId) {
    try {
      const config = await getSchedulerConfig(userId);
      return config.enabled && !!config.apiUrl;
    } catch (error) {
      return false;
    }
  }
};
