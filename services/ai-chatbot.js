const OpenAI = require('openai');
const axios = require('axios');

class AIChatbot {
  constructor(config = {}) {
    // Configurações do GPT com variáveis de ambiente
    const GPT_CONFIG = {
      businessName: process.env.BUSINESS_NAME || 'JT DEV NOCODE',
      services: process.env.SERVICES?.split(',') || ['Automação WhatsApp', 'Chatbot IA', 'CRM Integrado'],
      tone: process.env.TONE || 'amigavel',
      instructions: process.env.GPT_INSTRUCTIONS || 'Sempre coletar nome. Terminar com CTA. Não responder grupos.',
      businessDescription: process.env.BUSINESS_DESCRIPTION || 'Solução completa de automação WhatsApp com IA'
    };

    this.config = {
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 300,
      businessName: config.businessName || GPT_CONFIG.businessName,
      businessDescription: config.businessDescription || GPT_CONFIG.businessDescription,
      services: config.services || GPT_CONFIG.services,
      tone: config.tone || GPT_CONFIG.tone,
      instructions: config.instructions || GPT_CONFIG.instructions,
      specialInstructions: config.specialInstructions || config.instructions || GPT_CONFIG.instructions,
      templateVariables: config.templateVariables || {},
      promptOnlyMode: config.promptOnlyMode !== undefined ? !!config.promptOnlyMode : false,
      defaultResponses: config.defaultResponses || {},
      greetingMessage: config.greetingMessage || 'Olá! Como posso ajudar você hoje?',
      farewellMessage: config.farewellMessage || 'Obrigado pelo contato! Até logo!'
    };

    // Normalizar tipos (evita cair em fallback por erro de tipo, ex: services string)
    this.config = { ...this.config, ...this.normalizeConfig({ ...this.config }) };

    // Detectar qual API usar (OpenAI)
    this.apiProvider = 'none';
    this.openai = null;

    // Usar API key do config (do usuário) ou fallback para variável de ambiente
    const openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    
    console.log(`🔍 [AIChatbot] Constructor - Verificando API key:`, {
      hasConfigKey: !!config.openaiApiKey,
      configKeyType: typeof config.openaiApiKey,
      configKeyLength: config.openaiApiKey?.length,
      hasEnvKey: !!process.env.OPENAI_API_KEY,
      hasFinalKey: !!openaiApiKey,
      finalKeyType: typeof openaiApiKey,
      finalKeyLength: openaiApiKey?.length,
      finalKeyIsEmpty: openaiApiKey === '',
      finalKeyIsNull: openaiApiKey === null,
      finalKeyIsUndefined: openaiApiKey === undefined
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:40',message:'AIChatbot constructor - verificando API key',data:{hasConfigKey:!!config.openaiApiKey,hasEnvKey:!!process.env.OPENAI_API_KEY,hasFinalKey:!!openaiApiKey,keyLength:openaiApiKey?.length,keyType:typeof openaiApiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    // Inicializar OpenAI (se configurado)
    if (openaiApiKey) {
      try {
        this.openai = new OpenAI({
          apiKey: openaiApiKey
        });
        this.apiProvider = 'openai';
        console.log('✅ OpenAI API configurado' + (config.openaiApiKey ? ' (API key do usuário)' : ' (variável de ambiente)'));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:48',message:'OpenAI inicializado com sucesso',data:{apiProvider:this.apiProvider,hasOpenai:!!this.openai},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        console.error('❌ Erro ao inicializar OpenAI:', error.message);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:51',message:'Erro ao inicializar OpenAI',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      }
    }

    if (this.apiProvider === 'none') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:55',message:'apiProvider é none',data:{hasConfigKey:!!config.openaiApiKey,hasEnvKey:!!process.env.OPENAI_API_KEY,hasFinalKey:!!openaiApiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      // Não mostrar aviso se a API key foi passada mas está vazia/null (pode ser carregada depois)
      if (!config.openaiApiKey && !process.env.OPENAI_API_KEY) {
        console.warn('⚠️ Nenhuma API de IA configurada. Chatbot IA não funcionará.');
        console.warn('💡 Configure openaiApiKey no config ou OPENAI_API_KEY no ambiente');
      }
    }
  }

  async generateResponse(userMessage, conversationHistory = []) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:58',message:'generateResponse ENTRY',data:{userMessage:userMessage.substring(0,100),historyLength:conversationHistory.length,apiProvider:this.apiProvider,businessName:this.config.businessName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (this.apiProvider === 'none') {
      const fallbackResponse = this.getFallbackResponse(userMessage, conversationHistory);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:60',message:'generateResponse EXIT (fallback)',data:{response:fallbackResponse.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return fallbackResponse;
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      
      // Debug: Log do prompt sempre (primeiros 500 chars)
      console.log('📝 System Prompt sendo usado:');
      console.log('   - promptOnlyMode:', this.config.promptOnlyMode);
      console.log('   - specialInstructions length:', this.config.specialInstructions?.length || 0);
      console.log('   - prompt preview (500 chars):', systemPrompt.substring(0, 500));
      console.log('   - apiProvider:', this.apiProvider);
      console.log('   - openai configurado:', !!this.openai);

      // OpenAI
      if (this.apiProvider === 'openai' && this.openai) {
        try {
          console.log('🚀 Chamando generateWithOpenAI...');
          const aiResponse = await this.generateWithOpenAI(userMessage, conversationHistory, systemPrompt);
          console.log('✅ Resposta da OpenAI recebida:', aiResponse.substring(0, 100));
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:82',message:'generateResponse EXIT (OpenAI)',data:{response:aiResponse.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          return aiResponse;
        } catch (error) {
          console.error(`❌ Erro ao gerar resposta OpenAI:`, error.message);
          console.error(`❌ Stack:`, error.stack);
          throw error;
        }
      } else {
        console.warn(`⚠️ API não configurada ou OpenAI não disponível. apiProvider: ${this.apiProvider}, openai: ${!!this.openai}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao gerar resposta IA (${this.apiProvider}):`, error);
      console.error('❌ Detalhes do erro:', error.message);
      if (error.response) {
        console.error('❌ Resposta da API:', error.response.status, error.response.data);
      }
      console.warn(`⚠️ API falhou. Usando fallback (getFallbackResponse).`);
      
      // Respostas de fallback baseadas em palavras-chave
      const fallbackResponse = this.getFallbackResponse(userMessage, conversationHistory);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:97',message:'generateResponse EXIT (error fallback)',data:{response:fallbackResponse.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return fallbackResponse;
    }
  }

