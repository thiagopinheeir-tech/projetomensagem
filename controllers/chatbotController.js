const whatsappManager = require('../services/whatsapp-manager');
const ConversationManager = require('../services/conversation-manager');
const { supabase, db, isConfigured } = require('../config/supabase');
const { query } = require('../config/database');
const encryption = require('../services/encryption');

function mapProfileRowToConfig(row) {
  if (!row) return null;
  const config = {
    businessName: row.business_name ?? '',
    businessDescription: row.business_description ?? '',
    services: Array.isArray(row.services)
      ? row.services
      : (row.services ? String(row.services).split(',').map(s => s.trim()).filter(Boolean) : []),
    tone: row.tone ?? 'amigavel',
    model: row.model ?? 'gpt-4o-mini',
    temperature: row.temperature !== null && row.temperature !== undefined ? Number(row.temperature) : 0.7,
    maxTokens: row.max_tokens !== null && row.max_tokens !== undefined ? Number(row.max_tokens) : 300,
    specialInstructions: row.special_instructions ?? '',
    greetingMessage: row.greeting_message ?? '',
    farewellMessage: row.farewell_message ?? '',
    templateVariables: (row.template_variables && typeof row.template_variables === 'object' && !Array.isArray(row.template_variables))
      ? row.template_variables
      : {},
    promptOnlyMode: row.prompt_only_mode !== null && row.prompt_only_mode !== undefined
      ? !!row.prompt_only_mode
      : true,
    defaultResponses: row.default_responses && typeof row.default_responses === 'object'
      ? row.default_responses
      : (typeof row.default_responses === 'string'
        ? (() => { try { return JSON.parse(row.default_responses || '{}'); } catch { return {}; } })()
        : {}),
    servicesConfig: row.services_config && typeof row.services_config === 'object'
      ? (Array.isArray(row.services_config) ? row.services_config : [])
      : [],
    businessHours: row.business_hours && typeof row.business_hours === 'object'
      ? row.business_hours
      : {}
  };
  return config;
}

