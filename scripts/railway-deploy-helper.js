/**
 * Script Helper para Deploy no Railway
 * Este script ajuda a verificar se tudo está pronto para deploy
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração para Railway...\n');

// Verificações
const checks = {
  serverJs: fs.existsSync(path.join(__dirname, '../server.js')),
  packageJson: fs.existsSync(path.join(__dirname, '../package.json')),
  startCommand: false,
  railwayJson: fs.existsSync(path.join(__dirname, '../railway.json')),
};

// Verificar start command no package.json
if (checks.packageJson) {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  checks.startCommand = pkg.scripts?.start === 'node server.js';
}

console.log('📋 Checklist:');
console.log(`  ${checks.serverJs ? '✅' : '❌'} server.js existe`);
console.log(`  ${checks.packageJson ? '✅' : '❌'} package.json existe`);
console.log(`  ${checks.startCommand ? '✅' : '❌'} Start command: node server.js`);
console.log(`  ${checks.railwayJson ? '✅' : '❌'} railway.json existe`);

if (checks.serverJs && checks.packageJson && checks.startCommand) {
  console.log('\n✅ Tudo está pronto para deploy no Railway!');
  console.log('\n📝 Próximos passos:');
  console.log('  1. Vá em https://railway.app');
  console.log('  2. Clique em "Deployments"');
  console.log('  3. Clique em "Deploy" ou "Redeploy"');
  console.log('  4. Aguarde deploy terminar');
  console.log('  5. Veja logs para verificar se iniciou');
  console.log('  6. Vá em Settings → Networking → Generate Domain');
} else {
  console.log('\n⚠️ Algumas verificações falharam. Verifique os arquivos.');
}
