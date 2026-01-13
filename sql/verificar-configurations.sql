-- ====================================
-- VERIFICAR DADOS SALVOS EM CONFIGURATIONS
-- ====================================
-- Execute este SQL no Supabase SQL Editor para verificar os dados salvos

SELECT 
  id,
  business_name,
  LENGTH(special_instructions) as special_instructions_length,
  LENGTH(custom_prompt) as custom_prompt_length,
  LEFT(special_instructions, 100) as special_instructions_preview,
  LEFT(custom_prompt, 100) as custom_prompt_preview,
  updated_at
FROM configurations 
ORDER BY created_at DESC 
LIMIT 1;

-- Ver todos os campos
SELECT * FROM configurations ORDER BY created_at DESC LIMIT 1;
