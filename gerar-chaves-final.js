const crypto = require('crypto');
const fs = require('fs');

const jwtSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

const content = `🔑 CHAVES GERADAS PARA RAILWAY

============================================================

1️⃣ JWT_SECRET:
${jwtSecret}

2️⃣ ENCRYPTION_KEY:
${encryptionKey}

============================================================

📋 VALORES PARA COPIAR E COLAR NO RAILWAY:

JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}

============================================================

✅ Instruções:
1. Acesse Railway → serviço "projetomensagem" → Variables
2. Clique em "New Variable" para cada chave
3. Cole os valores acima
`;

console.log(content);
fs.writeFileSync('CHAVES-RAILWAY.txt', content, 'utf8');
console.log('\n✅ Arquivo salvo: CHAVES-RAILWAY.txt\n');
