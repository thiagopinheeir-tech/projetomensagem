const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { query } = require('../config/database');
const encryption = require('../services/encryption');
const { convertUserIdForTable } = require('../utils/userId-converter');

async function getActiveProfileForUser(userId) {
  const convertedUserId = await convertUserIdForTable('chatbot_profiles', userId);
  const r = await query(
    `SELECT id, google_oauth_client_id, google_oauth_client_secret_encrypted, google_oauth_redirect_uri
     FROM chatbot_profiles
     WHERE user_id = $1 AND is_active = true
     ORDER BY updated_at DESC
     LIMIT 1`,
    [convertedUserId]
  );
  return r.rows[0] || null;
}

async function getOAuthConfigForUser(userId) {
  // Primeiro tentar buscar da tabela user_google_oauth_config (nova estrutura multi-tenant)
  try {
    const convertedUserId = await convertUserIdForTable('user_google_oauth_config', userId);
    const userOAuthResult = await query(
      `SELECT client_id_encrypted, client_secret_encrypted, redirect_uri
       FROM user_google_oauth_config
       WHERE user_id = $1
       LIMIT 1`,
      [convertedUserId]
    );

    if (userOAuthResult.rows.length > 0) {
      const row = userOAuthResult.rows[0];
      // Priorizar variáveis de ambiente se disponíveis
      let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || null;
      let clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || null;
      
      // Se não tiver no env, tentar descriptografar do banco
      if (!clientId && row.client_id_encrypted) {
        try {
          clientId = encryption.decrypt(row.client_id_encrypted);
        } catch (decryptError) {
          console.warn(`⚠️ [getOAuthConfigForUser] Erro ao descriptografar client_id de user_google_oauth_config:`, decryptError.message);
          clientId = null;
        }
      }
      
      if (!clientSecret && row.client_secret_encrypted) {
        try {
          clientSecret = encryption.decrypt(row.client_secret_encrypted);
        } catch (decryptError) {
          console.warn(`⚠️ [getOAuthConfigForUser] Erro ao descriptografar client_secret de user_google_oauth_config:`, decryptError.message);
          console.warn(`⚠️ [getOAuthConfigForUser] Dados podem estar criptografados com chave diferente. Use GOOGLE_OAUTH_CLIENT_SECRET no .env.`);
          clientSecret = null;
        }
      }
      
      const redirectUri = row.redirect_uri || process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback';
      
      if (clientId && clientSecret) {
        console.log(`✅ [getOAuthConfigForUser] Credenciais encontradas em user_google_oauth_config para usuário ${userId}`);
        const active = await getActiveProfileForUser(userId);
        return { clientId, clientSecret, redirectUri, activeProfileId: active?.id || null };
      } else {
        console.warn(`⚠️ [getOAuthConfigForUser] Credenciais em user_google_oauth_config incompletas ou inválidas. Continuando para fallback.`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ [getOAuthConfigForUser] Erro ao buscar de user_google_oauth_config:`, error.message);
  }

  // Fallback: buscar do perfil ativo (compatibilidade)
  const active = await getActiveProfileForUser(userId);
  let clientId = active?.google_oauth_client_id || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecretEnc = active?.google_oauth_client_secret_encrypted || null;
  
  // SEMPRE priorizar variável de ambiente se disponível
  let clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  
  // Se não tiver no env, tentar descriptografar do perfil
  if (!clientSecret && clientSecretEnc) {
    try {
      clientSecret = encryption.decrypt(clientSecretEnc);
      console.log(`✅ [getOAuthConfigForUser] Client secret descriptografado com sucesso do perfil`);
    } catch (decryptError) {
      console.warn(`⚠️ [getOAuthConfigForUser] Erro ao descriptografar client_secret do perfil:`, decryptError.message);
      console.warn(`⚠️ [getOAuthConfigForUser] Dados podem estar criptografados com chave diferente. Use GOOGLE_OAUTH_CLIENT_SECRET no .env ou remova e reconfigure.`);
      // NÃO tentar usar o valor criptografado como texto simples - isso não funciona
      clientSecret = null;
    }
  }
  
  const redirectUri = active?.google_oauth_redirect_uri || process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback';

  // Validar que temos pelo menos Client ID e Secret (de qualquer fonte)
  if (!clientId) {
    console.error(`❌ [getOAuthConfigForUser] Client ID não encontrado. Verifique perfil ou GOOGLE_OAUTH_CLIENT_ID no .env`);
    const err = new Error('Google OAuth Client ID não configurado. Configure no perfil ou defina GOOGLE_OAUTH_CLIENT_ID no .env');
    err.statusCode = 400;
    throw err;
  }
  
  if (!clientSecret) {
    console.error(`❌ [getOAuthConfigForUser] Client Secret não encontrado. Verifique perfil ou GOOGLE_OAUTH_CLIENT_SECRET no .env`);
    const err = new Error('Google OAuth Client Secret não configurado. Configure no perfil ou defina GOOGLE_OAUTH_CLIENT_SECRET no .env. Se os dados estiverem corrompidos, use o botão "Remover Credenciais" e reconfigure.');
    err.statusCode = 400;
    throw err;
  }

  console.log(`✅ [getOAuthConfigForUser] Configuração OAuth carregada: Client ID=${clientId.substring(0, 20)}..., Secret=***, Redirect=${redirectUri}`);

  return { clientId, clientSecret, redirectUri, activeProfileId: active?.id || null };
}

function getScopes() {
  // Google Calendar foi removido - retornar array vazio
  // Se houver outros escopos no futuro, adicionar aqui
  const raw = process.env.GOOGLE_OAUTH_SCOPES;
  if (raw && String(raw).trim()) {
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function buildOAuthClient({ clientId, clientSecret, redirectUri }) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function getTokenRow(userId) {
  const convertedUserId = await convertUserIdForTable('user_google_tokens', userId);
  const r = await query(
    `SELECT *
     FROM user_google_tokens
     WHERE user_id = $1
     LIMIT 1`,
    [convertedUserId]
  );
  return r.rows[0] || null;
}

function htmlResponse(title, message) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; background: #0b0f14; color: #e6edf3; }
      .card { max-width: 720px; margin: 0 auto; background: #111826; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      p { margin: 0 0 8px; line-height: 1.5; }
      code { background: #0b1220; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <p>Você pode fechar esta aba e voltar ao aplicativo.</p>
    </div>
  </body>
</html>`;
}

async function getProfileTokenRow(profileId) {
  const r = await query(
    `SELECT *
     FROM profile_google_tokens
     WHERE profile_id = $1
     LIMIT 1`,
    [profileId]
  );
  return r.rows[0] || null;
}

module.exports = {
  async start(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }
      const oauthCfg = await getOAuthConfigForUser(userId);
      const oauth2 = buildOAuthClient(oauthCfg);
      const scopes = getScopes();

      const state = jwt.sign(
        { userId, profileId: oauthCfg.activeProfileId, ts: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      const url = oauth2.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state
      });

      return res.json({ success: true, url });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Erro ao iniciar OAuth Google'
      });
    }
  },

  async callback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.status(400).send(htmlResponse('Conexão Google cancelada', `Erro: ${String(error)}`));
      }
      if (!code || !state) {
        return res.status(400).send(htmlResponse('Conexão Google falhou', 'Parâmetros ausentes (code/state).'));
      }

      let decoded;
      try {
        decoded = jwt.verify(String(state), process.env.JWT_SECRET);
      } catch (e) {
        return res.status(400).send(htmlResponse('Conexão Google falhou', 'State inválido ou expirado. Tente novamente.'));
      }

      const userId = decoded?.userId;
      const profileId = decoded?.profileId;
      if (!userId) {
        return res.status(400).send(htmlResponse('Conexão Google falhou', 'Usuário não identificado.'));
      }
      if (!profileId) {
        return res.status(400).send(htmlResponse('Conexão Google falhou', 'Perfil ativo não identificado. Selecione/ative um perfil no app e tente novamente.'));
      }

      let oauthCfg;
      try {
        oauthCfg = await getOAuthConfigForUser(userId);
      } catch (configError) {
        console.error(`❌ [callback] Erro ao obter configuração OAuth:`, configError.message);
        return res.status(500).send(htmlResponse('Conexão Google falhou', `Erro na configuração: ${configError.message}. Verifique as credenciais do Google OAuth.`));
      }

      const oauth2 = buildOAuthClient(oauthCfg);
      let tokens;
      try {
        const result = await oauth2.getToken(String(code));
        tokens = result.tokens;
      } catch (tokenError) {
        console.error(`❌ [callback] Erro ao obter token do Google:`, tokenError.message);
        console.error(`❌ [callback] Detalhes:`, tokenError);
        // Se for erro de invalid_client, pode ser problema com client_secret
        if (tokenError.message?.includes('invalid_client') || tokenError.code === 'invalid_client') {
          return res.status(500).send(htmlResponse('Conexão Google falhou', 'Erro: Client ID ou Client Secret inválidos. Verifique as credenciais do Google OAuth e tente novamente. Se persistir, use o botão "Remover Credenciais" e reconfigure.'));
        }
        return res.status(500).send(htmlResponse('Conexão Google falhou', `Erro ao obter token: ${tokenError.message || 'Erro desconhecido'}`));
      }

      const accessTokenEnc = tokens.access_token ? encryption.encrypt(tokens.access_token) : null;
      const refreshTokenEnc = tokens.refresh_token ? encryption.encrypt(tokens.refresh_token) : null;
      const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      // Upsert por perfil: preserva refresh token existente se o Google não retornar um novo
      const existing = await getProfileTokenRow(profileId);
      const finalRefresh = refreshTokenEnc || existing?.refresh_token_encrypted || null;

      if (existing) {
        await query(
          `UPDATE profile_google_tokens SET
            access_token_encrypted = $1,
            refresh_token_encrypted = $2,
            token_type = $3,
            scope = $4,
            expiry_date = $5,
            updated_at = CURRENT_TIMESTAMP
           WHERE profile_id = $6`,
          [
            accessTokenEnc,
            finalRefresh,
            tokens.token_type || existing.token_type || null,
            tokens.scope || existing.scope || null,
            expiryDate,
            profileId
          ]
        );
      } else {
        const convertedUserId = await convertUserIdForTable('profile_google_tokens', userId);
        await query(
          `INSERT INTO profile_google_tokens (
            user_id, profile_id, access_token_encrypted, refresh_token_encrypted, token_type, scope, expiry_date,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            convertedUserId,
            profileId,
            accessTokenEnc,
            finalRefresh,
            tokens.token_type || null,
            tokens.scope || null,
            expiryDate
          ]
        );
      }

      return res.send(htmlResponse('Google Agenda conectado', 'Conexão concluída com sucesso.'));
    } catch (e) {
      console.error(`❌ [callback] Erro inesperado:`, e);
      console.error(`❌ [callback] Stack:`, e.stack);
      return res.status(500).send(htmlResponse('Conexão Google falhou', e.message || 'Erro inesperado. Verifique os logs do servidor para mais detalhes.'));
    }
  },

  async status(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado', connected: false });
      }
      
      const active = await getActiveProfileForUser(userId);
      const row = active?.id ? await getProfileTokenRow(active.id) : null;
      
      // Verificar se tem refresh_token válido
      const hasValidToken = !!row?.refresh_token_encrypted;
      
      return res.json({
        success: true,
        connected: hasValidToken,
        profileId: active?.id || null,
        hasProfile: !!active,
        hasTokenRow: !!row
      });
    } catch (e) {
      console.error('❌ [status] Erro ao verificar status do Google:', e);
      return res.status(500).json({ 
        success: false, 
        message: e.message || 'Erro ao verificar status',
        connected: false
      });
    }
  },


  async disconnect(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const active = await getActiveProfileForUser(userId);
      if (!active?.id) {
        return res.status(404).json({ success: false, message: 'Perfil ativo não encontrado' });
      }

      // Deletar tokens do perfil
      await query(
        `DELETE FROM profile_google_tokens WHERE profile_id = $1`,
        [active.id]
      );

      // Deletar configuração OAuth do usuário (se existir)
      const convertedUserId = await convertUserIdForTable('user_google_oauth_config', userId);
      await query(
        `DELETE FROM user_google_oauth_config WHERE user_id = $1`,
        [convertedUserId]
      );

      // Deletar tokens do usuário (se existir)
      const convertedUserIdTokens = await convertUserIdForTable('user_google_tokens', userId);
      await query(
        `DELETE FROM user_google_tokens WHERE user_id = $1`,
        [convertedUserIdTokens]
      );

      console.log(`✅ [disconnect] Credenciais do Google removidas para usuário ${userId}, perfil ${active.id}`);

      return res.json({ 
        success: true, 
        message: 'Credenciais do Google removidas com sucesso. Você pode conectar novamente.' 
      });
    } catch (e) {
      console.error('❌ [disconnect] Erro ao remover credenciais:', e);
      return res.status(500).json({ 
        success: false, 
        message: e.message || 'Erro ao remover credenciais do Google' 
      });
    }
  }
};

