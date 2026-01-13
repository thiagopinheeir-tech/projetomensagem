-- ============================================
-- MIGRATION: Adicionar configuração Premium Shears Scheduler
-- ============================================
-- Adiciona colunas na tabela config_ai para configuração multi-tenant
-- do sistema de agendamento Premium Shears

-- Para PostgreSQL local (config_ai com user_id INTEGER)
DO $$
BEGIN
  -- Adicionar coluna premium_shears_api_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'config_ai' AND column_name = 'premium_shears_api_url'
  ) THEN
    ALTER TABLE config_ai ADD COLUMN premium_shears_api_url TEXT;
  END IF;

  -- Adicionar coluna premium_shears_api_key (criptografada)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'config_ai' AND column_name = 'premium_shears_api_key_encrypted'
  ) THEN
    ALTER TABLE config_ai ADD COLUMN premium_shears_api_key_encrypted TEXT;
  END IF;

  -- Adicionar coluna use_premium_shears_scheduler
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'config_ai' AND column_name = 'use_premium_shears_scheduler'
  ) THEN
    ALTER TABLE config_ai ADD COLUMN use_premium_shears_scheduler BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Para Supabase (configurations com user_id UUID)
DO $$
BEGIN
  -- Adicionar coluna premium_shears_api_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configurations' AND column_name = 'premium_shears_api_url'
  ) THEN
    ALTER TABLE public.configurations ADD COLUMN premium_shears_api_url TEXT;
  END IF;

  -- Adicionar coluna premium_shears_api_key (criptografada)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configurations' AND column_name = 'premium_shears_api_key_encrypted'
  ) THEN
    ALTER TABLE public.configurations ADD COLUMN premium_shears_api_key_encrypted TEXT;
  END IF;

  -- Adicionar coluna use_premium_shears_scheduler
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'configurations' AND column_name = 'use_premium_shears_scheduler'
  ) THEN
    ALTER TABLE public.configurations ADD COLUMN use_premium_shears_scheduler BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Atualizar tabela booking_appointments para suportar scheduler_type
DO $$
BEGIN
  -- Adicionar coluna scheduler_type se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_appointments' AND column_name = 'scheduler_type'
  ) THEN
    ALTER TABLE booking_appointments ADD COLUMN scheduler_type VARCHAR(50) DEFAULT 'google_calendar';
  END IF;

  -- Adicionar coluna external_event_id se não existir (para substituir google_calendar_event_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_appointments' AND column_name = 'external_event_id'
  ) THEN
    ALTER TABLE booking_appointments ADD COLUMN external_event_id TEXT;
  END IF;
END $$;

-- Para Supabase booking_appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_appointments' AND column_name = 'scheduler_type'
  ) THEN
    ALTER TABLE public.booking_appointments ADD COLUMN scheduler_type VARCHAR(50) DEFAULT 'google_calendar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_appointments' AND column_name = 'external_event_id'
  ) THEN
    ALTER TABLE public.booking_appointments ADD COLUMN external_event_id TEXT;
  END IF;
END $$;
