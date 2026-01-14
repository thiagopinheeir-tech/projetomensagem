-- ====================================
-- VERIFICAR API KEY DA OPENAI SALVA
-- ====================================
-- Execute este SQL no Supabase SQL Editor para verificar se a API key está salva

-- 1. Verificar na tabela user_api_keys
SELECT 
  u.id as user_id,
  u.email,
  uak.provider,
  uak.is_active,
  uak.created_at,
  uak.updated_at,
  CASE 
    WHEN uak.api_key_encrypted IS NULL THEN 'NULL'
    WHEN LENGTH(uak.api_key_encrypted) = 0 THEN 'VAZIO'
    ELSE CONCAT('OK (', LENGTH(uak.api_key_encrypted), ' chars)')
  END as key_status
FROM users u
LEFT JOIN user_api_keys uak ON u.id = uak.user_id AND uak.provider = 'openai'
ORDER BY u.id;

-- 2. Verificar apenas keys ativas
SELECT 
  user_id,
  provider,
  is_active,
  created_at,
  updated_at,
  LENGTH(api_key_encrypted) as key_length
FROM user_api_keys
WHERE provider = 'openai' AND is_active = true;

-- 3. Verificar em chatbot_profiles (compatibilidade)
SELECT 
  cp.user_id,
  cp.id as profile_id,
  cp.is_active as profile_active,
  CASE 
    WHEN cp.openai_api_key_encrypted IS NULL THEN 'NULL'
    WHEN LENGTH(cp.openai_api_key_encrypted) = 0 THEN 'VAZIO'
    ELSE CONCAT('OK (', LENGTH(cp.openai_api_key_encrypted), ' chars)')
  END as key_status
FROM chatbot_profiles cp
WHERE cp.openai_api_key_encrypted IS NOT NULL
ORDER BY cp.user_id, cp.created_at DESC;

-- 4. Resumo: Quantas API keys ativas existem?
SELECT 
  COUNT(*) as total_keys_ativas,
  COUNT(DISTINCT user_id) as usuarios_com_key
FROM user_api_keys
WHERE provider = 'openai' AND is_active = true;
