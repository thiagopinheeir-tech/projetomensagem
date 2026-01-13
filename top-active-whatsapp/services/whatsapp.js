const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const AIChatbot = require('./ai-chatbot');
const ConversationManager = require('./conversation-manager');
const wsManager = require('./websocket');
const { handleAudioMessage } = require('./audio-handler');
const bookingService = require('./booking');
const automationService = require('./automation-service');
const { exec } = require('child_process');
const path = require('path');
const { query } = require('../config/database');

class WhatsAppService {
  constructor(userId = null) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp.js:15',message:'WhatsAppService constructor',data:{userId:userId,hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    this.userId = userId ? String(userId) : null;
    this.client = null;
    this.qrCode = null;
    this.isReady = false;
    this.isAuthenticated = false;
    this.isInitializing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.chatbotEnabled = false;
    this.automationsEnabled = true; // Automações ativas por padrão
    this.chatbot = null;
    // Usuário "ativo" do desktop: usado para Google OAuth/agenda.
    this.activeUserId = this.userId;
    this.activeProfileId = null;
    
    // Diretório de autenticação isolado por usuário
    this.authPath = this.userId 
      ? path.join(process.cwd(), '.wwebjs_auth', `user_${this.userId}`)
      : path.join(process.cwd(), '.wwebjs_auth', 'default');
    
