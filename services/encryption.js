/**
 * Serviço de criptografia para credenciais sensíveis
 * Usa AES-256-GCM para criptografia simétrica
 */

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Chave de criptografia deve estar em variável de ambiente
    // Se não existir, gerar uma (apenas para desenvolvimento)
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
    this.iterations = 100000;
    
    // Obter chave de criptografia
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      console.warn('⚠️ ENCRYPTION_KEY não definida. Gerando chave temporária (NÃO USE EM PRODUÇÃO!)');
      // Para desenvolvimento apenas - gerar chave temporária
      this.masterKey = crypto.randomBytes(this.keyLength);
    } else {
      // Se a chave for uma string, derivar para 32 bytes
      if (encryptionKey.length === 64) {
        // Assume que é hex string
        this.masterKey = Buffer.from(encryptionKey, 'hex');
      } else {
        // Derivar chave usando PBKDF2
        this.masterKey = crypto.pbkdf2Sync(
          encryptionKey,
          'encryption-salt',
          this.iterations,
          this.keyLength,
          'sha512'
        );
      }
    }
  }

  /**
   * Criptografa um texto
   * @param {string} text - Texto a ser criptografado
   * @returns {string} - String base64 contendo IV + tag + texto criptografado
   */
  encrypt(text) {
    if (!text) {
      return null;
    }

    try {
      // Gerar IV aleatório
      const iv = crypto.randomBytes(this.ivLength);
      
      // Criar cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      // Criptografar
      let encrypted = cipher.update(text, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Obter tag de autenticação
      const tag = cipher.getAuthTag();
      
      // Combinar IV + tag + encrypted
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'base64')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('❌ Erro ao criptografar:', error);
      throw new Error('Falha ao criptografar dados');
    }
  }

  /**
   * Descriptografa um texto
   * @param {string} encryptedData - String base64 com dados criptografados
   * @returns {string} - Texto descriptografado
   */
  decrypt(encryptedData) {
    if (!encryptedData) {
      return null;
    }

    try {
      // Decodificar base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extrair IV, tag e dados criptografados
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Criar decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);
      
      // Descriptografar
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Erro ao descriptografar:', error);
      throw new Error('Falha ao descriptografar dados');
    }
  }

  /**
   * Hash de senha (para comparação sem descriptografar)
   * @param {string} text - Texto a ser hasheado
   * @returns {string} - Hash SHA-256
   */
  hash(text) {
    if (!text) {
      return null;
    }
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

// Exportar singleton
module.exports = new EncryptionService();
