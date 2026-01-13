// Preload script para contexto isolado
// Expõe apenas APIs seguras do Node para o frontend

const { contextBridge, ipcMain, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // IPC comunicação entre frontend e main
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});

contextBridge.exposeInMainWorld('app', {
  version: '2.0.0',
  name: 'Top Active WhatsApp'
});
