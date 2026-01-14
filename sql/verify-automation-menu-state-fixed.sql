-- ====================================
-- VERIFICAR SE automation_menu_state ESTÁ CORRETA
-- ====================================
-- Execute este SQL no Supabase SQL Editor para confirmar que tudo está OK

-- 1. Verificar se a coluna user_id existe
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'automation_menu_state'
  AND column_name = 'user_id';

-- Resultado esperado: 1 linha com user_id UUID

-- 2. Verificar todas as colunas da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'automation_menu_state'
ORDER BY ordinal_position;

-- Resultado esperado: id, phone, menu_id, expires_at, created_at, user_id

-- 3. Verificar índices (deve incluir idx_automation_menu_state_user_id)
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'automation_menu_state'
ORDER BY indexname;

-- Resultado esperado: 
-- - automation_menu_state_pkey
-- - idx_automation_menu_state_phone
-- - idx_automation_menu_state_expires (ou expires_at)
-- - idx_automation_menu_state_user_id ✅
-- - automation_menu_state_phone_user_id_unique ✅

-- 4. Verificar constraint UNIQUE
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'automation_menu_state'::regclass
  AND contype = 'u';

-- Resultado esperado: automation_menu_state_phone_user_id_unique

-- 5. Teste: Tentar inserir um registro (apenas para verificar estrutura)
-- NÃO execute este INSERT se não quiser criar dados de teste
/*
INSERT INTO automation_menu_state (phone, user_id, menu_id, expires_at)
VALUES ('5511999999999', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', NOW() + INTERVAL '15 minutes')
ON CONFLICT (phone, user_id) DO NOTHING;
*/

-- 6. Verificar se há dados na tabela
SELECT COUNT(*) as total_records
FROM automation_menu_state;

-- 7. Verificar se há registros com user_id NULL (dados antigos)
SELECT 
  COUNT(*) as records_with_null_user_id,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as records_with_user_id
FROM automation_menu_state;
