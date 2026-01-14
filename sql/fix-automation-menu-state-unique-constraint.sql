-- ====================================
-- CORRIGIR CONSTRAINT UNIQUE PARA PERMITIR NULL
-- ====================================
-- IMPORTANTE: A constraint UNIQUE atual pode causar problemas se user_id for NULL
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar constraint atual
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'automation_menu_state'::regclass
  AND contype = 'u';

-- 2. Remover constraint antiga (se existir)
ALTER TABLE automation_menu_state 
DROP CONSTRAINT IF EXISTS automation_menu_state_phone_user_id_unique;

-- 3. Criar constraint UNIQUE parcial que permite múltiplos NULLs
-- Isso permite que múltiplos registros tenham user_id = NULL com phones diferentes
-- Mas garante que (phone, user_id) seja único quando user_id não é NULL
CREATE UNIQUE INDEX IF NOT EXISTS automation_menu_state_phone_user_id_unique 
ON automation_menu_state (phone, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ALTERNATIVA: Se preferir constraint mais simples (permite NULLs duplicados)
-- CREATE UNIQUE INDEX automation_menu_state_phone_user_id_unique 
-- ON automation_menu_state (phone) 
-- WHERE user_id IS NULL;
-- 
-- CREATE UNIQUE INDEX automation_menu_state_phone_user_id_unique_not_null 
-- ON automation_menu_state (phone, user_id) 
-- WHERE user_id IS NOT NULL;

-- 4. Verificar constraint criada
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'automation_menu_state'
  AND indexname = 'automation_menu_state_phone_user_id_unique';

-- 5. Teste: Verificar se pode inserir múltiplos registros com user_id NULL
-- (Não execute se não quiser criar dados de teste)
/*
-- Deve funcionar: diferentes phones com user_id NULL
INSERT INTO automation_menu_state (phone, menu_id, expires_at)
VALUES ('5511111111111', '00000000-0000-0000-0000-000000000000', NOW() + INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

-- Deve funcionar: mesmo phone, mas user_id diferente
INSERT INTO automation_menu_state (phone, user_id, menu_id, expires_at)
VALUES ('5511111111111', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', NOW() + INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

-- Deve FALHAR: mesmo phone e mesmo user_id
INSERT INTO automation_menu_state (phone, user_id, menu_id, expires_at)
VALUES ('5511111111111', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', NOW() + INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;
*/
