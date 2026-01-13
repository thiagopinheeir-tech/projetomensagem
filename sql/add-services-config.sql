-- Adicionar campos para serviços detalhados e horário de funcionamento em chatbot_profiles
-- Serviços detalhados: JSONB com array de objetos {name, durationMinutes, price}
-- Horário de funcionamento: JSONB com configuração por dia da semana

DO $$
BEGIN
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
