-- ============================================
-- TOP ACTIVE WHATSAPP 2.0 - DATABASE SCHEMA
-- ============================================

-- Extensões necessárias (UUID)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone VARCHAR(20),
  plan VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, phone)
);

-- Tabela de conversas do chatbot
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  chatbot_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Tabela de configuração de IA (API Manager)
CREATE TABLE IF NOT EXISTS config_ai (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  openai_key_encrypted TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 300,
  custom_prompt TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_config_ai_user_id ON config_ai(user_id);

-- ============================================
-- CONFIGURAÇÃO LEGACY (compatibilidade)
-- ============================================
-- Tabela usada por versões anteriores do chatbotController/whatsapp service.
CREATE TABLE IF NOT EXISTS configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  whatsapp_number VARCHAR(20),
  business_name VARCHAR(255),
  business_description TEXT,
  business_services TEXT,
  services TEXT[],
  tone VARCHAR(50) DEFAULT 'amigavel',
  model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 300,
  custom_prompt TEXT,
  special_instructions TEXT,
  greeting_message TEXT,
  farewell_message TEXT,
  default_responses JSONB,
  enable_chatbot BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_configurations_created_at ON configurations(created_at);

-- ============================================
-- CHATBOTS POR TIPO (Templates + Perfis por usuário)
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL, -- ex: 'barbearia', 'manicure', 'emprestimo', 'clinica'
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- payload padrão do template
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_key TEXT,
  profile_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,

  business_name VARCHAR(255),
  business_description TEXT,
  services TEXT[],
  tone VARCHAR(50) DEFAULT 'amigavel',
  model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 300,
  special_instructions TEXT,
  greeting_message TEXT,
  farewell_message TEXT,
  default_responses JSONB,
  enable_chatbot BOOLEAN DEFAULT true,

  -- Google OAuth por perfil (opcional; se vazio usa .env)
  google_oauth_client_id TEXT,
  google_oauth_client_secret_encrypted TEXT,
  google_oauth_redirect_uri TEXT,

  -- Variáveis do template (ex: endereço, horário, preços, políticas, links)
  template_variables JSONB DEFAULT '{}'::jsonb,

  -- Se true, o special_instructions é usado como System Prompt completo (sem pré-texto automático)
  prompt_only_mode BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar colunas Google OAuth em instalações antigas (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'google_oauth_client_id'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN google_oauth_client_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'google_oauth_client_secret_encrypted'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN google_oauth_client_secret_encrypted TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'google_oauth_redirect_uri'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN google_oauth_redirect_uri TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'template_variables'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN template_variables JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'prompt_only_mode'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN prompt_only_mode BOOLEAN DEFAULT true;
  END IF;

  -- Duração do serviço em minutos (padrão: 30 minutos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'service_duration_minutes'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN service_duration_minutes INTEGER DEFAULT 30;
  END IF;

  -- Intervalo entre agendamentos em minutos (padrão: 0 minutos)
  -- Este intervalo é adicionado após cada agendamento para evitar conflitos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'interval_between_appointments_minutes'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN interval_between_appointments_minutes INTEGER DEFAULT 0;
  END IF;

  -- Serviços detalhados (JSONB): array de {name: string, durationMinutes: number, price: number}
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'services_config'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN services_config JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Horário de funcionamento (JSONB): objeto com configuração por dia
  -- Exemplo: {"monday": {"open": true, "startTime": "09:00", "endTime": "20:00"}, ...}
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatbot_profiles' AND column_name = 'business_hours'
  ) THEN
    ALTER TABLE chatbot_profiles ADD COLUMN business_hours JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Garante 1 perfil ativo por usuário
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chatbot_profiles_active_per_user
ON chatbot_profiles(user_id)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_chatbot_profiles_user_id ON chatbot_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_profiles_updated_at ON chatbot_profiles(updated_at);

-- ============================================
-- TOKENS GOOGLE POR USUÁRIO (OAuth)
-- ============================================
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_type TEXT,
  scope TEXT,
  expiry_date TIMESTAMP,
  calendar_id_default TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);

-- ============================================
-- TOKENS GOOGLE POR PERFIL (OAuth) - recomendado
-- ============================================
CREATE TABLE IF NOT EXISTS profile_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES chatbot_profiles(id) ON DELETE CASCADE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_type TEXT,
  scope TEXT,
  expiry_date TIMESTAMP,
  calendar_id_default TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_google_tokens_user_id ON profile_google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_google_tokens_profile_id ON profile_google_tokens(profile_id);

-- ============================================
-- Seeds de templates (idempotente)
-- ============================================
INSERT INTO chatbot_templates (template_key, name, description, config)
VALUES
  (
    'barbearia',
    'Barbearia',
    'Agendamento de corte/barba com coleta de nome, serviço, dia e horário.',
    jsonb_build_object(
      'businessName', 'Barbearia Raimundo',
      'businessDescription', 'Barbearia com atendimento por agendamento.',
      'services', jsonb_build_array('Corte', 'Barba', 'Corte + Barba'),
      'tone', 'amigavel',
      'model', 'gpt-4o-mini',
      'temperature', 0.7,
      'maxTokens', 350,
            'specialInstructions', 'Você é o assistente virtual oficial da barbearia "{{NOME_FANTASIA}}", especializado em atendimento e agendamento.\n\nDADOS FIXOS:\n- Endereço: {{ENDERECO}}\n- Horário de funcionamento: {{HORARIO_FUNCIONAMENTO}}\n- Política de cancelamento: {{POLITICA_CANCELAMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n\nOBJETIVO: transformar conversas em agendamentos confirmados.\n\nREGRAS: (1) sempre conduza para agendamento, (2) finalize com UMA pergunta objetiva (CTA), (3) não invente horários; se houver agenda, valide disponibilidade e, se indisponível, ofereça 3 opções e peça 1/2/3, (4) se pedir “o mais cedo possível”, ofereça o primeiro horário, (5) não responda grupos.\n\nCOLETAR: nome, serviço, dia/horário, profissional (opcional).\n\nCONFIRMAÇÃO: repita serviço + data/hora + nome antes de confirmar.\n',
      'greetingMessage', 'Olá! Vou te ajudar a agendar seu horário. Qual seu nome completo?',
      'farewellMessage', 'Agendamento confirmado. Quer marcar outro horário?',
      'defaultResponses', jsonb_build_object(
        'preco', 'Corte e barba têm valores a partir de R$ X (varia por serviço). Quer agendar para qual dia e horário?',
        'endereco', 'Estamos em [ENDEREÇO]. Quer agendar para qual dia e horário?',
        'horario', 'Atendemos por agendamento. Quer agendar para qual dia e horário?'
            ),
            'templateVariables', jsonb_build_object(
              'NOME_FANTASIA', 'Barbearia Raimundo',
              'ENDERECO', '',
              'HORARIO_FUNCIONAMENTO', '',
              'POLITICA_CANCELAMENTO', 'Cancelamentos com pelo menos 2 horas de antecedência.',
              'LINK_PRINCIPAL', ''
            )
    )
  ),
  (
    'manicure',
    'Manicure',
    'Agendamento de manicure/pedicure, confirmação de preferência e horário.',
    jsonb_build_object(
      'businessName', 'Manicure',
      'businessDescription', 'Atendimento por agendamento de manicure/pedicure.',
      'services', jsonb_build_array('Manicure', 'Pedicure', 'Manicure + Pedicure', 'Alongamento'),
      'tone', 'amigavel',
      'model', 'gpt-4o-mini',
      'temperature', 0.7,
      'maxTokens', 350,
            'specialInstructions', 'Você é o assistente virtual do salão "{{NOME_FANTASIA}}", focado em atendimento e agendamento.\n\nDADOS FIXOS:\n- Endereço: {{ENDERECO}}\n- Horário de funcionamento: {{HORARIO_FUNCIONAMENTO}}\n- Política de cancelamento: {{POLITICA_CANCELAMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n\nREGRAS: (1) conduza para agendamento, (2) finalize com UMA pergunta objetiva, (3) não invente disponibilidade; se houver agenda, valide e, se indisponível, ofereça 3 opções e peça 1/2/3.\n\nCOLETAR: nome, serviço (manicure/pedicure/gel/fibra/manutenção/retirada), data/horário, profissional (opcional), observações (retirada/manutenção, alergias).\n\nCONFIRMAÇÃO: repita serviço + data/hora + nome + observações.\n',
      'greetingMessage', 'Olá! Vou te ajudar a agendar. Qual seu nome completo e qual serviço você deseja?',
      'farewellMessage', 'Agendamento encaminhado! Quer marcar outro horário?',
            'defaultResponses', jsonb_build_object(),
            'templateVariables', jsonb_build_object(
              'NOME_FANTASIA', 'Manicure',
              'ENDERECO', '',
              'HORARIO_FUNCIONAMENTO', '',
              'POLITICA_CANCELAMENTO', 'Cancelamentos com pelo menos 2 horas de antecedência.',
              'LINK_PRINCIPAL', ''
            )
    )
  ),
  (
    'emprestimo',
    'Empréstimo',
    'Funil de empréstimo: nome, CPF, valor, prazo, documentos.',
    jsonb_build_object(
      'businessName', 'JP Financeira',
      'businessDescription', 'Empresa especializada em empréstimo pessoal.',
      'services', jsonb_build_array('Empréstimo Pessoal', 'Crédito Rápido'),
      'tone', 'amigavel',
      'model', 'gpt-4o-mini',
      'temperature', 0.7,
      'maxTokens', 350,
            'specialInstructions', 'Você é um assistente virtual de empréstimo pessoal da empresa "{{NOME_FANTASIA}}".\n\nDADOS FIXOS:\n- Atendimento: {{HORARIO_ATENDIMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n- Taxa: {{TAXA_MINIMA}}\n- Valores: {{FAIXA_VALORES}}\n- Prazos: {{FAIXA_PRAZOS}}\n\nREGRAS: (1) nunca prometa aprovação garantida, (2) finalize com UMA pergunta objetiva, (3) sempre colete ANTES de prosseguir: nome completo, CPF, valor desejado, prazo em meses, (4) taxas “a partir de” e dependem de análise.\n\nFUNIL: nome → CPF → valor → prazo → documentação.\n\nDOCUMENTOS: RG/CNH, CPF, comprovante renda, comprovante residência, selfie com documento.\n',
      'greetingMessage', 'Olá! Vou te ajudar com o empréstimo. Qual seu nome completo?',
      'farewellMessage', 'Foi um prazer te atender! Quer continuar a simulação?',
            'defaultResponses', jsonb_build_object(),
            'templateVariables', jsonb_build_object(
              'NOME_FANTASIA', 'JP Financeira',
              'HORARIO_ATENDIMENTO', 'Segunda a Sábado, 8h-18h',
              'LINK_PRINCIPAL', '',
              'TAXA_MINIMA', 'a partir de 2,5% ao mês',
              'FAIXA_VALORES', 'R$ 500 a R$ 50.000',
              'FAIXA_PRAZOS', '6 a 48 meses'
            )
    )
  ),
  (
    'clinica',
    'Clínica',
    'Triagem e agendamento de consulta: especialidade, sintomas, convênio, data/horário.',
    jsonb_build_object(
      'businessName', 'Clínica',
      'businessDescription', 'Atendimento por agendamento de consultas.',
      'services', jsonb_build_array('Consulta', 'Retorno', 'Exames'),
      'tone', 'formal',
      'model', 'gpt-4o-mini',
      'temperature', 0.4,
      'maxTokens', 350,
            'specialInstructions', 'Você é o assistente virtual da clínica "{{NOME_FANTASIA}}".\n\nDADOS FIXOS:\n- Endereço: {{ENDERECO}}\n- Horário de atendimento: {{HORARIO_ATENDIMENTO}}\n- Link: {{LINK_PRINCIPAL}}\n\nREGRAS: (1) não faça diagnóstico, (2) finalize com UMA pergunta objetiva, (3) em urgência, oriente procurar emergência, (4) colete o mínimo necessário.\n\nCOLETAR: nome, especialidade, convênio/particular, preferência de data/horário (e queixa principal em 1 frase, opcional).\n\nCONFIRMAÇÃO: repita especialidade + data/hora + nome + convênio/particular.\n',
      'greetingMessage', 'Olá! Vou te ajudar a agendar. Qual especialidade você procura e qual seu nome completo?',
      'farewellMessage', 'Perfeito! Quer agendar outro atendimento?',
            'defaultResponses', jsonb_build_object(),
            'templateVariables', jsonb_build_object(
              'NOME_FANTASIA', 'Clínica',
              'ENDERECO', '',
              'HORARIO_ATENDIMENTO', '',
              'LINK_PRINCIPAL', ''
            )
    )
  )
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = CURRENT_TIMESTAMP;
