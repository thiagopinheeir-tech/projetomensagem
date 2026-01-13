# 🔧 Corrigir: "Connected branch does not exist"

## ❌ Problema:
Railway está configurado para usar branch `main`, mas essa branch não existe no GitHub.

## ✅ SOLUÇÃO: Não precisa criar novo projeto!

Basta criar a branch `main` no GitHub ou ajustar a branch no Railway.

---

## 🚀 OPÇÃO 1: Criar Branch no GitHub (Recomendado)

### **Se o repositório já existe no GitHub:**

1. **Acesse:** https://github.com/thiagopinheeir-tech/projetomensagem
2. **Verifique qual branch existe:**
   - Pode ser `master` ou outra branch
   - Ou pode não ter nenhuma branch ainda

3. **Se não tiver código no GitHub:**
   - Você precisa fazer push do código
   - Veja instruções abaixo

### **Se o repositório NÃO existe:**

1. **Crie o repositório:**
   - Acesse: https://github.com/new
   - Nome: `projetomensagem`
   - Público ou Privado
   - **NÃO** marque "Add README"
   - Clique em "Create repository"

2. **Faça push do código:**
   - Veja instruções na seção abaixo

---

## 🚀 OPÇÃO 2: Ajustar Branch no Railway

Se o repositório já existe mas com outra branch (ex: `master`):

1. **No Railway, vá em Settings → Source**
2. **Clique no dropdown da branch `main`**
3. **Selecione a branch que existe** (ex: `master`)
4. **Salve**

---

## 📝 Como Fazer Push do Código para GitHub

### **Passo 1: Instalar Git (se não tiver)**

Baixe e instale: https://git-scm.com/download/win

### **Passo 2: Inicializar Git e Fazer Push**

Abra PowerShell no diretório do projeto e execute:

```powershell
cd c:\Users\thiag\Desktop\top-active-whatsapp

# Inicializar git (se ainda não tiver)
git init

# Adicionar todos arquivos
git add .

# Fazer commit
git commit -m "Initial commit - Railway ready"

# Adicionar repositório remoto
git remote add origin https://github.com/thiagopinheeir-tech/projetomensagem.git

# Criar branch main e fazer push
git branch -M main
git push -u origin main
```

**Se pedir credenciais:**
- Use seu usuário GitHub
- Use Personal Access Token (não senha)
- Para criar token: https://github.com/settings/tokens

---

## 🎯 SOLUÇÃO RÁPIDA (Se Git não estiver instalado):

### **Opção A: Usar GitHub Desktop**

1. **Baixe:** https://desktop.github.com/
2. **Instale e faça login**
3. **File → Add Local Repository**
4. **Selecione:** `c:\Users\thiag\Desktop\top-active-whatsapp`
5. **Publish repository** (vai criar no GitHub)

### **Opção B: Mudar Branch no Railway**

1. **No Railway, Settings → Source**
2. **Clique no dropdown da branch**
3. **Se não tiver branch, crie uma no GitHub primeiro**
4. **Ou use outra branch que exista**

---

## ✅ O QUE FAZER AGORA:

### **1. Verificar se repositório existe:**

Acesse: https://github.com/thiagopinheeir-tech/projetomensagem

- **Se existir:** Veja qual branch tem
- **Se não existir:** Precisa criar

### **2. Se repositório não existe:**

**Criar e fazer push:**
- Crie no GitHub
- Faça push do código (veja instruções acima)

### **3. Se repositório existe mas sem branch main:**

**Opção A:** Criar branch `main` no GitHub
**Opção B:** Mudar branch no Railway para a que existe

---

## 💡 RECOMENDAÇÃO:

**A forma mais fácil:**
1. **Instale GitHub Desktop** (se não tiver Git)
2. **Publique o repositório**
3. **No Railway, a branch `main` vai aparecer automaticamente**

**Ou:**
1. **No Railway, mude a branch** para uma que existe
2. **Ou crie a branch `main` no GitHub**

---

## 📝 Me Diga:

1. **O repositório existe no GitHub?**
   - Acesse: https://github.com/thiagopinheeir-tech/projetomensagem
   - Existe ou dá 404?

2. **Se existe, qual branch tem?**
   - `master`? `main`? Outra?

Com essas informações, te ajudo a resolver! 🔧
