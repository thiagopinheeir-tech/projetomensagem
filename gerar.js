const crypto = require('crypto');
const jwt = crypto.randomBytes(32).toString('hex');
const enc = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET=' + jwt);
console.log('ENCRYPTION_KEY=' + enc);
const fs = require('fs');
fs.writeFileSync('jwt-key.txt', jwt);
fs.writeFileSync('enc-key.txt', enc);
