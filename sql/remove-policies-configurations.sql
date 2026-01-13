-- ====================================
-- REMOVER TODAS AS POLÍTICAS RLS DE CONFIGURATIONS
-- ====================================
-- Execute este SQL mesmo se RLS estiver desabilitado
-- Algumas políticas podem estar causando problemas

-- Ver políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'configurations';

-- Remover todas as políticas (se existirem)
DROP POLICY IF EXISTS "Users can only access their own data" ON public.configurations;
DROP POLICY IF EXISTS "Allow all for service role" ON public.configurations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.configurations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.configurations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.configurations;

-- Verificar novamente (deve retornar 0 linhas)
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'configurations';
