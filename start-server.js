#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  title: (msg) => console.log(`\n${colors.blue}🚀 ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  #!/usr/bin/env node

  const { execSync, spawn } = require('child_process');
  const path = require('path');
  const readline = require('readline');
  const os = require('os');

  // Cores para console
  const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
  };

  const log = {
    title: (msg) => console.log(`\n${colors.blue}🚀 ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
    divider: () => console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`),
  };

  let processes = [];

  const gracefulShutdown = () => {
    log.info('Encerrando processos...');
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    });
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  const runCommand = (command, cwd = __dirname, shell = true) => {
    try {
      return execSync(command, { 
        stdio: 'pipe', 
        cwd,
        shell 
      });
    } catch (err) {
      return null;
    }
  };

  const startProcess = (command, args, options = {}) => {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: __dirname,
        shell: false,
        stdio: 'inherit',
        ...options
      });

      processes.push(proc);

      proc.on('error', (err) => {
        log.error(`Erro ao iniciar ${command}: ${err.message}`);
        resolve();
      });

      proc.on('close', () => {
        resolve();
      });
    });
  };

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  // Se for invocado com role=server, inicia apenas o backend (usado pelo spawn em pacote)
  if (process.argv.includes('--role=server')) {
    try {
      // carregar o servidor diretamente
      require(path.join(__dirname, 'server.js'));
    } catch (e) {
      console.error('Falha ao iniciar server role:', e && e.message ? e.message : e);
      process.exit(1);
    }
    // manter processo em execução enquanto o servidor estiver ativo
    return;
  }

  const main = async () => {
    log.divider();
    log.title('JT DEV NOCODE 2.0 - Inicializando');
    log.divider();

    // 1. Docker
    log.info('Verificando Docker...');
    try {
      execSync('docker --version', { stdio: 'pipe' });
      try {
        execSync('docker-compose up -d', { 
          stdio: 'pipe', 
          cwd: __dirname 
        });
        log.success('1/4 Docker & PostgreSQL iniciado');
      
        // Aguardar banco estar pronto
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        log.warn('1/4 Erro ao iniciar Docker (verifique docker-compose.yml)');
      }
    } catch (e) {
      log.warn('1/4 Docker não detectado (modo desenvolvimento)');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Backend
    log.info('Iniciando Backend (Node.js)...');
    log.info('Aguarde a mensagem de sucesso...');

    // Para evitar conflito de ports ao executar dentro do mesmo processo,
    // spawnamos um processo separado que inicia apenas o backend.
    try {
      if (process.pkg) {
        // executável empacotado: spawn a mesma exe com role=server
        const serverProc = spawn(process.execPath, ['--role=server'], {
          cwd: __dirname,
          stdio: 'inherit'
        });
        serverProc.on('error', (err) => log.error(`Erro ao spawnar backend: ${err.message}`));
        processes.push(serverProc);
      } else {
        // modo desenvolvimento: spawn node directly with server.js
        const serverProc = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
          cwd: __dirname,
          stdio: 'inherit'
        });
        serverProc.on('error', (err) => log.error(`Erro ao spawnar backend: ${err.message}`));
        processes.push(serverProc);
      }
    } catch (e) {
      log.error('Não foi possível iniciar o backend automaticamente. Verifique instalação do Node/npm.');
    }

    // Aguardar Backend estar pronto (~4s)
    await new Promise(resolve => setTimeout(resolve, 4000));

    // 3. Frontend
    log.info('Iniciando Frontend (Vite React)...');
  
    // Frontend: tentar iniciar via Node (serve static build) ou via npm dev
    try {
      const frontendDir = path.join(__dirname, 'frontend');
      // Se existir build (dist) servir via o backend estático — aqui só tentamos dev
      const frontendProc = spawn(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: false
      });
      frontendProc.on('error', (err) => {
        log.warn(`Falha ao iniciar frontend via npm: ${err.message}`);
        log.info('Se preferir, execute manualmente: cd frontend && npm run dev');
      });
      processes.push(frontendProc);
      await new Promise(resolve => setTimeout(resolve, 3000));
      log.success('3/4 Frontend rodando em http://localhost:3000');
    } catch (e) {
      log.warn('Não foi possível iniciar o frontend automaticamente. Inicie manualmente em frontend/.');
    }

    log.divider();
    log.success('SISTEMA PRONTO! 🎉');
    log.divider();
  
    console.log(`
  ${colors.green}═══════════════════════════════════════════════════${colors.reset}
  ${colors.blue}🌐 APLICAÇÃO INICIADA COM SUCESSO!${colors.reset}
  ${colors.green}═══════════════════════════════════════════════════${colors.reset}

  ${colors.cyan}📱 Frontend:${colors.reset}   http://localhost:3000
  ${colors.cyan}🔌 Backend:${colors.reset}    http://localhost:5000
  ${colors.cyan}🐘 Database:${colors.reset}   localhost:5432
  ${colors.cyan}🤖 WhatsApp:${colors.reset}   Aguardando sincronização...

  ${colors.yellow}💡 Dica: Deixe esta janela aberta enquanto usar a aplicação${colors.reset}
  ${colors.yellow}🛑 Pressione CTRL+C para encerrar todos os serviços${colors.reset}

  ${colors.green}═══════════════════════════════════════════════════${colors.reset}
    `);

    // Manter processo vivo
    await new Promise(resolve => {
      readline.createInterface({
        input: process.stdin,
        output: process.stdout
      }).on('close', () => {
        gracefulShutdown();
        resolve();
      });
    });
  };

  main().catch(err => {
    log.error(`Erro fatal: ${err.message}`);
    gracefulShutdown();
  });
