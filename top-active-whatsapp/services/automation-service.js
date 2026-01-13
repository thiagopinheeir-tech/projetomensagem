const { query } = require('../config/database');

class AutomationService {
  constructor() {
    this.menuStateCache = new Map(); // phone -> {menuId, expiresAt}
  }

  /**
   * Processa mensagem através de automações (regras e menus)
   * Retorna {handled: true, reply: string} se processou, ou {handled: false} se não processou
   */
  async handleMessage({ userId, profileId, phone, message }) {
    if (!userId) {
      return { handled: false };
    }

    const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
    const lowerMessage = message.toLowerCase().trim();

    // 1. Verificar se há menu ativo para este número
    const menuResult = await this.handleMenuResponse({ userId, profileId, phone: cleanPhone, message, lowerMessage });
    if (menuResult.handled) {
      return menuResult;
    }

    // 2. Verificar se alguma regra de automação corresponde
    const ruleResult = await this.handleRule({ userId, profileId, message, lowerMessage });
    if (ruleResult.handled) {
      return ruleResult;
    }

    // 3. Verificar se alguma palavra-chave ativa um menu
    const menuTriggerResult = await this.triggerMenu({ userId, profileId, phone: cleanPhone, message, lowerMessage });
    if (menuTriggerResult.handled) {
      return menuTriggerResult;
    }

    return { handled: false };
  }

  /**
   * Processa resposta de menu ativo
   */
  async handleMenuResponse({ userId, profileId, phone, message, lowerMessage }) {
    try {
      // Buscar menu ativo no cache ou banco
      let menuState = this.menuStateCache.get(phone);
      
      if (!menuState) {
        // Buscar no banco
        // Filtrar por userId para isolamento multi-tenant
        const result = await query(
          `SELECT menu_id, expires_at 
           FROM automation_menu_state 
           WHERE phone = $1 AND user_id = $2 AND expires_at > NOW()`,
          [phone, userId]
        );
        
        if (result.rows.length === 0) {
          return { handled: false };
        }
        
        menuState = {
          menuId: result.rows[0].menu_id,
          expiresAt: new Date(result.rows[0].expires_at)
        };
        this.menuStateCache.set(phone, menuState);
      }

      // Verificar expiração
      if (new Date() > menuState.expiresAt) {
        this.menuStateCache.delete(phone);
        await query('DELETE FROM automation_menu_state WHERE phone = $1 AND user_id = $2', [phone, userId]);
        return { handled: false };
      }

      // Buscar menu
      let menuQuery = `
        SELECT id, options, menu_text 
        FROM automation_menus 
        WHERE id = $1 AND is_active = true
      `;
      const menuParams = [menuState.menuId];
      
      if (profileId) {
        menuQuery += ' AND (profile_id = $2 OR profile_id IS NULL)';
        menuParams.push(profileId);
      } else {
        menuQuery += ' AND (user_id = $2 OR profile_id IS NULL)';
        menuParams.push(userId);
      }

      const menuResult = await query(menuQuery, menuParams);
      if (menuResult.rows.length === 0) {
        this.clearMenuState(phone);
        return { handled: false };
      }

      const menu = menuResult.rows[0];
      const options = menu.options || [];

      // Verificar se a mensagem corresponde a uma opção do menu
      const messageNum = parseInt(message.trim());
      if (!isNaN(messageNum)) {
        // Resposta numérica (1, 2, 3...)
        const option = options.find(opt => opt.number === messageNum);
        if (option) {
          this.clearMenuState(phone);
          return { handled: true, reply: option.response || option.text || 'Opção selecionada.' };
        }
      } else {
        // Resposta por palavra-chave
        const option = options.find(opt => {
          if (opt.keyword) {
            return lowerMessage.includes(opt.keyword.toLowerCase());
          }
          return false;
        });
        if (option) {
          this.clearMenuState(phone);
          return { handled: true, reply: option.response || option.text || 'Opção selecionada.' };
        }
      }

      // Se não correspondeu, reenviar menu
      return { handled: true, reply: menu.menu_text };
    } catch (error) {
      console.error('❌ Erro ao processar resposta de menu:', error);
      return { handled: false };
    }
  }

