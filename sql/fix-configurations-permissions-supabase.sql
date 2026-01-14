-- ====================================
-- CORRIGIR PERMISSÕES DA TABELA CONFIGURATIONS NO SUPABASE
-- ====================================
-- Este script resolve o erro: "permission denied for table configurations"
-- Execute este SQL no Supabase SQL Editor

-- 1. DESABILITAR RLS NA TABELA CONFIGURATIONS
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES (se houver)
DROP POLICY IF EXISTS "Users can only access their own data" ON public.configurations;
DROP POLICY IF EXISTS "Allow all for service role" ON public.configurations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.configurations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.configurations;

-- 3. VERIFICAR SE RLS ESTÁ DESABILITADO
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'configurations';

-- Se a consulta acima retornar rowsecurity = false, então RLS foi desabilitado com sucesso!

-- 4. VERIFICAR PERMISSÕES DA TABELA
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'configurations';

-- ====================================
-- ALTERNATIVA: Se quiser manter RLS habilitado, crie estas políticas:
-- ====================================

-- OPÇÃO 1: Permitir tudo para service role (recomendado para desenvolvimento)
-- CREATE POLICY "Allow all for service role" ON public.configurations
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- OPÇÃO 2: Permitir baseado em user_id (para produção)
-- CREATE POLICY "Users can manage their own configs" ON public.configurations
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Depois de criar as políticas, habilite RLS:
-- ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
