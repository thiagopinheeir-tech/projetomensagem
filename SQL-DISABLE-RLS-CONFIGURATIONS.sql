-- ====================================
-- DESABILITAR RLS PARA CONFIGURATIONS
-- ====================================
-- Execute este SQL no Supabase SQL Editor se ainda estiver tendo problemas
-- com permissões mesmo usando SERVICE_KEY

-- Desabilitar RLS na tabela configurations (para desenvolvimento)
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'configurations';

-- Se precisar reabilitar depois (não recomendado para desenvolvimento):
-- ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
