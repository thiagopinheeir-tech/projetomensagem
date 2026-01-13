#!/usr/bin/env node

/**
 * PORTABLE LAUNCHER - Inicia Backend + Electron
 * Sem duplicação de backend, sem problemas de porta
 */

const { execFile } = require('child_process');
const path = require('path');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

console.log(`\n${colors.blue}╔════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.blue}║   Top Active WhatsApp 2.0 - App Desktop          ║${colors.reset}`);
console.log(`${colors.blue}║   Starting your internal browser...              ║${colors.reset}`);
console.log(`${colors.blue}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

async function start() {
  try {
    // 1. Iniciar Backend diretamente (sem spawn secundário)
    console.log(`${colors.cyan}🔧 Starting Backend...${colors.reset}`);
    require('./launcher.js');
    
    // 2. Aguardar backend estar pronto
    await new Promise(r => setTimeout(r, 5000));
    
    // 3. Abrir Electron com o mesmo processo
    console.log(`${colors.cyan}🖥️  Opening Application Window...${colors.reset}`);
    console.log(`${colors.green}✅ Ready!${colors.reset}\n`);
    
    // Usar require.resolve para encontrar o electron CLI
    const electronCli = require.resolve('electron/cli.js');
    
    execFile('node', [electronCli, path.join(__dirname, 'electron-main.js')], {
      cwd: __dirname,
      stdio: 'inherit'
    }, (error, stdout, stderr) => {
      if (error && error.code !== 0) {
        console.error(`${colors.red}Error:${colors.reset}`, error.message);
      }
      process.exit(0);
    });
    
  } catch (err) {
    console.error(`${colors.red}❌ Startup Error:${colors.reset}`, err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Se o processo principal morrer, também encerra tudo
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}🛑 Stopping...${colors.reset}`);
  process.exit(0);
});

start();
