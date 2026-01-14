const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const { query } = require('../config/database');
const { supabase, db, isConfigured } = require('../config/supabase');
const crypto = require('crypto');
const encryption = require('../services/encryption');
const whatsappManager = require('../services/whatsapp-manager');

// Chave de criptografia (deve estar no .env em produção)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Obter configuração de IA do usuário
router.get('/ai', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    let config = null;

    // Tentar carregar do Supabase primeiro
    if (isConfigured) {
      const { data: supabaseConfig, error } = await db.getAPIConfig(userId);
      if (!error && supabaseConfig) {
        config = {
          model: supabaseConfig.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: supabaseConfig.temperature || parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
          max_tokens: supabaseConfig.max_tokens || parseInt(process.env.OPENAI_MAX_TOKENS || '300'),
          has_key: !!supabaseConfig.openai_api_key || !!process.env.OPENAI_API_KEY,
          key_preview: null
        };
        
        // Preview da chave
        if (supabaseConfig.openai_api_key) {
          try {
            // Tentar descriptografar se estiver criptografada
            let key = supabaseConfig.openai_api_key;
            if (key.includes(':')) {
              key = encryption.decrypt(key);
            }
            config.key_preview = `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
          } catch (error) {
            // Se não conseguir descriptografar, usar como está
            config.key_preview = `${supabaseConfig.openai_api_key.substring(0, 10)}...${supabaseConfig.openai_api_key.substring(supabaseConfig.openai_api_key.length - 4)}`;
          }
        } else if (process.env.OPENAI_API_KEY) {
          config.key_preview = `${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`;
        }
      }
    }

    // Fallback: carregar do PostgreSQL local
    if (!config) {
      const result = await query(
        'SELECT * FROM config_ai WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Retornar configuração padrão
        return res.json({
          success: true,
          config: {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
            max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '300'),
            has_key: !!process.env.OPENAI_API_KEY,
            key_preview: process.env.OPENAI_API_KEY 
              ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`
              : null
          }
        });
      }

      const dbConfig = result.rows[0];
      const hasKey = !!dbConfig.openai_key_encrypted;
      let keyPreview = null;

      if (hasKey) {
        try {
          const decryptedKey = encryption.decrypt(dbConfig.openai_key_encrypted);
          keyPreview = `${decryptedKey.substring(0, 10)}...${decryptedKey.substring(decryptedKey.length - 4)}`;
        } catch (error) {
          console.error('Erro ao descriptografar chave:', error);
        }
      } else if (process.env.OPENAI_API_KEY) {
        keyPreview = `${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`;
      }

      config = {
        model: dbConfig.model,
        temperature: parseFloat(dbConfig.temperature),
        max_tokens: parseInt(dbConfig.max_tokens),
        has_key: hasKey,
        key_preview: keyPreview
      };
    }

    res.json({
      success: true,
      config: config
    });
  } catch (error) {
    next(error);
  }
});

