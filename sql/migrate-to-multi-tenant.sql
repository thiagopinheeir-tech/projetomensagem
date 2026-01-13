-- ============================================
-- MIGRAÇÃO: Transformação para Multi-Tenant
-- ============================================
-- Este script adiciona suporte para múltiplos usuários
-- com isolamento completo de dados

-- 1. Adicionar campos de assinatura na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP NULL;

-- Comentários
COMMENT ON COLUMN users.subscription_status IS 'Status da assinatura: active, suspended, cancelled';
COMMENT ON COLUMN users.subscription_expires_at IS 'Data de expiração da assinatura (NULL = sem expiração)';

-- 2. Criar tabela para API Keys dos usuários (OpenAI, etc)
-- Suporta tanto INTEGER (PostgreSQL local) quanto UUID (Supabase)
DO $$
DECLARE
  users_id_type TEXT;
  table_exists BOOLEAN;
  current_user_id_type TEXT;
BEGIN
  -- Detectar tipo de user_id na tabela users
  SELECT data_type INTO users_id_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';
  
  -- Verificar se tabela já existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_api_keys'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Verificar tipo atual
    SELECT data_type INTO current_user_id_type
    FROM information_schema.columns
    WHERE table_name = 'user_api_keys' AND column_name = 'user_id';
    
    -- Se tipos não coincidem, remover tabela e recriar
    IF current_user_id_type IS NULL OR current_user_id_type != users_id_type THEN
      DROP TABLE IF EXISTS user_api_keys CASCADE;
      table_exists := false;
    END IF;
  END IF;
  
  IF NOT table_exists THEN
    -- Criar tabela sem foreign key primeiro
    IF users_id_type = 'uuid' THEN
      CREATE TABLE user_api_keys (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        provider VARCHAR(50) NOT NULL,
        api_key_encrypted TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider)
      );
    ELSE
      CREATE TABLE user_api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        provider VARCHAR(50) NOT NULL,
        api_key_encrypted TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider)
      );
    END IF;
    
    -- Adicionar foreign key apenas se os tipos forem compatíveis
    BEGIN
      ALTER TABLE user_api_keys ADD CONSTRAINT fk_user_api_keys_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Não foi possível criar foreign key (pode ser que users.id tenha tipo diferente). Continuando sem foreign key.';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

COMMENT ON TABLE user_api_keys IS 'Armazena API keys criptografadas dos usuários';
COMMENT ON COLUMN user_api_keys.provider IS 'Provedor da API: openai, anthropic, etc';
COMMENT ON COLUMN user_api_keys.api_key_encrypted IS 'API key criptografada usando AES-256-GCM';

-- 3. Adicionar campo para Google OAuth credentials por usuário
-- (Se não existir user_google_tokens, criar)
DO $$
DECLARE
  users_id_type TEXT;
  table_exists BOOLEAN;
  current_user_id_type TEXT;