async function getActiveProfile(userId) {
  const result = await query(
    `SELECT *
     FROM chatbot_profiles
     WHERE user_id = $1 AND is_active = true
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );
  const profile = result.rows[0] || null;
  return profile;
}

async function applyConfigToRuntime(config, enabled, userId) {
  if (config && userId) {
    // Obter instância WhatsApp do usuário
    const instance = whatsappManager.getInstance(userId);
    if (instance && instance.chatbot) {
      instance.chatbot.updateConfig(config);
      if (enabled) {
        instance.chatbotEnabled = true;
      } else {
        instance.chatbotEnabled = false;
      }
    }
  }
}

const getConfig = async (req, res, next) => {
  try {
    // Tentar carregar do Supabase primeiro
    let config = null;
    let enabled = false;
    const userId = req.user?.id;
    
    // Valores padrão JP Financeira
    const defaultConfig = {
      businessName: process.env.BUSINESS_NAME || 'JP Financeira',
      businessDescription: process.env.BUSINESS_DESCRIPTION || 'Empresa especializada em empréstimo pessoal rápido e seguro. Aprovamos seu crédito em até 24 horas com as melhores taxas do mercado. Atendimento de segunda a sábado, das 8h às 18h.',
      services: process.env.BUSINESS_SERVICES?.split(',').map(s => s.trim()) || ['Empréstimo Pessoal', 'Crédito Rápido', 'Antecipação de Recebíveis', 'Refinanciamento'],
      tone: process.env.BUSINESS_TONE || 'amigavel',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '350'),
      specialInstructions: process.env.BUSINESS_INSTRUCTIONS || 'Sempre coletar nome completo, CPF, valor desejado e prazo antes de prosseguir. Informar valores e taxas quando solicitado. Ser claro sobre documentação necessária. NUNCA prometer aprovação garantida. Atendimento apenas Segunda a Sábado, 8h-18h.',
      greetingMessage: 'Olá! 👋 Como posso te ajudar hoje?',
      farewellMessage: 'Foi um prazer te atender! 💙 Se precisar de mais alguma coisa sobre empréstimo pessoal, estou aqui! Tenha um ótimo dia!',
      defaultResponses: {
        preco: process.env.RESPONSE_PRECO || 'Oferecemos empréstimo pessoal de R$ 500 a R$ 50.000 com taxa a partir de 2,5% ao mês. O valor final depende da análise de crédito. Qual valor você precisa?',
        site: process.env.RESPONSE_SITE || 'Você pode acessar nosso site: www.jpfinanceira.com.br ou continuar aqui pelo WhatsApp mesmo! Posso te ajudar agora mesmo 😊',
        teste: process.env.RESPONSE_TESTE || 'Para solicitar seu empréstimo, preciso de algumas informações: nome completo, CPF, valor desejado e prazo de pagamento. Posso te ajudar agora?'
      }
    };

    // ✅ Prioridade 1: Perfil ativo do usuário (chatbot_profiles)
    if (userId) {
      try {
        const active = await getActiveProfile(userId);
        if (active) {
          config = mapProfileRowToConfig(active);
          enabled = active.enable_chatbot !== false;
          await applyConfigToRuntime(config, enabled, userId);
          // Configurar instância WhatsApp do usuário
          const instance = whatsappManager.getInstance(userId);
          instance.setActiveUser(userId);
          instance.setActiveProfileId(active.id);
          // Atualizar estado das automações também
          instance.setAutomationsEnabled(active.enable_automations !== false);
        }
      } catch (e) {
        console.warn('⚠️ Falha ao carregar perfil ativo; caindo para legacy:', e.message || e);
      }
    }

    // Carregar via PostgreSQL direto (método primário)
    try {
      if (config) {
        // Já carregou do perfil ativo
      } else {
      const pgResult = await query(
        'SELECT * FROM configurations ORDER BY created_at DESC LIMIT 1'
      );
      
      if (pgResult.rows.length > 0) {
        const supabaseConfig = pgResult.rows[0];
        // Verificar se é configuração antiga (Top Active WhatsApp) ou vazia
        const isOldConfig = !supabaseConfig.business_name || 
                           supabaseConfig.business_name === 'JT DEV NOCODE' ||
                           supabaseConfig.business_name.trim() === '';
        
        if (isOldConfig) {
          // Usar valores padrão JP Financeira
          config = defaultConfig;
        } else {
          // Usar configuração salva, mas preencher campos vazios com padrões
          config = {
            businessName: supabaseConfig.business_name || defaultConfig.businessName,
            businessDescription: supabaseConfig.business_description || defaultConfig.businessDescription,
            services: supabaseConfig.services && supabaseConfig.services.length > 0 
              ? supabaseConfig.services 
              : (supabaseConfig.business_services ? supabaseConfig.business_services.split(',').map(s => s.trim()) : defaultConfig.services),
            tone: supabaseConfig.tone || defaultConfig.tone,
            model: supabaseConfig.model || defaultConfig.model,
            temperature: supabaseConfig.temperature !== undefined ? supabaseConfig.temperature : defaultConfig.temperature,
            maxTokens: supabaseConfig.max_tokens || defaultConfig.maxTokens,
            // IMPORTANTE: Usar exatamente o que está salvo (sem fallback para padrão)
            specialInstructions: (supabaseConfig.special_instructions !== null && supabaseConfig.special_instructions !== undefined) 
              ? supabaseConfig.special_instructions 
              : ((supabaseConfig.custom_prompt !== null && supabaseConfig.custom_prompt !== undefined) 
                ? supabaseConfig.custom_prompt 
                : ''),
            greetingMessage: supabaseConfig.greeting_message || defaultConfig.greetingMessage,
            farewellMessage: supabaseConfig.farewell_message || defaultConfig.farewellMessage,
            defaultResponses: {
              ...defaultConfig.defaultResponses,
              ...(typeof supabaseConfig.default_responses === 'string' 
                ? JSON.parse(supabaseConfig.default_responses || '{}')
                : (supabaseConfig.default_responses || {}))
            }
          };
        }
        enabled = supabaseConfig.enable_chatbot !== false;
        
        // Atualizar chatbot em memória também
        await applyConfigToRuntime(config, enabled, userId);
      }
      }
    } catch (pgError) {
      console.error('❌ Erro ao carregar configuração via PostgreSQL:', pgError);
      // Continuar com valores padrão se falhar
    }
    
    // Fallback: carregar da memória se não tiver no banco
    if (!config) {
      // Buscar config da instância WhatsApp do usuário
      const instance = whatsappManager.getInstance(userId);
      if (instance && instance.chatbot) {
        config = instance.chatbot.getConfig();
        enabled = instance.chatbotEnabled;
      }
    }
    
    // Se ainda não tiver config, usar valores padrão
    if (!config || !config.businessName || config.businessName === 'JT DEV NOCODE') {
      config = defaultConfig;
      enabled = !!process.env.OPENAI_API_KEY;
    }

    res.json({
      success: true,
      config: config,
      enabled: enabled
    });
  } catch (error) {
    next(error);
  }
};

const updateConfig = async (req, res, next) => {
  try {
    const {
      businessName,
      businessDescription,
      services,
      tone,
      model,
      temperature,
      maxTokens,
      defaultResponses,
      specialInstructions,
      greetingMessage,
      farewellMessage
    } = req.body;

    const newConfig = {
      businessName,
      businessDescription,
      services: Array.isArray(services) ? services : services?.split(',').map(s => s.trim()).filter(s => s),
      tone,
      model,
      temperature: temperature ? parseFloat(temperature) : undefined,
      maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
      defaultResponses,
      specialInstructions,
      greetingMessage,
      farewellMessage
    };

    // Remover campos undefined
    Object.keys(newConfig).forEach(key => {
      if (newConfig[key] === undefined) {
        delete newConfig[key];
      }
    });

    const userId = req.user?.id;

    // ✅ Prioridade 1: Atualizar perfil ativo do usuário (se existir)
    if (userId) {
      try {
        const active = await getActiveProfile(userId);
        if (active) {
          const profileUpdate = {
            business_name: newConfig.businessName ?? null,
            business_description: newConfig.businessDescription ?? null,
            services: Array.isArray(newConfig.services) ? newConfig.services : null,
            tone: newConfig.tone ?? null,
            model: newConfig.model ?? null,
            temperature: newConfig.temperature !== undefined ? newConfig.temperature : null,
            max_tokens: newConfig.maxTokens !== undefined ? newConfig.maxTokens : null,
            special_instructions: newConfig.specialInstructions ?? null,
            greeting_message: newConfig.greetingMessage ?? null,
            farewell_message: newConfig.farewellMessage ?? null,
            default_responses: (newConfig.defaultResponses && typeof newConfig.defaultResponses === 'object')
              ? newConfig.defaultResponses
              : null
          };

          await query(
            `UPDATE chatbot_profiles SET
              business_name = $1,
              business_description = $2,
              services = $3,
              tone = $4,
              model = $5,
              temperature = $6,
              max_tokens = $7,
              special_instructions = $8,
              greeting_message = $9,
              farewell_message = $10,
              default_responses = $11,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = $12 AND user_id = $13`,
            [
              profileUpdate.business_name,
              profileUpdate.business_description,
              profileUpdate.services,
              profileUpdate.tone,
              profileUpdate.model,
              profileUpdate.temperature,
              profileUpdate.max_tokens,
              profileUpdate.special_instructions,
              profileUpdate.greeting_message,
              profileUpdate.farewell_message,
              profileUpdate.default_responses,
              active.id,
              userId
            ]
          );

          // Atualizar em memória também
          await applyConfigToRuntime(newConfig, enabled, userId);

          return res.json({
            success: true,
            message: 'Perfil ativo atualizado com sucesso',
            config: newConfig
          });
        }
      } catch (e) {
        console.warn('⚠️ Falha ao atualizar perfil ativo; tentando legacy:', e.message || e);
      }
    }

    // Salvar via PostgreSQL direto (método primário para evitar problemas de permissão)
    try {
      // Debug: Log do que está sendo recebido
      console.log('📥 Dados recebidos para salvar:');
      console.log('  - businessName:', newConfig.businessName ? 'OK' : 'undefined');
      console.log('  - businessDescription:', newConfig.businessDescription ? 'OK' : 'undefined');
      console.log('  - specialInstructions:', newConfig.specialInstructions ? `OK (${newConfig.specialInstructions.length} chars)` : 'undefined');
      console.log('  - greetingMessage:', newConfig.greetingMessage ? 'OK' : 'undefined');
      console.log('  - farewellMessage:', newConfig.farewellMessage ? 'OK' : 'undefined');
      console.log('  - tone:', newConfig.tone ? newConfig.tone : 'undefined');
      console.log('  - model:', newConfig.model ? newConfig.model : 'undefined');
      console.log('  - temperature:', newConfig.temperature !== undefined ? newConfig.temperature : 'undefined');
      console.log('  - maxTokens:', newConfig.maxTokens !== undefined ? newConfig.maxTokens : 'undefined');
      console.log('  - defaultResponses:', newConfig.defaultResponses ? 'OK' : 'undefined');

      const configData = {
        business_name: newConfig.businessName || null,
        business_description: newConfig.businessDescription || null,
        services: Array.isArray(newConfig.services) ? newConfig.services : (newConfig.services ? newConfig.services.split(',') : []),
        business_services: Array.isArray(newConfig.services) ? newConfig.services.join(', ') : (newConfig.services || null),
        tone: newConfig.tone || null,
        model: newConfig.model || null,
        temperature: newConfig.temperature !== undefined ? newConfig.temperature : null,
        max_tokens: newConfig.maxTokens !== undefined ? newConfig.maxTokens : null,
        special_instructions: newConfig.specialInstructions || null,
        custom_prompt: newConfig.specialInstructions || null,
        greeting_message: newConfig.greetingMessage || null,
        farewell_message: newConfig.farewellMessage || null,
        default_responses: newConfig.defaultResponses ? JSON.stringify(newConfig.defaultResponses) : null
      };
      
      // NÃO remover campos - sempre incluir todos, mesmo que sejam null
      // Isso garante que campos vazios sejam atualizados no banco
      
      // Verificar se já existe configuração
      const existingResult = await query(
        'SELECT id FROM configurations ORDER BY created_at DESC LIMIT 1'
      );
      
      if (existingResult.rows.length > 0) {
        // UPDATE - Lista fixa de TODOS os campos (garante que todos sejam atualizados)
        const fieldsToUpdate = [
          'business_name', 'business_description', 'services', 'business_services',
          'tone', 'model', 'temperature', 'max_tokens',
          'special_instructions', 'custom_prompt',
          'greeting_message', 'farewell_message', 'default_responses'
        ];
        
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        
        fieldsToUpdate.forEach(key => {
          updateFields.push(`${key} = $${paramCount++}`);
          values.push(configData[key]);
        });
        
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(existingResult.rows[0].id);
        
        await query(
          `UPDATE configurations SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          values
        );
        console.log('✅ Configuração salva via PostgreSQL (UPDATE)');
        console.log('📝 Campos atualizados:', fieldsToUpdate.length);
        console.log('📝 special_instructions:', configData.special_instructions ? `${configData.special_instructions.length} chars` : 'null');
      } else {
        // INSERT - Lista fixa de TODOS os campos
        const fieldsToInsert = [
          'business_name', 'business_description', 'services', 'business_services',
          'tone', 'model', 'temperature', 'max_tokens',
          'special_instructions', 'custom_prompt',
          'greeting_message', 'farewell_message', 'default_responses'
        ];
        
        const insertValues = fieldsToInsert.map(k => configData[k]);
        const placeholders = fieldsToInsert.map((_, i) => `$${i + 1}`).join(', ');
        
        await query(
          `INSERT INTO configurations (${fieldsToInsert.join(', ')}, created_at, updated_at) 
           VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          insertValues
        );
        console.log('✅ Configuração salva via PostgreSQL (INSERT)');
        console.log('📝 Campos inseridos:', fieldsToInsert.length);
      }
    } catch (pgError) {
      console.error('❌ Erro ao salvar via PostgreSQL:', pgError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar configuração: ' + (pgError.message || 'Erro desconhecido'),
        error: process.env.NODE_ENV === 'development' ? pgError : undefined
      });
    }

    // Atualizar em memória também
    await applyConfigToRuntime(newConfig, enabled, userId);

    res.json({
      success: true,
      message: 'Configuração do chatbot atualizada com sucesso',
      config: newConfig
    });
  } catch (error) {
    next(error);
  }
};

const toggleChatbot = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const userId = req.user?.id;

    // Se houver perfil ativo do usuário, salvar nele
    if (userId) {
      try {
        const active = await getActiveProfile(userId);
        if (active) {
          await query(
            `UPDATE chatbot_profiles SET enable_chatbot = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3`,
            [!!enabled, active.id, userId]
          );
        }
      } catch (e) {
        console.warn('⚠️ Falha ao salvar enable_chatbot no perfil; seguindo:', e.message || e);
      }
    }

    // Salvar status no Supabase
    if (isConfigured) {
      const { error: supabaseError } = await db.saveChatbotConfig({
        enable_chatbot: enabled
      });
      if (supabaseError) {
        console.error('Erro ao salvar status no Supabase:', supabaseError);
        // Continuar mesmo se falhar no Supabase
      } else {
        console.log(`✅ Status do chatbot ${enabled ? 'habilitado' : 'desabilitado'} salvo no Supabase`);
      }
    }

    // Atualizar instância WhatsApp do usuário
    const instance = whatsappManager.getInstance(userId);
    instance.chatbotEnabled = enabled;

    res.json({
      success: true,
      message: `Chatbot ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`,
      enabled: enabled
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await ConversationManager.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const conversations = await ConversationManager.getRecentConversations(limit);
    
    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    next(error);
  }
};

const getConversationHistory = async (req, res, next) => {
  try {
    const { phone } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }

    const history = await ConversationManager.getHistory(phone, limit);
    
    res.json({
      success: true,
      history: history
    });
  } catch (error) {
    next(error);
  }
};

const initDefaultConfig = async (req, res, next) => {
  try {
    // Valores padrão do JP Financeira
    const defaultConfig = {
      businessName: process.env.BUSINESS_NAME || 'JP Financeira',
      businessDescription: process.env.BUSINESS_DESCRIPTION || 'Empresa especializada em empréstimo pessoal rápido e seguro. Aprovamos seu crédito em até 24 horas com as melhores taxas do mercado. Atendimento de segunda a sábado, das 8h às 18h.',
      services: process.env.BUSINESS_SERVICES?.split(',').map(s => s.trim()) || ['Empréstimo Pessoal', 'Crédito Rápido', 'Antecipação de Recebíveis', 'Refinanciamento'],
      tone: process.env.BUSINESS_TONE || 'amigavel',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '350'),
      specialInstructions: process.env.BUSINESS_INSTRUCTIONS || 'Sempre coletar nome completo, CPF, valor desejado e prazo antes de prosseguir. Informar valores e taxas quando solicitado. Ser claro sobre documentação necessária. NUNCA prometer aprovação garantida. Atendimento apenas Segunda a Sábado, 8h-18h.',
      greetingMessage: 'Olá! 👋 Como posso te ajudar hoje?',
      farewellMessage: 'Foi um prazer te atender! 💙 Se precisar de mais alguma coisa sobre empréstimo pessoal, estou aqui! Tenha um ótimo dia!',
      defaultResponses: {
        preco: 'Oferecemos empréstimo pessoal de R$ 500 a R$ 50.000 com taxa a partir de 2,5% ao mês. O valor final depende da análise de crédito. Qual valor você precisa?',
        site: 'Você pode acessar nosso site: www.jpfinanceira.com.br ou continuar aqui pelo WhatsApp mesmo! Posso te ajudar agora mesmo 😊',
        teste: 'Para solicitar seu empréstimo, preciso de algumas informações: nome completo, CPF, valor desejado e prazo de pagamento. Posso te ajudar agora?'
      }
    };

    // Usar updateConfig logic diretamente
    req.body = defaultConfig;
    await updateConfig(req, res, next);
  } catch (error) {
    next(error);
  }
};

// =========================
// Templates / Perfis
// =========================
const listTemplates = async (req, res, next) => {
  try {
    let result = await query(
      `SELECT template_key, name, description, config
       FROM chatbot_templates
       ORDER BY name ASC`
    );
    
    // Se a tabela estiver vazia, popular com os templates padrão
    if (result.rows.length === 0) {
      console.log('📋 Tabela chatbot_templates vazia, populando templates padrão...');
      await query(`
        INSERT INTO chatbot_templates (template_key, name, description, config)
        VALUES
          (
            'barbearia',
            'Barbearia',
            'Agendamento de corte/barba com coleta de nome, serviço, dia e horário.',
            jsonb_build_object(
              'businessName', 'Barbearia Raimundo',
              'businessDescription', 'Barbearia com atendimento por agendamento.',
              'services', jsonb_build_array('Corte', 'Barba', 'Corte + Barba'),
              'tone', 'amigavel',
              'model', 'gpt-4o-mini',
              'temperature', 0.7,
              'maxTokens', 350,
              'promptOnlyMode', true,
              'specialInstructions', 'Você é o assistente virtual oficial da barbearia \"{{NOME_FANTASIA}}\", especializado em atendimento e agendamento.\n\nDADOS FIXOS:\n- Endereço: {{ENDERECO}}\n- Horário de funcionamento: {{HORARIO_FUNCIONAMENTO}}\n- Política de cancelamento: {{POLITICA_CANCELAMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n\nOBJETIVO: transformar conversas em agendamentos confirmados.\n\nREGRAS: (1) sempre conduza para agendamento, (2) finalize com UMA pergunta objetiva (CTA), (3) não invente horários; se houver agenda, valide disponibilidade e, se indisponível, ofereça 3 opções e peça 1/2/3, (4) se pedir "o mais cedo possível", ofereça o primeiro horário, (5) não responda grupos.\n\nCOLETAR: nome, serviço, dia/horário, profissional (opcional).\n\nCONFIRMAÇÃO: repita serviço + data/hora + nome antes de confirmar.\n',
              'greetingMessage', 'Olá! Vou te ajudar a agendar seu horário. Qual seu nome completo?',
              'farewellMessage', 'Agendamento confirmado. Quer marcar outro horário?',
              'defaultResponses', jsonb_build_object(
                'preco', 'Corte e barba têm valores a partir de R$ X (varia por serviço). Quer agendar para qual dia e horário?',
                'endereco', 'Estamos em [ENDEREÇO]. Quer agendar para qual dia e horário?',
                'horario', 'Atendemos por agendamento. Quer agendar para qual dia e horário?'
              ),
              'templateVariables', jsonb_build_object(
                'NOME_FANTASIA', 'Barbearia Raimundo',
                'ENDERECO', '',
                'HORARIO_FUNCIONAMENTO', '',
                'POLITICA_CANCELAMENTO', 'Cancelamentos com pelo menos 2 horas de antecedência.',
                'LINK_PRINCIPAL', ''
              )
            )
          ),
          (
            'manicure',
            'Manicure',
            'Agendamento de manicure/pedicure, confirmação de preferência e horário.',
            jsonb_build_object(
              'businessName', 'Manicure',
              'businessDescription', 'Atendimento por agendamento de manicure/pedicure.',
              'services', jsonb_build_array('Manicure', 'Pedicure', 'Manicure + Pedicure', 'Alongamento'),
              'tone', 'amigavel',
              'model', 'gpt-4o-mini',
              'temperature', 0.7,
              'maxTokens', 350,
              'promptOnlyMode', true,
              'specialInstructions', 'Você é o assistente virtual do salão \"{{NOME_FANTASIA}}\", focado em atendimento e agendamento.\n\nDADOS FIXOS:\n- Endereço: {{ENDERECO}}\n- Horário de funcionamento: {{HORARIO_FUNCIONAMENTO}}\n- Política de cancelamento: {{POLITICA_CANCELAMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n\nREGRAS: (1) conduza para agendamento, (2) finalize com UMA pergunta objetiva, (3) não invente disponibilidade; se houver agenda, valide e, se indisponível, ofereça 3 opções e peça 1/2/3.\n\nCOLETAR: nome, serviço (manicure/pedicure/gel/fibra/manutenção/retirada), data/horário, profissional (opcional), observações (retirada/manutenção, alergias).\n\nCONFIRMAÇÃO: repita serviço + data/hora + nome + observações.\n',
              'greetingMessage', 'Olá! Vou te ajudar a agendar. Qual seu nome completo e qual serviço você deseja?',
              'farewellMessage', 'Agendamento encaminhado! Quer marcar outro horário?',
              'defaultResponses', jsonb_build_object(),
              'templateVariables', jsonb_build_object(
                'NOME_FANTASIA', 'Manicure',
                'ENDERECO', '',
                'HORARIO_FUNCIONAMENTO', '',
                'POLITICA_CANCELAMENTO', 'Cancelamentos com pelo menos 2 horas de antecedência.',
                'LINK_PRINCIPAL', ''
              )
            )
          ),
          (
            'emprestimo',
            'Empréstimo',
            'Funil de empréstimo: nome, CPF, valor, prazo, documentos.',
            jsonb_build_object(
              'businessName', 'JP Financeira',
              'businessDescription', 'Empresa especializada em empréstimo pessoal.',
              'services', jsonb_build_array('Empréstimo Pessoal', 'Crédito Rápido'),
              'tone', 'amigavel',
              'model', 'gpt-4o-mini',
              'temperature', 0.7,
              'maxTokens', 350,
              'promptOnlyMode', true,
              'specialInstructions', 'Você é um assistente virtual de empréstimo pessoal da empresa \"{{NOME_FANTASIA}}\".\n\nDADOS FIXOS:\n- Atendimento: {{HORARIO_ATENDIMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n- Taxa: {{TAXA_MINIMA}}\n- Valores: {{FAIXA_VALORES}}\n- Prazos: {{FAIXA_PRAZOS}}\n\nREGRAS: (1) nunca prometa aprovação garantida, (2) finalize com UMA pergunta objetiva, (3) sempre colete ANTES de prosseguir: nome completo, CPF, valor desejado, prazo em meses, (4) taxas "a partir de" e dependem de análise.\n\nFUNIL: nome → CPF → valor → prazo → documentação.\n\nDOCUMENTOS: RG/CNH, CPF, comprovante renda, comprovante residência, selfie com documento.\n',
              'greetingMessage', 'Olá! Vou te ajudar com o empréstimo. Qual seu nome completo?',
              'farewellMessage', 'Foi um prazer te atender! Quer continuar a simulação?',
              'defaultResponses', jsonb_build_object(),
              'templateVariables', jsonb_build_object(
                'NOME_FANTASIA', 'JP Financeira',
                'HORARIO_ATENDIMENTO', 'Segunda a Sábado, 8h-18h',
                'LINK_PRINCIPAL', '',
                'TAXA_MINIMA', 'a partir de 2,5% ao mês',
                'FAIXA_VALORES', 'R$ 500 a R$ 50.000',
                'FAIXA_PRAZOS', '6 a 48 meses'
              )
            )
          ),
          (
            'clinica',
            'Clínica',
            'Triagem e agendamento de consulta: especialidade, sintomas, convênio, data/horário.',
            jsonb_build_object(
              'businessName', 'Clínica',
              'businessDescription', 'Atendimento por agendamento de consultas.',
              'services', jsonb_build_array('Consulta', 'Retorno', 'Exames'),
              'tone', 'formal',
              'model', 'gpt-4o-mini',
              'temperature', 0.4,
              'maxTokens', 350,
              'promptOnlyMode', true,
              'specialInstructions', 'Você é o assistente virtual da clínica \"{{NOME_FANTASIA}}\".\n\nDADOS FIXOS:\n- Endereço: {{ENDERECO}}\n- Horário de atendimento: {{HORARIO_ATENDIMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n\nREGRAS: (1) não faça diagnóstico, (2) finalize com UMA pergunta objetiva, (3) em urgência, oriente procurar emergência, (4) colete o mínimo necessário.\n\nCOLETAR: nome, especialidade, convênio/particular, preferência de data/horário (e queixa principal em 1 frase, opcional).\n\nCONFIRMAÇÃO: repita especialidade + data/hora + nome + convênio/particular.\n',
              'greetingMessage', 'Olá! Vou te ajudar a agendar. Qual especialidade você procura e qual seu nome completo?',
              'farewellMessage', 'Perfeito! Quer agendar outro atendimento?',
              'defaultResponses', jsonb_build_object(),
              'templateVariables', jsonb_build_object(
                'NOME_FANTASIA', 'Clínica',
                'ENDERECO', '',
                'HORARIO_ATENDIMENTO', '',
                'LINK_PRINCIPAL', ''
              )
            )
          )
        ON CONFLICT (template_key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          config = EXCLUDED.config,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      // Buscar novamente após popular
      result = await query(
        `SELECT template_key, name, description, config
         FROM chatbot_templates
         ORDER BY name ASC`
      );
      console.log(`✅ Templates populados: ${result.rows.length} templates disponíveis`);
    }
    
    res.json({ success: true, templates: result.rows });
  } catch (e) {
    console.error('❌ Erro ao listar templates:', e);
    // Retornar array vazio em caso de erro para não quebrar o frontend
    res.json({ success: true, templates: [] });
  }
};

