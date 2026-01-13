# WhatsApp Web.js - Guia de Troubleshooting

## ❌ Erro: TargetCloseError ou Protocol Error

Se você está vendo erros como:
```
TargetCloseError: Protocol error (Target.setDiscoverTargets): Target closed
```

### Soluções:

#### 1. Limpar cache e tentar novamente
```bash
# Delete a pasta de autenticação (vai pedir QR code novamente)
rm -rf .wwebjs_auth

# No Windows PowerShell:
Remove-Item -Recurse -Force .wwebjs_auth
```

#### 2. Instalar Chrome/Chromium manualmente
O Puppeteer precisa do Chrome. Certifique-se de que está instalado:
- Windows: Instale o Google Chrome normalmente
- O Puppeteer deve detectar automaticamente

#### 3. Usar headless: false (para debug)
Se o erro persistir, tente rodar com Chrome visível para ver o erro:
Edite `services/whatsapp.js`:
```javascript
puppeteer: {
  headless: false, // Mude para false temporariamente
  ...
}
```

#### 4. Downgrade do Puppeteer (se necessário)
Se o erro persistir, tente uma versão anterior:
```bash
npm install puppeteer@21.6.1 --save
```

#### 5. Verificar processos do Chrome
Às vezes processos antigos do Chrome podem causar conflitos:
```bash
# Windows PowerShell:
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
```

#### 6. Permissões de administrador
Tente executar o servidor como administrador (Windows):
- Clique direito no terminal → "Executar como administrador"

### Configuração Alternativa

Se nada funcionar, tente esta configuração alternativa no `services/whatsapp.js`:

```javascript
puppeteer: {
  headless: 'new', // Nova engine headless
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--disable-gpu'
  ],
  executablePath: undefined // Deixa o Puppeteer encontrar o Chrome automaticamente
}
```

### Logs Úteis

Se o problema persistir, verifique:
1. Versão do Node.js: `node --version` (recomendado: 18.x ou 20.x)
2. Versão do Chrome instalado
3. Logs completos no terminal

### Suporte

Se nenhuma solução funcionar, o problema pode ser específico da sua máquina. Tente:
- Reinstalar Node.js
- Reinstalar dependências: `rm -rf node_modules && npm install`
- Usar Docker (mais isolado)
