#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

console.log(`\n${colors.blue}🚀 JT DEV NOCODE 2.0 - Iniciando${colors.reset}\n`);

// Determinar o diretório raiz
let appDir = __dirname;
if (process.pkg) {
  appDir = process.pkg.defaultEntrypoint ? path.dirname(process.execPath) : __dirname;
}

console.log(`${colors.cyan}📁 Diretório: ${appDir}${colors.reset}`);

// Carregar env
try {
  require('dotenv').config({ path: path.join(appDir, '.env') });
  console.log(`${colors.green}✅ Variáveis de ambiente carregadas${colors.reset}`);
} catch (e) {
  console.log(`${colors.yellow}⚠️  .env não encontrado${colors.reset}`);
}

// Iniciar Backend
async function startBackend() {
  return new Promise((resolve, reject) => {
    console.log(`\n${colors.cyan}🔧 Iniciando Backend (Node.js :5000)...${colors.reset}`);
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'launcher.js:39',message:'Before require server.js',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      require('./server.js');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'launcher.js:42',message:'After require server.js - success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log(`${colors.green}✅ Backend iniciado!${colors.reset}`);
      
      setTimeout(() => {
        console.log(`${colors.green}✅ Backend pronto em http://localhost:5000${colors.reset}`);
        resolve();
      }, 2000);
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'launcher.js:50',message:'Error caught in startBackend',data:{errorMessage:err.message,errorStack:err.stack,errorName:err.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error(`${colors.red}❌ Erro ao iniciar backend:${colors.reset}`);
      console.error(err.message);
      reject(err);
    }
  });
}

// Instruções
function showInstructions() {
  console.log(`
${colors.green}═══════════════════════════════════════════════════════════${colors.reset}
${colors.green}✅ SISTEMA INICIADO COM SUCESSO!${colors.reset}
${colors.green}═══════════════════════════════════════════════════════════${colors.reset}

${colors.cyan}📍 URLs para acessar:${colors.reset}
  • Frontend:  ${colors.blue}http://localhost:5173${colors.reset}
  • Backend:   ${colors.blue}http://localhost:5000${colors.reset}
  • Health:    ${colors.blue}http://localhost:5000/health${colors.reset}

${colors.cyan}📊 Supabase Dashboard:${colors.reset}
  ${colors.blue}https://app.supabase.com/project/hhhifxikyhvruwvmaduq${colors.reset}

${colors.cyan}🎯 Próximos passos:${colors.reset}
  1. Abra seu navegador em: ${colors.blue}http://localhost:5173${colors.reset}
  2. Clique em "Gerar QR Code"
  3. Escaneie com seu WhatsApp
  4. Pronto! Dashboard ativo

${colors.yellow}💡 Dica: Mantenha esta janela aberta (backend rodando)${colors.reset}
${colors.green}═══════════════════════════════════════════════════════════${colors.reset}\n
`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}🛑 Encerrando...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}🛑 Encerrando...${colors.reset}`);
  process.exit(0);
});

// Iniciar
(async () => {
  try {
    await startBackend();
    showInstructions();
  } catch (err) {
    console.error(`\n${colors.red}❌ Erro crítico:${colors.reset}`, err.message);
    console.error(`${colors.yellow}\n💡 Verifique se PostgreSQL está rodando (docker-compose up -d)${colors.reset}`);
    process.exit(1);
  }
})();
