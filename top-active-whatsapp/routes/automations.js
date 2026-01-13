const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const automationController = require('../controllers/automationController');

// ============================================
// AUTOMATION RULES (Regras de Automação)
// ============================================

// Listar regras
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.query;

    let queryStr = `
      SELECT id, name, keywords, response, is_active, priority, case_sensitive, created_at, updated_at
      FROM automation_rules
      WHERE user_id = $1
    `;
    const params = [userId];

    if (profileId) {
      queryStr += ' AND (profile_id = $2 OR profile_id IS NULL)';
      params.push(profileId);
    }

    queryStr += ' ORDER BY priority DESC, id ASC';

    const result = await query(queryStr, params);

    res.json({
      success: true,
      rules: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar regras:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Criar regra
router.post('/rules', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, keywords, response, is_active = true, priority = 0, case_sensitive = false, profileId } = req.body;

    if (!name || !keywords || !Array.isArray(keywords) || keywords.length === 0 || !response) {
      return res.status(400).json({
        success: false,
        error: 'Nome, keywords (array) e response são obrigatórios'
      });
    }

    const result = await query(
      `INSERT INTO automation_rules (user_id, profile_id, name, keywords, response, is_active, priority, case_sensitive)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, keywords, response, is_active, priority, case_sensitive, created_at, updated_at`,
      [userId, profileId || null, name, keywords, response, is_active, priority, case_sensitive]
    );

    res.status(201).json({
      success: true,
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao criar regra:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Atualizar regra
router.put('/rules/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, keywords, response, is_active, priority, case_sensitive } = req.body;

    // Verificar se a regra pertence ao usuário
    const checkResult = await query(
      'SELECT id FROM automation_rules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    if (keywords !== undefined) {
      updateFields.push(`keywords = $${paramCount++}`);
      updateValues.push(keywords);
    }
    if (response !== undefined) {
      updateFields.push(`response = $${paramCount++}`);
      updateValues.push(response);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(is_active);
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      updateValues.push(priority);
    }
    if (case_sensitive !== undefined) {
      updateFields.push(`case_sensitive = $${paramCount++}`);
      updateValues.push(case_sensitive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id, userId);

    const result = await query(
      `UPDATE automation_rules 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING id, name, keywords, response, is_active, priority, case_sensitive, created_at, updated_at`,
      updateValues
    );

    res.json({
      success: true,
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar regra:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Deletar regra
router.delete('/rules/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM automation_rules WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Regra deletada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar regra:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// AUTOMATION MENUS (Menus Interativos)
// ============================================

// Listar menus
router.get('/menus', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.query;

    let queryStr = `
      SELECT id, name, trigger_keywords, menu_text, options, is_active, created_at, updated_at
      FROM automation_menus
      WHERE user_id = $1
    `;
    const params = [userId];

    if (profileId) {
      queryStr += ' AND (profile_id = $2 OR profile_id IS NULL)';
      params.push(profileId);
    }

    queryStr += ' ORDER BY id ASC';

    const result = await query(queryStr, params);

    res.json({
      success: true,
      menus: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar menus:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Criar menu
router.post('/menus', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, trigger_keywords, menu_text, options, is_active = true, profileId } = req.body;

    if (!name || !trigger_keywords || !Array.isArray(trigger_keywords) || trigger_keywords.length === 0 || !menu_text || !options || !Array.isArray(options)) {
      return res.status(400).json({
        success: false,
        error: 'Nome, trigger_keywords (array), menu_text e options (array) são obrigatórios'
      });
    }

    const result = await query(
      `INSERT INTO automation_menus (user_id, profile_id, name, trigger_keywords, menu_text, options, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, trigger_keywords, menu_text, options, is_active, created_at, updated_at`,
      [userId, profileId || null, name, trigger_keywords, menu_text, options, is_active]
    );

    res.status(201).json({
      success: true,
      menu: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao criar menu:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Atualizar menu
router.put('/menus/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, trigger_keywords, menu_text, options, is_active } = req.body;

    // Verificar se o menu pertence ao usuário
    const checkResult = await query(
      'SELECT id FROM automation_menus WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu não encontrado'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    if (trigger_keywords !== undefined) {
      updateFields.push(`trigger_keywords = $${paramCount++}`);
      updateValues.push(trigger_keywords);
    }
    if (menu_text !== undefined) {
      updateFields.push(`menu_text = $${paramCount++}`);
      updateValues.push(menu_text);
    }
    if (options !== undefined) {
      updateFields.push(`options = $${paramCount++}`);
      updateValues.push(options);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id, userId);

    const result = await query(
      `UPDATE automation_menus 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING id, name, trigger_keywords, menu_text, options, is_active, created_at, updated_at`,
      updateValues
    );

    res.json({
      success: true,
      menu: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar menu:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Deletar menu
router.delete('/menus/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM automation_menus WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Menu deletado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar menu:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Seed automations from template
router.get('/seed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    let { profileId } = req.query;

    // Se profileId não fornecido, buscar perfil ativo
    if (!profileId) {
      const profileResult = await query(
        `SELECT id, template_key FROM chatbot_profiles WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [userId]
      );
      
      if (profileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum perfil ativo encontrado. Crie ou ative um perfil no Chatbot IA primeiro.'
        });
      }

      profileId = profileResult.rows[0].id;
      const templateKey = profileResult.rows[0].template_key;

      if (!templateKey) {
        return res.status(400).json({
          success: false,
          message: 'Perfil ativo não tem template_key associado'
        });
      }

      // Fazer seed
      const seedResult = await automationController.seedAutomationsFromTemplate(userId, profileId, templateKey);

      return res.json({
        success: true,
        created: seedResult.created,
        alreadyExists: seedResult.alreadyExists,
        rulesCreated: seedResult.rulesCreated,
        menusCreated: seedResult.menusCreated
      });
    }

    // Se profileId fornecido, buscar template_key do perfil
    const profileResult = await query(
      `SELECT template_key FROM chatbot_profiles WHERE id = $1 AND user_id = $2`,
      [profileId, userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Perfil não encontrado'
      });
    }

    const templateKey = profileResult.rows[0].template_key;

    if (!templateKey) {
      return res.status(400).json({
        success: false,
        message: 'Perfil não tem template_key associado'
      });
    }

    // Fazer seed
    const seedResult = await automationController.seedAutomationsFromTemplate(userId, profileId, templateKey);

    res.json({
      success: true,
      created: seedResult.created,
      alreadyExists: seedResult.alreadyExists,
      rulesCreated: seedResult.rulesCreated,
      menusCreated: seedResult.menusCreated
    });
  } catch (error) {
    console.error('❌ Erro ao fazer seed de automações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Toggle enable/disable automations
router.put('/toggle', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;

    // Buscar perfil ativo
    const profileResult = await query(
      `SELECT id FROM chatbot_profiles WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum perfil ativo encontrado. Crie ou ative um perfil no Chatbot IA primeiro.'
      });
    }

    const profileId = profileResult.rows[0].id;

    // Atualizar enable_automations no perfil
    await query(
      `UPDATE chatbot_profiles SET enable_automations = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [enabled !== false, profileId]
    );

    // Atualizar no runtime
    const whatsapp = require('../services/whatsapp');
    whatsapp.setAutomationsEnabled(enabled !== false);

    res.json({
      success: true,
      enabled: enabled !== false,
      message: `Automações ${enabled !== false ? 'ativadas' : 'desativadas'} com sucesso`
    });
  } catch (error) {
    console.error('❌ Erro ao alternar automações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get automations status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar perfil ativo
    const profileResult = await query(
      `SELECT id, enable_automations FROM chatbot_profiles WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.json({
        success: true,
        enabled: true, // Default: ativo
        hasActiveProfile: false
      });
    }

    const profile = profileResult.rows[0];

    res.json({
      success: true,
      enabled: profile.enable_automations !== false, // Default true se null
      hasActiveProfile: true
    });
  } catch (error) {
    console.error('❌ Erro ao buscar status das automações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
