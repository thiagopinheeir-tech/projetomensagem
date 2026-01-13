# ✅ Instruções - Desabilitar RLS apenas para configurations

## Erro Encontrado

Você recebeu o erro: `relation "public.users" does not exist`

Isso significa que algumas tabelas do schema completo ainda não foram criadas no Supabase.

## Solução Simples

Execute apenas o SQL para desabilitar RLS na tabela `configurations` (que é a única que precisa no momento):

### Passo 1: Acesse o SQL Editor do Supabase

1. Abra: https://app.supabase.com/project/hhhifxikyhvruwvmaduq/sql/new
2. Ou vá em: SQL Editor → New Query

### Passo 2: Execute este SQL (apenas para configurations)

Copie e cole este SQL:

```sql
-- Desabilitar RLS na tabela configurations
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;
```

### Passo 3: Verificar

Execute este SQL para verificar se funcionou:

```sql
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'configurations';
```

Se `rowsecurity` for `false`, então funcionou! ✅

### Passo 4: Testar

1. Vá para a página de configurações do chatbot
2. Tente salvar uma configuração
3. Deve funcionar agora! 🎉

## Arquivo Criado

Criei o arquivo `sql/disable-rls-configurations-only.sql` com o SQL correto para você usar.

## Por que isso funciona?

- Desabilita RLS apenas na tabela `configurations`
- Não tenta modificar tabelas que podem não existir
- Resolve o problema de permissão para salvar configurações

## Se ainda não funcionar

Verifique se a tabela `configurations` existe:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'configurations';
```

Se não retornar nenhuma linha, a tabela não existe e você precisa executar o schema completo primeiro (arquivo `sql/supabase-setup.sql`).
