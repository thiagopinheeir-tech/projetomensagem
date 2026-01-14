# 🔧 Correção: Erro de Permissão no Supabase

## ❌ Erro Encontrado

```
❌ [PUT /config/scheduler] Erro ao inserir no Supabase: {
  code: '42501',
  details: null,
  hint: null,
  message: 'permission denied for table configurations'
}
```

## 🔍 Causa

O Supabase tem **RLS (Row Level Security) habilitado** na tabela `configurations` sem políticas adequadas, ou a **SERVICE_KEY não está configurada** no Railway.

---

## ✅ Solução 1: Desabilitar RLS (Recomendado para desenvolvimento)

### Passo 1: Executar SQL no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute o script: `sql/fix-configurations-permissions-supabase.sql`

Ou execute diretamente:

```sql
-- Desabilitar RLS na tabela configurations
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can only access their own data" ON public.configurations;
DROP POLICY IF EXISTS "Allow all for service role" ON public.configurations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.configurations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.configurations;

-- Verificar se RLS está desabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'configurations';
```

**Resultado esperado:** `rls_enabled = false`

---

## ✅ Solução 2: Configurar SERVICE_KEY (Alternativa)

### Passo 1: Obter SERVICE_KEY no Supabase

1. Acesse **Supabase Dashboard**
2. Vá em **Settings** → **API**
3. Copie a **`service_role` key** (secret key)

### Passo 2: Adicionar no Railway

1. Acesse **Railway Dashboard**
2. Vá no seu projeto → **Variables**
3. Adicione:
   - **Key:** `SUPABASE_SERVICE_KEY`
   - **Value:** Cole a service_role key do Supabase

### Passo 3: Reiniciar Serviço

1. No Railway, vá em **Deployments**
2. Clique em **...** → **Restart**

**A SERVICE_KEY bypassa RLS automaticamente!**

---

## 🔍 Verificar Configuração Atual

### Verificar se SERVICE_KEY está configurada

No Railway, verifique se existe a variável:
- `SUPABASE_SERVICE_KEY` ✅ (preferível)
- `SUPABASE_ANON_KEY` ⚠️ (pode ter problemas com RLS)

### Verificar logs do Railway

Procure por estas mensagens nos logs:

```
✅ Usando SUPABASE_SERVICE_KEY (bypass RLS)  ← Ideal
⚠️ Usando SUPABASE_ANON_KEY (pode ter problemas com RLS)  ← Pode causar erro
```

---

## ✅ Solução Rápida (Fallback Funciona)

**Boa notícia:** O sistema já tem fallback funcionando! Mesmo com erro no Supabase, ele salva no PostgreSQL local:

```
❌ [PUT /config/scheduler] Erro ao inserir no Supabase: ...
✅ [PUT /config/scheduler] Configuração salva no PostgreSQL
```

**O sistema continua funcionando**, mas seria ideal corrigir o Supabase para sincronização completa.

---

## 🎯 Recomendação

**Para desenvolvimento:**
- Use **Solução 1** (Desabilitar RLS) - Mais rápido

**Para produção:**
- Use **Solução 2** (Configurar SERVICE_KEY) - Mais seguro
- Ou crie políticas RLS adequadas baseadas em `user_id`

---

## 📝 Após Corrigir

Após aplicar a correção, você verá nos logs:

```
✅ [PUT /config/scheduler] Configuração atualizada no Supabase
✅ [PUT /config/scheduler] Configuração salva no PostgreSQL
```

Em vez de:

```
❌ [PUT /config/scheduler] Erro ao inserir no Supabase: ...
✅ [PUT /config/scheduler] Configuração salva no PostgreSQL
```

---

**Última atualização:** 13/01/2026
