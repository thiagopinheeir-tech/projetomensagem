# 🤖 Deploy Automático no Railway

## ✅ Railway CLI Instalado!

Agora posso fazer o deploy automaticamente para você! Só precisa fazer login uma vez.

---

## 🚀 PASSO A PASSO (2 minutos):

### **1. Fazer Login (Só uma vez)** 🔐

No terminal, execute:

```bash
railway login
```

- Isso vai abrir o navegador
- Faça login com sua conta Railway (GitHub)
- Volte ao terminal quando terminar

**Depois disso, eu faço tudo automaticamente!**

---

### **2. Executar Script Automático** 🤖

Depois do login, execute:

```bash
node scripts/deploy-railway.js
```

**O script vai:**
- ✅ Verificar se está logado
- ✅ Linkar o projeto (se necessário)
- ✅ Fazer deploy automaticamente
- ✅ Mostrar próximos passos

---

## 🎯 OU FAÇA TUDO MANUALMENTE:

Se preferir fazer tudo manual:

```bash
# 1. Login (só uma vez)
railway login

# 2. Linkar projeto
railway link

# 3. Fazer deploy
railway up

# 4. Ver logs
railway logs

# 5. Ver status
railway status
```

---

## 📝 DEPOIS DO DEPLOY:

1. **No site do Railway:**
   - Vá em **Settings → Networking**
   - Clique em **"Generate Domain"**
   - Copie a URL gerada

2. **Testar:**
   - Acesse: `https://sua-url.railway.app/health`
   - Deve retornar JSON com `"status": "ok"`

---

## 💡 DICA:

**Execute agora:**
```bash
railway login
```

Depois me avise que eu executo o script automático para você! 🚀
