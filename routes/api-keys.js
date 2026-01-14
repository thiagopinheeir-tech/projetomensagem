/**
 * Rotas para gerenciar API Keys dos usuários (OpenAI, etc.)
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const { query } = require('../config/database');
const encryption = require('../services/encryption');
const { convertUserIdForTable } = require('../utils/userId-converter');
const OpenAI = require('openai');

/**
 * GET /api/api-keys
 * Lista todas as API keys do usuário (sem mostrar valores)
 */
router.get('/', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    let userId = req.userId;
    userId = await convertUserIdForTable('user_api_keys', userId);

    const result = await query(
      `SELECT id, provider, is_active, created_at, updated_at
       FROM user_api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      apiKeys: result.rows.map(row => ({
        id: row.id,
        provider: row.provider,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        configured: true // Indica que está configurada (mas não mostra o valor)
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/api-keys/:provider
 * Verifica se uma API key está configurada para um provedor
 */
router.get('/:provider', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    let userId = req.userId;
    // Converter userId para o tipo correto da tabela user_api_keys
    userId = await convertUserIdForTable('user_api_keys', userId);
    const provider = req.params.provider.toLowerCase();

    const result = await query(
      `SELECT id, is_active
       FROM user_api_keys
       WHERE user_id = $1 AND provider = $2 AND is_active = true
       LIMIT 1`,
      [userId, provider]
    );

    res.json({
      success: true,
      configured: result.rows.length > 0,
      provider: provider
    });
  } catch (error) {
    console.error('❌ Erro em GET /api/api-keys/:provider:', error);
    next(error);
  }
});

/**
 * POST /api/api-keys
 * Salva ou atualiza uma API key (criptografada)
 */
router.post('/', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    let userId = req.userId;
    userId = await convertUserIdForTable('user_api_keys', userId);
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'provider e apiKey são obrigatórios'
      });
    }

    // Validar provider
    const validProviders = ['openai', 'anthropic'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Provider inválido. Use: ${validProviders.join(', ')}`
      });
    }

    // Criptografar API key
    const encryptedKey = encryption.encrypt(apiKey);

    // Verificar se já existe
    const existing = await query(
      `SELECT id FROM user_api_keys
       WHERE user_id = $1 AND provider = $2
       LIMIT 1`,
      [userId, provider.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      // Atualizar existente
      await query(
        `UPDATE user_api_keys
         SET api_key_encrypted = $1, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND provider = $3`,
        [encryptedKey, userId, provider.toLowerCase()]
      );

      console.log(`✅ [api-keys] API key ${provider} atualizada para usuário ${userId}`);
    } else {
      // Criar nova
      await query(
        `INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, is_active)
         VALUES ($1, $2, $3, true)`,
        [userId, provider.toLowerCase(), encryptedKey]
      );

      console.log(`✅ [api-keys] API key ${provider} criada para usuário ${userId}`);
    }

    // Reinicializar chatbot se for OpenAI e a instância WhatsApp existir
    if (provider.toLowerCase() === 'openai') {
      try {
        const whatsappManager = require('../services/whatsapp-manager');
        const originalUserId = req.userId; // userId original (antes da conversão)
        const instance = whatsappManager.getInstance(originalUserId);
        
        if (instance) {
          await instance.initChatbot(originalUserId);
          console.log(`✅ [api-keys] Chatbot reinicializado para usuário ${originalUserId}`);
        } else {
          console.log(`ℹ️ [api-keys] Instância WhatsApp não encontrada para usuário ${originalUserId}. Chatbot será inicializado quando WhatsApp conectar.`);
        }
      } catch (error) {
        console.warn(`⚠️ [api-keys] Erro ao reinicializar chatbot: ${error.message}`);
        // Não falhar a requisição se houver erro ao reinicializar
      }
    }

    res.json({
      success: true,
      message: `API key ${provider} salva com sucesso${provider.toLowerCase() === 'openai' ? '. O chatbot será atualizado automaticamente.' : ''}`
    });
  } catch (error) {
    console.error('❌ Erro ao salvar API key:', error);
    next(error);
  }
});

/**
 * POST /api/api-keys/:provider/verify
 * Verifica se uma API key está funcionando (faz teste real)
 */
router.post('/:provider/verify', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    let userId = req.userId;
    userId = await convertUserIdForTable('user_api_keys', userId);
    const provider = req.params.provider.toLowerCase();

    if (provider !== 'openai') {
      return res.status(400).json({
        success: false,
        message: 'Verificação disponível apenas para OpenAI'
      });
    }

    // Buscar API key
    const result = await query(
      `SELECT api_key_encrypted FROM user_api_keys
       WHERE user_id = $1 AND provider = $2 AND is_active = true
       LIMIT 1`,
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        valid: false,
        message: 'API key não configurada'
      });
    }

    // Descriptografar
    const decryptedKey = encryption.decrypt(result.rows[0].api_key_encrypted);

    // Testar API key fazendo uma requisição simples
    try {
      const openai = new OpenAI({ apiKey: decryptedKey });
      const testResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });

      if (testResponse && testResponse.choices && testResponse.choices.length > 0) {
        return res.json({
          success: true,
          valid: true,
          message: 'API key válida e funcionando'
        });
      } else {
        return res.json({
          success: false,
          valid: false,
          message: 'Resposta inválida da API'
        });
      }
    } catch (apiError) {
      return res.json({
        success: false,
        valid: false,
        message: apiError.message || 'Erro ao testar API key',
        error: apiError.response?.status || apiError.status || 'unknown'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar API key:', error);
    next(error);
  }
});

/**
 * DELETE /api/api-keys/:provider
 * Remove uma API key (desativa)
 */
router.delete('/:provider', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    let userId = req.userId;
    userId = await convertUserIdForTable('user_api_keys', userId);
    const provider = req.params.provider.toLowerCase();

    await query(
      `UPDATE user_api_keys
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    console.log(`✅ [api-keys] API key ${provider} desativada para usuário ${userId}`);

    res.json({
      success: true,
      message: `API key ${provider} removida com sucesso`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