// Atualizar configuração de IA
router.put('/ai', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { openai_key, model, temperature, max_tokens } = req.body;

    // Validar
    if (model && !['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(model)) {
      return res.status(400).json({
        success: false,
        message: 'Modelo inválido'
      });
    }

    if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
      return res.status(400).json({
        success: false,
        message: 'Temperatura deve estar entre 0 e 1'
      });
    }

    if (max_tokens && (max_tokens < 50 || max_tokens > 2000)) {
      return res.status(400).json({
        success: false,
        message: 'Max tokens deve estar entre 50 e 2000'
      });
    }

    let encryptedKey = null;
    if (openai_key && openai_key.trim()) {
      // Validar formato da chave
      if (!openai_key.startsWith('sk-')) {
        return res.status(400).json({
          success: false,
          message: 'Chave OpenAI inválida (deve começar com sk-)'
        });
      }
      encryptedKey = encryption.encrypt(openai_key.trim());
    }

    // Montar campos para UPDATE
    const updateFields = [];
    if (encryptedKey !== null) updateFields.push('openai_key_encrypted = EXCLUDED.openai_key_encrypted');
    if (model) updateFields.push('model = EXCLUDED.model');
    if (temperature !== undefined) updateFields.push('temperature = EXCLUDED.temperature');
    if (max_tokens) updateFields.push('max_tokens = EXCLUDED.max_tokens');
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Salvar no Supabase primeiro
    if (isConfigured) {
      const apiConfigData = {
        openai_key_encrypted: encryptedKey,
        model: model || 'gpt-4o-mini',
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: max_tokens || 300
      };
      
      // Remover campos undefined
      Object.keys(apiConfigData).forEach(key => {
        if (apiConfigData[key] === undefined || apiConfigData[key] === null) {
          delete apiConfigData[key];
        }
      });
      
      const { error: supabaseError } = await db.saveAPIConfig(userId, apiConfigData);
      if (supabaseError) {
        console.error('Erro ao salvar no Supabase:', supabaseError);
        // Continuar mesmo se falhar no Supabase
      } else {
        console.log('✅ Configuração de API salva no Supabase');
      }
    }
    
    // Fallback: salvar no PostgreSQL local
    await query(
      `INSERT INTO config_ai (user_id, openai_key_encrypted, model, temperature, max_tokens, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         ${updateFields.join(', ')}`,
      [
        userId,
        encryptedKey,
        model || 'gpt-4o-mini',
        temperature !== undefined ? temperature : 0.7,
        max_tokens || 300
      ]
    );

    // Atualizar chatbot em tempo real (instância do usuário)
    if (encryptedKey && openai_key) {
      // Salvar API key na tabela user_api_keys
      await query(
        `INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, is_active)
         VALUES ($1, 'openai', $2, true)
         ON CONFLICT (user_id, provider) 
         DO UPDATE SET api_key_encrypted = $2, is_active = true, updated_at = CURRENT_TIMESTAMP`,
        [userId, encryptedKey]
      );
      
      // Reinicializar chatbot da instância do usuário com nova chave
      try {
        const instance = whatsappManager.getInstance(userId);
        if (instance) {
          await instance.initChatbot(userId);
          console.log(`✅ [config/ai] Chatbot reinicializado para usuário ${userId}`);
        } else {
          console.log(`ℹ️ [config/ai] Instância WhatsApp não encontrada para usuário ${userId}. Chatbot será inicializado quando WhatsApp conectar.`);
        }
      } catch (error) {
        console.warn(`⚠️ [config/ai] Erro ao reinicializar chatbot: ${error.message}`);
        // Não falhar a requisição se houver erro ao reinicializar
      }
    }

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso! O chatbot será atualizado automaticamente.'
    });
  } catch (error) {
    next(error);
  }
});

// Obter configuração do Premium Shears Scheduler
router.get('/scheduler', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const userId = req.userId;
    let config = null;

    // Tentar buscar do Supabase primeiro
    if (isConfigured) {
      try {
        const { data: supabaseConfig, error } = await supabase
          .from('configurations')
          .select('premium_shears_api_url, premium_shears_api_key_encrypted, use_premium_shears_scheduler, barbearia_phone')
          .eq('user_id', userId)
          .single();

        if (!error && supabaseConfig) {
          let apiUrlPreview = null;
          if (supabaseConfig.premium_shears_api_url) {
            const url = supabaseConfig.premium_shears_api_url;
            apiUrlPreview = url.length > 50 ? `${url.substring(0, 50)}...` : url;
          }

          let hasKey = !!supabaseConfig.premium_shears_api_key_encrypted;

          config = {
            api_url: supabaseConfig.premium_shears_api_url || null,
            api_url_preview: apiUrlPreview,
            has_key: hasKey,
            enabled: supabaseConfig.use_premium_shears_scheduler || false,
            barbearia_phone: supabaseConfig.barbearia_phone || null
          };
        }
      } catch (error) {
        console.warn('⚠️ [GET /config/scheduler] Erro ao buscar do Supabase:', error.message);
      }
    }

    // Fallback: buscar do PostgreSQL local
    if (!config) {
      try {
        const result = await query(
          `SELECT premium_shears_api_url, premium_shears_api_key_encrypted, use_premium_shears_scheduler, barbearia_phone
           FROM config_ai
           WHERE user_id = $1`,
          [userId]
        );

        if (result.rows.length > 0) {
          const row = result.rows[0];
          let apiUrlPreview = null;
          if (row.premium_shears_api_url) {
            const url = row.premium_shears_api_url;
            apiUrlPreview = url.length > 50 ? `${url.substring(0, 50)}...` : url;
          }

          config = {
            api_url: row.premium_shears_api_url || null,
            api_url_preview: apiUrlPreview,
            has_key: !!row.premium_shears_api_key_encrypted,
            enabled: row.use_premium_shears_scheduler || false,
            barbearia_phone: row.barbearia_phone || null
          };
        } else {
          config = {
            api_url: null,
            api_url_preview: null,
            has_key: false,
            enabled: false,
            barbearia_phone: null
          };
        }
      } catch (error) {
        console.error('❌ [GET /config/scheduler] Erro ao buscar do PostgreSQL:', error);
        throw error;
      }
    }

    if (!config) {
      config = {
        api_url: null,
        api_url_preview: null,
        has_key: false,
        enabled: false,
        barbearia_phone: null
      };
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    next(error);
  }
});

