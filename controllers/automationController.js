const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Carrega template de automações do arquivo JSON
 */
function loadAutomationTemplate(templateKey) {
  try {
    const validKeys = ['barbearia', 'manicure', 'clinica', 'emprestimo'];
    if (!validKeys.includes(templateKey)) {
      return null;
    }

    const templatePath = path.join(__dirname, '..', 'templates', 'automations', `${templateKey}.json`);

    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️ Template de automações não encontrado: ${templatePath}`);
      return null;
    }

    const content = fs.readFileSync(templatePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erro ao carregar template de automações ${templateKey}:`, error.message);
    return null;
  }
}

/**
 * Cria regras e menus no banco baseado no template
 * Retorna estatísticas de criação
 */
async function seedAutomationsFromTemplate(userId, profileId, templateKey) {
  try {
    // Verificar se já existem automações para este perfil
    const existingRules = await query(
      `SELECT COUNT(*) as count FROM automation_rules WHERE user_id = $1 AND profile_id = $2`,
      [userId, profileId]
    );
    const existingMenus = await query(
      `SELECT COUNT(*) as count FROM automation_menus WHERE user_id = $1 AND profile_id = $2`,
      [userId, profileId]
    );

    const hasExisting = parseInt(existingRules.rows[0].count) > 0 || parseInt(existingMenus.rows[0].count) > 0;

    if (hasExisting) {
      return {
        created: false,
        alreadyExists: true,
        rulesCreated: 0,
        menusCreated: 0
      };
    }

    // Carregar template
    const template = loadAutomationTemplate(templateKey);
    if (!template) {
      throw new Error(`Template ${templateKey} não encontrado`);
    }

    let rulesCreated = 0;
    let menusCreated = 0;

    // Criar regras
    if (template.rules && Array.isArray(template.rules)) {
      for (const rule of template.rules) {
        try {
          await query(
            `INSERT INTO automation_rules (user_id, profile_id, name, keywords, response, is_active, priority, case_sensitive)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              profileId,
              rule.name,
              rule.keywords || [],
              rule.response,
              rule.is_active !== undefined ? rule.is_active : true,
              rule.priority !== undefined ? rule.priority : 0,
              rule.case_sensitive !== undefined ? rule.case_sensitive : false
            ]
          );
          rulesCreated++;
        } catch (error) {
          console.error(`❌ Erro ao criar regra "${rule.name}":`, error.message);
        }
      }
    }

    // Criar menus
    if (template.menus && Array.isArray(template.menus)) {
      for (const menu of template.menus) {
        try {
          // Criar menu (options já é JSONB no banco, então passamos o array diretamente)
          const menuResult = await query(
            `INSERT INTO automation_menus (user_id, profile_id, name, trigger_keywords, menu_text, options, is_active)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING id`,
            [
              userId,
              profileId,
              menu.name,
              menu.trigger_keywords || [],
              menu.menu_text,
              JSON.stringify(menu.options || []),
              menu.is_active !== undefined ? menu.is_active : true
            ]
          );

          const menuId = menuResult.rows[0].id;
          menusCreated++;

          // Criar opções do menu (se houver tabela automation_menu_options)
          // Nota: O schema atual usa JSONB para options, então já está salvo acima
          // Se no futuro mudar para tabela separada, descomentar abaixo:
          /*
          if (menu.options && Array.isArray(menu.options)) {
            for (const option of menu.options) {
              await query(
                `INSERT INTO automation_menu_options (menu_id, option_number, option_text, response)
                 VALUES ($1, $2, $3, $4)`,
                [menuId, option.number, option.text, option.response]
              );
            }
          }
          */
        } catch (error) {
          console.error(`❌ Erro ao criar menu "${menu.name}":`, error.message);
        }
      }
    }

    return {
      created: true,
      alreadyExists: false,
      rulesCreated,
      menusCreated
    };
  } catch (error) {
    console.error('❌ Erro ao fazer seed de automações:', error);
    throw error;
  }
}

module.exports = {
  loadAutomationTemplate,
  seedAutomationsFromTemplate
};
