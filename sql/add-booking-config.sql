-- Adicionar campos de configuração de agendamento em chatbot_profiles
-- Duração do serviço e intervalo entre agendamentos

DO $$
BEGIN
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
END $$;
