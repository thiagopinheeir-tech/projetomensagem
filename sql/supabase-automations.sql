-- ============================================
-- SISTEMA DE AUTOMAÇÕES SEM IA - SUPABASE
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- IMPORTANTE: Este schema usa UUID para user_id (Supabase padrão)

-- Tabela de regras de automação (respostas baseadas em palavras-chave)
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- UUID no Supabase (sem foreign key para evitar conflitos)
  profile_id UUID, -- Referência ao chatbot_profiles(id)
  name VARCHAR(255) NOT NULL,
  keywords TEXT[] NOT NULL, -- Array de palavras-chave que ativam a regra
  response TEXT NOT NULL, -- Resposta automática
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Prioridade (maior número = maior prioridade)
  case_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_profile_id ON automation_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active) WHERE is_active = true;

-- Tabela de menus interativos
CREATE TABLE IF NOT EXISTS automation_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- UUID no Supabase
  profile_id UUID, -- Referência ao chatbot_profiles(id)
  name VARCHAR(255) NOT NULL,
  trigger_keywords TEXT[] NOT NULL, -- Palavras que ativam o menu
  menu_text TEXT NOT NULL, -- Texto do menu (ex: "Digite 1 para...")
  options JSONB NOT NULL, -- Array de opções: [{"number": 1, "keyword": "agendar", "response": "..."}, ...]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_menus_user_id ON automation_menus(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_menus_profile_id ON automation_menus(profile_id);
CREATE INDEX IF NOT EXISTS idx_automation_menus_active ON automation_menus(is_active) WHERE is_active = true;

-- Tabela de agendamentos (para consultar, cancelar, remarcar)
CREATE TABLE IF NOT EXISTS booking_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- UUID no Supabase
  profile_id UUID, -- Referência ao chatbot_profiles(id)
  phone VARCHAR(20) NOT NULL,
  client_name VARCHAR(255),
  service TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  google_calendar_event_id TEXT, -- ID do evento no Google Calendar (se integrado)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_appointments_user_id ON booking_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_profile_id ON booking_appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_phone ON booking_appointments(phone);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_status ON booking_appointments(status);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_start_time ON booking_appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_phone_status ON booking_appointments(phone, status);

-- Tabela para estado de menus ativos por conversa
CREATE TABLE IF NOT EXISTS automation_menu_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  menu_id UUID NOT NULL, -- Referência ao automation_menus(id)
  expires_at TIMESTAMP NOT NULL, -- Menu expira após X minutos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(phone)
);

CREATE INDEX IF NOT EXISTS idx_automation_menu_state_phone ON automation_menu_state(phone);
CREATE INDEX IF NOT EXISTS idx_automation_menu_state_expires ON automation_menu_state(expires_at);

-- NOTA: Foreign keys foram removidas para evitar conflitos de tipo.
-- O sistema funciona com UUIDs sem foreign keys no Supabase.
-- Se necessário adicionar foreign keys posteriormente, certifique-se de que
-- as tabelas users e chatbot_profiles existem com id UUID.
