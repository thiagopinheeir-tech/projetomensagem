-- ====================================
-- CORRIGIR PERMISSÕES DA TABELA chat_history
-- ====================================
-- Execute este script no SQL Editor do Supabase
-- para garantir que a tabela chat_history pode ser escrita

-- 1. Garantir que a tabela existe (se não existir, criar)
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  sentiment VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Desabilitar RLS na tabela chat_history
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;

-- 3. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Enable insert for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Enable select for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Enable update for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Enable delete for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Users can access their chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Public can insert chat history" ON public.chat_history;

-- 4. Garantir permissões de acesso (caso RLS seja reabilitado no futuro)
-- Comentado porque RLS está desabilitado, mas deixado como referência
/*
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role"
ON public.chat_history
FOR ALL
USING (true)
WITH CHECK (true);
*/

-- 5. Criar índices para melhor performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_chat_history_phone ON public.chat_history(phone);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);

-- Confirmação
SELECT 'Tabela chat_history configurada com sucesso! RLS desabilitado.' as status;
