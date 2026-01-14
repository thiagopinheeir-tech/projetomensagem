# 🔧 Correção Completa: Permissões do Supabase (Versão 2)

## ❌ Erro Ainda Persiste

Mesmo após executar o primeiro script, o erro continua:

```
❌ [PUT /config/scheduler] Erro ao inserir no Supabase: {
  code: '42501',
  message: 'permission denied for table configurations'
}

Erro ao salvar status no Supabase: {
  code: '42501',
  message: 'permission denied for table configurations'
}
```

---

## 🔍 Possíveis Causas

1. **RLS não foi desabilitado corretamente** - Pode estar habilitado novamente
2. **SERVICE_KEY não configurada** - Railway está usando ANON_KEY ao invés de SERVICE_KEY
3. **Permissões não concedidas** - Roles não têm privilégios adequados
4. **Políticas RLS ainda ativas** - Políticas não foram removidas corretamente

---

## ✅ Solução Completa

### Passo 1: Executar Script SQL Mais Robusto

Execute o script completo: `sql/fix-all-permissions-supabase.sql`

Este script:
- ✅ Desabilita RLS
- ✅ Remove TODAS as políticas
- ✅ Concede permissões para todos os roles (postgres, authenticated, anon, service_role)
- ✅ Verifica configuração final

**Importante:** Execute o script completo no Supabase SQL Editor.

---

### Passo 2: Verificar SERVICE_KEY no Railway

**O problema mais provável é que a SERVICE_KEY não está configurada.**

#### 2.1 Obter SERVICE_KEY no Supabase

1. Acesse **Supabase Dashboard**
2. Vá em **Settings** → **API**
3. Copie a **`service_role` key** (secret key - fica na parte inferior)

#### 2.2 Adicionar no Railway

1. Acesse **Railway Dashboard**
2. Vá no seu projeto → **Variables**
3. Verifique se existe:
   - `SUPABASE_SERVICE_KEY` ← **Deve ter esta**
   - `SUPABASE_ANON_KEY` ← Se só tiver esta, adicione SERVICE_KEY

4. Se não existir `SUPABASE_SERVICE_KEY`:
   - Clique em **New Variable**
   - **Key:** `SUPABASE_SERVICE_KEY`
   - **Value:** Cole a service_role key do Supabase
   - Clique em **Add**

#### 2.3 Verificar nos Logs

Após adicionar a SERVICE_KEY, reinicie o serviço e verifique os logs:

**Logs corretos:**
```
✅ Usando SUPABASE_SERVICE_KEY (bypass RLS)
```

**Logs incorretos:**
```
⚠️ Usando SUPABASE_ANON_KEY (pode ter problemas com RLS)
```

---

### Passo 3: Reiniciar Serviço no Railway

1. No Railway, vá em **Deployments**
2. Clique em **...** → **Restart**
3. Aguarde o serviço reiniciar

---

## 🧪 Testar Após Correção

### Teste 1: Salvar Configuração do Scheduler

1. Acesse "Chaves e Integrações" → "Sistema de Agendamento"
2. Configure e salve
3. Verifique logs:

**Sucesso esperado:**
```
✅ [PUT /config/scheduler] Configuração atualizada no Supabase
✅ [PUT /config/scheduler] Configuração salva no PostgreSQL
```

### Teste 2: Toggle do Chatbot

1. Acesse "Chatbot IA"
2. Ative/desative o chatbot
3. Verifique logs:

**Sucesso esperado:**
```
✅ Status do chatbot atualizado no Supabase
```

**Erro:**
```
Erro ao salvar status no Supabase: ...
```

---

## 📋 Checklist Completo

- [ ] Script SQL executado (`fix-all-permissions-supabase.sql`)
- [ ] RLS desabilitado na tabela `configurations`
- [ ] Todas as políticas removidas
- [ ] Permissões concedidas para todos os roles
- [ ] `SUPABASE_SERVICE_KEY` configurada no Railway
- [ ] Serviço reiniciado no Railway
- [ ] Logs mostram: "✅ Usando SUPABASE_SERVICE_KEY"
- [ ] Teste de salvamento funciona
- [ ] Teste de toggle funciona

---

## 🔧 Script SQL Completo (Já Criado)

O arquivo `sql/fix-all-permissions-supabase.sql` contém:

```sql
-- 1. Desabilitar RLS
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas
DROP POLICY IF EXISTS ...;

-- 3. Conceder permissões para todos os roles
GRANT ALL PRIVILEGES ON TABLE public.configurations TO postgres;
GRANT ALL PRIVILEGES ON TABLE public.configurations TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.configurations TO anon;
GRANT ALL PRIVILEGES ON TABLE public.configurations TO service_role;

-- 4. Verificações finais
SELECT ...;
```

---

## 🎯 Ação Recomendada

**MAIS IMPORTANTE:** Configure a `SUPABASE_SERVICE_KEY` no Railway.

A SERVICE_KEY bypassa RLS automaticamente, então mesmo que o RLS esteja habilitado, funcionará.

---

**Última atualização:** 14/01/2026
