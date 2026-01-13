const OpenAI = require('openai');

class AIChatbot {
  constructor(config = {}) {
    this.config = {
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 300,
      businessName: config.businessName || 'Sua Empresa',
      businessDescription: config.businessDescription || 'Descrição da empresa',
      services: config.services || ['Produto 1', 'Produto 2'],
      tone: config.tone || 'amigavel',
      defaultResponses: config.defaultResponses || {},
      specialInstructions: config.specialInstructions || '',
      greetingMessage: config.greetingMessage || 'Olá! Como posso ajudar você hoje?',
      farewellMessage: config.farewellMessage || 'Obrigado pelo contato! Até logo!'
    };

    // Inicializar OpenAI client
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY não configurada. Chatbot IA não funcionará.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateResponse(userMessage, conversationHistory = []) {
    if (!this.openai) {
      return 'Desculpe, o serviço de IA não está disponível no momento. Por favor, entre em contato com o suporte.';
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      
      // Converter histórico para formato OpenAI
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Adicionar histórico (últimas 10 mensagens) - em ordem cronológica
      const recentHistory = conversationHistory.slice(-10);
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

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      const aiResponse = completion.choices[0]?.message?.content || 
        'Desculpe, não consegui gerar uma resposta. Pode reformular a pergunta?';

      return aiResponse.trim();
    } catch (error) {
      console.error('❌ Erro ao gerar resposta IA:', error);
      
      // Respostas de fallback baseadas em palavras-chave
      return this.getFallbackResponse(userMessage);
    }
  }

  buildSystemPrompt() {
    const toneDescription = {
      'formal': 'formal, profissional e respeitoso',
      'informal': 'casual, descontraído e próximo',
      'amigavel': 'amigável, acolhedor e empático',
      'vendedor': 'persuasivo, entusiasta e focado em conversão'
    }[this.config.tone] || 'amigável e profissional';

    return `
Você é ${this.config.businessName}, um assistente virtual inteligente.

SOBRE A EMPRESA:
${this.config.businessDescription}

SERVIÇOS/PRODUTOS:
${this.config.services.join(', ')}

TOM DE VOZ:
Seja ${toneDescription} em todas as respostas.

REGRAS OBRIGATÓRIAS:
1. SEMPRE mencione o nome da empresa: "${this.config.businessName}"
2. Mantenha o tom ${this.config.tone}
3. Sempre termine com um call-to-action (CTA) quando apropriado
4. Use emojis de forma natural e moderada 😊👍
5. Se a pergunta não estiver relacionada ao negócio, direcione para contato humano
6. Seja conciso e objetivo (máximo ${this.config.maxTokens} tokens)

${this.config.specialInstructions ? `INSTRUÇÕES ESPECIAIS:\n${this.config.specialInstructions}\n` : ''}

${Object.keys(this.config.defaultResponses).length > 0 ? 
  `RESPOSTAS PADRÃO PARA CONTEXTO:\n${Object.entries(this.config.defaultResponses).map(([key, value]) => 
    `- Se perguntarem sobre "${key}": ${value}`
  ).join('\n')}\n` : ''}

MENSAGENS:
- Saudação padrão: "${this.config.greetingMessage}"
- Despedida padrão: "${this.config.farewellMessage}"

IMPORTANTE: Mantenha o contexto da conversa anterior. Seja natural e humano.
    `.trim();
  }

  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Respostas básicas quando IA falha
    if (lowerMessage.includes('preco') || lowerMessage.includes('preço') || lowerMessage.includes('quanto')) {
      return this.config.defaultResponses.preco || 
        `💵 Para informações sobre preços, entre em contato conosco!`;
    }

    if (lowerMessage.includes('site') || lowerMessage.includes('web')) {
      return this.config.defaultResponses.site || 
        `🌐 Visite nosso site para mais informações!`;
    }

    if (lowerMessage.includes('ola') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia')) {
      return this.config.greetingMessage;
    }

    if (lowerMessage.includes('tchau') || lowerMessage.includes('ate logo')) {
      return this.config.farewellMessage;
    }

    return 'Desculpe, estou tendo dificuldades técnicas. Pode reformular a pergunta ou entre em contato com nosso atendimento?';
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Configuração do chatbot atualizada:', this.config);
  }

  getConfig() {
    return this.config;
  }
}

module.exports = AIChatbot;