  /**
   * Processa regras de automação (palavras-chave)
   */
  async handleRule({ userId, profileId, message, lowerMessage }) {
    try {
      let ruleQuery = `
        SELECT id, keywords, response, case_sensitive, priority
        FROM automation_rules
        WHERE is_active = true
      `;
      const ruleParams = [];
      
      if (profileId) {
        ruleQuery += ' AND (profile_id = $1 OR profile_id IS NULL)';
        ruleParams.push(profileId);
      } else {
        ruleQuery += ' AND (user_id = $1 OR profile_id IS NULL)';
        ruleParams.push(userId);
      }

      ruleQuery += ' ORDER BY priority DESC, id ASC';

      const result = await query(ruleQuery, ruleParams);

      for (const rule of result.rows) {
        const keywords = rule.keywords || [];
        const caseSensitive = rule.case_sensitive || false;
        const searchText = caseSensitive ? message : lowerMessage;

        for (const keyword of keywords) {
          const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
          if (searchText.includes(searchKeyword)) {
            return { handled: true, reply: rule.response };
          }
        }
      }

      return { handled: false };
    } catch (error) {
      console.error('❌ Erro ao processar regras de automação:', error);
      return { handled: false };
    }
  }

  /**
   * Ativa um menu se a mensagem corresponde às palavras-chave de trigger
   */
  async triggerMenu({ userId, profileId, phone, message, lowerMessage }) {
    try {
      let menuQuery = `
        SELECT id, trigger_keywords, menu_text, options
        FROM automation_menus
        WHERE is_active = true
      `;
      const menuParams = [];
      
      if (profileId) {
        menuQuery += ' AND (profile_id = $1 OR profile_id IS NULL)';
        menuParams.push(profileId);
      } else {
        menuQuery += ' AND (user_id = $1 OR profile_id IS NULL)';
        menuParams.push(userId);
      }

      menuQuery += ' ORDER BY id ASC';

      const result = await query(menuQuery, menuParams);

      for (const menu of result.rows) {
        const triggerKeywords = menu.trigger_keywords || [];
        
        for (const keyword of triggerKeywords) {
          if (lowerMessage.includes(keyword.toLowerCase())) {
            // Ativar menu
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Menu expira em 15 minutos

            await query(
              `INSERT INTO automation_menu_state (phone, user_id, menu_id, expires_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (phone, user_id) 
               DO UPDATE SET menu_id = $3, expires_at = $4, created_at = NOW()`,
              [phone, userId, menu.id, expiresAt]
            );

            this.menuStateCache.set(phone, {
              menuId: menu.id,
              expiresAt
            });

            // Retornar menu com botões se houver opções
            const options = menu.options || [];
            const buttons = options.slice(0, 3).map(opt => ({
              id: opt.keyword || `option_${opt.number}`,
              body: opt.text || opt.response || `Opção ${opt.number}`
            }));

            return { 
              handled: true, 
              reply: menu.menu_text,
              buttons: buttons.length > 0 ? buttons : undefined
            };
          }
        }
      }

      return { handled: false };
    } catch (error) {
      console.error('❌ Erro ao ativar menu:', error);
      return { handled: false };
    }
  }

  /**
   * Limpa estado de menu para um número
   */
  async clearMenuState(phone) {
    this.menuStateCache.delete(phone);
    try {
      // Nota: clearMenuState precisa de userId, mas não está sendo passado
      // Por enquanto, limpar apenas do cache. A query será atualizada quando userId estiver disponível
      this.menuStateCache.delete(phone);
    } catch (error) {
      console.error('❌ Erro ao limpar estado de menu:', error);
    }
  }

  /**
   * Limpa cache e estados expirados
   */
  async cleanupExpiredStates() {
    try {
      // Limpar do banco
      // Limpar estados expirados (filtrar por userId se possível)
      await query('DELETE FROM automation_menu_state WHERE expires_at < NOW()');
      
      // Limpar cache
      const now = new Date();
      for (const [phone, state] of this.menuStateCache.entries()) {
        if (now > state.expiresAt) {
          this.menuStateCache.delete(phone);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao limpar estados expirados:', error);
    }
  }
}

// Limpar estados expirados a cada 5 minutos
const automationService = new AutomationService();
setInterval(() => {
  automationService.cleanupExpiredStates().catch(console.error);
}, 5 * 60 * 1000);

module.exports = automationService;
