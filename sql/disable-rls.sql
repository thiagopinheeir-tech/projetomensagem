-- Desabilitar RLS (para desenvolvimento)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Remover policies existentes
DROP POLICY IF EXISTS "Users can only access their own data" ON public.configurations;
DROP POLICY IF EXISTS "Users can only access their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can only access their contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can only access their campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can only access their logs" ON public.audit_logs;

-- Confirmação
SELECT 'RLS desabilitado para desenvolvimento' as status;
