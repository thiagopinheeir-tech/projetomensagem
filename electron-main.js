const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

require('dotenv').config();

let mainWindow;
let frontendProcess;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    }
  });

  // Remover menu padrão em produção
  if (!isDev) {
    mainWindow.setMenuBarVisibility(false);
  }

  // Em desenvolvimento, acessa o servidor Vite (http://localhost:5173)
  // Em produção, acessa os arquivos estáticos compilados
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, 'frontend', 'dist', 'index.html')}`;

  console.log(`📍 Carregando URL: ${startUrl}`);
  
  // Tentar conectar à aplicação com retry
  let attempts = 0;
  const tryLoad = () => {
    mainWindow.loadURL(startUrl).catch(err => {
      attempts++;
      console.log(`⏳ Tentativa ${attempts} de conexão...`);
      
      if (attempts < 10) {
        setTimeout(tryLoad, 1000);
      } else {
        console.error('❌ Falha ao conectar após 10 tentativas');
        if (isDev) {
          console.log('📍 Tentando fallback para build...');
          mainWindow.loadURL(`file://${path.join(__dirname, 'frontend', 'dist', 'index.html')}`);
        }
      }
    });
  };
  
  tryLoad();

  // Mostrar window quando pronta
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Janela exibida');
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    console.log('🪟 Janela fechada');
    mainWindow = null;
    
    // Encerrar processos filhos
    cleanupProcesses();
    
    app.quit();
  });
}

function cleanupProcesses() {
  if (frontendProcess) {
    console.log('🛑 Terminando frontend...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']);
      } else {
        frontendProcess.kill();
      }
    } catch (e) { console.error(e); }
    frontendProcess = null;
  }
  
  if (backendProcess) {
    console.log('🛑 Terminando backend...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill();
      }
    } catch (e) { console.error(e); }
    backendProcess = null;
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔧 Iniciando Backend...');
      
      backendProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, PORT: 5000 } // Garantir porta 5000
      });

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Backend] ${output}`);
        
        // Detectar quando o backend está pronto (várias possibilidades)
        if (output.includes('Started on port') || 
            output.includes('Backend pronto') || 
            output.includes('Server running') ||
            output.includes('listening on port') ||
            output.includes(':5000')) {
          console.log('✅ Backend detectado como pronto');
          resolve();
        }
      });

      backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString()}`);
      });

      backendProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar backend:', err.message);
        reject(err);
      });

      // Fallback timeout para resolver se não detectar mensagem
      setTimeout(() => {
        console.log('⚠️ Backend timeout (assumindo iniciado)');
        resolve();
      }, 5000);

    } catch (err) {
      reject(err);
    }
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    try {
      console.log('🎨 Iniciando Frontend Vite...');
      
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      // Spawn npm run dev dentro da pasta frontend
      frontendProcess = spawn(npmCmd, ['run', 'dev'], {
        cwd: path.join(__dirname, 'frontend'),
        stdio: 'pipe',
        shell: true
      });

      frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Frontend] ${output}`);
        
        // Quando Vite reporta que está pronto
        if (output.includes('Local:') || output.includes('ready in')) {
          resolve();
        }
      });

      frontendProcess.stderr.on('data', (data) => {
        console.error(`[Frontend Error] ${data.toString()}`);
      });

      frontendProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar frontend:', err.message);
        reject(err);
      });

      // Timeout de 15 segundos
      setTimeout(() => {
        console.log('✅ Frontend iniciado (timeout)');
        resolve();
      }, 15000);

    } catch (err) {
      reject(err);
    }
  });
}

app.on('ready', async () => {
  try {
    console.log('🚀 Iniciando JT DEV NOCODE Desktop...');
    
    // Iniciar Backend sempre
    await startBackend();

    // Iniciar frontend apenas em dev
    if (isDev) {
      await startFrontend();
    }
    
    console.log('✅ Serviços iniciados, abrindo janela...');
    
    // Criar janela
    createWindow();
  } catch (err) {
    console.error('❌ Erro ao iniciar aplicação:', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupProcesses();
    app.quit();
  }
});

app.on('will-quit', () => {
  cleanupProcesses();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT recebido, encerrando...');
  if (frontendProcess) {
    frontendProcess.kill();
  }
  if (mainWindow) {
    mainWindow.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (frontendProcess) {
    frontendProcess.kill();
  }
  if (mainWindow) {
    mainWindow.close();
  }
  process.exit(0);
});
