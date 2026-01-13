# 🔧 Correção - Permissões Supabase (RLS)

## Problema Identificado

**Erro:** `permission denied for table configurations`

O Supabase usa Row Level Security (RLS) por padrão. Quando você usa a `ANON_KEY`, ela está sujeita às políticas RLS, que podem bloquear operações de escrita.

## Solução Aplicada

### Mudança no `config/supabase.js`

O código agora:
1. **Prioriza `SUPABASE_SERVICE_KEY`** quando disponível (bypass RLS)
2. **Faz fallback para `SUPABASE_ANON_KEY`** se SERVICE_KEY não estiver disponível
3. **Loga qual chave está sendo usada** para debug

### Por que SERVICE_KEY?

A `SERVICE_KEY` (também chamada de "service_role key"):
- ✅ Bypassa Row Level Security (RLS)
- ✅ Permite operações de escrita/leitura sem políticas
- ✅ Ideal para operações administrativas no backend

A `ANON_KEY`:
- ⚠️ Sujeita a políticas RLS
- ⚠️ Pode ser bloqueada por políticas de segurança
- ⚠️ Ideal para operações do frontend

## Como Configurar

1. **Obter SERVICE_KEY:**
   - Acesse: https://supabase.com/dashboard
   - Selecione seu projeto
   - Vá em Settings → API
   - Copie a **"service_role" key** (NÃO a anon key!)

2. **Adicionar no .env:**
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua-chave-anon-aqui
   SUPABASE_SERVICE_KEY=sua-service-role-key-aqui
   ```

3. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

## Verificação

Após configurar, você deve ver no console:
```
✅ Usando SUPABASE_SERVICE_KEY (bypass RLS)
```

Ou se não tiver SERVICE_KEY:
```
⚠️  Usando SUPABASE_ANON_KEY (pode ter problemas com RLS)
```

## Alternativa (se não quiser usar SERVICE_KEY)

Se preferir usar apenas ANON_KEY, você precisaria:
1. Desabilitar RLS na tabela `configurations` (não recomendado)
2. Criar políticas RLS apropriadas que permitam INSERT/UPDATE

A opção mais segura e recomendada é usar a SERVICE_KEY no backend.
