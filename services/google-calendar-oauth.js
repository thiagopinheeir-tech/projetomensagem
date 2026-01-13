const { google } = require('googleapis');
const { query } = require('../config/database');
const encryption = require('./encryption');

async function getActiveProfile(userId) {
  const r = await query(
    `SELECT id, google_oauth_client_id, google_oauth_client_secret_encrypted, google_oauth_redirect_uri
     FROM chatbot_profiles
     WHERE user_id = $1 AND is_active = true
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

async function getOAuthConfigForUser(userId) {
  // Primeiro tentar buscar da tabela user_google_oauth_config (nova estrutura multi-tenant)
  try {
    const userOAuthResult = await query(
      `SELECT client_id_encrypted, client_secret_encrypted, redirect_uri
       FROM user_google_oauth_config
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (userOAuthResult.rows.length > 0) {
      const row = userOAuthResult.rows[0];
      const clientId = row.client_id_encrypted ? encryption.decrypt(row.client_id_encrypted) : null;
      const clientSecret = row.client_secret_encrypted ? encryption.decrypt(row.client_secret_encrypted) : null;
      const redirectUri = row.redirect_uri || process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback';
      
      if (clientId && clientSecret) {
        console.log(`✅ [getOAuthConfigForUser] Credenciais encontradas em user_google_oauth_config para usuário ${userId}`);
        const active = await getActiveProfile(userId);
        return { clientId, clientSecret, redirectUri, profileId: active?.id || null };
      }
    }
  } catch (error) {
    console.warn(`⚠️ [getOAuthConfigForUser] Erro ao buscar de user_google_oauth_config:`, error.message);
  }

  // Fallback: buscar do perfil ativo (compatibilidade)
  const active = await getActiveProfile(userId);
  const clientId = active?.google_oauth_client_id || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secretEnc = active?.google_oauth_client_secret_encrypted || null;
  const clientSecret = secretEnc ? encryption.decrypt(secretEnc) : process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = active?.google_oauth_redirect_uri || process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback';
  
  if (!clientId || !clientSecret) {
    const err = new Error('Google OAuth não configurado para este usuário. Configure as credenciais OAuth nas configurações.');
    err.statusCode = 400;
    throw err;
  }
  
  return { clientId, clientSecret, redirectUri, profileId: active?.id || null };
}

function buildOAuthClient(oauthCfg) {
  const { clientId, clientSecret, redirectUri } = oauthCfg;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
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

function toDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    const err = new Error('Data/hora inválida');
    err.statusCode = 400;
    throw err;
  }
  return d;
}

