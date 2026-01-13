const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

function getKeyBuffer() {
  const raw = String(process.env.ENCRYPTION_KEY || '').trim();
  if (!raw) {
    // Mantém comportamento explícito: sem chave fixa, não dá para garantir descriptografia após restart.
    // Ainda assim, geramos uma chave derivada para evitar crash; callers podem bloquear salvamento se quiserem.
    return crypto.createHash('sha256').update('missing-encryption-key').digest();
  }

  // Se for hex >= 64 chars, usar os primeiros 32 bytes (64 hex chars)
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64) {
    return Buffer.from(raw.slice(0, 64), 'hex'); // 32 bytes
  }

  // Caso contrário, derivar 32 bytes via SHA-256 do texto informado
  return crypto.createHash('sha256').update(raw).digest(); // 32 bytes
}

function encrypt(plainText) {
  const iv = crypto.randomBytes(16);
  const key = getKeyBuffer();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(cipherText) {
  const text = String(cipherText || '');
  const parts = text.split(':');
  const ivHex = parts.shift();
  const dataHex = parts.join(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(dataHex, 'hex');
  const key = getKeyBuffer();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt, getKeyBuffer };

