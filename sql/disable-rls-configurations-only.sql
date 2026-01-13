-- ====================================
-- DESABILITAR RLS APENAS PARA CONFIGURATIONS
-- ====================================
-- Script seguro que só desabilita RLS na tabela configurations
-- Use este script se outras tabelas não existirem ainda

-- Desabilitar RLS na tabela configurations
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'configurations';

-- Se a consulta acima retornar rowsecurity = false, então RLS foi desabilitado com sucesso!
