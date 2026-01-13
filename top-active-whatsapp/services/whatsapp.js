const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const AIChatbot = require('./ai-chatbot');
const ConversationManager = require('./conversation-manager');
const { exec } = require('child_process');
const path = require('path');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.qrCode = null;
    this.isReady = false;
    this.isAuthenticated = false;
    this.isInitializing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.chatbotEnabled = false;
    this.chatbot = null;
  }

  initChatbot() {
    // Inicializar chatbot com configuração padrão
    try {
      this.chatbot = new AIChatbot({
        businessName: process.env.BUSINESS_NAME || 'Top Active WhatsApp',
        businessDescription: process.env.BUSINESS_DESCRIPTION || 'Automação WhatsApp para empresas',
        services: (process.env.BUSINESS_SERVICES || 'Agendamento,CRM,Chatbot IA,Relatórios').split(',').map(s => s.trim()),
        tone: process.env.BUSINESS_TONE || 'amigavel',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '300'),
        defaultResponses: {
          preco: process.env.RESPONSE_PRECO || 'Planos a partir de R$49/mês!',
          site: process.env.RESPONSE_SITE || 'Acesse: topactive.com.br',
          teste: process.env.RESPONSE_TESTE || 'Teste grátis por 7 dias!'
        },
        specialInstructions: process.env.BUSINESS_INSTRUCTIONS || 'Sempre coletar nome do cliente primeiro'
      });

      this.chatbotEnabled = !!process.env.OPENAI_API_KEY;
      if (this.chatbotEnabled) {
        console.log('✅ Chatbot IA inicializado e pronto!');
      } else {
        console.log('⚠️ Chatbot IA desabilitado (OPENAI_API_KEY não configurada)');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar chatbot:', error);
      this.chatbotEnabled = false;
    }
  }

  async killExistingProcesses() {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        // Windows PowerShell: matar processos Chrome
        exec('powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Get-Process chromium -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"', (error) => {
          // Ignorar erros (processos podem não existir)
          setTimeout(resolve, 2000); // Aguardar 2 segundos para processos encerrarem
        });
      } else {
        // Linux/Mac
        exec('pkill -f "chrome.*wwebjs" || pkill -f "chromium.*wwebjs" || true', (error) => {
          setTimeout(resolve, 2000);
        });
      }
    });
  }

  async initialize() {
    // Evitar múltiplas inicializações simultâneas
    if (this.isInitializing || this.isReady) {
      return;
    }

    this.isInitializing = true;
    this.retryCount++;

    if (this.retryCount > this.maxRetries) {
      console.error(`\n❌ Tentativas máximas de inicialização excedidas (${this.maxRetries})`);
      console.log('💡 Por favor, reinicie o servidor manualmente');
      this.isInitializing = false;
      return;
    }

    try {
      // Na primeira tentativa, limpar processos antigos
      if (this.retryCount === 1) {
        console.log('🧹 Limpando processos anteriores do Chrome...');
        await this.killExistingProcesses();
      }

      console.log(`🔄 Inicializando WhatsApp Web... (tentativa ${this.retryCount}/${this.maxRetries})`);
      
        // Configuração do Puppeteer
        const puppeteerArgs = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--safebrowsing-disable-auto-update'
        ];

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: "top-active-whatsapp",
          dataPath: "./.wwebjs_auth"
        }),
        puppeteer: {
          headless: 'new',
          args: puppeteerArgs
        },
        // Timeout aumentado para inicialização
        authTimeoutMs: 60000,
        qrMaxRetries: 5
      });

      // QR Code
      this.client.on('qr', (qr) => {
        this.qrCode = qr;
        console.log('\n📱 ========================================');
        console.log('📱 WHATSAPP QR CODE - ESCANEIE AGORA:');
        console.log('📱 ========================================\n');
        qrcode.generate(qr, { small: true });
        console.log('\n📱 Abra o WhatsApp no celular → Menu → Dispositivos conectados → Conectar dispositivo\n');
      });

      // Ready
      this.client.on('ready', () => {
        this.isReady = true;
        this.isInitializing = false;
        this.retryCount = 0; // Reset retry count on success
        console.log('\n✅ ========================================');
        console.log('✅ WhatsApp conectado e pronto!');
        console.log('✅ ========================================\n');
        
        // Inicializar chatbot se ainda não foi inicializado
        if (!this.chatbot) {
          this.initChatbot();
        }
        
        // Configurar listener de mensagens após estar pronto
        this.setupMessageListener();
      });

      // Authenticated
      this.client.on('authenticated', () => {
        this.isAuthenticated = true;
        console.log('\n🔐 WhatsApp autenticado com sucesso!\n');
      });

      // Authentication failure
      this.client.on('auth_failure', (msg) => {
        console.error('\n❌ Erro de autenticação WhatsApp:', msg);
        this.isReady = false;
        this.isAuthenticated = false;
      });

      // Disconnected
      this.client.on('disconnected', (reason) => {
        console.log('\n⚠️ WhatsApp desconectado:', reason);
        this.isReady = false;
        this.qrCode = null;
      });

      // Loading screen
      this.client.on('loading_screen', (percent, message) => {
        console.log(`📱 Carregando WhatsApp: ${percent}% - ${message}`);
      });

      // Error handler
      this.client.on('error', (error) => {
        console.error('\n❌ Erro no WhatsApp Client:', error.message);
        this.isReady = false;
      });

      // Initialize with error handling
      this.client.initialize().catch(async (error) => {
        this.isInitializing = false;
        console.error('\n❌ Erro ao inicializar WhatsApp:', error.message);
        
        // Se erro de processo já rodando, tentar matar e reiniciar
        if (error.message.includes('already running') || error.message.includes('browser is already')) {
          console.log('🔧 Detectado processo Chrome em execução. Limpando...');
          await this.killExistingProcesses();
          
          if (this.retryCount < this.maxRetries) {
            const delay = 3000;
            console.log(`💡 Tentando novamente em ${delay/1000} segundos após limpeza...`);
            setTimeout(() => {
              if (!this.isReady && !this.isInitializing) {
                this.initialize();
              }
            }, delay);
            return;
          }
        }

        if (this.retryCount < this.maxRetries) {
          const delay = this.retryCount * 3000; // Delay crescente: 3s, 6s, 9s
          console.log(`💡 Tentando novamente em ${delay/1000} segundos... (${this.retryCount}/${this.maxRetries})`);
          
          setTimeout(() => {
            if (!this.isReady && !this.isInitializing) {
              this.initialize();
            }
          }, delay);
        } else {
          console.error('\n❌ Não foi possível inicializar WhatsApp após múltiplas tentativas');
          console.log('💡 Soluções possíveis:');
          console.log('   1. Feche todos os processos Chrome: taskkill /F /IM chrome.exe');
          console.log('   2. Delete a pasta .wwebjs_auth e tente novamente');
          console.log('   3. Reinicie o servidor: npm run dev');
        }
      });
    } catch (error) {
      this.isInitializing = false;
      console.error('❌ Erro ao criar WhatsApp Client:', error.message);
      console.error('Stack:', error.stack);
      console.log('💡 Verifique se o Chrome/Chromium está instalado');
      
      if (this.retryCount < this.maxRetries) {
        const delay = 5000;
        console.log(`💡 Tentando novamente em ${delay/1000} segundos...`);
        setTimeout(() => {
          if (!this.isReady && !this.isInitializing) {
            this.initialize();
          }
        }, delay);
      }
    }
  }

  async sendMessage(phone, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp não está conectado. Escaneie o QR code primeiro.');
    }

    try {
      // Formatar número: remover caracteres não numéricos e garantir formato correto
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Formatar para padrão WhatsApp: 5511999999999@c.us
      const chatId = cleanPhone.includes('@c.us') 
        ? cleanPhone 
        : `${cleanPhone}@c.us`;

      const msg = await this.client.sendMessage(chatId, message);
      
      return { 
        success: true, 
        id: msg.id.id,
        timestamp: msg.timestamp,
        from: msg.from,
        to: msg.to
      };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      throw new Error(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  getStatus() {
    return {
      ready: this.isReady,
      authenticated: this.isAuthenticated,
      qrCode: this.qrCode
    };
  }

  getQRCode() {
    return this.qrCode;
  }

  setupMessageListener() {
    if (!this.client) {
      console.log('⚠️ WhatsApp client não disponível para configurar listener');
      return;
    }

    if (!this.chatbot) {
      console.log('⚠️ Chatbot não inicializado ainda');
      return;
    }

    if (this.chatbotEnabled) {
      console.log('🤖 Chatbot IA ativado - escutando mensagens...\n');
    } else {
      console.log('⚠️ Chatbot IA desabilitado - mensagens serão ignoradas\n');
      return;
    }

    this.client.on('message', async (msg) => {
      try {
        // Ignorar mensagens próprias, status e grupos
        if (msg.fromMe || msg.isStatus || msg.isGroupMsg) {
          return;
        }

        const phone = msg.from;
        const userMessage = msg.body.trim();

        // Ignorar mensagens vazias
        if (!userMessage || userMessage.length === 0) {
          return;
        }

        // Comandos administrativos
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage === '!stop' || lowerMessage === '/stop') {
          this.chatbotEnabled = false;
          await msg.reply('🤖 Chatbot desativado. Digite !start para reativar.');
          console.log(`🛑 Chatbot desativado por ${phone}`);
          return;
        }

        if (lowerMessage === '!start' || lowerMessage === '/start') {
          this.chatbotEnabled = true;
          await msg.reply('🤖 Chatbot ativado! Como posso ajudar você hoje?');
          console.log(`▶️ Chatbot ativado por ${phone}`);
          return;
        }

        // Se chatbot está desabilitado, não responder
        if (!this.chatbotEnabled) {
          return;
        }

        console.log(`📨 [${phone}] Recebida: ${userMessage.substring(0, 50)}...`);

        // Buscar histórico da conversa
        const history = await ConversationManager.getHistory(phone, 10);

        // Gerar resposta com IA
        const aiResponse = await this.chatbot.generateResponse(userMessage, history);

        // Salvar conversa no banco
        await ConversationManager.saveMessage(phone, userMessage, aiResponse);

        // Responder ao cliente
        await msg.reply(aiResponse);

        console.log(`🤖 [${phone}] Resposta enviada: ${aiResponse.substring(0, 50)}...\n`);

      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        
        try {
          // Resposta de fallback em caso de erro
          await msg.reply('⏳ Desculpe, estou processando sua mensagem. Responderei em breve!');
        } catch (replyError) {
          console.error('❌ Erro ao enviar resposta de fallback:', replyError);
        }
      }
    });
  }

  enableChatbot() {
    this.chatbotEnabled = true;
    console.log('✅ Chatbot IA habilitado');
  }

  disableChatbot() {
    this.chatbotEnabled = false;
    console.log('🛑 Chatbot IA desabilitado');
  }

  updateChatbotConfig(config) {
    if (this.chatbot) {
      this.chatbot.updateConfig(config);
      console.log('✅ Configuração do chatbot atualizada');
    }
  }

  getChatbotConfig() {
    return this.chatbot ? this.chatbot.getConfig() : null;
  }

  async destroy() {
    try {
      if (this.client) {
        await this.client.destroy();
        console.log('✅ WhatsApp client destruído');
      }
      
      // Limpar processos Chrome
      await this.killExistingProcesses();
      console.log('✅ Processos limpos');
    } catch (error) {
      console.error('❌ Erro ao destruir WhatsApp service:', error);
    }
  }
}

// Cleanup ao encerrar processo
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  const service = require('./services/whatsapp');
  await service.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando servidor...');
  const service = require('./services/whatsapp');
  await service.destroy();
  process.exit(0);
});

module.exports = new WhatsAppService();
