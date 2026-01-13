const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../config/database');
const crypto = require('crypto');

// Chave de criptografia (deve estar no .env em produção)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Obter configuração de IA do usuário
router.get('/ai', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

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
          custom_prompt: null,
          has_key: !!process.env.OPENAI_API_KEY,
          key_preview: process.env.OPENAI_API_KEY 
            ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`
            : null
        }
      });
    }

    const config = result.rows[0];
    const hasKey = !!config.openai_key_encrypted;
    let keyPreview = null;

    if (hasKey) {
      try {
        const decryptedKey = decrypt(config.openai_key_encrypted);
        keyPreview = `${decryptedKey.substring(0, 10)}...${decryptedKey.substring(decryptedKey.length - 4)}`;
      } catch (error) {
        console.error('Erro ao descriptografar chave:', error);
      }
    } else if (process.env.OPENAI_API_KEY) {
      keyPreview = `${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}`;
    }

    res.json({
      success: true,
      config: {
        model: config.model,
        temperature: parseFloat(config.temperature),
        max_tokens: parseInt(config.max_tokens),
        custom_prompt: config.custom_prompt,
        has_key: hasKey,
        key_preview: keyPreview
      }
    });
  } catch (error) {
    next(error);
  }
});

// Atualizar configuração de IA
router.put('/ai', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { openai_key, model, temperature, max_tokens, custom_prompt } = req.body;

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
      encryptedKey = encrypt(openai_key.trim());
    }

    // Montar campos para UPDATE
    const updateFields = [];
    if (encryptedKey !== null) updateFields.push('openai_key_encrypted = EXCLUDED.openai_key_encrypted');
    if (model) updateFields.push('model = EXCLUDED.model');
    if (temperature !== undefined) updateFields.push('temperature = EXCLUDED.temperature');
    if (max_tokens) updateFields.push('max_tokens = EXCLUDED.max_tokens');
    if (custom_prompt !== undefined) updateFields.push('custom_prompt = EXCLUDED.custom_prompt');
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Usar UPSERT (INSERT ... ON CONFLICT)
    const result = await query(
      `INSERT INTO config_ai (user_id, openai_key_encrypted, model, temperature, max_tokens, custom_prompt, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         ${updateFields.join(', ')}`,
      [
        userId,
        encryptedKey,
        model || 'gpt-4o-mini',
        temperature !== undefined ? temperature : 0.7,
        max_tokens || 300,
        custom_prompt || null
      ]
    );

    // Atualizar chatbot em tempo real
    const whatsapp = require('../services/whatsapp');
    if (whatsapp.chatbot) {
      const updateConfig = {};
      if (model) updateConfig.model = model;
      if (temperature !== undefined) updateConfig.temperature = temperature;
      if (max_tokens) updateConfig.maxTokens = max_tokens;
      if (custom_prompt !== undefined) updateConfig.specialInstructions = custom_prompt;

      if (Object.keys(updateConfig).length > 0) {
        whatsapp.updateChatbotConfig(updateConfig);
      }

      // Se mudou a chave, recriar cliente OpenAI
      if (encryptedKey && whatsapp.chatbot) {
        // Reinicializar chatbot com nova chave
        process.env.OPENAI_API_KEY = openai_key.trim();
        whatsapp.initChatbot();
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

module.exports = router;
