const { exec } = require('child_process');
const path = require('path');

console.log('🧹 Limpando processos Chrome...');

if (process.platform === 'win32') {
  // Windows PowerShell
  exec('powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Get-Process chromium -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"', (error) => {
    if (error && !error.message.includes('Cannot find a process')) {
      console.error('❌ Erro ao limpar processos:', error.message);
    } else {
      console.log('✅ Processos Chrome limpos');
    }
    
    // Aguardar 2 segundos antes de continuar
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });
} else {
  // Linux/Mac
  exec('pkill -f "chrome.*wwebjs" || pkill -f "chromium.*wwebjs" || true', (error) => {
    console.log('✅ Processos limpos (se existiam)');
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });
}
