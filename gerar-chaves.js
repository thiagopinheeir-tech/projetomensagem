const crypto = require('crypto');

console.log('\n🔑 CHAVES GERADAS PARA RAILWAY:\n');
console.log('='.repeat(60));
console.log('\n1️⃣ JWT_SECRET:');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('\n2️⃣ ENCRYPTION_KEY:');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('\n' + '='.repeat(60));
console.log('\n✅ Copie cada chave acima e adicione no Railway como variável de ambiente.\n');
