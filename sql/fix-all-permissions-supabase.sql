-- ====================================
-- CORRIGIR TODAS AS PERMISSÕES NO SUPABASE
-- ====================================
-- Este script resolve erros: "permission denied for table configurations"
-- Execute este SQL no Supabase SQL Editor
-- Execute cada seção separadamente se necessário

-- ====================================
-- 1. DESABILITAR RLS EM CONFIGURATIONS
-- ====================================
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS está desabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'configurations';

-- Resultado esperado: rls_enabled = false

-- ====================================
-- 2. REMOVER TODAS AS POLÍTICAS DE CONFIGURATIONS
-- ====================================
DROP POLICY IF EXISTS "Users can only access their own data" ON public.configurations;
DROP POLICY IF EXISTS "Allow all for service role" ON public.configurations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.configurations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Users can manage their own configs" ON public.configurations;

-- Verificar políticas existentes (deve retornar 0 linhas)
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'configurations';

-- ====================================
-- 3. GARANTIR PERMISSÕES PARA POSTGRES ROLE
-- ====================================
-- Garantir que o role postgres tem todas as permissões
GRANT ALL PRIVILEGES ON TABLE public.configurations TO postgres;
GRANT ALL PRIVILEGES ON TABLE public.configurations TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.configurations TO anon;
GRANT ALL PRIVILEGES ON TABLE public.configurations TO service_role;

-- Verificar permissões concedidas
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'configurations'
ORDER BY grantee, privilege_type;

-- ====================================
-- 4. VERIFICAR SEQUENCE PERMISSIONS (se houver)
-- ====================================
-- Se a tabela configurations tiver uma coluna id com sequence
DO $$
BEGIN
  -- Verificar e conceder permissões na sequence se existir
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE 'configurations%') THEN
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role';
  END IF;
END $$;

-- ====================================
-- 5. VERIFICAR CONFIGURAÇÃO FINAL
-- ====================================
-- Verificar RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'configurations';

-- Verificar permissões
SELECT 
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'configurations'
GROUP BY grantee;

-- Verificar políticas (deve estar vazio)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'configurations';

-- ====================================
-- RESUMO ESPERADO
-- ====================================
-- RLS: false (desabilitado)
-- Políticas: 0 (nenhuma política ativa)
-- Permissões: postgres, authenticated, anon, service_role têm INSERT, SELECT, UPDATE, DELETE
