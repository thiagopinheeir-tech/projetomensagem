/**
 * Script para automatizar deploy no Railway
 * Tenta usar Railway CLI se disponível
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Tentando automatizar deploy no Railway...\n');

// Verificar se Railway CLI está instalado
let railwayInstalled = false;
try {
  execSync('railway --version', { stdio: 'ignore' });
  railwayInstalled = true;
  console.log('✅ Railway CLI encontrado!\n');
} catch (error) {
  console.log('⚠️ Railway CLI não encontrado.\n');
  console.log('📝 Para instalar Railway CLI:');
  console.log('   npm install -g @railway/cli\n');
  console.log('💡 Ou siga os passos manuais no site:\n');
  console.log('   1. Vá em https://railway.app');
  console.log('   2. Clique em "Deployments"');
  console.log('   3. Clique em "Deploy" ou "Redeploy"');
  console.log('   4. Aguarde deploy terminar');
  console.log('   5. Veja logs para verificar');
  console.log('   6. Vá em Settings → Networking → Generate Domain\n');
  process.exit(0);
}

if (railwayInstalled) {
  console.log('🔍 Verificando se está logado no Railway...\n');
  
  try {
    // Verificar login
    execSync('railway whoami', { stdio: 'pipe' });
    console.log('✅ Logado no Railway!\n');
    
    // Verificar se projeto está linkado
    const railwayConfig = path.join(process.cwd(), '.railway');
    if (fs.existsSync(railwayConfig)) {
      console.log('✅ Projeto já está linkado ao Railway!\n');
    } else {
      console.log('⚠️ Projeto não está linkado. Execute:');
      console.log('   railway link\n');
      console.log('Ou faça deploy manualmente no site.\n');
      process.exit(0);
    }
    
    console.log('🚀 Iniciando deploy...\n');
    console.log('⏳ Isso pode levar alguns minutos...\n');
    
    // Fazer deploy
    execSync('railway up', { stdio: 'inherit' });
    
    console.log('\n✅ Deploy concluído!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Vá em https://railway.app');
    console.log('   2. Veja logs em "Deployments"');
    console.log('   3. Vá em Settings → Networking → Generate Domain');
    
  } catch (error) {
    console.error('\n❌ Erro ao fazer deploy:', error.message);
    console.log('\n💡 Tente fazer deploy manualmente no site do Railway.');
  }
}