BEGIN
  -- Detectar tipo de user_id na tabela users
  SELECT data_type INTO users_id_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';
  
  -- Verificar se tabela já existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_google_oauth_config'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Verificar tipo atual
    SELECT data_type INTO current_user_id_type
    FROM information_schema.columns
    WHERE table_name = 'user_google_oauth_config' AND column_name = 'user_id';
    
    -- Se tipos não coincidem, remover tabela e recriar
    IF current_user_id_type IS NULL OR current_user_id_type != users_id_type THEN
      DROP TABLE IF EXISTS user_google_oauth_config CASCADE;
      table_exists := false;
    END IF;
  END IF;
  
  IF NOT table_exists THEN
    -- Criar tabela sem foreign key primeiro
    IF users_id_type = 'uuid' THEN
      CREATE TABLE user_google_oauth_config (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE,
        client_id_encrypted TEXT,
        client_secret_encrypted TEXT,
        redirect_uri TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ELSE
      CREATE TABLE user_google_oauth_config (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        client_id_encrypted TEXT,
        client_secret_encrypted TEXT,
        redirect_uri TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    END IF;
    
    -- Adicionar foreign key apenas se os tipos forem compatíveis
    BEGIN
      ALTER TABLE user_google_oauth_config ADD CONSTRAINT fk_user_google_oauth_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Não foi possível criar foreign key (pode ser que users.id tenha tipo diferente). Continuando sem foreign key.';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_google_oauth_config_user_id ON user_google_oauth_config(user_id);

COMMENT ON TABLE user_google_oauth_config IS 'Configuração OAuth do Google por usuário';
COMMENT ON COLUMN user_google_oauth_config.client_id_encrypted IS 'Google OAuth Client ID criptografado';
COMMENT ON COLUMN user_google_oauth_config.client_secret_encrypted IS 'Google OAuth Client Secret criptografado';

-- 4. Adicionar índices compostos para melhorar performance de queries multi-tenant
CREATE INDEX IF NOT EXISTS idx_conversations_user_phone ON conversations(user_id, phone) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_appointments_user_phone ON booking_appointments(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_user_start ON booking_appointments(user_id, start_time) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_chatbot_profiles_user_active ON chatbot_profiles(user_id, is_active) WHERE is_active = true;

-- 5. Garantir que todas as tabelas principais têm user_id
-- (Verificar e adicionar se necessário)

-- conversations já tem user_id (verificar)
-- booking_appointments já tem user_id (verificar)
-- chatbot_profiles já tem user_id (verificar)
-- messages já tem user_id (verificar)

-- 6. Atualizar constraints para garantir integridade
-- Adicionar NOT NULL onde necessário (se ainda não tiver)

-- 7. Migrar dados existentes (se houver dados sem user_id)
-- Atribuir ao primeiro usuário (admin)
-- NOTA: Esta migração é opcional. Se houver incompatibilidade de tipos (INTEGER vs UUID),
-- a migração de dados deve ser feita manualmente.
-- Por enquanto, pulamos a migração automática para evitar erros.
/*
DO $$
DECLARE
  admin_user_id INTEGER;
  admin_user_uuid UUID;
  user_id_type TEXT;
  conversations_has_user_id BOOLEAN;
  booking_user_id_type TEXT;
  messages_user_id_type TEXT;
BEGIN
  -- Verificar se a coluna user_id existe em conversations
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'user_id'
  ) INTO conversations_has_user_id;
  
  IF NOT conversations_has_user_id THEN
    RAISE NOTICE 'Coluna user_id não existe em conversations. Pulando migração de dados.';
    RETURN;
  END IF;
  
  -- Detectar tipo de user_id na tabela users
  SELECT data_type INTO user_id_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';
  
  -- Apenas migrar se users.id for INTEGER (PostgreSQL local)
  -- Para UUID (Supabase), a migração de dados deve ser feita manualmente
  IF user_id_type = 'integer' THEN
    -- PostgreSQL local: usar INTEGER
    SELECT id INTO admin_user_id FROM users ORDER BY id ASC LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      -- Verificar tipo de user_id em conversations
      SELECT data_type INTO user_id_type
      FROM information_schema.columns
      WHERE table_name = 'conversations' AND column_name = 'user_id';
      
      IF user_id_type = 'integer' THEN
        -- Atualizar conversas sem user_id (INTEGER)
        UPDATE conversations 
        SET user_id = admin_user_id::INTEGER
        WHERE user_id IS NULL;
      -- Se conversations.user_id é UUID mas users.id é INTEGER, pular (incompatível)
      -- Esta situação requer migração manual
      END IF;
      
      -- Atualizar agendamentos sem user_id
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_appointments') THEN
        BEGIN
          SELECT data_type INTO booking_user_id_type
          FROM information_schema.columns
          WHERE table_name = 'booking_appointments' AND column_name = 'user_id';
          
          IF booking_user_id_type = 'integer' THEN
            UPDATE booking_appointments 
            SET user_id = admin_user_id 
            WHERE user_id IS NULL;
          -- Se booking_appointments.user_id é UUID mas users.id é INTEGER, pular
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao atualizar booking_appointments: %', SQLERRM;
        END;
      END IF;
      
      -- Atualizar mensagens sem user_id
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        BEGIN
          SELECT data_type INTO messages_user_id_type
          FROM information_schema.columns
          WHERE table_name = 'messages' AND column_name = 'user_id';
          
          IF messages_user_id_type = 'integer' THEN
            UPDATE messages 
            SET user_id = admin_user_id 
            WHERE user_id IS NULL;
          -- Se messages.user_id é UUID mas users.id é INTEGER, pular
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao atualizar messages: %', SQLERRM;
        END;
      END IF;
      
      RAISE NOTICE 'Dados migrados para user_id (INTEGER): %', admin_user_id;
    END IF;
  ELSIF user_id_type = 'uuid' THEN
    -- Supabase: usar UUID diretamente
    SELECT id INTO admin_user_uuid FROM users ORDER BY created_at ASC LIMIT 1;
    
    IF admin_user_uuid IS NOT NULL THEN
      -- Atualizar conversas sem user_id (UUID)
      BEGIN
        UPDATE conversations 
        SET user_id = admin_user_uuid
        WHERE user_id IS NULL;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar conversations: %', SQLERRM;
      END;
      
      -- Atualizar outras tabelas se existirem
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_appointments') THEN
        BEGIN
          UPDATE booking_appointments 
          SET user_id = admin_user_uuid 
          WHERE user_id IS NULL;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao atualizar booking_appointments: %', SQLERRM;
        END;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        BEGIN
          UPDATE messages 
          SET user_id = admin_user_uuid 
          WHERE user_id IS NULL;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao atualizar messages: %', SQLERRM;
        END;
      END IF;
      
      RAISE NOTICE 'Dados migrados para user_id (UUID): %', admin_user_uuid;
    END IF;
  ELSE
    RAISE NOTICE 'Tipo de user_id não reconhecido: %. Pulando migração de dados.', user_id_type;
  END IF;
END $$;
*/

-- 8. Adicionar campo para armazenar OpenAI API key no chatbot_profiles (opcional, para compatibilidade)
ALTER TABLE chatbot_profiles 
ADD COLUMN IF NOT EXISTS openai_api_key_encrypted TEXT;

COMMENT ON COLUMN chatbot_profiles.openai_api_key_encrypted IS 'OpenAI API Key criptografada (alternativa a user_api_keys)';

-- 9. Criar função para limpar dados de usuário (útil para testes)
CREATE OR REPLACE FUNCTION cleanup_user_data(target_user_id INTEGER)
RETURNS void AS $$
BEGIN
  -- Deletar em cascata (devido a ON DELETE CASCADE)
  DELETE FROM users WHERE id = target_user_id;
  
  RAISE NOTICE 'Dados do usuário % foram removidos', target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentários finais
COMMENT ON TABLE users IS 'Usuários do sistema multi-tenant';
COMMENT ON TABLE user_api_keys IS 'API keys criptografadas por usuário';
COMMENT ON TABLE user_google_oauth_config IS 'Configuração OAuth Google por usuário';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
-- Execute este script antes de iniciar o sistema multi-tenant
-- Certifique-se de definir ENCRYPTION_KEY no .env
