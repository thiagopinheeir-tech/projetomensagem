-- View otimizada para conversas
CREATE OR REPLACE VIEW conversations_view AS
SELECT 
  phone,
  user_message as last_message,
  ai_response as last_ai_response,
  message_type as last_status,
  created_at as last_updated,
  COUNT(*) OVER (PARTITION BY phone) as msg_count
FROM conversations
WHERE id IN (
  SELECT MAX(id) 
  FROM conversations 
  GROUP BY phone
)
ORDER BY created_at DESC;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_phone_created ON conversations(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_message_type ON conversations(message_type);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);