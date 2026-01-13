--- ====================================
-- SCHEMA SUPABASE - TOP ACTIVE WHATSAPP
-- ====================================
-- Execute todos os comandos abaixo no SQL Editor do Supabase
-- 
-- NOTA: As foreign keys para users foram removidas para evitar conflitos
-- de tipo. Se você quiser adicionar foreign keys posteriormente, certifique-se
-- de que a tabela users existe com id UUID.

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE CONFIGURAÇÕES
-- Nota: user_id é opcional para permitir configuração global sem usuário específico
CREATE TABLE IF NOT EXISTS public.configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Opcional, sem foreign key por enquanto para evitar conflitos
  whatsapp_number VARCHAR(20),
  openai_api_key TEXT, -- TEXT para suportar chaves criptografadas
  business_name VARCHAR(255),
  business_description TEXT,
  business_services TEXT,
  services TEXT[], -- Array de serviços
  tone VARCHAR(50) DEFAULT 'amigavel', -- 'amigavel', 'profissional', 'casual'
  model VARCHAR(50) DEFAULT 'gpt-4o-mini', -- Modelo OpenAI
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 300,
  custom_prompt TEXT, -- Instruções especiais/prompt customizado
  greeting_message TEXT,
  farewell_message TEXT,
  out_of_hours_message TEXT,
  default_responses JSONB, -- Respostas padrão (preço, site, teste, etc.)
  special_instructions TEXT,
  enable_chatbot BOOLEAN DEFAULT true,
  enable_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- Removido UNIQUE(user_id) para permitir múltiplas configurações
);

-- Criar índice para user_id se necessário (sem foreign key por enquanto)
-- Comentado para evitar erro se a coluna não existir - descomentar após garantir que a coluna existe
-- CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON public.configurations(user_id) WHERE user_id IS NOT NULL;

-- 3. TABELA DE HISTÓRICO DE CHAT (Conversas com Clientes)
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  sentiment VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE CONVERSAS (Threads/Tópicos)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Sem foreign key para evitar conflitos de tipo
  phone VARCHAR(20) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

-- 5. TABELA DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID, -- Sem foreign key para evitar conflitos
  phone VARCHAR(20) NOT NULL,
  sender VARCHAR(50), -- 'user' ou 'bot'
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'audio', 'file'
  content TEXT,
  media_url VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE CONTATOS
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Sem foreign key para evitar conflitos de tipo
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  tags TEXT[], -- Array de tags
  last_message_date TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  is_vip BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE CAMPANHAS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Sem foreign key para evitar conflitos de tipo
  name VARCHAR(255) NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  target_contacts TEXT[], -- Array de phone numbers
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed'
  scheduled_at TIMESTAMP,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE LOGS/AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Sem foreign key para evitar conflitos de tipo
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA DE LEADS/OPORTUNIDADES (CRM)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  contact_id UUID, -- Referência ao contato (opcional)
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  company VARCHAR(255),
  title VARCHAR(255), -- Cargo/posição
  source VARCHAR(100), -- Origem do lead (whatsapp, site, indicação, etc)
  status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, proposal, negotiation, won, lost
  stage VARCHAR(100), -- Etapa no pipeline
  value DECIMAL(10,2), -- Valor estimado da oportunidade
  probability INTEGER DEFAULT 0, -- Probabilidade de fechar (0-100)
  expected_close_date DATE,
  tags TEXT[],
  notes TEXT,
  assigned_to UUID, -- ID do usuário responsável
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

-- 10. TABELA DE TAREFAS/ATIVIDADES (CRM)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  lead_id UUID, -- Referência ao lead (opcional)
  contact_id UUID, -- Referência ao contato (opcional)
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'call', -- call, email, meeting, note, follow_up, etc
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  reminder_at TIMESTAMP,
  assigned_to UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABELA DE NOTAS/HISTÓRICO (CRM)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  lead_id UUID, -- Referência ao lead (opcional)
  contact_id UUID, -- Referência ao contato (opcional)
  conversation_id UUID, -- Referência à conversa (opcional)
  title VARCHAR(255),
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'note', -- note, call_summary, meeting_summary, etc
  is_important BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABELA DE PIPELINE/ETAPAS (CRM)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name VARCHAR(100) NOT NULL,
  position INTEGER DEFAULT 0, -- Posição no pipeline (ordem)
  color VARCHAR(20), -- Cor para visualização
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- GARANTIR QUE COLUNAS USER_ID EXISTAM
-- ====================================
-- Adiciona colunas user_id se não existirem (para tabelas criadas antes)