  async generateWithOpenAI(userMessage, conversationHistory, systemPrompt) {
    // Converter histórico para formato OpenAI
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Adicionar histórico (últimas 10 mensagens) - em ordem cronológica
    const recentHistory = conversationHistory.slice(-10);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:116',message:'generateWithOpenAI HISTORY',data:{historyLength:recentHistory.length,historyPreview:recentHistory.slice(0,3).map(m=>({u:m.user_message?.substring(0,50),a:m.ai_response?.substring(0,50)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    recentHistory.forEach(msg => {
      if (msg.user_message && msg.user_message.trim()) {
        messages.push({ role: 'user', content: msg.user_message.trim() });
      }
      if (msg.ai_response && msg.ai_response.trim()) {
        messages.push({ role: 'assistant', content: msg.ai_response.trim() });
      }
    });

    // Adicionar mensagem atual
    messages.push({ role: 'user', content: userMessage });

    // Garantir que use um modelo OpenAI válido (não aceitar modelos Gemini/Ollama)
    let openaiModel = this.config.model || 'gpt-4o-mini';
    if (openaiModel && (openaiModel.includes('gemini') || openaiModel.includes('ollama') || openaiModel.includes('llama'))) {
      console.log(`⚠️ Modelo ${openaiModel} não é válido para OpenAI. Usando gpt-4o-mini como fallback.`);
      openaiModel = 'gpt-4o-mini'; // Fallback para modelo OpenAI válido
    }
    
    console.log(`🔧 Usando modelo OpenAI: ${openaiModel}`);
    console.log(`   - Temperature: ${this.config.temperature}`);
    console.log(`   - Max tokens: ${this.config.maxTokens}`);
    console.log(`   - Mensagens no histórico: ${messages.length}`);

    const completion = await this.openai.chat.completions.create({
      model: openaiModel,
      messages: messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    });
    
    console.log(`✅ Resposta da API OpenAI recebida (tokens: ${completion.usage?.total_tokens || 'N/A'})`);

    const aiResponse = completion.choices[0]?.message?.content || 
      'Desculpe, não consegui gerar uma resposta. Pode reformular a pergunta?';

    return aiResponse.trim();
  }

  normalizeConfig(partial = {}) {
    const out = { ...partial };

    // services: string -> array
    if (typeof out.services === 'string') {
      out.services = out.services.split(',').map(s => s.trim()).filter(Boolean);
    }

    // temperature / maxTokens: string -> number
    if (typeof out.temperature === 'string') {
      const t = parseFloat(out.temperature);
      out.temperature = Number.isFinite(t) ? t : 0.7;
    }
    if (typeof out.maxTokens === 'string') {
      const m = parseInt(out.maxTokens, 10);
      out.maxTokens = Number.isFinite(m) ? m : 300;
    }

    // defaultResponses: string -> object
    if (typeof out.defaultResponses === 'string') {
      try {
        out.defaultResponses = JSON.parse(out.defaultResponses || '{}');
      } catch {
        out.defaultResponses = {};
      }
    }
    if (!out.defaultResponses || typeof out.defaultResponses !== 'object' || Array.isArray(out.defaultResponses)) {
      out.defaultResponses = {};
    }

    // specialInstructions: garantir string
    if (out.specialInstructions === null || out.specialInstructions === undefined) {
      out.specialInstructions = '';
    } else if (typeof out.specialInstructions !== 'string') {
      out.specialInstructions = String(out.specialInstructions);
    }

    // templateVariables: garantir objeto simples
    if (!out.templateVariables || typeof out.templateVariables !== 'object' || Array.isArray(out.templateVariables)) {
      out.templateVariables = {};
    }

    // promptOnlyMode: garantir boolean
    out.promptOnlyMode = !!out.promptOnlyMode;

    // greeting/farewell: garantir string
    if (out.greetingMessage === null || out.greetingMessage === undefined) out.greetingMessage = '';
    if (out.farewellMessage === null || out.farewellMessage === undefined) out.farewellMessage = '';

    return out;
  }

  renderTemplate(text) {
    const tpl = String(text || '');
    const vars = (this.config.templateVariables && typeof this.config.templateVariables === 'object')
      ? this.config.templateVariables
      : {};

    // placeholders: {{KEY}}
    return tpl.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (_m, keyRaw) => {
      const key = String(keyRaw || '').trim();
      const v = vars[key] ?? vars[key.toUpperCase()] ?? vars[key.toLowerCase()];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
      try { return JSON.stringify(v); } catch { return ''; }
    });
  }

  buildSystemPrompt() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:198',message:'buildSystemPrompt ENTRY',data:{businessName:this.config.businessName,specialInstructionsLength:this.config.specialInstructions?.length,promptOnlyMode:this.config.promptOnlyMode,servicesCount:this.config.services?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    const toneDescription = {
      'formal': 'formal, profissional e respeitoso',
      'informal': 'casual, descontraído e próximo',
      'amigavel': 'amigável, acolhedor e empático',
      'vendedor': 'persuasivo, entusiasta e focado em conversão'
    }[this.config.tone] || 'amigável e profissional';

    // Sempre incluir o contexto da empresa e SEMPRE incluir as instruções especiais (se existirem)
    const customInstructions = (this.config.specialInstructions && this.config.specialInstructions.trim())
      ? this.config.specialInstructions.trim()
      : (this.config.instructions || '').trim();

    const renderedInstructions = this.renderTemplate(customInstructions);

    // ✅ Modo Prompt Único: usa o prompt como System Prompt completo (sem pré-texto automático)
    if (this.config.promptOnlyMode && renderedInstructions && renderedInstructions.trim()) {
      const prompt = renderedInstructions.trim();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:215',message:'buildSystemPrompt EXIT (promptOnlyMode)',data:{promptLength:prompt.length,promptPreview:prompt.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return prompt;
    }

    const servicesText = Array.isArray(this.config.services) ? this.config.services.join(', ') : String(this.config.services || '');

    const prompt = `
Você é o atendente da empresa "${this.config.businessName}".

SOBRE A EMPRESA:
${this.config.businessDescription}

SERVIÇOS/PRODUTOS:
${servicesText}

TOM DE VOZ:
Seja ${toneDescription} em todas as respostas.

REGRAS OBRIGATÓRIAS (SIGA À RISCA):
1. Seja DIRETO e OBJETIVO. NÃO se apresente como "assistente virtual". NÃO use frases como "Sou o assistente virtual da..." ou qualquer variação. NÃO repita palavras ou frases várias vezes.
2. Mantenha o tom ${this.config.tone}
3. Sempre termine com um call-to-action (CTA) quando apropriado
4. Use emojis de forma natural e moderada (máximo 2 por mensagem) 😊👍
5. Se a pergunta não estiver relacionada ao negócio, direcione para contato humano
6. Seja conciso e objetivo (máximo ${this.config.maxTokens} tokens)
7. SEMPRE colete o nome do cliente quando possível
8. NUNCA responda mensagens de grupos
9. Sempre termine com uma proposta de valor ou próximo passo
10. Responda sempre em português brasileiro
11. NÃO repita a mesma palavra ou frase - seja direto e objetivo

    ${renderedInstructions ? `INSTRUÇÕES ESPECIAIS (OBRIGATÓRIO SEGUIR):
    ${renderedInstructions}
