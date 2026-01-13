# 🔧 Corrigir Senha na DATABASE_URL

## ⚠️ Problema Atual
Erro: `ENOTFOUND base` - A URL está sendo parseada incorretamente.

## ✅ Solução: Usar Connection Pooling (Recomendado)

### Passo 1: Obter Connection Pooling do Supabase

1. **Supabase Dashboard** → Seu projeto
2. **Menu lateral** → **Database** (não "Settings")
3. Procure por **"Connection string"** ou **"Connect"**
4. Use a opção **"Connection pooling"** (porta 6543)
5. Copie a URL completa que aparece

### Passo 2: Atualizar no Railway

1. **Railway** → serviço `projetomensagem` → **Variables**
2. Encontre `DATABASE_URL` → **Edit**
3. Cole a URL do Connection Pooling
4. **Save**

---

## 🔄 Alternativa: Codificar Senha Corretamente

Se preferir usar a connection direta, a senha precisa ser codificada:

### Caracteres que precisam ser codificados:
- `#` → `%23`
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `&` → `%26`
- `=` → `%3D`
- `+` → `%2B`
- ` ` (espaço) → `%20`

### Para a senha `Pedro150510#11`:
- A URL completa seria:
  ```
  postgresql://postgres:Pedro150510%2311@db.hhhifxikyhvruwvmaduq.supabase.co:5432/postgres
  ```

### Mas se ainda não funcionar:
- Use **Connection Pooling** (mais estável e recomendado)

---

## 📋 Checklist

- [ ] Usar Connection Pooling (recomendado)
- [ ] Ou codificar senha corretamente
- [ ] Atualizar no Railway
- [ ] Aguardar redeploy (1-2 minutos)
- [ ] Verificar logs (não deve mais aparecer `ENOTFOUND`)