DO $$ 
BEGIN
  -- configurations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'configurations' AND column_name = 'user_id') THEN
    ALTER TABLE public.configurations ADD COLUMN user_id UUID;
  END IF;
  
  -- conversations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'user_id') THEN
    ALTER TABLE public.conversations ADD COLUMN user_id UUID;
  END IF;
  
  -- contacts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'user_id') THEN
    ALTER TABLE public.contacts ADD COLUMN user_id UUID;
  END IF;
  
  -- campaigns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'user_id') THEN
    ALTER TABLE public.campaigns ADD COLUMN user_id UUID;
  END IF;
  
  -- audit_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id') THEN
    ALTER TABLE public.audit_logs ADD COLUMN user_id UUID;
  END IF;
  
  -- messages.conversation_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id') THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID;
  END IF;
  
  -- leads.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'user_id') THEN
    ALTER TABLE public.leads ADD COLUMN user_id UUID;
  END IF;
  
  -- tasks.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id') THEN
    ALTER TABLE public.tasks ADD COLUMN user_id UUID;
  END IF;
  
  -- notes.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'notes' AND column_name = 'user_id') THEN
    ALTER TABLE public.notes ADD COLUMN user_id UUID;
  END IF;
  
  -- pipeline_stages.user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'pipeline_stages' AND column_name = 'user_id') THEN
    ALTER TABLE public.pipeline_stages ADD COLUMN user_id UUID;
  END IF;
END $$;

-- ====================================
-- ÍNDICES PARA PERFORMANCE
-- ====================================

CREATE INDEX IF NOT EXISTS idx_chat_history_phone ON public.chat_history(phone);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON public.messages(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON public.configurations(user_id) WHERE user_id IS NOT NULL;

-- Índices para CRM
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON public.notes(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON public.notes(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user_id ON public.pipeline_stages(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON public.pipeline_stages(position);

-- ====================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ====================================

-- RLS desabilitado para desenvolvimento
-- Habilitar em produção conforme necessário:

-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas (comentadas para desenvolvimento)
-- CREATE POLICY "Users can only access their own data" ON public.configurations
--   FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can only access their conversations" ON public.conversations
--   FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can only access their contacts" ON public.contacts
--   FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can only access their campaigns" ON public.campaigns
--   FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can only access their logs" ON public.audit_logs
--   FOR ALL USING (auth.uid() = user_id);

-- ====================================
-- FUNÇÕES ÚTEIS
-- ====================================

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para configurations
DROP TRIGGER IF EXISTS update_configurations_updated_at ON public.configurations;
CREATE TRIGGER update_configurations_updated_at
BEFORE UPDATE ON public.configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para campaigns
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para notes
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger para pipeline_stages
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- INSERIR DADOS DE TESTE (OPCIONAL)
-- ====================================

-- Descomente as linhas abaixo para inserir dados de teste

/*
INSERT INTO public.chat_history (phone, user_message, ai_response)
VALUES (
  '5511999999999',
  'Olá, qual é o preço do serviço?',
  'Olá! Temos planos a partir de R$49/mês. Qual serviço você está interessado?'
);

INSERT INTO public.contacts (user_id, phone, name, tags)
VALUES (
  'user-uuid-here',
  '5511999999999',
  'João Silva',
  ARRAY['cliente', 'ativo']
);
*/

-- ====================================
-- CONCLUSÃO
-- ====================================
-- Setup do Supabase concluído!
-- Próximos passos:
-- 1. Configure as variáveis de ambiente (.env) com SUPABASE_URL e SUPABASE_ANON_KEY
-- 2. Teste a conexão rodando o sistema
-- 3. Monitore os dados em tempo real no Supabase Dashboard
