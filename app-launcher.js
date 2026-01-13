#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   JT DEV NOCODE 2.0 Desktop App            ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// Executar via Electron
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
const electronArgs = [path.join(__dirname, 'electron-main.js')];

console.log('🚀 Iniciando aplicação Electron...\n');

const child = spawn(electronPath || 'electron', electronArgs, {
  stdio: 'inherit',
  shell: true,
  windowsHide: false
});

child.on('error', (err) => {
  console.error('❌ Erro ao iniciar:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});