function subtractBusy(from, to, busyIntervals, intervalMinutes = 0) {
  // Retorna lista de intervalos livres (Date objects) dentro [from, to)
  // intervalMinutes: intervalo entre agendamentos (adicionado antes e depois de cada evento ocupado)
  let free = [{ start: from, end: to }];
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const busy = (busyIntervals || [])
    .map(b => {
      const start = toDate(b.start);
      const end = toDate(b.end);
      // Expandir período ocupado com o intervalo antes e depois
      return {
        start: new Date(start.getTime() - intervalMs),
        end: new Date(end.getTime() + intervalMs)
      };
    })
    .filter(b => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  for (const b of busy) {
    const next = [];
    for (const f of free) {
      if (b.end <= f.start || b.start >= f.end) {
        next.push(f);
        continue;
      }
      if (b.start > f.start) next.push({ start: f.start, end: b.start });
      if (b.end < f.end) next.push({ start: b.end, end: f.end });
    }
    free = next;
    if (free.length === 0) break;
  }
  return free.filter(i => i.end > i.start);
}

function splitIntoSlots(freeIntervals, durationMinutes, maxSlots = 60) {
  const slots = [];
  const durationMs = durationMinutes * 60 * 1000;
  for (const i of freeIntervals) {
    let cursor = new Date(i.start);
    while (cursor.getTime() + durationMs <= i.end.getTime()) {
      slots.push(new Date(cursor));
      if (slots.length >= maxSlots) return slots;
      cursor = new Date(cursor.getTime() + durationMs);
    }
  }
  return slots;
}

function buildLocalDateTimeString(dateObj) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = dateObj.getFullYear();
  const m = pad(dateObj.getMonth() + 1);
  const d = pad(dateObj.getDate());
  const hh = pad(dateObj.getHours());
  const mm = pad(dateObj.getMinutes());
  const ss = pad(dateObj.getSeconds());
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

module.exports = {
  async getCalendarClientForUser(userId, profileId = null) {
    console.log(`📅 [getCalendarClientForUser] Iniciando:`, {
      userId: userId ? 'presente' : 'AUSENTE ❌',
      profileId: profileId || 'não fornecido'
    });

    if (!userId) {
      const err = new Error('userId é obrigatório para obter cliente do calendário');
      err.statusCode = 400;
      console.error('❌ [getCalendarClientForUser] Erro: userId não fornecido');
      throw err;
    }

    try {
      const oauthCfg = await getOAuthConfigForUser(userId);
      console.log(`📅 [getCalendarClientForUser] Configuração OAuth obtida:`, {
        hasClientId: !!oauthCfg.clientId,
        hasClientSecret: !!oauthCfg.clientSecret,
        profileId: oauthCfg.profileId
      });

      const targetProfileId = profileId || oauthCfg.profileId;
      
      if (!targetProfileId) {
        const err = new Error('Nenhum perfil ativo para este usuário');
        err.statusCode = 400;
        console.error('❌ [getCalendarClientForUser] Erro: Nenhum perfil ativo');
        throw err;
      }

      console.log(`📅 [getCalendarClientForUser] Buscando tokens do perfil:`, targetProfileId);
      const row = await getProfileTokenRow(targetProfileId);
      
      if (!row) {
        const err = new Error('Perfil não encontrado ou sem tokens do Google');
        err.statusCode = 400;
        console.error('❌ [getCalendarClientForUser] Erro: Perfil não encontrado');
        throw err;
      }

      if (!row?.refresh_token_encrypted) {
        const err = new Error('Google Agenda não conectado para este usuário. Faça a autenticação OAuth primeiro.');
        err.statusCode = 400;
        console.error('❌ [getCalendarClientForUser] Erro: refresh_token não encontrado');
        throw err;
      }

      console.log(`📅 [getCalendarClientForUser] Tokens encontrados, construindo cliente OAuth...`);
      const oauth2 = buildOAuthClient(oauthCfg);
      
      const refreshToken = encryption.decrypt(row.refresh_token_encrypted);
      const accessToken = row.access_token_encrypted ? encryption.decrypt(row.access_token_encrypted) : undefined;
      
      if (!refreshToken) {
        const err = new Error('Refresh token inválido ou corrompido');
        err.statusCode = 400;
        console.error('❌ [getCalendarClientForUser] Erro: refresh_token inválido após descriptografia');
        throw err;
      }

      oauth2.setCredentials({
        refresh_token: refreshToken,
        access_token: accessToken
      });

      // Configurar renovação automática de token
      oauth2.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
          console.log(`🔄 [getCalendarClientForUser] Refresh token atualizado`);
          // Atualizar refresh token no banco se necessário
        }
        if (tokens.access_token) {
          console.log(`🔄 [getCalendarClientForUser] Access token renovado`);
          // Atualizar access token no banco
          try {
            await query(
              `UPDATE profile_google_tokens 
               SET access_token_encrypted = $1, updated_at = CURRENT_TIMESTAMP 
               WHERE profile_id = $2`,
              [encryption.encrypt(tokens.access_token), targetProfileId]
            );
          } catch (updateError) {
            console.warn('⚠️ [getCalendarClientForUser] Erro ao atualizar access token:', updateError.message);
          }
        }
      });

      console.log(`📅 [getCalendarClientForUser] Cliente OAuth configurado, criando cliente do calendário...`);
      const calendar = google.calendar({ version: 'v3', auth: oauth2 });
      
      const calendarId = row.calendar_id_default;
      if (!calendarId) {
        const err = new Error('Selecione um calendário padrão antes de agendar. Vá em Configurações > Google Calendar.');
        err.statusCode = 400;
        console.error('❌ [getCalendarClientForUser] Erro: calendar_id_default não definido');
        throw err;
      }

      console.log(`✅ [getCalendarClientForUser] Cliente do calendário criado com sucesso:`, {
        calendarId: calendarId.substring(0, 50),
        timeZone: process.env.BOOKING_TIMEZONE || 'America/Sao_Paulo'
      });

      return { calendar, calendarId, timeZone: process.env.BOOKING_TIMEZONE || 'America/Sao_Paulo' };
    } catch (error) {
      console.error('❌ [getCalendarClientForUser] Erro ao obter cliente do calendário:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack?.substring(0, 200)
      });
      throw error;
    }
  },

  async getBusyIntervals({ userId, fromISO, toISO }) {
    const { calendar, calendarId } = await this.getCalendarClientForUser(userId);
    const from = toDate(fromISO);
    const to = toDate(toISO);
    if (to <= from) {
      const err = new Error('Intervalo inválido: `to` deve ser maior que `from`');
      err.statusCode = 400;
      throw err;
    }

    const resp = await calendar.freebusy.query({
      requestBody: {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        items: [{ id: calendarId }]
      }
    });

    return resp?.data?.calendars?.[calendarId]?.busy || [];
  },

  async getAvailableSlots({ userId, fromISO, toISO, durationMinutes, intervalMinutes = 0 }) {
    const duration = parseInt(String(durationMinutes || ''), 10);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
      const err = new Error('durationMinutes inválido');
      err.statusCode = 400;
      throw err;
    }

    // Corrigir: intervalMinutes pode ser 0, então não usar || que trata 0 como falsy
    const interval = (intervalMinutes !== null && intervalMinutes !== undefined) 
      ? parseInt(String(intervalMinutes), 10) 
      : 0;
    if (!Number.isFinite(interval) || interval < 0) {
      throw new Error('intervalMinutes deve ser um número >= 0');
    }

    const from = toDate(fromISO);
    const to = toDate(toISO);
    const busy = await this.getBusyIntervals({ userId, fromISO: from, toISO: to });
    const free = subtractBusy(from, to, busy, interval);
    const starts = splitIntoSlots(free, duration);

    return starts.map(d => ({
      startISO: d.toISOString(),
      startLocal: buildLocalDateTimeString(d)
    }));
  },

  async isSlotFree({ userId, startISO, durationMinutes, intervalMinutes = 0 }) {
    const start = toDate(startISO);
    const duration = parseInt(String(durationMinutes || ''), 10);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
      const err = new Error('durationMinutes inválido');
      err.statusCode = 400;
      throw err;
    }
    // Corrigir: intervalMinutes pode ser 0, então não usar || que trata 0 como falsy
    const interval = (intervalMinutes !== null && intervalMinutes !== undefined) 
      ? parseInt(String(intervalMinutes), 10) 
      : 0;
    if (!Number.isFinite(interval) || interval < 0) {
      throw new Error('intervalMinutes deve ser um número >= 0');
    }
    
    const intervalMs = interval * 60 * 1000;
    // Expandir janela de verificação para incluir o intervalo antes e depois
    const checkStart = new Date(start.getTime() - intervalMs);
    const checkEnd = new Date(start.getTime() + duration * 60 * 1000 + intervalMs);
    
    const busy = await this.getBusyIntervals({ userId, fromISO: checkStart, toISO: checkEnd });
    
    // Verificar se há conflito considerando o intervalo
    for (const b of busy) {
      const busyStart = toDate(b.start);
      const busyEnd = toDate(b.end);
      // Se o slot desejado sobrepõe com o período ocupado (considerando intervalo), não está livre
      if (start < busyEnd && new Date(start.getTime() + duration * 60 * 1000) > busyStart) {
        return false;
      }
    }
    return true;
  },

  async createAppointment({ userId, name, phone, service, startISO, durationMinutes, intervalMinutes = 0, notes }) {
    console.log(`📅 [createAppointment] Iniciando criação de agendamento:`, {
      userId: userId ? 'presente' : 'AUSENTE',
      name: name?.substring(0, 30),
      phone: phone?.substring(0, 15),
      service: service?.substring(0, 30),
      startISO: startISO?.substring(0, 30),
      durationMinutes,
      intervalMinutes
    });

    if (!userId) {
      const err = new Error('userId é obrigatório para criar agendamento');
      err.statusCode = 400;
      console.error('❌ [createAppointment] Erro: userId não fornecido');
      throw err;
    }

    const { calendar, calendarId, timeZone: tz } = await this.getCalendarClientForUser(userId);
    console.log(`✅ [createAppointment] Cliente do calendário obtido:`, {
      calendarId: calendarId?.substring(0, 50),
      timeZone: tz
    });

    const start = toDate(startISO);
    const duration = parseInt(String(durationMinutes || ''), 10);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
      const err = new Error('durationMinutes inválido');
      err.statusCode = 400;
      console.error('❌ [createAppointment] Erro: durationMinutes inválido:', durationMinutes);
      throw err;
    }
    const end = new Date(start.getTime() + duration * 60 * 1000);

    console.log(`📅 [createAppointment] Verificando disponibilidade do slot:`, {
      start: start.toISOString(),
      end: end.toISOString(),
      duration
    });

    const intervalForCheck = (intervalMinutes !== null && intervalMinutes !== undefined) ? Number(intervalMinutes) : 0;
    let free = false;
    try {
      free = await this.isSlotFree({ userId, startISO: start, durationMinutes: duration, intervalMinutes: Number.isFinite(intervalForCheck) && intervalForCheck >= 0 ? intervalForCheck : 0 });
      console.log(`📅 [createAppointment] Slot livre:`, free);
    } catch (slotError) {
      console.error('❌ [createAppointment] Erro ao verificar disponibilidade:', slotError.message);
      throw slotError;
    }

    if (!free) {
      const err = new Error('Horário indisponível (conflito no calendário)');
      err.statusCode = 409;
      console.warn('⚠️ [createAppointment] Slot não está livre');
      throw err;
    }

    const summary = `Agendamento - ${service}${name ? ` - ${name}` : ''}`;
    const descriptionLines = [
      `Cliente: ${name || '-'}`,
      `Telefone: ${phone || '-'}`,
      `Serviço: ${service || '-'}`,
      notes ? `Observações: ${notes}` : null
    ].filter(Boolean);

    const eventData = {
      summary,
      description: descriptionLines.join('\n'),
      start: { dateTime: buildLocalDateTimeString(start), timeZone: tz },
      end: { dateTime: buildLocalDateTimeString(end), timeZone: tz }
    };

    console.log(`📅 [createAppointment] Criando evento no Google Calendar:`, {
      calendarId: calendarId?.substring(0, 50),
      summary: eventData.summary?.substring(0, 50),
      start: eventData.start.dateTime,
      end: eventData.end.dateTime
    });

    let resp;
    try {
      console.log(`📅 [createAppointment] Enviando requisição para Google Calendar API...`);
      resp = await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });
      
      if (!resp || !resp.data) {
        throw new Error('Resposta vazia do Google Calendar API');
      }

      if (!resp.data.id) {
        console.error('❌ [createAppointment] Evento criado mas sem ID:', resp.data);
        throw new Error('Evento criado mas sem ID retornado');
      }

      console.log(`✅ [createAppointment] Evento criado com sucesso:`, {
        eventId: resp.data.id,
        htmlLink: resp.data.htmlLink?.substring(0, 80),
        summary: resp.data.summary,
        start: resp.data.start,
        end: resp.data.end
      });
    } catch (insertError) {
      console.error('❌ [createAppointment] Erro ao inserir evento no Google Calendar:', {
        message: insertError.message,
        code: insertError.code,
        statusCode: insertError.statusCode,
        response: insertError.response?.data,
        stack: insertError.stack?.substring(0, 300)
      });
      
      // Se for erro de autenticação, relançar com mensagem mais clara
      if (insertError.code === 401 || insertError.code === 403) {
        const authError = new Error('Erro de autenticação com Google Calendar. Refaça a conexão OAuth.');
        authError.statusCode = 401;
        throw authError;
      }
      
      throw insertError;
    }

    const result = {
      eventId: resp?.data?.id,
      id: resp?.data?.id,
      htmlLink: resp?.data?.htmlLink,
      summary: resp?.data?.summary,
      start: resp?.data?.start,
      end: resp?.data?.end
    };

    // Verificar se o evento realmente foi criado (verificação adicional)
    if (!result.eventId) {
      console.error('❌ [createAppointment] CRÍTICO: Evento criado mas sem eventId!', resp?.data);
      throw new Error('Evento criado no Google Calendar mas sem ID retornado. Verifique a resposta da API.');
    }

    // Tentar verificar se o evento existe no calendário (opcional, para garantir)
    try {
      const verifyEvent = await calendar.events.get({
        calendarId,
        eventId: result.eventId
      });
      
      if (verifyEvent?.data?.id === result.eventId) {
        console.log(`✅ [createAppointment] Evento verificado no calendário: ${result.eventId}`);
      } else {
        console.warn(`⚠️ [createAppointment] Evento criado mas verificação falhou`);
      }
    } catch (verifyError) {
      console.warn(`⚠️ [createAppointment] Não foi possível verificar evento (mas foi criado):`, verifyError.message);
      // Não falhar se a verificação falhar, pois o evento já foi criado
    }

    console.log(`✅ [createAppointment] Agendamento criado com sucesso:`, {
      eventId: result.eventId,
      hasHtmlLink: !!result.htmlLink,
      summary: result.summary?.substring(0, 50)
    });

    return result;
  },

  async deleteAppointment({ userId, eventId }) {
    console.log(`🗑️ [deleteAppointment] Iniciando cancelamento:`, {
      userId: userId ? 'presente' : 'AUSENTE ❌',
      eventId: eventId?.substring(0, 50)
    });

    if (!userId) {
      const err = new Error('userId é obrigatório para cancelar agendamento');
      err.statusCode = 400;
      console.error('❌ [deleteAppointment] Erro: userId não fornecido');
      throw err;
    }

    if (!eventId) {
      const err = new Error('eventId é obrigatório');
      err.statusCode = 400;
      console.error('❌ [deleteAppointment] Erro: eventId não fornecido');
      throw err;
    }

    try {
      const { calendar, calendarId } = await this.getCalendarClientForUser(userId);
      console.log(`🗑️ [deleteAppointment] Cliente do calendário obtido:`, {
        calendarId: calendarId?.substring(0, 50)
      });

      console.log(`🗑️ [deleteAppointment] Deletando evento do Google Calendar...`);
      await calendar.events.delete({
        calendarId,
        eventId
      });

      console.log(`✅ [deleteAppointment] Evento deletado com sucesso do Google Calendar`);
      return { success: true };
    } catch (error) {
      console.error('❌ [deleteAppointment] Erro ao deletar evento:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack?.substring(0, 200)
      });
      throw error;
    }
  }
};

