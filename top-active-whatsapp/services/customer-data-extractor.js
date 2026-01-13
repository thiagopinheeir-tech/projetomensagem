const { query } = require('../config/database');
const { supabase, db, isConfigured } = require('../config/supabase');

/**
 * Classe para extrair e salvar dados do cliente das conversas
 */
class CustomerDataExtractor {
  /**
   * Extrai o nome do cliente da mensagem usando padrões simples
   */
  async extractCustomerName(userMessage, conversationHistory = [], phone = null, userId = null) {
    if (!userMessage) {
      // Se não tem mensagem mas tem telefone, tentar buscar nome salvo no banco
      if (phone && userId) {
        try {
          const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
          const { query } = require('../config/database');
          const result = await query(
            'SELECT name FROM contacts WHERE user_id = $1 AND phone = $2 AND name IS NOT NULL AND name NOT LIKE $3 LIMIT 1',
            [userId, cleanPhone, 'Contato%']
          );
          if (result.rows.length > 0 && result.rows[0].name) {
            console.log(`📝 Nome encontrado no banco de dados: ${result.rows[0].name}`);
            return result.rows[0].name;
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar nome no banco: ${error.message}`);
        }
      }
      return null;
    }

    const message = userMessage.trim();
    const messageLower = message.toLowerCase();
    
    // Padrões comuns para identificar nome (melhorados)
    const patterns = [
      // "meu nome é João Silva"
      /(?:meu\s+nome\s+é|me\s+chamo|sou\s+o|sou\s+a|eu\s+sou|eu\s+sou\s+o|eu\s+sou\s+a)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç\s]{1,30})/i,
      // "nome: João Silva" ou "nome - João Silva"
      /(?:nome|chamo)\s*[:\-]\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç\s]{1,30})/i,
      // "sou João Silva"
      /^sou\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç\s]{1,30})$/i,
      // Nome próprio como mensagem única (2-5 palavras, primeira letra maiúscula)
      /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç]+){1,4})$/,
      // "pode me chamar de João"
      /(?:pode\s+me\s+chamar\s+de|chame\s+de|me\s+chame\s+de)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç\s]{1,30})/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        
        // Validar que não é muito curto e não contém palavras comuns
        if (name.length >= 2 && name.length <= 50) {
          const commonWords = ['o', 'a', 'de', 'da', 'do', 'e', 'em', 'que', 'para', 'com', 'comigo', 'você', 'voce'];
          const nameWords = name.toLowerCase().split(/\s+/);
          
          // Se todas as palavras são comuns, não é um nome
          if (nameWords.every(word => commonWords.includes(word))) {
            continue;
          }
          
          // Capitalizar primeira letra de cada palavra
          name = name.split(' ').map(word => {
            const trimmed = word.trim();
            if (!trimmed) return '';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
          }).filter(Boolean).join(' ');
          
          // Validar que não contém números ou caracteres especiais (exceto hífen e apóstrofo)
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇa-záàâãéèêíïóôõöúç\s\-\']+$/.test(name)) {
            console.log(`📝 Nome extraído da mensagem: ${name}`);
            return name;
          }
        }
      }
    }

    // Tentar buscar no histórico de conversas (sem recursão para evitar loops)
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.user_message && msg.user_message !== userMessage) {
          // Aplicar os mesmos padrões de regex diretamente
          const msgText = msg.user_message.trim();
          for (const pattern of patterns) {
            const match = msgText.match(pattern);
            if (match && match[1]) {
              let name = match[1].trim();
              if (name.length >= 2 && name.length <= 50) {
                const commonWords = ['o', 'a', 'de', 'da', 'do', 'e', 'em', 'que', 'para', 'com', 'comigo', 'você', 'voce'];
                const nameWords = name.toLowerCase().split(/\s+/);
                if (!nameWords.every(word => commonWords.includes(word))) {
                  name = name.split(' ').map(word => {
                    const trimmed = word.trim();
                    if (!trimmed) return '';
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
                  }).filter(Boolean).join(' ');
                  if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇa-záàâãéèêíïóôõöúç\s\-\']+$/.test(name)) {
                    console.log(`📝 Nome extraído do histórico: ${name}`);
                    return name;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Se não encontrou na mensagem, tentar buscar nome salvo no banco
    if (phone && userId) {
      try {
        const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
        const { query } = require('../config/database');
        const result = await query(
          'SELECT name FROM contacts WHERE user_id = $1 AND phone = $2 AND name IS NOT NULL AND name NOT LIKE $3 LIMIT 1',
          [userId, cleanPhone, 'Contato%']
        );
        if (result.rows.length > 0 && result.rows[0].name) {
          console.log(`📝 Nome encontrado no banco de dados: ${result.rows[0].name}`);
          return result.rows[0].name;
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar nome no banco: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Extrai serviços mencionados na mensagem
   * Prioriza servicesConfig (objetos com name) e depois availableServices (array de strings)
   */
  extractServices(userMessage, availableServices = [], servicesConfig = []) {
    if (!userMessage) {
      return [];
    }

    const message = userMessage.toLowerCase();
    const mentionedServices = new Set();

    // 1. Buscar em servicesConfig (para templates como barbearia)
    if (servicesConfig && Array.isArray(servicesConfig) && servicesConfig.length > 0) {
      for (const serviceObj of servicesConfig) {
        const serviceName = serviceObj.name || '';
        const serviceLower = serviceName.toLowerCase();
        const keywords = serviceLower.split(/[\s,]+/);
        const found = keywords.some(keyword =>
          keyword.length > 2 && message.includes(keyword)
        );
        if (found) {
          mentionedServices.add(serviceName);
        }
      }
    }

    // 2. Buscar em availableServices (array de strings)
    if (availableServices && Array.isArray(availableServices) && availableServices.length > 0) {
      for (const service of availableServices) {
        const serviceName = typeof service === 'string' ? service : service.name || '';
        const serviceLower = serviceName.toLowerCase();
        const keywords = serviceLower.split(/[\s,]+/);
        const found = keywords.some(keyword =>
          keyword.length > 2 && message.includes(keyword)
        );
        if (found) {
          mentionedServices.add(serviceName);
        }
      }
    }

    console.log(`🔍 Serviços extraídos: ${Array.from(mentionedServices).join(', ')}`);
    return Array.from(mentionedServices);
  }

  /**
   * Cria ou atualiza contato
   */
  async createOrUpdateContact(phone, customerData, userId = null) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      const { name, services = [], email = null } = customerData;

      if (isConfigured && supabase) {
        // Supabase
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id, name, tags, message_count')
          .eq('phone', cleanPhone)
          .single();

        const updateData = {
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
          last_message_date: new Date().toISOString()
        };

        if (name) updateData.name = name;
        if (email) updateData.email = email;

        // Atualizar tags com serviços
        let tags = existingContact?.tags || [];
        if (services && services.length > 0) {
          tags = [...new Set([...tags, ...services])]; // Adicionar serviços únicos
        }
        updateData.tags = tags;

        // Incrementar contador de mensagens
        updateData.message_count = (existingContact?.message_count || 0) + 1;

        if (existingContact) {
          // Atualizar contato existente
          const { error } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('phone', cleanPhone);

          if (!error) {
            console.log(`📝 ✅ Contato atualizado no Supabase: ${cleanPhone} - ${name || 'Sem nome'}`);
          }
        } else {
          // Criar novo contato
          if (userId) updateData.user_id = userId;
          const { error } = await supabase
            .from('contacts')
            .insert([updateData]);

          if (!error) {
            console.log(`📝 ✅ Contato criado no Supabase: ${cleanPhone} - ${name || 'Sem nome'}`);
          }
        }
      } else {
        // PostgreSQL local
        if (userId) {
          const existingResult = await query(
            'SELECT id, name, tags FROM contacts WHERE user_id = $1 AND phone = $2',
            [userId, cleanPhone]
          );

          let tags = existingResult.rows[0]?.tags || [];
          if (services && services.length > 0) {
            tags = [...new Set([...tags, ...services])];
          }

          if (existingResult.rows.length > 0) {
            // Atualizar
            await query(
              `UPDATE contacts SET 
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                tags = $3,
                updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $4 AND phone = $5`,
              [name, email, tags, userId, cleanPhone]
            );
            console.log(`📝 ✅ Contato atualizado no PostgreSQL: ${cleanPhone} - ${name || 'Sem nome'}`);
          } else {
            // Criar
            await query(
              `INSERT INTO contacts (user_id, phone, name, email, tags, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [userId, cleanPhone, name, email, tags]
            );
            console.log(`📝 ✅ Contato criado no PostgreSQL: ${cleanPhone} - ${name || 'Sem nome'}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Erro ao criar/atualizar contato: ${error.message}`);
    }
  }

  /**
   * Atualiza lead com informações do cliente
   */
  async updateLeadWithCustomerData(phone, customerData) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      const { name, services = [] } = customerData;

      if (isConfigured && supabase) {
        // Buscar lead existente
        const { data: existingLeads } = await supabase
          .from('leads')
          .select('id, name, notes')
          .eq('phone', cleanPhone)
          .limit(1)
          .single();

        if (existingLeads) {
          const updateData = {
            updated_at: new Date().toISOString()
          };

          // Atualizar nome se ainda não tiver ou se for placeholder
          if (name && (!existingLeads.name || existingLeads.name.startsWith('Contato'))) {
            updateData.name = name;
          }

          // Adicionar serviços às notas se houver
          if (services && services.length > 0) {
            const servicesText = `Serviços de interesse: ${services.join(', ')}`;
            const currentNotes = existingLeads.notes || '';
            updateData.notes = currentNotes 
              ? `${currentNotes}\n${servicesText}`
              : servicesText;
          }

          await supabase
            .from('leads')
            .update(updateData)
            .eq('phone', cleanPhone);

          console.log(`📋 ✅ Lead atualizado no Supabase: ${cleanPhone}`);
        }
      } else {
        // PostgreSQL local
        const existingResult = await query(
          'SELECT id, name, notes FROM leads WHERE phone = $1 LIMIT 1',
          [cleanPhone]
        );

        if (existingResult.rows.length > 0) {
          const lead = existingResult.rows[0];
          const updates = [];
          const values = [];
          let paramIndex = 1;

          // Atualizar nome se ainda não tiver ou se for placeholder
          if (name && (!lead.name || lead.name.startsWith('Contato'))) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
          }

          // Adicionar serviços às notas
          if (services && services.length > 0) {
            const servicesText = `Serviços de interesse: ${services.join(', ')}`;
            const currentNotes = lead.notes || '';
            const newNotes = currentNotes 
              ? `${currentNotes}\n${servicesText}`
              : servicesText;
            updates.push(`notes = $${paramIndex++}`);
            values.push(newNotes);
          }

          if (updates.length > 0) {
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(cleanPhone);

            await query(
              `UPDATE leads SET ${updates.join(', ')} WHERE phone = $${paramIndex}`,
              values
            );
            console.log(`📋 ✅ Lead atualizado no PostgreSQL: ${cleanPhone}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Erro ao atualizar lead: ${error.message}`);
    }
  }

  /**
   * Processa mensagem e extrai/salva dados do cliente
   */
  async processCustomerData(phone, userMessage, conversationHistory = [], userId = null, availableServices = [], servicesConfig = []) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');

      // Debug: log dos serviços disponíveis
      console.log(`🔍 Processando dados do cliente ${cleanPhone}:`, {
        availableServicesCount: availableServices?.length || 0,
        servicesConfigCount: servicesConfig?.length || 0,
        availableServices: availableServices?.slice(0, 3) || [],
        userMessage: userMessage.substring(0, 50)
      });

      // Extrair nome (agora é async e busca no banco também)
      const customerName = await this.extractCustomerName(userMessage, conversationHistory, phone, userId);
      console.log(`📝 Nome extraído: ${customerName || 'Nenhum'}`);

      // Extrair serviços (passar servicesConfig também)
      const services = this.extractServices(userMessage, availableServices, servicesConfig);
      
      // Debug: log dos serviços encontrados
      if (services && services.length > 0) {
        console.log(`✅ Serviços extraídos para ${cleanPhone}:`, services);
      }

      // Se encontrou algum dado, salvar
      if (customerName || services.length > 0) {
        const customerData = {
          name: customerName,
          services: services,
          email: null // Pode ser expandido no futuro
        };

        // Criar/atualizar contato
        await this.createOrUpdateContact(cleanPhone, customerData, userId);

        // Atualizar lead
        await this.updateLeadWithCustomerData(cleanPhone, customerData);

        return customerData;
      }

      return null;
    } catch (error) {
      console.warn(`⚠️  Erro ao processar dados do cliente: ${error.message}`);
      return null;
    }
  }
}

module.exports = new CustomerDataExtractor();
