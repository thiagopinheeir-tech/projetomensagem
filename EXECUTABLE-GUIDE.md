# 🚀 TopActiveWhatsApp.exe - GUIA DE USO

## ✅ Executável Criado com Sucesso!

**Arquivo:** `top-active-whatsapp.exe` (245 MB)  
**Local:** `C:\Users\thiag\Desktop\top-active-whatsapp\`

---

## 🎯 COMO USAR

### Opção 1: Duplo Clique (Mais Fácil)
1. Navegue até a pasta do projeto
2. Clique duplo em `top-active-whatsapp.exe`
3. Uma janela de console abrirá
4. **Aguarde ~10 segundos** enquanto os serviços iniciam

### Opção 2: Terminal PowerShell
```powershell
cd C:\Users\thiag\Desktop\top-active-whatsapp
.\top-active-whatsapp.exe
```

---

## 📱 SERVIÇOS QUE INICIAM AUTOMATICAMENTE

Quando você executar o .exe:

| Serviço | URL | Status |
|---------|-----|--------|
| **Docker** | `localhost` | Sobe Postgres em background |
| **Backend API** | `http://localhost:5000` | Node.js Express |
| **Frontend** | `http://localhost:3000` | React + Vite |
| **WhatsApp** | Automático | Sincroniza após login |

---

## 🔄 SEQUÊNCIA DE INICIALIZAÇÃO

```
1️⃣  Docker & PostgreSQL (2s)
2️⃣  Backend Node.js (4s)
3️⃣  Frontend React (3s)
4️⃣  PRONTO! ✅
```

**Tempo Total:** ~10 segundos

---

## 📊 VERIFICAR SE ESTÁ FUNCIONANDO

Abra o navegador e acesse:

- **Frontend:** http://localhost:3000
  - Login na aplicação
  - Dashboard + Chat + Configurações

- **Backend API:** http://localhost:5000/api
  - Testa endpoints
  - Verifica logs

---

## ⏹️ COMO PARAR

1. Volte para a janela do console
2. Pressione **CTRL + C**
3. Todos os serviços serão encerrados

---

## ⚠️ REQUISITOS DO SISTEMA

### Necessário:
- ✅ **Windows 64-bit** (x64)
- ✅ **Docker Desktop** instalado
- ✅ **3GB RAM** livre
- ✅ **Portas 3000, 5000, 5432** disponíveis

### Opcional:
- Mais rápido com SSD
- Melhor com 8GB+ RAM

---

## 🐛 TROUBLESHOOTING

### Erro: "Docker não detectado"
```
⚠️ 1/4 Docker não detectado (modo desenvolvimento)
```
**Solução:** Instale Docker Desktop em https://www.docker.com/products/docker-desktop

### Erro: "Porta em uso"
```
listen EADDRINUSE: address already in use :::3000
```
**Solução:** Feche outras aplicações ou mude as portas em `.env`

### Erro: "Arquivo muito grande" (Windows Defender)
```
Windows Defender bloqueou o .exe
```
**Solução:** 
1. Abra `Settings > Privacy & Security > Virus & threat protection`
2. Clique `Manage settings`
3. Adicione a pasta do projeto à exceção

---

## 📦 O QUE ESTÁ INCLUÍDO NO .EXE

```
✅ Node.js v18 (embutido)
✅ Backend + Frontend
✅ Todas as dependências
✅ Docker Compose
✅ Configurações
✅ Banco de Dados SQL
```

**NÃO INCLUÍDO:**
- ❌ Chromium (Puppeteer baixa na primeira execução)
- ❌ node_modules (separado por segurança)
- ❌ .env (use .env.example como base)

---

## 🎨 CUSTOMIZAÇÃO

Se precisar modificar comportamento:

1. Edite `start-server.js` (entry point)
2. Recompile: `npm run build:exe`

---

## 📝 LOGS

Os logs aparecem na janela do console:
- ✅ Verde = Sucesso
- ⚠️ Amarelo = Aviso
- ❌ Vermelho = Erro

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Executar o .exe
2. ✅ Fazer login (http://localhost:3000)
3. ✅ Sincronizar WhatsApp
4. ✅ Testar bot com GPT
5. ✅ Configurar campanhas

---

## 💬 SUPORTE

Se precisar recompinar ou debugar:

```bash
# Terminal no diretório do projeto
npm run dev      # Modo desenvolvimento
npm run backend  # Apenas backend
npm run build:exe # Recompila .exe
```

---

**Desenvolvido com ❤️ - Top Active WhatsApp 2.0**