// Atualizar configuração do Premium Shears Scheduler
router.put('/scheduler', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { api_url, api_key, enabled, barbearia_phone } = req.body;

    // Validar URL se fornecida
    if (api_url && api_url.trim()) {
      try {
        new URL(api_url);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          message: 'URL da API inválida'
        });
      }
    }

    // Criptografar API key se fornecida
    let encryptedKey = null;
    if (api_key && api_key.trim()) {
      encryptedKey = encryption.encrypt(api_key.trim());
    }

    // Preparar dados para atualização
    const updateData = {};
    if (api_url !== undefined) {
      updateData.premium_shears_api_url = api_url ? api_url.trim() : null;
    }
    if (encryptedKey !== null) {
      updateData.premium_shears_api_key_encrypted = encryptedKey;
    }
    if (enabled !== undefined) {
      updateData.use_premium_shears_scheduler = enabled === true || enabled === 'true';
    }
    if (barbearia_phone !== undefined) {
      // Limpar número: remover caracteres não numéricos
      const cleanPhone = barbearia_phone ? barbearia_phone.replace(/\D/g, '') : null;
      updateData.barbearia_phone = cleanPhone || null;
    }

    // Salvar no Supabase primeiro
    if (isConfigured) {
      try {
        // Garantir que estamos usando service key (bypass RLS)
        const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        
        if (serviceKey && supabaseUrl) {
          const { createClient } = require('@supabase/supabase-js');
          const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          });

          // Verificar se já existe configuração
          const { data: existing } = await supabaseAdmin
            .from('configurations')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (existing) {
            const { error: updateError } = await supabaseAdmin
              .from('configurations')
              .update({
                ...updateData,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId);

            if (updateError) {
              console.error('❌ [PUT /config/scheduler] Erro ao atualizar no Supabase:', updateError);
            } else {
              console.log('✅ [PUT /config/scheduler] Configuração atualizada no Supabase');
            }
          } else {
            const { error: insertError } = await supabaseAdmin
              .from('configurations')
              .insert([{
                user_id: userId,
                ...updateData
              }]);

            if (insertError) {
              console.error('❌ [PUT /config/scheduler] Erro ao inserir no Supabase:', insertError);
            } else {
              console.log('✅ [PUT /config/scheduler] Configuração inserida no Supabase');
            }
          }
        }
      } catch (error) {
        console.error('❌ [PUT /config/scheduler] Erro ao salvar no Supabase:', error);
      }
    }

    // Fallback: salvar no PostgreSQL local
    try {
      // Construir query dinamicamente
      const fields = ['user_id'];
      const values = [userId];
      const placeholders = ['$1'];
      let paramIndex = 2;

      const updateFields = [];
      
      if (api_url !== undefined) {
        fields.push('premium_shears_api_url');
        values.push(api_url ? api_url.trim() : null);
        placeholders.push(`$${paramIndex}`);
        updateFields.push(`premium_shears_api_url = EXCLUDED.premium_shears_api_url`);
        paramIndex++;
      }

      if (encryptedKey !== null) {
        fields.push('premium_shears_api_key_encrypted');
        values.push(encryptedKey);
        placeholders.push(`$${paramIndex}`);
        updateFields.push(`premium_shears_api_key_encrypted = EXCLUDED.premium_shears_api_key_encrypted`);
        paramIndex++;
      }

      if (enabled !== undefined) {
        fields.push('use_premium_shears_scheduler');
        values.push(enabled === true || enabled === 'true');
        placeholders.push(`$${paramIndex}`);
        updateFields.push(`use_premium_shears_scheduler = EXCLUDED.use_premium_shears_scheduler`);
        paramIndex++;
      }

      if (barbearia_phone !== undefined) {
        const cleanPhone = barbearia_phone ? barbearia_phone.replace(/\D/g, '') : null;
        fields.push('barbearia_phone');
        values.push(cleanPhone);
        placeholders.push(`$${paramIndex}`);
        updateFields.push(`barbearia_phone = EXCLUDED.barbearia_phone`);
        paramIndex++;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      if (fields.length > 1) {
        await query(
          `INSERT INTO config_ai (${fields.join(', ')})
           VALUES (${placeholders.join(', ')})
           ON CONFLICT (user_id) DO UPDATE SET
             ${updateFields.join(', ')}`,
          values
        );
        console.log('✅ [PUT /config/scheduler] Configuração salva no PostgreSQL');
      }
    } catch (error) {
      console.error('❌ [PUT /config/scheduler] Erro ao salvar no PostgreSQL:', error);
      throw error;
    }

    res.json({
      success: true,
      message: 'Configuração do scheduler atualizada com sucesso!'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
