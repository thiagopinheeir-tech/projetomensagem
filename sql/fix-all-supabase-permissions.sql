-- ====================================
-- CORRIGIR TODAS AS PERMISSÕES DO SUPABASE
-- ====================================
-- Execute este script no SQL Editor do Supabase
-- para garantir que todas as tabelas podem ser escritas sem problemas de RLS
--
-- IMPORTANTE: Este script desabilita RLS (Row Level Security) em todas as tabelas
-- para permitir operações usando SERVICE_KEY. Isso é adequado para aplicações
-- onde o backend controla o acesso usando SERVICE_KEY.

-- ====================================
-- 1. DESABILITAR RLS EM TODAS AS TABELAS
-- ====================================

-- Tabelas principais
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notes DISABLE ROW LEVEL SECURITY;

-- Tabelas do chatbot
ALTER TABLE IF EXISTS public.chatbot_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chatbot_profiles DISABLE ROW LEVEL SECURITY;

-- Tabelas de automações
ALTER TABLE IF EXISTS public.automation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.automation_menus DISABLE ROW LEVEL SECURITY;
-- Nota: automation_menu_options não existe - as opções são armazenadas como JSONB na tabela automation_menus
ALTER TABLE IF EXISTS public.automation_menu_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_appointments DISABLE ROW LEVEL SECURITY;

-- ====================================
-- 2. REMOVER POLÍTICAS EXISTENTES
-- ====================================

-- Remover políticas das tabelas principais
DROP POLICY IF EXISTS "Users can only access their own data" ON public.configurations;
DROP POLICY IF EXISTS "Users can only access their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can only access their contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can only access their campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can only access their logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can access their chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Public can insert chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Enable select for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Enable update for service role" ON public.chat_history;
DROP POLICY IF EXISTS "Enable delete for service role" ON public.chat_history;

-- Remover políticas das tabelas de automações
DROP POLICY IF EXISTS "Users can access automation rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can access automation menus" ON public.automation_menus;
-- Nota: automation_menu_options não existe - as opções são armazenadas como JSONB na tabela automation_menus
DROP POLICY IF EXISTS "Users can access automation menu state" ON public.automation_menu_state;
DROP POLICY IF EXISTS "Users can access booking appointments" ON public.booking_appointments;

-- ====================================
-- 3. GARANTIR QUE AS TABELAS EXISTEM
-- ====================================

-- Tabela chat_history (se não existir, criar)
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  sentiment VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ====================================

-- Índices para chat_history
CREATE INDEX IF NOT EXISTS idx_chat_history_phone ON public.chat_history(phone);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id) WHERE user_id IS NOT NULL;

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON public.messages(phone);

-- Índices para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);

-- Índices para campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id) WHERE user_id IS NOT NULL;

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Índices para configurations
CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON public.configurations(user_id) WHERE user_id IS NOT NULL;

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Índices para tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id) WHERE lead_id IS NOT NULL;

-- Índices para automation_rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON public.automation_rules(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_rules_profile_id ON public.automation_rules(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON public.automation_rules(is_active);

-- Índices para automation_menus
CREATE INDEX IF NOT EXISTS idx_automation_menus_user_id ON public.automation_menus(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_menus_profile_id ON public.automation_menus(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_menus_is_active ON public.automation_menus(is_active);

-- Índices para automation_menu_state
CREATE INDEX IF NOT EXISTS idx_automation_menu_state_phone ON public.automation_menu_state(phone);
CREATE INDEX IF NOT EXISTS idx_automation_menu_state_expires_at ON public.automation_menu_state(expires_at);

-- Índices para booking_appointments
CREATE INDEX IF NOT EXISTS idx_booking_appointments_user_id ON public.booking_appointments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_appointments_profile_id ON public.booking_appointments(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_appointments_phone ON public.booking_appointments(phone);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_start_time ON public.booking_appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_status ON public.booking_appointments(status);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_phone_status ON public.booking_appointments(phone, status);

-- ====================================
-- 5. CONFIRMAÇÃO
-- ====================================

SELECT 
  '✅ Permissões corrigidas com sucesso!' as status,
  'RLS desabilitado em todas as tabelas' as message,
  'Sistema pronto para usar SERVICE_KEY' as note;

-- Verificar status das tabelas
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'configurations', 'chat_history', 'conversations', 
    'messages', 'contacts', 'campaigns', 'audit_logs', 'leads', 
    'tasks', 'notes', 'chatbot_templates', 'chatbot_profiles',
    'automation_rules', 'automation_menus',
    'automation_menu_state', 'booking_appointments'
  )
ORDER BY tablename;
