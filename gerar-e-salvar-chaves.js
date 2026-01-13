const crypto = require('crypto');
const fs = require('fs');

const jwtSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

const output = `
🔑 CHAVES GERADAS PARA RAILWAY

============================================================

1️⃣ JWT_SECRET:
${jwtSecret}

2️⃣ ENCRYPTION_KEY:
${encryptionKey}

============================================================

✅ Copie cada chave acima e adicione no Railway como variável de ambiente.

📋 VALORES PARA COPIAR:

JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}
`;

console.log(output);
fs.writeFileSync('CHAVES-RAILWAY.txt', output, 'utf8');
console.log('\n✅ Chaves salvas em: CHAVES-RAILWAY.txt\n');
