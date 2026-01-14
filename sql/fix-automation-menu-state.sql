-- ====================================
-- ADICIONAR COLUNA user_id NA TABELA automation_menu_state
-- ====================================
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna user_id (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'automation_menu_state' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE automation_menu_state 
    ADD COLUMN user_id UUID;
    
    -- Criar índice para melhor performance
    CREATE INDEX IF NOT EXISTS idx_automation_menu_state_user_id 
    ON automation_menu_state(user_id);
    
    -- Atualizar constraint UNIQUE para incluir user_id (se necessário)
    -- Remover constraint antiga se existir
    ALTER TABLE automation_menu_state 
    DROP CONSTRAINT IF EXISTS automation_menu_state_phone_key;
    
    -- Adicionar nova constraint UNIQUE com user_id
    ALTER TABLE automation_menu_state 
    ADD CONSTRAINT automation_menu_state_phone_user_id_unique 
    UNIQUE(phone, user_id);
    
    RAISE NOTICE 'Coluna user_id adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna user_id já existe';
  END IF;
END $$;

-- 2. Verificar estrutura da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'automation_menu_state'
ORDER BY ordinal_position;

-- 3. Verificar índices
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'automation_menu_state';
