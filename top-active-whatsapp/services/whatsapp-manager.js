/**
 * Gerenciador de múltiplas instâncias WhatsApp
 * Gerencia uma instância WhatsAppService por usuário
 */

// WhatsAppService agora é uma classe, não singleton
// #region agent log
fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp-manager.js:7',message:'Loading WhatsAppServiceClass module',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion
const WhatsAppServiceClass = require('./whatsapp');
// #region agent log
fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp-manager.js:9',message:'WhatsAppServiceClass loaded',data:{isClass:typeof WhatsAppServiceClass === 'function',isInstance:typeof WhatsAppServiceClass === 'object' && WhatsAppServiceClass !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion
const path = require('path');
const fs = require('fs');

class WhatsAppManager {
  constructor() {
    // Map de instâncias: userId -> WhatsAppService
    this.instances = new Map();
    this.statuses = new Map(); // Cache de status por usuário
  }

  /**
   * Obtém ou cria uma instância WhatsApp para um usuário
   * @param {number|string} userId - ID do usuário
   * @returns {WhatsAppService} - Instância do WhatsAppService
   */
  getInstance(userId) {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    const userIdStr = String(userId);

    // Se já existe, retornar
    if (this.instances.has(userIdStr)) {
      return this.instances.get(userIdStr);
    }

    // Criar nova instância
    console.log(`📱 [WhatsAppManager] Criando nova instância WhatsApp para usuário ${userIdStr}`);
    const instance = new WhatsAppServiceClass(userIdStr);
    this.instances.set(userIdStr, instance);

    return instance;
  }

  /**
   * Remove uma instância WhatsApp
   * @param {number|string} userId - ID do usuário
   */
  async removeInstance(userId) {
    const userIdStr = String(userId);

    if (!this.instances.has(userIdStr)) {
      return;
    }

    console.log(`🗑️ [WhatsAppManager] Removendo instância WhatsApp do usuário ${userIdStr}`);
    
    const instance = this.instances.get(userIdStr);
    
    try {
      // Fazer logout se estiver conectado
      if (instance.isReady) {
        await instance.logout();
      }
    } catch (error) {
      console.error(`⚠️ [WhatsAppManager] Erro ao fazer logout do usuário ${userIdStr}:`, error.message);
    }

    // Remover da memória
    this.instances.delete(userIdStr);
    this.statuses.delete(userIdStr);
  }

  /**
   * Inicializa WhatsApp para um usuário específico
   * @param {number|string} userId - ID do usuário
   * @param {string} profileId - ID do perfil (opcional)
   */
  async initializeForUser(userId, profileId = null) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp-manager.js:83',message:'initializeForUser ENTRY',data:{userId:userId,profileId:profileId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const instance = this.getInstance(userId);
    
    // Configurar activeUserId e activeProfileId
    instance.setActiveUser(String(userId));
    if (profileId) {
      instance.setActiveProfileId(String(profileId));
    }

    // Inicializar chatbot para este usuário
    await instance.initChatbot(userId);

    // Inicializar WhatsApp se ainda não estiver inicializado
    if (!instance.isReady && !instance.isInitializing) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp-manager.js:96',message:'About to call instance.initialize()',data:{userId:userId,hasUserId:!!instance.userId,isReady:instance.isReady,isInitializing:instance.isInitializing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log(`📱 [WhatsAppManager] Inicializando WhatsApp para usuário ${userId}`);
      await instance.initialize();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp-manager.js:100',message:'instance.initialize() completed',data:{userId:userId,isReady:instance.isReady,isInitializing:instance.isInitializing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } else {
      console.log(`📱 [WhatsAppManager] WhatsApp já está inicializado ou inicializando para usuário ${userId}`);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'whatsapp-manager.js:105',message:'initializeForUser EXIT',data:{userId:userId,isReady:instance.isReady,hasQRCode:!!instance.qrCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return instance;
  }

  /**
   * Obtém status de todas as instâncias
   * @returns {Object} - Map de statuses por userId
   */
  async getAllStatuses() {
    const statuses = {};

    for (const [userId, instance] of this.instances.entries()) {
      try {
        const status = await instance.getAuthStatus();
        statuses[userId] = {
          ...status,
          userId: userId,
          isInitializing: instance.isInitializing
        };
      } catch (error) {
        statuses[userId] = {
          userId: userId,
          status: 'error',
          error: error.message
        };
      }
    }

    return statuses;
  }

  /**
   * Obtém status de uma instância específica
   * @param {number|string} userId - ID do usuário
   * @returns {Object} - Status da instância
   */
  async getStatus(userId) {
    const userIdStr = String(userId);

    if (!this.instances.has(userIdStr)) {
      return {
        userId: userIdStr,
        status: 'not_initialized',
        authenticated: false
      };
    }

    const instance = this.instances.get(userIdStr);
    const status = await instance.getAuthStatus();

    return {
      ...status,
      userId: userIdStr,
      isInitializing: instance.isInitializing
    };
  }

  /**
   * Obtém QR code de uma instância específica
   * @param {number|string} userId - ID do usuário
   * @returns {string} - QR code em base64
   */
  async getQRCode(userId) {
    const instance = this.getInstance(userId);
    return await instance.generateQRCode();
  }

  /**
   * Envia mensagem através da instância de um usuário
   * @param {number|string} userId - ID do usuário
   * @param {string} phone - Número do telefone
   * @param {string} message - Mensagem a enviar
   */
  async sendMessage(userId, phone, message) {
    const instance = this.getInstance(userId);
    return await instance.sendMessage(phone, message);
  }

  /**
   * Verifica se uma instância está pronta
   * @param {number|string} userId - ID do usuário
   * @returns {boolean}
   */
  isReady(userId) {
    const userIdStr = String(userId);
    if (!this.instances.has(userIdStr)) {
      return false;
    }
    return this.instances.get(userIdStr).isReady;
  }

  /**
   * Limpa todas as instâncias (útil para testes ou shutdown)
   */
  async cleanup() {
    console.log('🧹 [WhatsAppManager] Limpando todas as instâncias...');
    
    const userIds = Array.from(this.instances.keys());
    
    for (const userId of userIds) {
      await this.removeInstance(userId);
    }

    console.log('✅ [WhatsAppManager] Todas as instâncias foram removidas');
  }

  /**
   * Obtém lista de usuários com instâncias ativas
   * @returns {Array} - Array de userIds
   */
  getActiveUsers() {
    return Array.from(this.instances.keys());
  }

  /**
   * Conta total de instâncias ativas
   * @returns {number}
   */
  getInstanceCount() {
    return this.instances.size;
  }
}

// Exportar singleton
module.exports = new WhatsAppManager();