    // NUNCA inicializar automaticamente no construtor
    // Inicialização só deve acontecer via initialize() com userId válido
  }

  /**
   * Obter status de autenticação
   */
  async getAuthStatus() {
    return {
      authenticated: this.isAuthenticated,
      phoneNumber: this.client?.info?.wid?.user || '',
      status: this.isReady ? 'ready' : this.isInitializing ? 'initializing' : 'disconnected'
    };
  }

  /**
   * Gerar novo QR Code
   */
  async generateQRCode() {
    if (this.qrCode) {
      return this.qrCode;
    }
    // Se o client não existe, criar um novo (apenas se tiver userId)
    if (!this.client && this.userId) {
      await this.initialize();
    }
    if (!this.userId) {
      return 'QR Code não disponível: userId necessário';
    }
    return this.qrCode || 'QR Code não disponível no momento';
  }

  /**
   * Logout da sessão
   */
  async logout() {
    try {
      if (this.client) {
        await this.client.logout();
        this.isAuthenticated = false;
        this.isReady = false;
        console.log('✅ Logout realizado com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      throw error;
    }
  }

  async initChatbot(userId = null) {
    // Buscar API key do usuário se userId fornecido
    let openaiApiKey = null;
    
    if (userId) {
      try {
        const encryption = require('./encryption');
        const { convertUserIdForTable } = require('../utils/userId-converter');
        
        // Converter userId para o tipo correto da tabela user_api_keys
        const convertedUserId = await convertUserIdForTable('user_api_keys', userId);
        
        // Tentar buscar da tabela user_api_keys primeiro
        const apiKeyResult = await query(
          `SELECT api_key_encrypted FROM user_api_keys 
           WHERE user_id = $1 AND provider = 'openai' AND is_active = true 
           LIMIT 1`,
          [convertedUserId]
        );
        
        if (apiKeyResult.rows.length > 0 && apiKeyResult.rows[0].api_key_encrypted) {
          openaiApiKey = encryption.decrypt(apiKeyResult.rows[0].api_key_encrypted);
          console.log(`✅ [initChatbot] API key do usuário ${userId} carregada do banco`);
        } else {
          // Tentar buscar do chatbot_profiles (compatibilidade)
          const profileResult = await query(
            `SELECT openai_api_key_encrypted FROM chatbot_profiles 
             WHERE user_id = $1 AND is_active = true 
             LIMIT 1`,
            [userId]
          );
          
          if (profileResult.rows.length > 0 && profileResult.rows[0].openai_api_key_encrypted) {
            openaiApiKey = encryption.decrypt(profileResult.rows[0].openai_api_key_encrypted);
            console.log(`✅ [initChatbot] API key do usuário ${userId} carregada do perfil`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ [initChatbot] Erro ao buscar API key do usuário ${userId}:`, error.message);
      }
    }
    
    // Fallback para variável de ambiente (apenas se não tiver userId ou não encontrou no banco)
    if (!openaiApiKey) {
      openaiApiKey = process.env.OPENAI_API_KEY;
    }

    // Inicializar chatbot com configuração padrão + config do banco
    try {
      this.chatbot = new AIChatbot({
        openaiApiKey: openaiApiKey, // Passar API key específica do usuário
        businessName: process.env.BUSINESS_NAME || 'JP Financeira',
        businessDescription: process.env.BUSINESS_DESCRIPTION || 'Empresa especializada em empréstimo pessoal rápido e seguro. Aprovamos seu crédito em até 24 horas com as melhores taxas do mercado. Atendimento de segunda a sábado, das 8h às 18h.',
        services: (process.env.BUSINESS_SERVICES || 'Empréstimo Pessoal,Crédito Rápido,Antecipação de Recebíveis,Refinanciamento').split(',').map(s => s.trim()),
        tone: process.env.BUSINESS_TONE || 'amigavel',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '350'),
        defaultResponses: {
          preco: process.env.RESPONSE_PRECO || 'Oferecemos empréstimo pessoal de R$ 500 a R$ 50.000 com taxa a partir de 2,5% ao mês. O valor final depende da análise de crédito. Qual valor você precisa?',
          site: process.env.RESPONSE_SITE || 'Você pode acessar nosso site: www.jpfinanceira.com.br ou continuar aqui pelo WhatsApp mesmo! Posso te ajudar agora mesmo 😊',
          teste: process.env.RESPONSE_TESTE || 'Para solicitar seu empréstimo, preciso de algumas informações: nome completo, CPF, valor desejado e prazo de pagamento. Posso te ajudar agora?'
        },
        specialInstructions: process.env.BUSINESS_INSTRUCTIONS || 'Sempre coletar nome completo, CPF, valor desejado e prazo antes de prosseguir. Informar valores e taxas quando solicitado. Ser claro sobre documentação necessária. NUNCA prometer aprovação garantida. Atendimento apenas Segunda a Sábado, 8h-18h.',
        greetingMessage: 'Olá! 👋 Como posso te ajudar hoje?',
        farewellMessage: 'Foi um prazer te atender! 💙 Se precisar de mais alguma coisa sobre empréstimo pessoal, estou aqui! Tenha um ótimo dia!'
      });

      // Habilitar se tiver API key
      this.chatbotEnabled = !!openaiApiKey;

      // Tentar carregar configuração salva do banco (filtrada por userId se fornecido)
      try {
        let configQuery = 'SELECT * FROM configurations';
        let configParams = [];
        
        if (userId) {
          const { convertUserIdForTable } = require('../utils/userId-converter');
          const convertedUserId = await convertUserIdForTable('configurations', userId);
          configQuery += ' WHERE user_id = $1';
          configParams = [convertedUserId];
        }
        
        configQuery += ' ORDER BY created_at DESC LIMIT 1';
        
        const result = await query(configQuery, configParams);
        if (result.rows && result.rows.length > 0) {
          const row = result.rows[0];
          const dbDefaultResponses =
            typeof row.default_responses === 'string'
              ? JSON.parse(row.default_responses || '{}')
              : (row.default_responses || {});

          const dbConfig = {
            businessName: row.business_name ?? undefined,
            businessDescription: row.business_description ?? undefined,
            services: Array.isArray(row.services)
              ? row.services
              : (row.business_services ? row.business_services.split(',').map(s => s.trim()).filter(Boolean) : undefined),
            tone: row.tone ?? undefined,
            model: row.model ?? undefined,
            temperature: row.temperature ?? undefined,
            maxTokens: row.max_tokens ?? undefined,
            specialInstructions: (row.special_instructions ?? row.custom_prompt) ?? undefined,
            greetingMessage: row.greeting_message ?? undefined,
            farewellMessage: row.farewell_message ?? undefined,
            defaultResponses: dbDefaultResponses
          };

          this.chatbot.updateConfig(dbConfig);

          // Respeitar enable_chatbot se existir (mas nunca habilitar sem OPENAI_API_KEY)
          if (row.enable_chatbot === false) {
            this.chatbotEnabled = false;
          }

          console.log('✅ Configuração do chatbot carregada do banco (PostgreSQL)');
        } else {
          console.log('ℹ️ Nenhuma configuração encontrada no banco; usando .env');
        }
      } catch (dbErr) {
        console.warn('⚠️ Falha ao carregar configuração do banco; usando .env:', dbErr.message || dbErr);
      }

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp.js:234',message:'initialize() called',data:{userId:this.userId,hasUserId:!!this.userId,stack:new Error().stack.split('\n').slice(1,5).join('|')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // NÃO inicializar automaticamente sem userId (evitar inicialização no servidor)
    if (!this.userId) {
      console.warn('⚠️ [WhatsAppService] Tentativa de inicializar sem userId. Ignorando...');
      console.warn('💡 WhatsApp deve ser inicializado apenas via /api/whatsapp/connect com userId válido');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp.js:239',message:'initialize() blocked - no userId',data:{userId:this.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }

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

      // Garantir que o diretório de autenticação existe
      const fs = require('fs');
      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.userId ? `user_${this.userId}` : "top-active-whatsapp",
          dataPath: this.authPath
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
      this.client.on('qr', async (qr) => {
        try {
          // Gerar Data URL para o frontend
          this.qrCode = await QRCode.toDataURL(qr);
          
          const userLabel = this.userId ? ` (Usuário ${this.userId})` : '';
          console.log(`\n📱 ========================================`);
          console.log(`📱 WHATSAPP QR CODE${userLabel} - ESCANEIE AGORA:`);
          console.log(`📱 ========================================\n`);
          
          // Enviar QR code via WebSocket para o usuário específico
          if (this.userId) {
            wsManager.broadcast('qr', { qr: this.qrCode, userId: this.userId }, this.userId);
          } else {
            wsManager.broadcast('qr', { qr: this.qrCode });
          }
          
          // Mostrar no terminal também
          qrcodeTerminal.generate(qr, { small: true });
          
          console.log('\n📱 Abra o WhatsApp no celular → Menu → Dispositivos conectados → Conectar dispositivo\n');
          
          // BROADCAST QR Code para todos os clientes conectados
          console.log('📡 Enviando QR code via WebSocket...');
          wsManager.broadcast('qr', { qr: this.qrCode, status: 'qr_ready' });
          console.log('✅ QR code enviado via WebSocket para todos os clientes');
          
        } catch (err) {
          console.error('❌ Erro ao gerar QR Code:', err);
        }
      });

      // Ready
      this.client.on('ready', async () => {
        this.isReady = true;
        this.isInitializing = false;
        this.retryCount = 0; // Reset retry count on success
        console.log('\n✅ ========================================');
        console.log('✅ WhatsApp conectado e pronto!');
        console.log('✅ ========================================\n');
        
        // BROADCAST status conectado para todos os clientes
        wsManager.broadcast('status', { status: 'connected', message: 'WhatsApp conectado!' });
        
        // Inicializar chatbot se ainda não foi inicializado
        if (!this.chatbot) {
          await this.initChatbot();
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

  /**
   * Envia mensagem com botões interativos
   * Nota: WhatsApp Web não suporta botões oficiais, então formatamos a mensagem
   * com opções numeradas e processamos as respostas como se fossem botões
   * @param {string} phone - Número do telefone
   * @param {string} message - Texto da mensagem
   * @param {Array} buttons - Array de botões [{id: string, body: string}, ...] (máx 3)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendMessageWithButtons(phone, message, buttons = []) {
    if (!this.isReady) {
      throw new Error('WhatsApp não está conectado. Escaneie o QR code primeiro.');
    }

    try {
      // Validar botões (máximo 3)
      const validButtons = (buttons || []).slice(0, 3);
      if (validButtons.length === 0) {
        // Se não há botões, usar sendMessage normal
        return await this.sendMessage(phone, message);
      }

      // Formatar número
      const cleanPhone = phone.replace(/\D/g, '');
      const chatId = cleanPhone.includes('@c.us') 
        ? cleanPhone 
        : `${cleanPhone}@c.us`;

      // Criar mensagem formatada com botões (simulados)
      // Formato: mensagem + botões numerados
      let formattedMessage = message;
      if (validButtons.length > 0) {
        formattedMessage += '\n\n';
        validButtons.forEach((btn, index) => {
          const buttonText = btn.body || btn.text || '';
          // Limitar a 20 caracteres (limite do WhatsApp para botões)
          const shortText = buttonText.length > 20 ? buttonText.substring(0, 17) + '...' : buttonText;
          formattedMessage += `${index + 1}️⃣ ${shortText}\n`;
        });
        formattedMessage += '\n💬 _Digite o número da opção desejada_';
      }

      // Tentar usar botões reais se a biblioteca suportar
      // WhatsApp Web não suporta botões oficiais, então usamos mensagem formatada
      try {
        // Tentar enviar com botões usando a API do whatsapp-web.js
        // Se não funcionar, usar fallback de mensagem formatada
        const msg = await this.client.sendMessage(chatId, formattedMessage);
        
        return { 
          success: true, 
          id: msg.id.id,
          timestamp: msg.timestamp,
          from: msg.from,
          to: msg.to,
          buttons: validButtons,
          usesFormattedButtons: true // Flag indicando que usamos formato simulado
        };
      } catch (buttonError) {
        // Fallback: enviar mensagem formatada simples
        console.warn('⚠️ Botões interativos não suportados, usando formato texto:', buttonError.message);
        return await this.sendMessage(phone, formattedMessage);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem com botões:', error);
      // Fallback: enviar mensagem simples
      try {
        return await this.sendMessage(phone, message);
      } catch (fallbackError) {
        throw new Error(`Erro ao enviar mensagem: ${error.message}`);
      }
    }
  }

  getStatus() {
    return {
      ready: this.isReady,
      authenticated: this.isAuthenticated,
      qrCode: this.qrCode
    };
  }

  setActiveUser(userId) {
    const previousUserId = this.activeUserId;
    this.activeUserId = userId ?? null;
    console.log('✅ [setActiveUser] Usuário ativo definido para agendamentos:', {
      previous: previousUserId,
      current: this.activeUserId,
      changed: previousUserId !== this.activeUserId
    });
    
    if (!this.activeUserId) {
      console.warn('⚠️ [setActiveUser] ATENÇÃO: activeUserId foi definido como null! Agendamentos não funcionarão.');
    }
  }

  setActiveProfileId(profileId) {
    const previousProfileId = this.activeProfileId;
    this.activeProfileId = profileId ?? null;
    console.log('✅ [setActiveProfileId] Perfil ativo definido para agendamentos:', {
      previous: previousProfileId,
      current: this.activeProfileId,
      changed: previousProfileId !== this.activeProfileId
    });
    
    if (!this.activeProfileId) {
      console.warn('⚠️ [setActiveProfileId] ATENÇÃO: activeProfileId foi definido como null! Agendamentos não funcionarão.');
    }
  }

  setAutomationsEnabled(enabled) {
    this.automationsEnabled = enabled !== false;
    console.log(`✅ Automações ${this.automationsEnabled ? 'ativadas' : 'desativadas'}`);
  }

  getActiveUserId() {
    return this.activeUserId;
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
      // Não retornar aqui: permite habilitar depois via dashboard/comando
      console.log('⚠️ Chatbot IA desabilitado - listener ativo, mas mensagens serão ignoradas até habilitar\n');
    }

    this.client.on('message', async (msg) => {
      try {
        // 🚫 NÃO responder grupos/status/seu número
        if (msg.fromMe || msg.isStatus || msg.isGroupMsg) {
          return console.log('🚫 Ignorado:', msg.from);
        }

        // Usar userId da instância para processar mensagens
        const currentUserId = this.userId || this.activeUserId;
        if (!currentUserId) {
          console.warn('⚠️ [WhatsApp] Mensagem recebida mas userId não definido. Ignorando...');
          return;
        }

        // 🔊 PROCESSAR ÁUDIO PRIMEIRO
        const audioProcessed = await handleAudioMessage(this.client, msg, this.chatbot, wsManager);
        if (audioProcessed) {
          return; // Áudio processado, não processar como texto
        }

        const phone = msg.from.replace('@c.us', '');
        let userMessage = msg.body.trim();
        
        // Detectar clique em botão (se suportado)
        // WhatsApp Web não tem botões oficiais, mas podemos detectar respostas numéricas
        // que correspondem a botões enviados anteriormente
        // Se a mensagem for um número (1, 2, 3) e estiver esperando resposta de menu, 
        // o automationService já trata isso, então não precisamos fazer nada especial aqui

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

        console.log(`📨 [${phone}] ${userMessage.substring(0,50)}`);

        // Debug opcional: conferir se a config atual está mesmo aplicada
        if (process.env.DEBUG_CHATBOT_CONFIG === 'true') {
          const cfg = this.chatbot?.getConfig?.() || {};
          console.log('🧾 Chatbot config snapshot:', {
            businessName: cfg.businessName,
            model: cfg.model,
            tone: cfg.tone,
            maxTokens: cfg.maxTokens,
            temperature: cfg.temperature,
            servicesType: Array.isArray(cfg.services) ? 'array' : typeof cfg.services,
            specialInstructionsLength: typeof cfg.specialInstructions === 'string' ? cfg.specialInstructions.length : null
          });
        }

        // Buscar histórico da conversa (filtrado por userId)
        const history = await ConversationManager.getHistory(phone, 10, currentUserId);

        // 📅 Processar comandos de agendamento (cancelar, listar, etc.) - ANTES DE TUDO
        // Isso garante que comandos de cancelamento sejam processados antes da IA
        // Usar userId da instância
        if (currentUserId && this.activeProfileId) {
          try {
            // Verificar se é comando de cancelamento (prioridade máxima)
            const lowerMsg = userMessage.toLowerCase().trim();
            const isCancelCommand = lowerMsg.includes('cancelar') || 
                                   lowerMsg.includes('cancela') ||
                                   /^\s*\d+\s*$/.test(lowerMsg); // Números também podem ser escolha de cancelamento
            
            if (isCancelCommand) {
              console.log(`🗑️ [WhatsApp] Detectado comando de cancelamento, processando antes da IA...`);
            }
            
            const bookingResult = await bookingService.handleMessage({
              userId: currentUserId,
              profileId: this.activeProfileId,
              phone,
              message: userMessage,
              cfg: this.chatbot?.getConfig?.() || {}
            });
            
            if (bookingResult?.handled) {
              const reply = bookingResult.reply || 'Certo! Como posso ajudar?';
              const chatbotConfig = this.chatbot?.getConfig?.() || {};
              await ConversationManager.saveMessage(phone, userMessage, reply, null, this.activeUserId, chatbotConfig);
              await msg.reply(reply);
              
              // BROADCAST REALTIME
              wsManager.broadcast('new_conversation', {
                phone,
                userMessage,
                aiResponse: reply,
                timestamp: Date.now()
              });
              
              console.log(`📅 [WhatsApp] Comando de agendamento processado: ${userMessage.substring(0, 50)}`);
              return; // IMPORTANTE: retornar aqui para não processar pela IA
            }
          } catch (bookingErr) {
            console.error('❌ Erro ao processar comando de agendamento:', bookingErr);
            console.error('Stack:', bookingErr.stack?.substring(0, 200));
            // Continuar com o fluxo normal se falhar
          }
        }

        // 🤖 Automações sem IA (regras e menus) - antes da IA
        if (this.automationsEnabled) {
          try {
            const automationResult = await automationService.handleMessage({
              userId: currentUserId,
              profileId: this.activeProfileId,
              phone,
              message: userMessage
            });
            if (automationResult?.handled) {
              const reply = automationResult.reply || 'Certo! Como posso ajudar?';
              const chatbotConfig = this.chatbot?.getConfig?.() || {};
              await ConversationManager.saveMessage(phone, userMessage, reply, null, this.activeUserId, chatbotConfig);
              
              // Se houver botões, usar sendMessageWithButtons
              if (automationResult.buttons && automationResult.buttons.length > 0) {
                await this.sendMessageWithButtons(phone, reply, automationResult.buttons);
              } else {
                await msg.reply(reply);
              }
              return;
            }
          } catch (automationErr) {
            console.warn('⚠️ Falha nas automações; continuando com chatbot:', automationErr.message || automationErr);
          }
        }

        // Gerar resposta com IA (apenas se chatbot estiver habilitado)
        if (!this.chatbot || !this.chatbotEnabled) {
          console.log(`⚠️ Chatbot desabilitado ou não inicializado. Mensagem de ${phone} não será processada pela IA.`);
          // Se chatbot não está disponível, usar fallback
          let responseText;
          if (this.chatbot) {
            // Chatbot existe mas está desabilitado - usar fallback
            responseText = this.chatbot.getFallbackResponse(userMessage, history);
            console.log(`🤖 [${phone}] Resposta (fallback): ${responseText.substring(0,50)}`);
          } else {
            // Chatbot não inicializado - mensagem genérica
            responseText = 'Olá! 👋 Como posso te ajudar hoje?';
            console.log(`🤖 [${phone}] Resposta (padrão): ${responseText}`);
          }
          
          // Salvar e enviar resposta
          const chatbotConfig = this.chatbot?.getConfig?.() || {};
          await ConversationManager.saveMessage(phone, userMessage, responseText, null, this.activeUserId, chatbotConfig);
          await msg.reply(responseText);
          
          // BROADCAST REALTIME para dashboard
          wsManager.broadcast('new_conversation', {
            phone,
            userMessage,
            aiResponse: responseText,
            timestamp: Date.now()
          });
          
          return;
        }

        console.log(`🤖 [${phone}] Gerando resposta da IA...`);
        console.log(`   - Mensagem do usuário: ${userMessage.substring(0, 100)}`);
        console.log(`   - Histórico: ${history.length} mensagens`);
        
        const aiResponse = await this.chatbot.generateResponse(userMessage, history);
        
        console.log(`🤖 [${phone}] Resposta gerada: ${aiResponse.substring(0, 100)}`);

        // 🚀 Verificar se a IA coletou informações de agendamento e criar evento
        console.log(`📅 [WhatsApp] Verificando informações de agendamento...`, {
          activeUserId: this.activeUserId ? 'presente' : 'AUSENTE ❌',
          activeProfileId: this.activeProfileId ? 'presente' : 'AUSENTE ❌',
          phone: phone?.substring(0, 15)
        });

        // Se activeProfileId não está definido, tentar buscar automaticamente para este usuário
        if (!this.activeProfileId && currentUserId) {
          console.log(`🔄 [WhatsApp] activeProfileId não definido. Buscando perfil ativo para usuário ${currentUserId}...`);
          try {
            const { query } = require('../config/database');
            const { convertUserIdForTable } = require('../utils/userId-converter');
            const convertedUserId = await convertUserIdForTable('chatbot_profiles', currentUserId);
            const userResult = await query(
              `SELECT cp.id::text as profile_id
               FROM chatbot_profiles cp
               WHERE cp.user_id = $1 AND cp.is_active = true
               ORDER BY cp.updated_at DESC
               LIMIT 1`,
              [convertedUserId]
            );

            if (userResult.rows.length > 0) {
              const { profile_id } = userResult.rows[0];
              this.setActiveProfileId(profile_id);
              console.log(`✅ [WhatsApp] Perfil definido automaticamente:`, {
                userId: currentUserId,
                profileId: profile_id
              });
            } else {
              console.warn(`⚠️ [WhatsApp] Nenhum perfil ativo encontrado para usuário ${currentUserId}`);
            }
          } catch (autoSetError) {
            console.error(`❌ [WhatsApp] Erro ao buscar perfil automaticamente:`, autoSetError.message);
          }
        }

        const bookingInfo = this.extractBookingInfoFromHistory([...history, { user_message: userMessage, ai_response: aiResponse }], this.chatbot?.getConfig?.());
        
        if (bookingInfo) {
          console.log(`📅 [WhatsApp] Informações de agendamento extraídas:`, {
            hasAllInfo: bookingInfo.hasAllInfo,
            name: bookingInfo.name?.substring(0, 30),
            service: bookingInfo.service?.substring(0, 30),
            startISO: bookingInfo.startISO?.substring(0, 30),
            durationMinutes: bookingInfo.durationMinutes
          });
        } else {
          console.log(`📅 [WhatsApp] Nenhuma informação de agendamento detectada`);
        }

        if (bookingInfo && bookingInfo.hasAllInfo) {
          try {
            console.log(`📅 [WhatsApp] Agendamento completo detectado. Criando evento...`, {
              userId: this.activeUserId,
              profileId: this.activeProfileId,
              bookingInfo: {
                name: bookingInfo.name,
                service: bookingInfo.service,
                startISO: bookingInfo.startISO
              }
            });

            if (!currentUserId) {
              console.error(`❌ [WhatsApp] userId não está definido! Não é possível criar agendamento.`);
              console.log(`💡 [WhatsApp] Dica: Certifique-se de que o usuário está logado e o perfil está ativo.`);
            }

            if (!this.activeProfileId) {
              console.error(`❌ [WhatsApp] activeProfileId não está definido! Não é possível criar agendamento.`);
              console.log(`💡 [WhatsApp] Dica: Certifique-se de que um perfil está selecionado/ativo.`);
            }

            const bookingResult = await bookingService.createAppointmentFromAI({
              userId: currentUserId,
              profileId: this.activeProfileId,
              phone: phone,
              clientName: bookingInfo.name,
              service: bookingInfo.service,
              startISO: bookingInfo.startISO,
              durationMinutes: bookingInfo.durationMinutes,
              notes: ''
            });
            
            console.log(`📅 [WhatsApp] Resultado do agendamento:`, {
              success: bookingResult.success,
              eventId: bookingResult.eventId,
              error: bookingResult.error,
              calendarError: bookingResult.calendarError
            });

            if (bookingResult.success && bookingResult.eventId) {
              console.log(`✅ [WhatsApp] Agendamento criado com sucesso! Event ID: ${bookingResult.eventId}`);
              
              // Verificar se o horário foi ajustado automaticamente
              let timeAdjustmentMsg = '';
              if (bookingResult.timeAdjusted && bookingResult.originalTime) {
                const originalTime = new Date(bookingResult.originalTime).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const newTime = new Date(bookingResult.startTime).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                timeAdjustmentMsg = `\n\n⚠️ O horário foi ajustado automaticamente:\n   Original: ${originalTime}\n   Novo: ${newTime}`;
              }
              
              // A IA pode incluir a confirmação na resposta, mas também podemos adicionar uma mensagem
              if (!aiResponse.toLowerCase().includes('agendado') && !aiResponse.toLowerCase().includes('confirmado')) {
                const confirmationMsg = `\n\n✅ Agendamento confirmado no Google Calendar!${timeAdjustmentMsg}${bookingResult.htmlLink ? `\n🔗 Link: ${bookingResult.htmlLink}` : ''}`;
                await msg.reply(aiResponse + confirmationMsg);
                // Salvar mensagem com confirmação
                const chatbotConfig = this.chatbot?.getConfig?.() || {};
                await ConversationManager.saveMessage(phone, userMessage, aiResponse + confirmationMsg, null, this.activeUserId, chatbotConfig);
                
                // BROADCAST REALTIME
                wsManager.broadcast('new_conversation', {
                  phone,
                  userMessage,
                  aiResponse: aiResponse + confirmationMsg,
                  timestamp: Date.now()
                });
                return; // Não continuar para enviar aiResponse novamente
              } else if (timeAdjustmentMsg) {
                // Se a IA já mencionou agendamento, apenas adicionar o aviso de ajuste
                await msg.reply(timeAdjustmentMsg);
                const chatbotConfig = this.chatbot?.getConfig?.() || {};
                await ConversationManager.saveMessage(phone, '', timeAdjustmentMsg, null, this.activeUserId, chatbotConfig);
                wsManager.broadcast('new_conversation', {
                  phone,
                  userMessage: '',
                  aiResponse: timeAdjustmentMsg,
                  timestamp: Date.now()
                });
                return;
              }
            } else {
              console.warn(`⚠️ [WhatsApp] Erro ao criar agendamento:`, {
                success: bookingResult.success,
                eventId: bookingResult.eventId,
                error: bookingResult.error,
                calendarError: bookingResult.calendarError
              });
              
              // Adicionar mensagem de erro na resposta se necessário
              let errorMsg = '';
              if (bookingResult.error && (bookingResult.error.includes('userId') || bookingResult.error.includes('profileId'))) {
                errorMsg = `\n\n⚠️ Não foi possível criar o agendamento automaticamente. Por favor, verifique se você está logado e tem um perfil ativo no sistema.`;
              } else if (bookingResult.calendarError) {
                errorMsg = `\n\n⚠️ Não foi possível criar o agendamento no Google Calendar: ${bookingResult.calendarError}\n\nPor favor, tente novamente ou entre em contato com o suporte.`;
              } else if (bookingResult.error) {
                errorMsg = `\n\n⚠️ Erro ao criar agendamento: ${bookingResult.error}\n\nPor favor, tente novamente.`;
              } else {
                errorMsg = `\n\n⚠️ Não foi possível criar o agendamento no Google Calendar. O agendamento foi salvo localmente, mas não apareceu no calendário. Por favor, verifique sua conexão com o Google Calendar.`;
              }
              
              if (errorMsg) {
                await msg.reply(aiResponse + errorMsg);
                const chatbotConfig = this.chatbot?.getConfig?.() || {};
                await ConversationManager.saveMessage(phone, userMessage, aiResponse + errorMsg, null, this.activeUserId, chatbotConfig);
                wsManager.broadcast('new_conversation', {
                  phone,
                  userMessage,
                  aiResponse: aiResponse + errorMsg,
                  timestamp: Date.now()
                });
                return;
              }
            }
          } catch (bookingErr) {
            console.error('❌ [WhatsApp] Erro ao processar agendamento:', {
              message: bookingErr.message,
              stack: bookingErr.stack?.substring(0, 300)
            });
            // Continuar normalmente mesmo se falhar
          }
        }

        // Salvar mensagem e resposta juntas (padrão do sistema)
        const chatbotConfig = this.chatbot?.getConfig?.() || {};
        await ConversationManager.saveMessage(phone, userMessage, aiResponse, null, currentUserId, chatbotConfig);

        // Responder ao cliente
        await msg.reply(aiResponse);

        // BROADCAST REALTIME para dashboard
        wsManager.broadcast('new_conversation', {
          phone,
          userMessage,
          aiResponse,
          timestamp: Date.now()
        });

        console.log(`🤖 [${phone}] Resposta enviada: ${aiResponse.substring(0,50)}`);

      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        
        try {
          // Resposta de fallback em caso de erro - usar fallback do chatbot se disponível
          let fallbackResponse = 'Olá! Como posso ajudar você hoje?';
          
          if (this.chatbot && typeof this.chatbot.getFallbackResponse === 'function') {
            try {
              fallbackResponse = this.chatbot.getFallbackResponse(userMessage, history);
            } catch (fallbackError) {
              console.warn('⚠️ Erro ao gerar fallback do chatbot:', fallbackError);
            }
          }
          
          const chatbotConfig = this.chatbot?.getConfig?.() || {};
          await ConversationManager.saveMessage(phone, userMessage, fallbackResponse, null, this.activeUserId, chatbotConfig);
          await msg.reply(fallbackResponse);
          
          // BROADCAST REALTIME para dashboard
          wsManager.broadcast('new_conversation', {
            phone,
            userMessage,
            aiResponse: fallbackResponse,
            timestamp: Date.now()
          });
        } catch (replyError) {
          console.error('❌ Erro ao enviar resposta de fallback:', replyError);
        }
      }
    });
  }

  /**
   * Extrai informações de agendamento do histórico da conversa
   * Retorna null se não encontrar informações completas
   */
  extractBookingInfoFromHistory(history, chatbotConfig = {}) {
    try {
      console.log(`📅 [extractBookingInfoFromHistory] Iniciando extração:`, {
        historyLength: history?.length || 0,
        hasServices: Array.isArray(chatbotConfig?.services),
        servicesCount: Array.isArray(chatbotConfig?.services) ? chatbotConfig.services.length : 0
      });

      // Funções auxiliares do booking service
      const norm = (s) => String(s || '').trim();
      const lower = (s) => norm(s).toLowerCase();
      
      const looksLikeName = (text) => {
        const t = norm(text);
        if (!t) return false;
        if (/\d/.test(t)) return false;
        if (t.length < 4 || t.length > 60) return false;
        const words = t.split(/\s+/).filter(Boolean);
        if (words.length < 2 || words.length > 5) return false;
        const lt = t.toLowerCase();
        // Excluir frases comuns que não são nomes
        if (lt.includes('bom dia') || lt.includes('boa tarde') || lt.includes('boa noite') || 
            lt === 'oi' || lt === 'ola' || lt === 'olá' ||
            lt.includes('quero') || lt.includes('cancelar') || lt.includes('agendar') ||
            lt.includes('marcar') || lt.includes('remarcar') || lt.includes('reagendar')) return false;
        return /^[A-Za-zÀ-ÿ'\- ]+$/.test(t);
      };
      
      const parseTime = (text) => {
        const t = lower(text);
        // Padrões mais flexíveis: "9h", "9:00", "às 9 horas", "9 horas", "09:30", "9h30"
        // Tentar padrão completo primeiro: "às 9 horas", "9 horas"
        let m = t.match(/(?:às|as|a|de|para)\s*(\d{1,2})\s*(?:h|horas|hora)/);
        if (m) {
          const hour = parseInt(m[1], 10);
          if (hour >= 0 && hour <= 23) {
            return { hour, minute: 0 };
          }
        }
        
        // Padrão: "9h", "9:00", "09:30", "9h30"
        m = t.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/);
        if (m) {
          const hour = parseInt(m[1], 10);
          const minute = m[2] ? parseInt(m[2], 10) : 0;
          return { hour, minute };
        }
        
        // Padrão: "nove horas", "nove e meia" (números por extenso)
        const numberWords = {
          'uma': 1, 'duas': 2, 'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5,
          'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
          'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'quinze': 15,
          'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19, 'vinte': 20
        };
        
        for (const [word, num] of Object.entries(numberWords)) {
          if (t.includes(word) && (t.includes('hora') || t.includes('h'))) {
            return { hour: num, minute: 0 };
          }
        }
        
        return null;
      };
      
      const parseDate = (text) => {
        const t = lower(text);
        const iso = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
        if (iso) {
          const y = parseInt(iso[1], 10);
          const m = parseInt(iso[2], 10);
          const d = parseInt(iso[3], 10);
          const dt = new Date();
          dt.setHours(0, 0, 0, 0);
          dt.setFullYear(y, m - 1, d);
          return dt;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDay = today.getDay(); // 0 = domingo, 1 = segunda, etc.
        
        if (t.includes('hoje')) return today;
        if (t.includes('amanha') || t.includes('amanhã')) {
          const d = new Date(today);
          d.setDate(d.getDate() + 1);
          return d;
        }
        
        // Detectar dias da semana: "segunda", "terça", "terca", "quarta", etc.
        const dayNames = {
          'domingo': 0, 'segunda': 1, 'segunda-feira': 1,
          'terça': 2, 'terca': 2, 'terça-feira': 2, 'terca-feira': 2,
          'quarta': 3, 'quarta-feira': 3,
          'quinta': 4, 'quinta-feira': 4,
          'sexta': 5, 'sexta-feira': 5,
          'sábado': 6, 'sabado': 6
        };
        
        for (const [dayName, targetDay] of Object.entries(dayNames)) {
          if (t.includes(dayName)) {
            const daysUntilTarget = (targetDay - todayDay + 7) % 7;
            const targetDate = daysUntilTarget === 0 ? 7 : daysUntilTarget; // Se for hoje, pegar próxima semana
            const d = new Date(today);
            d.setDate(d.getDate() + targetDate);
            return d;
          }
        }
        
        return null;
      };
      
      const detectService = (text, cfg) => {
        const services = Array.isArray(cfg?.services) ? cfg.services : [];
        const servicesConfig = Array.isArray(cfg?.servicesConfig) ? cfg.servicesConfig : [];
        const allServices = [...services, ...servicesConfig.map(s => typeof s === 'object' ? s.name : s)];
        const lt = lower(text);
        for (const s of allServices) {
          const token = lower(String(s));
          if (token && lt.includes(token)) return String(s);
        }
        if (lt.includes('corte') && lt.includes('barba')) return 'Corte + Barba';
        if (lt.includes('barba')) return 'Barba';
        if (lt.includes('corte')) return 'Corte';
        return null;
      };
      
      const buildDateTime = (dateOnly, time) => {
        const d = new Date(dateOnly);
        d.setHours(time.hour, time.minute, 0, 0);
        return d;
      };
      
      // Extrair informações do histórico
      let name = null;
      let service = null;
      let dateOnly = null;
      let time = null;
      
      // Buscar nas últimas mensagens (mais recentes primeiro)
      const recentMessages = [...history].reverse().slice(0, 10);
      console.log(`📅 [extractBookingInfoFromHistory] Analisando ${recentMessages.length} mensagens recentes`);
      
      for (const msg of recentMessages) {
        const userMsg = norm(msg.user_message || '');
        const aiMsg = norm(msg.ai_response || '');
        const combined = `${userMsg} ${aiMsg}`;
        
        // Extrair nome
        if (!name && looksLikeName(userMsg)) {
          name = userMsg;
          console.log(`📅 [extractBookingInfoFromHistory] Nome detectado: ${name}`);
        }
        
        // Extrair serviço
        if (!service) {
          service = detectService(combined, chatbotConfig);
          if (service) {
            console.log(`📅 [extractBookingInfoFromHistory] Serviço detectado: ${service}`);
          }
        }
        
        // Extrair data
        if (!dateOnly) {
          const d = parseDate(combined);
          if (d) {
            dateOnly = d;
            console.log(`📅 [extractBookingInfoFromHistory] Data detectada: ${d.toISOString().substring(0, 10)}`);
          }
        }
        
        // Extrair hora
        if (!time) {
          const t = parseTime(combined);
          if (t) {
            time = t;
            console.log(`📅 [extractBookingInfoFromHistory] Hora detectada: ${t.hour}:${String(t.minute).padStart(2, '0')}`);
          }
        }
      }
      
      console.log(`📅 [extractBookingInfoFromHistory] Informações extraídas:`, {
        name: name ? 'presente' : 'ausente',
        service: service ? 'presente' : 'ausente',
        dateOnly: dateOnly ? 'presente' : 'ausente',
        time: time ? 'presente' : 'ausente',
        hasAllInfo: !!(name && service && dateOnly && time)
      });
      
      // Verificar se temos todas as informações
      if (name && service && dateOnly && time) {
        const startDateTime = buildDateTime(dateOnly, time);
        
        // Buscar duração do serviço
        let durationMinutes = 30; // padrão
        const servicesConfig = Array.isArray(chatbotConfig?.servicesConfig) ? chatbotConfig.servicesConfig : [];
        const serviceConfig = servicesConfig.find(s => {
          const sName = typeof s === 'object' ? s.name : String(s);
          return lower(sName) === lower(service);
        });
        if (serviceConfig && typeof serviceConfig === 'object' && serviceConfig.durationMinutes) {
          durationMinutes = parseInt(serviceConfig.durationMinutes, 10) || 30;
        }
        
        const result = {
          hasAllInfo: true,
          name: name,
          service: service,
          startISO: startDateTime.toISOString(),
          durationMinutes: durationMinutes
        };

        console.log(`✅ [extractBookingInfoFromHistory] Todas as informações coletadas:`, {
          name: result.name,
          service: result.service,
          startISO: result.startISO,
          durationMinutes: result.durationMinutes
        });

        return result;
      }
      
      console.log(`⚠️ [extractBookingInfoFromHistory] Informações incompletas - não é possível criar agendamento`);
      return null;
    } catch (error) {
      console.error('❌ [extractBookingInfoFromHistory] Erro ao extrair informações de agendamento:', {
        message: error.message,
        stack: error.stack?.substring(0, 200)
      });
      return null;
    }
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp.js:601',message:'updateChatbotConfig ENTRY',data:{hasChatbot:!!this.chatbot,hasConfig:!!config,businessName:config?.businessName,specialInstructionsLength:config?.specialInstructions?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (this.chatbot) {
      this.chatbot.updateConfig(config);
      console.log('✅ Configuração do chatbot atualizada');
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp.js:606',message:'updateChatbotConfig EXIT',data:{updated:!!this.chatbot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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

// Exportar a classe para ser usada pelo WhatsAppManager
module.exports = WhatsAppService;
