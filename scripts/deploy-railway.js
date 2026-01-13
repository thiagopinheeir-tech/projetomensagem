/**
 * Script para fazer deploy automático no Railway
 * Execute após fazer login: railway login
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando deploy automático no Railway...\n');

// Verificar se está logado
try {
  const whoami = execSync('railway whoami', { encoding: 'utf8' });
  console.log('✅ Logado como:', whoami.trim());
} catch (error) {
  console.log('❌ Não está logado no Railway!');
  console.log('\n📝 Faça login primeiro:');
  console.log('   railway login\n');
  console.log('Isso vai abrir o navegador para você fazer login.\n');
  process.exit(1);
}

// Verificar se projeto está linkado
const railwayConfig = path.join(process.cwd(), '.railway');
if (!fs.existsSync(railwayConfig)) {
  console.log('⚠️ Projeto não está linkado ao Railway.');
  console.log('\n📝 Linkando projeto...\n');
  try {
    execSync('railway link', { stdio: 'inherit' });
    console.log('\n✅ Projeto linkado!\n');
  } catch (error) {
    console.log('\n❌ Erro ao linkar projeto.');
    console.log('💡 Tente manualmente: railway link\n');
    process.exit(1);
  }
} else {
  console.log('✅ Projeto já está linkado!\n');
}

// Fazer deploy
console.log('🚀 Iniciando deploy...\n');
console.log('⏳ Isso pode levar 2-5 minutos...\n');

try {
  execSync('railway up', { stdio: 'inherit' });
  
  console.log('\n✅ Deploy concluído!\n');
  console.log('📝 Próximos passos:');
  console.log('   1. Veja logs: railway logs');
  console.log('   2. Veja status: railway status');
  console.log('   3. No site: Settings → Networking → Generate Domain');
  console.log('   4. Teste: https://sua-url.railway.app/health\n');
  
} catch (error) {
  console.error('\n❌ Erro ao fazer deploy:', error.message);
  console.log('\n💡 Tente manualmente: railway up');
  console.log('   Ou faça deploy pelo site: https://railway.app\n');
}