const getTemplatePrompt = async (req, res, next) => {
  try {
    const { key } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    // Validar template key
    const validKeys = ['barbearia', 'manicure', 'clinica', 'emprestimo'];
    if (!validKeys.includes(key)) {
      return res.status(400).json({ success: false, message: 'Template inválido' });
    }
    
    // Caminho do arquivo de prompt
    const promptPath = path.join(__dirname, '..', 'prompts', `${key}.txt`);
    
    // Ler arquivo
    if (!fs.existsSync(promptPath)) {
      return res.status(404).json({ success: false, message: 'Prompt não encontrado' });
    }
    
    const prompt = fs.readFileSync(promptPath, 'utf8').trim();
    
    res.json({ success: true, prompt });
  } catch (e) {
    next(e);
  }
};

const listProfiles = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const result = await query(
      `SELECT id, template_key, profile_name, is_active, updated_at, created_at,
              business_name, business_description, services, tone, model, temperature, max_tokens,
              special_instructions, greeting_message, farewell_message, default_responses, enable_chatbot
       FROM chatbot_profiles
       WHERE user_id = $1
       ORDER BY is_active DESC, updated_at DESC`,
      [userId]
    );
    res.json({ success: true, profiles: result.rows });
  } catch (e) {
    next(e);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await query(
      `SELECT *
       FROM chatbot_profiles
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Perfil não encontrado' });
    }
    res.json({ success: true, profile: result.rows[0] });
  } catch (e) {
    next(e);
  }
};

const createProfileFromTemplate = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { templateKey, profileName, googleOAuthClientId, googleOAuthClientSecret, googleOAuthRedirectUri, templateVariables } = req.body || {};
    if (!templateKey) {
      return res.status(400).json({ success: false, message: 'templateKey é obrigatório' });
    }

    const tplRes = await query(
      `SELECT template_key, config
       FROM chatbot_templates
       WHERE template_key = $1
       LIMIT 1`,
      [templateKey]
    );
    const tpl = tplRes.rows[0];
    if (!tpl) {
      return res.status(404).json({ success: false, message: 'Template não encontrado' });
    }

    const cfg = tpl.config || {};
    const services = Array.isArray(cfg.services) ? cfg.services : (Array.isArray(cfg.services?.value) ? cfg.services.value : []);
    const tplVars = (templateVariables && typeof templateVariables === 'object' && !Array.isArray(templateVariables))
      ? templateVariables
      : (cfg.templateVariables && typeof cfg.templateVariables === 'object' && !Array.isArray(cfg.templateVariables) ? cfg.templateVariables : {});
    const promptOnlyMode = (req.body && typeof req.body.promptOnlyMode === 'boolean')
      ? !!req.body.promptOnlyMode
      : (typeof cfg.promptOnlyMode === 'boolean' ? !!cfg.promptOnlyMode : true);

    const hasGoogleSecret = googleOAuthClientSecret && String(googleOAuthClientSecret).trim();
    if (hasGoogleSecret && (!process.env.ENCRYPTION_KEY || !String(process.env.ENCRYPTION_KEY).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Defina ENCRYPTION_KEY no .env antes de salvar credenciais do Google'
      });
    }

    const insertRes = await query(
      `INSERT INTO chatbot_profiles (
        user_id, template_key, profile_name, is_active,
        business_name, business_description, services, tone, model, temperature, max_tokens,
        special_instructions, greeting_message, farewell_message, default_responses, enable_chatbot,
        google_oauth_client_id, google_oauth_client_secret_encrypted, google_oauth_redirect_uri,
        template_variables,
        prompt_only_mode,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, false,
        $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, true,
        $15, $16, $17,
        $18,
        $19,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id`,
      [
        userId,
        tpl.template_key,
        String(profileName || cfg.businessName || tpl.template_key),
        cfg.businessName || null,
        cfg.businessDescription || null,
        services,
        cfg.tone || 'amigavel',
        cfg.model || 'gpt-4o-mini',
        cfg.temperature !== undefined ? cfg.temperature : 0.7,
        cfg.maxTokens !== undefined ? cfg.maxTokens : 300,
        cfg.specialInstructions || null,
        cfg.greetingMessage || null,
        cfg.farewellMessage || null,
        cfg.defaultResponses || {},
        googleOAuthClientId ? String(googleOAuthClientId) : null,
        hasGoogleSecret ? encrypt(String(googleOAuthClientSecret).trim()) : null,
        googleOAuthRedirectUri ? String(googleOAuthRedirectUri) : null,
        tplVars,
        promptOnlyMode
      ]
    );

    res.json({ success: true, id: insertRes.rows[0]?.id });
  } catch (e) {
    next(e);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const body = req.body || {};

    const hasGoogleSecret = body.googleOAuthClientSecret && String(body.googleOAuthClientSecret).trim();
    if (hasGoogleSecret && (!process.env.ENCRYPTION_KEY || !String(process.env.ENCRYPTION_KEY).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Defina ENCRYPTION_KEY no .env antes de salvar credenciais do Google'
      });
    }

    const result = await query(
      `UPDATE chatbot_profiles SET
        profile_name = COALESCE($1, profile_name),
        business_name = $2,
        business_description = $3,
        services = $4,
        tone = $5,
        model = $6,
        temperature = $7,
        max_tokens = $8,
        special_instructions = $9,
        greeting_message = $10,
        farewell_message = $11,
        default_responses = $12,
        enable_chatbot = $13,
        google_oauth_client_id = COALESCE($16, google_oauth_client_id),
        google_oauth_client_secret_encrypted = COALESCE($17, google_oauth_client_secret_encrypted),
        google_oauth_redirect_uri = COALESCE($18, google_oauth_redirect_uri),
        template_variables = COALESCE($19, template_variables),
        prompt_only_mode = COALESCE($20, prompt_only_mode),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND user_id = $15
       RETURNING *`,
      [
        body.profileName ?? null,
        body.businessName ?? null,
        body.businessDescription ?? null,
        Array.isArray(body.services) ? body.services : (body.services ? String(body.services).split(',').map(s => s.trim()).filter(Boolean) : null),
        body.tone ?? null,
        body.model ?? null,
        body.temperature !== undefined ? Number(body.temperature) : null,
        body.maxTokens !== undefined ? Number(body.maxTokens) : null,
        body.specialInstructions ?? null,
        body.greetingMessage ?? null,
        body.farewellMessage ?? null,
        body.defaultResponses && typeof body.defaultResponses === 'object' ? body.defaultResponses : null,
        body.enabled !== undefined ? !!body.enabled : (body.enable_chatbot !== undefined ? !!body.enable_chatbot : true),
        id,
        userId,
        body.googleOAuthClientId ?? null,
        hasGoogleSecret ? encrypt(String(body.googleOAuthClientSecret).trim()) : null,
        body.googleOAuthRedirectUri ?? null,
        (body.templateVariables && typeof body.templateVariables === 'object' && !Array.isArray(body.templateVariables)) ? body.templateVariables : null,
        (body.promptOnlyMode !== undefined && body.promptOnlyMode !== null) ? !!body.promptOnlyMode : null
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Perfil não encontrado' });
    }

    // Se for o perfil ativo, aplicar no runtime
    if (result.rows[0].is_active) {
      const cfg = mapProfileRowToConfig(result.rows[0]);
      await applyConfigToRuntime(cfg, result.rows[0].enable_chatbot !== false, userId);
      const instance = whatsappManager.getInstance(userId);
      instance.setActiveUser(userId);
      instance.setActiveProfileId(result.rows[0].id);
      instance.setAutomationsEnabled(result.rows[0].enable_automations !== false);
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (e) {
    next(e);
  }
};

const activateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Transação: desativa outros e ativa este
    await query('BEGIN');
    await query(
      `UPDATE chatbot_profiles SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    const actRes = await query(
      `UPDATE chatbot_profiles SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    await query('COMMIT');

    const profile = actRes.rows[0];
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Perfil não encontrado' });
    }

    const cfg = mapProfileRowToConfig(profile);
    await applyConfigToRuntime(cfg, profile.enable_chatbot !== false, userId);
    const instance = whatsappManager.getInstance(userId);
    instance.setActiveUser(userId);
    instance.setActiveProfileId(profile.id);
    instance.setAutomationsEnabled(profile.enable_automations !== false);

    res.json({ success: true, message: 'Perfil ativado', profileId: profile.id });
  } catch (e) {
    try { await query('ROLLBACK'); } catch {}
    next(e);
  }
};

// Função auxiliar para carregar prompt do template
function loadTemplatePromptFile(templateKey) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const validKeys = ['barbearia', 'manicure', 'clinica', 'emprestimo'];
    if (!validKeys.includes(templateKey)) {
      return null;
    }
    
    const promptPath = path.join(__dirname, '..', 'prompts', `${templateKey}.txt`);
    
    if (!fs.existsSync(promptPath)) {
      return null;
    }
    
    return fs.readFileSync(promptPath, 'utf8').trim();
  } catch (e) {
    console.warn(`⚠️ Erro ao carregar prompt do template ${templateKey}:`, e.message);
    return null;
  }
}

// Salvar ou criar perfil automaticamente baseado no template
const saveOrCreateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { templateKey, specialInstructions, promptOnlyMode, model, temperature, maxTokens, servicesConfig, businessHours } = req.body || {};

    if (!templateKey) {
      return res.status(400).json({ success: false, message: 'templateKey é obrigatório' });
    }

    // Verificar se existe perfil ativo
    const active = await getActiveProfile(userId);
    
    let profileId;
    let finalSpecialInstructions = specialInstructions;
    
    // Se specialInstructions está vazio/null e está criando novo perfil, carregar do template
    if (!active && (!finalSpecialInstructions || !finalSpecialInstructions.trim())) {
      const templatePrompt = loadTemplatePromptFile(templateKey);
      if (templatePrompt) {
        finalSpecialInstructions = templatePrompt;
      }
    }
    
    if (active) {
      // Carregar template para obter business_name, business_description, services
      const tplRes = await query(
        `SELECT template_key, config
         FROM chatbot_templates
         WHERE template_key = $1
         LIMIT 1`,
        [templateKey]
      );
      const tpl = tplRes.rows[0];
      const cfg = tpl?.config || {};
      
      // Atualizar perfil existente (incluindo business_name, business_description, services, greeting_message, farewell_message do template)
      const result = await query(
        `UPDATE chatbot_profiles SET
          template_key = $1,
          business_name = COALESCE($2, business_name),
          business_description = COALESCE($3, business_description),
          services = COALESCE($4, services),
          greeting_message = COALESCE($5, greeting_message),
          farewell_message = COALESCE($6, farewell_message),
          special_instructions = COALESCE(NULLIF($7, ''), special_instructions),
          prompt_only_mode = COALESCE($8, prompt_only_mode),
          model = COALESCE($9, model),
          temperature = COALESCE($10, temperature),
          max_tokens = COALESCE($11, max_tokens),
          services_config = COALESCE($12, services_config),
          business_hours = COALESCE($13, business_hours),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $14 AND user_id = $15
         RETURNING id`,
        [
          templateKey,
          cfg.businessName || null,
          cfg.businessDescription || null,
          cfg.services ? (Array.isArray(cfg.services) ? cfg.services : [cfg.services]) : null,
          cfg.greetingMessage || null,
          cfg.farewellMessage || null,
          finalSpecialInstructions?.trim() || null,
          promptOnlyMode !== undefined ? !!promptOnlyMode : null,
          model ?? null,
          temperature !== undefined ? Number(temperature) : null,
          maxTokens !== undefined ? Number(maxTokens) : null,
          servicesConfig ? JSON.stringify(servicesConfig) : null,
          businessHours ? JSON.stringify(businessHours) : null,
          active.id,
          userId
        ]
      );
      profileId = result.rows[0]?.id || active.id;
    } else {
      // Criar novo perfil baseado no template
      const tplRes = await query(
        `SELECT template_key, config
         FROM chatbot_templates
         WHERE template_key = $1
         LIMIT 1`,
        [templateKey]
      );
      const tpl = tplRes.rows[0];
      if (!tpl) {
        return res.status(404).json({ success: false, message: 'Template não encontrado' });
      }

      const cfg = tpl.config || {};
      const insertRes = await query(
        `INSERT INTO chatbot_profiles (
          user_id, template_key, profile_name, is_active,
          special_instructions, model, temperature, max_tokens, prompt_only_mode,
          services_config, business_hours,
          enable_chatbot, created_at, updated_at
        ) VALUES (
          $1, $2, $3, true,
          $4, $5, $6, $7, $8,
          $9, $10,
          true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id`,
        [
          userId,
          templateKey,
          cfg.businessName || templateKey,
          finalSpecialInstructions?.trim() || null,
          model ?? (cfg.model || 'gpt-4o-mini'),
          temperature !== undefined ? Number(temperature) : (cfg.temperature ?? 0.7),
          maxTokens !== undefined ? Number(maxTokens) : (cfg.maxTokens ?? 300),
          promptOnlyMode !== undefined ? !!promptOnlyMode : (typeof cfg.promptOnlyMode === 'boolean' ? cfg.promptOnlyMode : true),
          servicesConfig ? JSON.stringify(servicesConfig) : null,
          businessHours ? JSON.stringify(businessHours) : null
        ]
      );
      profileId = insertRes.rows[0]?.id;
    }

    // Sempre ativar (desativar outros primeiro)
    await query('BEGIN');
    await query(
      `UPDATE chatbot_profiles SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_active = true AND id != $2`,
      [userId, profileId]
    );
    await query(
      `UPDATE chatbot_profiles SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [profileId, userId]
    );
    await query('COMMIT');

    // Carregar perfil completo e aplicar no runtime
    const finalRes = await query(
      `SELECT * FROM chatbot_profiles WHERE id = $1 AND user_id = $2`,
      [profileId, userId]
    );
    const profile = finalRes.rows[0];
    if (profile) {
      const cfg = mapProfileRowToConfig(profile);
      await applyConfigToRuntime(cfg, profile.enable_chatbot !== false, userId);
      const instance = whatsappManager.getInstance(userId);
      instance.setActiveUser(userId);
      instance.setActiveProfileId(profile.id);
      instance.setAutomationsEnabled(profile.enable_automations !== false);
    }

    res.json({ success: true, profileId });
  } catch (e) {
    try { await query('ROLLBACK'); } catch {}
    next(e);
  }
};

module.exports = {
  getConfig,
  updateConfig,
  toggleChatbot,
  getStats,
  getConversations,
  getConversationHistory,
  initDefaultConfig,
  listTemplates,
  getTemplatePrompt,
  listProfiles,
  getProfile,
  createProfileFromTemplate,
  updateProfile,
  activateProfile,
  saveOrCreateProfile
};