` : ''}

${Object.keys(this.config.defaultResponses).length > 0 ? 
  `RESPOSTAS PADRÃO PARA CONTEXTO:
${Object.entries(this.config.defaultResponses).map(([key, value]) => 
  `- Se perguntarem sobre "${key}": ${value}`
).join('\n')}\n` : ''}

MENSAGENS:
- Saudação padrão: "${this.config.greetingMessage}"
- Despedida padrão: "${this.config.farewellMessage}"

IMPORTANTE: Mantenha o contexto da conversa anterior. Seja natural e humano.
    `.trim();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:267',message:'buildSystemPrompt EXIT (normal)',data:{businessName:this.config.businessName,promptLength:prompt.length,servicesText:servicesText.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return prompt;
  }

  getFallbackResponse(userMessage, conversationHistory = []) {
    const lowerMessage = userMessage.toLowerCase();
    const responses = this.config.defaultResponses || {};
    const company = this.config.businessName || 'Empresa';
    
    // Limpar greetingMessage removendo frase indesejada
    const cleanGreeting = () => {
      let greeting = this.config.greetingMessage || 'Olá! 👋';
      greeting = greeting.replace(/Sou o assistente virtual da[^.!]*[.!]?\s*/gi, '');
      greeting = greeting.replace(/Estou aqui para[^.!]*[.!]?\s*/gi, '');
      return greeting.trim();
    };

    // Usar respostas personalizadas do defaultResponses quando disponíveis
    if (lowerMessage.includes('preco') || lowerMessage.includes('preço') || lowerMessage.includes('quanto') || lowerMessage.includes('valor')) {
      if (responses.preco) return responses.preco;
      if (responses.valor) return responses.valor;
    }

    if (lowerMessage.includes('horario') || lowerMessage.includes('horário') || lowerMessage.includes('funciona') || lowerMessage.includes('aberto')) {
      if (responses.horario) return responses.horario;
      if (responses.funcionamento) return responses.funcionamento;
    }

    if (lowerMessage.includes('endereco') || lowerMessage.includes('endereço') || lowerMessage.includes('local') || lowerMessage.includes('onde')) {
      if (responses.endereco) return responses.endereco;
      if (responses.localizacao) return responses.localizacao;
    }

    if (lowerMessage.includes('contato') || lowerMessage.includes('telefone') || lowerMessage.includes('whatsapp')) {
      if (responses.contato) return responses.contato;
    }

    if (lowerMessage.includes('agendar') || lowerMessage.includes('agendamento') || lowerMessage.includes('marcar') || lowerMessage.includes('horario')) {
      if (responses.agendamento) return responses.agendamento;
    }

    if (lowerMessage.includes('servico') || lowerMessage.includes('serviço') || lowerMessage.includes('oferece') || lowerMessage.includes('faz')) {
      if (responses.servicos) return responses.servicos;
      if (this.config.services && Array.isArray(this.config.services) && this.config.services.length > 0) {
        return `Oferecemos os seguintes serviços:\n\n${this.config.services.map((s, i) => `${i + 1}️⃣ ${s}`).join('\n')}\n\nComo posso ajudar você?`;
      }
    }

    if (lowerMessage.includes('site') || lowerMessage.includes('web') || lowerMessage.includes('instagram') || lowerMessage.includes('facebook')) {
      if (responses.site) return responses.site;
      if (responses.rede_social) return responses.rede_social;
    }

    // Saudação
    if (lowerMessage.includes('ola') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia') || lowerMessage.includes('boa tarde') || lowerMessage.includes('boa noite')) {
      return cleanGreeting();
    }

    // Despedida
    if (lowerMessage.includes('tchau') || lowerMessage.includes('ate logo') || lowerMessage.includes('obrigado') || lowerMessage.includes('obrigada')) {
      return this.config.farewellMessage || 'Obrigado pelo contato! Até logo! 👋';
    }

    // Resposta genérica padrão baseada na configuração
    const servicesText = this.config.services && Array.isArray(this.config.services) && this.config.services.length > 0
      ? `Oferecemos: ${this.config.services.slice(0, 3).join(', ')}${this.config.services.length > 3 ? ' e mais' : ''}.\n\n`
      : '';
    
    return `${cleanGreeting()}\n\n${servicesText}Como posso ajudar você hoje?`;
  }

  updateConfig(newConfig) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:330',message:'updateConfig ENTRY',data:{newBusinessName:newConfig?.businessName,newSpecialInstructionsLength:newConfig?.specialInstructions?.length,currentBusinessName:this.config.businessName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    const normalized = this.normalizeConfig(newConfig || {});
    this.config = { ...this.config, ...normalized };

    // Log detalhado para debug
    console.log('✅ Configuração do chatbot atualizada:', {
      businessName: this.config.businessName,
      model: this.config.model,
      tone: this.config.tone,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      promptOnlyMode: this.config.promptOnlyMode,
      servicesCount: Array.isArray(this.config.services) ? this.config.services.length : null,
      specialInstructionsLength: typeof this.config.specialInstructions === 'string' ? this.config.specialInstructions.length : null,
      specialInstructionsPreview: typeof this.config.specialInstructions === 'string' ? this.config.specialInstructions.substring(0, 200) : null
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-chatbot.js:346',message:'updateConfig EXIT',data:{finalBusinessName:this.config.businessName,finalSpecialInstructionsLength:this.config.specialInstructions?.length,servicesCount:this.config.services?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
  }

  getConfig() {
    return this.config;
  }
}

module.exports = AIChatbot;
