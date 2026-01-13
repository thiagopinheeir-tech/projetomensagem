const googleCalendarOAuth = require('./google-calendar-oauth');
const premiumShearsScheduler = require('./premium-shears-scheduler');
const appointmentNotifier = require('./appointment-notifier');
const { query } = require('../config/database');
const { supabase, isConfigured } = require('../config/supabase');

// Cache de configurações de perfil para evitar múltiplas queries
const profileConfigCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Cache de configuração do scheduler para evitar múltiplas queries
const schedulerConfigCache = new Map();
const SCHEDULER_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configuração do scheduler e retorna o serviço correto
 */
async function getSchedulerService(userId) {
  if (!userId) {
    return googleCalendarOAuth; // Fallback para Google Calendar
  }

  // Verificar cache
  const cacheKey = String(userId);
  const cached = schedulerConfigCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SCHEDULER_CACHE_TTL) {
    return cached.service;
  }

  try {
    const isConfigured = await premiumShearsScheduler.isConfiguredForUser(userId);
    const service = isConfigured ? premiumShearsScheduler : googleCalendarOAuth;
    
    // Atualizar cache
    schedulerConfigCache.set(cacheKey, {
      service,
      timestamp: Date.now()
    });

    return service;
  } catch (error) {
    console.warn('⚠️ [getSchedulerService] Erro ao verificar configuração, usando Google Calendar:', error.message);
    return googleCalendarOAuth; // Fallback para Google Calendar
  }
}

function norm(s) {
  return String(s || '').trim();
}

function lower(s) {
  return norm(s).toLowerCase();
}

function looksLikeName(text) {
  const t = norm(text);
  if (!t) return false;
  if (/\d/.test(t)) return false;
  if (t.length < 4 || t.length > 60) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const lt = t.toLowerCase();
  if (lt.includes('bom dia') || lt.includes('boa tarde') || lt.includes('boa noite') || lt === 'oi' || lt === 'ola' || lt === 'olá') return false;
  return /^[A-Za-zÀ-ÿ'\- ]+$/.test(t);
}

function parseTime(text) {
  const t = lower(text);
  // 14h, 14:30, 14h30
  const m = t.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  return { hour, minute };
}

function parseDate(text) {
  const t = lower(text);
  // yyyy-mm-dd
  const iso = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    dt.setFullYear(y, m - 1, d);
    return dt;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (t.includes('hoje')) return today;
  if (t.includes('amanha') || t.includes('amanhã')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  return null;
}

function buildDateTime(dateOnly, time) {
  const d = new Date(dateOnly);
  d.setHours(time.hour, time.minute, 0, 0);
  return d;
}

function getOpenClose(dateOnly) {
  const openHour = parseInt(process.env.BOOKING_OPEN_HOUR || '9', 10);
  const closeHour = parseInt(process.env.BOOKING_CLOSE_HOUR || '20', 10);
  const start = new Date(dateOnly);
  start.setHours(openHour, 0, 0, 0);
  const end = new Date(dateOnly);
  end.setHours(closeHour, 0, 0, 0);
  return { start, end };
}

function formatHuman(d) {
  // dd/mm hh:mm
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

class BookingService {
  constructor() {
    this.state = new Map(); // phone -> state
  }

  isEnabledForConfig(cfg = {}) {
    const enabled = String(process.env.BOOKING_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      // Se não está habilitado por env, verificar se é barbearia
      const name = lower(cfg.businessName || '');
      const instr = lower(cfg.specialInstructions || '');
      const templateKey = lower(cfg.templateKey || '');
      // Habilitar se for barbearia ou se o prompt contém "agend"
      if (name.includes('barbear') || instr.includes('agend') || templateKey === 'barbearia') {
        return true;
      }
      return false;
    }

    const always = String(process.env.BOOKING_ALWAYS_ON || '').toLowerCase() === 'true';
    if (always) return true;

    const name = lower(cfg.businessName || '');
    const instr = lower(cfg.specialInstructions || '');
    const templateKey = lower(cfg.templateKey || '');
    // Habilitar se for barbearia ou se o prompt contém "agend"
    return name.includes('barbear') || instr.includes('agend') || templateKey === 'barbearia';
  }

  async getProfileConfig(profileId) {
    if (!profileId) {
      return {
        serviceDurationMinutes: parseInt(process.env.BOOKING_DURATION_MINUTES || '30', 10),
        intervalBetweenAppointmentsMinutes: parseInt(process.env.BOOKING_INTERVAL_MINUTES || '0', 10)
      };
    }

    // Verificar cache
    const cached = profileConfigCache.get(profileId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.config;
    }

    try {
      const result = await query(
        `SELECT service_duration_minutes, interval_between_appointments_minutes
         FROM chatbot_profiles
         WHERE id = $1`,
        [profileId]
      );
      
      const row = result.rows[0];
      const config = {
        serviceDurationMinutes: row?.service_duration_minutes 
          ? parseInt(row.service_duration_minutes, 10) 
          : parseInt(process.env.BOOKING_DURATION_MINUTES || '30', 10),
        intervalBetweenAppointmentsMinutes: (row?.interval_between_appointments_minutes !== null && row?.interval_between_appointments_minutes !== undefined)
          ? parseInt(row.interval_between_appointments_minutes, 10)
          : parseInt(process.env.BOOKING_INTERVAL_MINUTES || '0', 10)
      };

      // Validar valores
      if (!Number.isFinite(config.serviceDurationMinutes) || config.serviceDurationMinutes <= 0) {
        config.serviceDurationMinutes = 30;
      }
      if (!Number.isFinite(config.intervalBetweenAppointmentsMinutes) || config.intervalBetweenAppointmentsMinutes < 0) {
        config.intervalBetweenAppointmentsMinutes = 0;
      }

      // Atualizar cache
      profileConfigCache.set(profileId, { config, timestamp: Date.now() });
      return config;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar configuração do perfil, usando padrões:', error.message);
      return {
        serviceDurationMinutes: parseInt(process.env.BOOKING_DURATION_MINUTES || '30', 10),
        intervalBetweenAppointmentsMinutes: parseInt(process.env.BOOKING_INTERVAL_MINUTES || '0', 10)
      };
    }
  }

  getDurationMinutes() {
    // Método legado - mantido para compatibilidade
    const n = parseInt(process.env.BOOKING_DURATION_MINUTES || '30', 10);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  reset(phone) {
    this.state.delete(phone);
  }

  getOrCreate(phone) {
    if (!this.state.has(phone)) {
      this.state.set(phone, {
        name: null,
        service: null,
        dateOnly: null,
        time: null,
        awaitingChoice: false,
        suggestedSlots: [] // array of {startISO, startLocal}
      });
    }
    return this.state.get(phone);
  }

  detectServiceFromMessage(text, cfg = {}) {
    const services = Array.isArray(cfg.services) ? cfg.services : [];
    const lt = lower(text);
    // match por substring simples
    for (const s of services) {
      const token = lower(s);
      if (token && lt.includes(token)) return s;
    }
    // heurísticas comuns
    if (lt.includes('corte') && lt.includes('barba')) return 'Corte + Barba';
    if (lt.includes('barba')) return 'Barba';
    if (lt.includes('corte')) return 'Corte';
    return null;
  }

  async handleMessage({ userId, phone, message, cfg, profileId }) {
    // Log para debug
    const isEnabled = this.isEnabledForConfig(cfg);
    const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
    const msg = norm(message);
    const lmsg = lower(msg);
    
    console.log(`📅 BookingService.handleMessage chamado:`, {
      userId: userId ? 'presente' : 'ausente',
      phone: cleanPhone.substring(0, 10) + '...',
      isEnabled,
      businessName: cfg?.businessName,
      messagePreview: msg.substring(0, 50)
    });

    // Verificar comandos de consulta/cancelamento/remarcação PRIMEIRO
    // Estes comandos devem ser processados SEMPRE, mesmo se o serviço não estiver habilitado
    
    // Comandos de consulta (sempre processar)
    if (lmsg.includes('consultar') || lmsg.includes('meus agendamentos') || lmsg.includes('meu agendamento') || lmsg.includes('agendamentos')) {
      if (!userId) {
        return { handled: true, reply: 'Para consultar seus agendamentos, você precisa estar logado no sistema.' };
      }
      return await this.handleListAppointments({ userId, profileId, phone: cleanPhone });
    }

    // CANCELAMENTO DESABILITADO - Será feito diretamente com o estabelecimento
    // Quando o cliente pedir para cancelar, orientar a entrar em contato
    const cancelKeywords = ['cancelar agendamento', 'cancelar meu agendamento', 'cancelar agendamentos', 
                           'quero cancelar', 'preciso cancelar', 'cancelar o agendamento', 
                           'cancelar um agendamento', 'cancelar', 'cancela'];
    
    const hasCancelIntent = cancelKeywords.some(keyword => lmsg.includes(keyword));
    
    if (hasCancelIntent) {
      console.log(`🗑️ [handleMessage] Cliente solicitou cancelamento - orientando a entrar em contato`);
      return { 
        handled: true, 
        reply: 'Para cancelar ou alterar seu agendamento, entre em contato diretamente com o estabelecimento. Eles poderão ajudá-lo da melhor forma.\n\nVocê pode consultar seus agendamentos digitando "meus agendamentos".' 
      };
    }
    
    // Remover detecção de números para cancelamento

    // Se não for comando de consulta/cancelamento, verificar se está habilitado
    if (!isEnabled) {
      console.log(`⚠️ BookingService não está habilitado para esta configuração`);
      return { handled: false };
    }

    if (!userId) {
      console.warn(`⚠️ BookingService: userId não definido`);
      return { handled: true, reply: `Para eu agendar automaticamente, preciso que você esteja logado no app (usuário ativo não definido). Você consegue abrir o dashboard e selecionar o perfil novamente?` };
    }

    const state = this.getOrCreate(cleanPhone);
    
    console.log(`📅 BookingService processando mensagem:`, {
      cleanPhone,
      messagePreview: msg.substring(0, 50),
      stateExists: !!state,
      hasState: !!(state.name || state.service || state.dateOnly || state.time || state.awaitingChoice)
    });
    
    // Buscar configuração do perfil (duração e intervalo) se ainda não foi carregada
    if (!state.profileConfig) {
      state.profileConfig = await this.getProfileConfig(profileId);
    }

    // Verificar se há estado ativo de agendamento (nome, serviço, data/hora sendo coletados)
    const hasActiveBookingState = !!(state.name || state.service || state.dateOnly || state.time || state.awaitingChoice);
    
    // Se a mensagem é apenas um número (1-10), pode ser escolha de agendamento para cancelar
    // Verificar se há agendamentos futuros e processar como cancelamento
    if (/^\s*[1-9]\d?\s*$/.test(lmsg)) {
      const num = parseInt(lmsg.trim(), 10);
      if (num >= 1 && num <= 10) {
        // Verificar se há agendamentos futuros
        try {
          const checkResult = await query(
            `SELECT COUNT(*) as count
             FROM booking_appointments
             WHERE user_id = $1 AND phone = $2 AND start_time >= NOW() AND status = 'confirmed'
             LIMIT 1`,
            [userId, cleanPhone]
          );
          
          if (checkResult.rows[0]?.count > 0) {
            // Há agendamentos, processar como cancelamento
            return await this.handleCancelAppointment({ userId, profileId, phone: cleanPhone, message: lmsg });
          }
        } catch (err) {
          // Se falhar, continuar fluxo normal
        }
      }
    }

    // Remarcação desabilitada - cliente deve entrar em contato com o estabelecimento
    if (lmsg.includes('remarcar') || lmsg.includes('reagendar')) {
      return { 
        handled: true, 
        reply: 'Para remarcar seu agendamento, entre em contato diretamente com o estabelecimento. Eles poderão ajudá-lo a encontrar um novo horário disponível.' 
      };
    }

    // comandos de cancelar criação de novo agendamento
    if (lmsg === 'cancelar' || lmsg === 'cancela' || lmsg === 'parar') {
      if (hasActiveBookingState) {
        this.reset(cleanPhone);
        return { handled: true, reply: `Certo — agendamento cancelado. Quer marcar um novo horário?` };
      }
      // Se não há estado ativo, deixar passar para IA
      return { handled: false };
    }

    // escolha de slot sugerido (sempre processar se aguardando escolha)
    if (state.awaitingChoice) {
      const m = lmsg.match(/^\s*([1-3])\s*$/);
      if (m) {
        const idx = parseInt(m[1], 10) - 1;
        const slot = state.suggestedSlots[idx];
        if (!slot) {
          return { handled: true, reply: `Opção inválida. Responda com **1**, **2** ou **3**.` };
        }

        const calendarService = await getSchedulerService(userId);
        const schedulerType = calendarService === premiumShearsScheduler ? 'premium_shears' : 'google_calendar';
        
        const duration = state.profileConfig?.serviceDurationMinutes || this.getDurationMinutes();
        let appt = null;
        let calendarError = null;
        
        try {
          appt = await calendarService.createAppointment({
            userId,
            name: state.name || '',
            phone: cleanPhone,
            service: state.service || 'Agendamento',
            startISO: slot.startISO,
            durationMinutes: duration,
            notes: ''
          });
          console.log(`✅ Agendamento criado no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}: ${appt.eventId || appt.id}`);
        } catch (err) {
          console.error(`❌ Erro ao criar agendamento no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}:`, err.message);
          calendarError = err;
          // Continuar para salvar no banco mesmo se falhar
        }

        // Salvar no banco de dados (mesmo se falhar)
        let savedAppointmentId = null;
        try {
          const savedAppt = await this.saveAppointmentToDatabase({
            userId,
            profileId,
            phone: cleanPhone,
            clientName: state.name,
            service: state.service || 'Agendamento',
            startTime: new Date(slot.startISO),
            endTime: new Date(new Date(slot.startISO).getTime() + duration * 60000),
            googleCalendarEventId: schedulerType === 'google_calendar' ? (appt?.eventId || appt?.id || null) : null,
            externalEventId: schedulerType === 'premium_shears' ? (appt?.eventId || appt?.id || null) : null,
            schedulerType: schedulerType,
            notes: calendarError ? `Erro ao criar no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}: ${calendarError.message}` : null
          });
          savedAppointmentId = savedAppt?.id || appt?.eventId || appt?.id;
        } catch (dbError) {
          console.error('❌ Erro ao salvar agendamento no banco de dados:', dbError);
          throw dbError; // Re-throw para que o fluxo pare aqui
        }

        // Enviar mensagem de confirmação com lista de agendamentos
        try {
          await appointmentNotifier.sendAppointmentConfirmation(cleanPhone, userId, savedAppointmentId);
        } catch (notifyError) {
          console.warn('⚠️ Erro ao enviar notificação WhatsApp:', notifyError.message);
          // Não falhar o agendamento se a notificação falhar
        }

        this.reset(cleanPhone);
        return {
          handled: true,
          reply: `✅ Agendado! *${state.service || 'Serviço'}* para *${state.name || 'cliente'}* em *${slot.startLocal}*.\n${appt.htmlLink ? `Link do agendamento: ${appt.htmlLink}\n` : ''}Quer agendar mais algum horário?`
        };
      }
      // se não respondeu com 1-3, continua coletando
    }

    // Verificar se a mensagem indica intenção de agendamento
    const bookingKeywords = ['agendar', 'marcar', 'horario', 'agendamento', 'reservar', 'marcar horario', 'marcar horário', 'quero agendar', 'quero marcar', 'preciso agendar'];
    const hasBookingIntent = bookingKeywords.some(keyword => lmsg.includes(keyword));
    
    // Se não há estado ativo E não há intenção de agendamento, deixar passar para IA
    if (!hasActiveBookingState && !hasBookingIntent) {
      console.log(`📅 BookingService: mensagem não relacionada a agendamento, passando para IA`);
      return { handled: false };
    }

    // coletar nome
    if (!state.name && looksLikeName(msg)) {
      state.name = msg;
    }
    if (!state.name) {
      // Se não há intenção de agendamento e não há estado, deixar passar
      if (!hasBookingIntent && !hasActiveBookingState) {
        return { handled: false };
      }
      return {
        handled: true,
        reply: `Perfeito — vamos agendar. Qual é seu **nome completo**?`
      };
    }

    // coletar serviço
    if (!state.service) {
      state.service = this.detectServiceFromMessage(msg, cfg);
    }
    if (!state.service) {
      const services = Array.isArray(cfg.services) && cfg.services.length > 0 ? cfg.services : ['Corte', 'Barba', 'Corte + Barba'];
      return {
        handled: true,
        reply: `Beleza, ${state.name}! Qual serviço você quer agendar?\n- ${services.slice(0, 6).join('\n- ')}\nQual você prefere?`
      };
    }

    // coletar data/hora
    if (!state.dateOnly) {
      const d = parseDate(msg);
      if (d) state.dateOnly = d;
    }
    if (!state.time) {
      const t = parseTime(msg);
      if (t) state.time = t;
    }

    if (!state.dateOnly && !state.time) {
      return {
        handled: true,
        reply: `Show, ${state.name}. Para *${state.service}*, você quer agendar para **qual dia e horário**? (ex: "amanhã 14h" ou "2026-01-11 10h30")`
      };
    }
    if (!state.dateOnly) {
      return { handled: true, reply: `Qual **dia** você prefere? (ex: "hoje", "amanhã" ou "2026-01-11")` };
    }
    if (!state.time) {
      return { handled: true, reply: `Qual **horário** você prefere? (ex: "14h" ou "14:30")` };
    }

    // tentar agendar no horário solicitado
    const duration = state.profileConfig?.serviceDurationMinutes || this.getDurationMinutes();
    const desired = buildDateTime(state.dateOnly, state.time);

    // checar janela de atendimento
    const { start: open, end: close } = getOpenClose(state.dateOnly);
    if (desired < open || desired >= close) {
      state.time = null;
      return {
        handled: true,
        reply: `Esse horário fica fora do atendimento. Nosso horário é das **${String(open.getHours()).padStart(2, '0')}:00** às **${String(close.getHours()).padStart(2, '0')}:00**.\nQual horário você prefere dentro desse período?`
      };
    }

    const calendarService = await getSchedulerService(userId);
    const schedulerType = calendarService === premiumShearsScheduler ? 'premium_shears' : 'google_calendar';
    
    let isFree = false;
    try {
      isFree = await calendarService.isSlotFree({ 
        userId, 
        startISO: desired.toISOString(), 
        durationMinutes: duration,
        intervalMinutes: state.profileConfig?.intervalBetweenAppointmentsMinutes || 0
      });
    } catch (e) {
      // Caso comum: usuário não conectou ou não configurou sistema de agendamento
      const serviceName = schedulerType === 'premium_shears' ? 'Premium Shears Scheduler' : 'Google Calendar';
      return {
        handled: true,
        reply: `Para eu consultar horários e agendar, você precisa **configurar o ${serviceName}** no app (Chaves e Integrações).\n\nDepois disso, me diga novamente: qual dia e horário você quer?`
      };
    }
    if (isFree) {
      let appt = null;
      let calendarError = null;
      
      try {
        appt = await calendarService.createAppointment({
          userId,
          name: state.name,
          phone: cleanPhone,
          service: state.service,
          startISO: desired.toISOString(),
          durationMinutes: duration,
          intervalMinutes: state.profileConfig?.intervalBetweenAppointmentsMinutes || 0,
          notes: ''
        });
        console.log(`✅ Agendamento criado no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}: ${appt.eventId || appt.id}`);
      } catch (err) {
        console.error(`❌ Erro ao criar agendamento no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}:`, err.message);
        calendarError = err;
        // Continuar para salvar no banco mesmo se falhar
      }
      
      // Salvar no banco de dados (mesmo se falhar)
      let savedAppointmentId = null;
      try {
        const savedAppt = await this.saveAppointmentToDatabase({
          userId,
          profileId,
          phone: cleanPhone,
          clientName: state.name,
          service: state.service,
          startTime: desired,
          endTime: new Date(desired.getTime() + duration * 60000),
          googleCalendarEventId: schedulerType === 'google_calendar' ? (appt?.eventId || appt?.id || null) : null,
          externalEventId: schedulerType === 'premium_shears' ? (appt?.eventId || appt?.id || null) : null,
          schedulerType: schedulerType,
          notes: calendarError ? `Erro ao criar no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}: ${calendarError.message}` : null
        });
        savedAppointmentId = savedAppt?.id || appt?.eventId || appt?.id;
      } catch (dbError) {
        console.error('❌ Erro ao salvar agendamento no banco de dados:', dbError);
        throw dbError; // Re-throw para que o fluxo pare aqui
      }

      // Enviar mensagem de confirmação com lista de agendamentos
      try {
        await appointmentNotifier.sendAppointmentConfirmation(cleanPhone, userId, savedAppointmentId);
      } catch (notifyError) {
        console.warn('⚠️ Erro ao enviar notificação WhatsApp:', notifyError.message);
        // Não falhar o agendamento se a notificação falhar
      }
      
      const when = formatHuman(desired);
      this.reset(cleanPhone);
      return {
        handled: true,
        reply: `✅ Agendado! *${state.service}* para *${state.name}* em *${when}*.\n${appt.htmlLink ? `Link do agendamento: ${appt.htmlLink}\n` : ''}Quer agendar outro horário?`
      };
    }

    // sugerir 3 opções do dia
    const calendarService = await getSchedulerService(userId);
    const schedulerType = calendarService === premiumShearsScheduler ? 'premium_shears' : 'google_calendar';
    
    const { start, end } = getOpenClose(state.dateOnly);
    let slots = [];
    try {
      slots = await calendarService.getAvailableSlots({
        userId,
        fromISO: start.toISOString(),
        toISO: end.toISOString(),
        durationMinutes: duration,
        intervalMinutes: state.profileConfig?.intervalBetweenAppointmentsMinutes || 0
      });
    } catch (e) {
      const serviceName = schedulerType === 'premium_shears' ? 'Premium Shears Scheduler' : 'Google Calendar';
      return {
        handled: true,
        reply: `Para eu sugerir horários disponíveis, você precisa **configurar o ${serviceName}** no app (Chaves e Integrações).\n\nQuer que eu te diga onde fica essa opção no painel?`
      };
    }

    const suggestions = slots.slice(0, 3);
    if (suggestions.length === 0) {
      // tentar dia seguinte
      const nextDay = new Date(state.dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);
      state.dateOnly = nextDay;
      state.time = null;
      return {
        handled: true,
        reply: `Poxa, não tenho horários disponíveis nesse dia. Quer tentar **amanhã**? Se sim, me diga um horário (ex: "10h" ou "15h").`
      };
    }

    state.awaitingChoice = true;
    state.suggestedSlots = suggestions;

    return {
      handled: true,
      reply: `Esse horário já está ocupado. Tenho estes horários disponíveis:\n1) ${suggestions[0].startLocal}\n2) ${suggestions[1]?.startLocal || '-'}\n3) ${suggestions[2]?.startLocal || '-'}\n\nResponda com **1**, **2** ou **3** para eu agendar agora.`
    };
  }

  /**
   * Cria agendamento a partir de informações coletadas pela IA
   * Esta função é chamada pela IA quando ela tem todas as informações necessárias
   */
  async createAppointmentFromAI({ userId, profileId, phone, clientName, service, startISO, durationMinutes, notes = '' }) {
    console.log(`📅 [createAppointmentFromAI] Iniciando criação de agendamento a partir da IA:`, {
      userId: userId ? 'presente' : 'AUSENTE ❌',
      profileId: profileId ? 'presente' : 'AUSENTE ❌',
      phone: phone?.substring(0, 15),
      clientName: clientName?.substring(0, 30),
      service: service?.substring(0, 30),
      startISO: startISO?.substring(0, 30),
      durationMinutes
    });

    try {
      if (!userId) {
        const errorMsg = 'userId não definido - necessário para criar agendamento';
        console.error(`❌ [createAppointmentFromAI] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      if (!profileId) {
        const errorMsg = 'profileId não definido - necessário para criar agendamento';
        console.error(`❌ [createAppointmentFromAI] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      console.log(`📅 [createAppointmentFromAI] Telefone limpo:`, cleanPhone);
      
      // Buscar configuração do perfil
      console.log(`📅 [createAppointmentFromAI] Buscando configuração do perfil:`, profileId);
      const profileConfig = await this.getProfileConfig(profileId);
      const duration = durationMinutes || profileConfig.serviceDurationMinutes || 30;
      console.log(`📅 [createAppointmentFromAI] Configuração obtida:`, {
        durationMinutes: duration,
        intervalMinutes: profileConfig.intervalBetweenAppointmentsMinutes
      });
      
      const startTime = new Date(startISO);
      if (isNaN(startTime.getTime())) {
        const errorMsg = `Data/hora inválida: ${startISO}`;
        console.error(`❌ [createAppointmentFromAI] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
      const endTime = new Date(startTime.getTime() + duration * 60000);

      console.log(`📅 [createAppointmentFromAI] Preparando para criar evento:`, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration
      });

      // Buscar serviço de agendamento correto (Premium Shears ou Google Calendar)
      const calendarService = await getSchedulerService(userId);
      const schedulerType = calendarService === premiumShearsScheduler ? 'premium_shears' : 'google_calendar';
      console.log(`📅 [createAppointmentFromAI] Usando serviço: ${schedulerType}`);

      // Criar evento no sistema de agendamento
      // Se o horário solicitado estiver ocupado, tentar horários alternativos automaticamente
      let appt = null;
      let calendarError = null;
      let finalStartTime = startTime;
      let triedAlternativeTimes = false;

      const intervalMinutes = (profileConfig.intervalBetweenAppointmentsMinutes !== null && profileConfig.intervalBetweenAppointmentsMinutes !== undefined)
        ? Number(profileConfig.intervalBetweenAppointmentsMinutes)
        : 0;

      try {
        console.log(`📅 [createAppointmentFromAI] Tentando criar agendamento no horário solicitado...`);
        appt = await calendarService.createAppointment({
          userId,
          name: clientName,
          phone: cleanPhone,
          service: service,
          startISO: startTime.toISOString(),
          durationMinutes: duration,
          intervalMinutes: Number.isFinite(intervalMinutes) && intervalMinutes >= 0 ? intervalMinutes : 0,
          notes: notes
        });
        console.log(`✅ [createAppointmentFromAI] Agendamento criado no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}:`, {
          eventId: appt.eventId || appt.id,
          htmlLink: appt.htmlLink?.substring(0, 80)
        });
      } catch (err) {
        // Se o erro for de horário ocupado (409), tentar horários alternativos
        if (err.statusCode === 409 && err.message.includes('indisponível')) {
          console.log(`⚠️ [createAppointmentFromAI] Horário solicitado ocupado. Buscando horário alternativo...`);
          triedAlternativeTimes = true;

          // Tentar horários alternativos: expandir busca significativamente
          // Tentar múltiplos horários no mesmo dia e dias seguintes
          const alternativeOffsets = [];
          
          // Mesmo dia: +30min até +6h (a cada 30min)
          for (let i = 30; i <= 360; i += 30) {
            alternativeOffsets.push(i);
          }
          
          // Mesmo dia: -30min até -2h (se não for passado)
          for (let i = -30; i >= -120; i -= 30) {
            alternativeOffsets.push(i);
          }
          
          // Próximos 3 dias: horários das 9h às 19h (a cada hora)
          const baseTime = startTime.getTime();
          for (let day = 1; day <= 3; day++) {
            for (let hour = 9; hour < 20; hour++) {
              const nextDayTime = new Date(startTime);
              nextDayTime.setDate(nextDayTime.getDate() + day);
              nextDayTime.setHours(hour, 0, 0, 0);
              const offsetMinutes = Math.round((nextDayTime.getTime() - baseTime) / 60000);
              if (offsetMinutes > 0 && !alternativeOffsets.includes(offsetMinutes)) {
                alternativeOffsets.push(offsetMinutes);
              }
            }
          }
          
          // Ordenar offsets (positivos primeiro, depois negativos)
          alternativeOffsets.sort((a, b) => {
            if (a > 0 && b > 0) return a - b;
            if (a < 0 && b < 0) return b - a;
            return a > 0 ? -1 : 1;
          });
          
          let foundAlternative = false;
          let attemptsCount = 0;
          const maxAttempts = 20; // Limitar tentativas para não demorar muito

          for (const offsetMinutes of alternativeOffsets) {
            if (attemptsCount >= maxAttempts) {
              console.log(`⚠️ [createAppointmentFromAI] Limite de ${maxAttempts} tentativas atingido`);
              break;
            }
            
            const alternativeTime = new Date(startTime.getTime() + offsetMinutes * 60000);
            
            // Não permitir horários no passado
            if (alternativeTime < new Date()) {
              continue;
            }

            // Verificar se está dentro do horário de funcionamento (9h-20h)
            const hour = alternativeTime.getHours();
            if (hour < 9 || hour >= 20) {
              continue;
            }
            
            attemptsCount++;

            try {
              attemptsCount++;
              console.log(`🔄 [createAppointmentFromAI] Tentativa ${attemptsCount}/${alternativeOffsets.length}: ${alternativeTime.toLocaleString('pt-BR')}...`);
              appt = await calendarService.createAppointment({
                userId,
                name: clientName,
                phone: cleanPhone,
                service: service,
                startISO: alternativeTime.toISOString(),
                durationMinutes: duration,
                intervalMinutes: Number.isFinite(intervalMinutes) && intervalMinutes >= 0 ? intervalMinutes : 0,
                notes: notes + (notes ? ' | ' : '') + `Horário ajustado automaticamente (original: ${startTime.toLocaleString('pt-BR')})`
              });
              
              finalStartTime = alternativeTime;
              foundAlternative = true;
              console.log(`✅ [createAppointmentFromAI] Agendamento criado em horário alternativo (tentativa ${attemptsCount}):`, {
                eventId: appt.eventId || appt.id,
                originalTime: startTime.toLocaleString('pt-BR'),
                newTime: alternativeTime.toLocaleString('pt-BR'),
                htmlLink: appt.htmlLink?.substring(0, 80)
              });
              break;
            } catch (altErr) {
              // Continuar tentando outros horários
              if (altErr.statusCode !== 409) {
                // Se não for erro de conflito, parar de tentar
                console.error(`❌ [createAppointmentFromAI] Erro ao tentar horário alternativo (tentativa ${attemptsCount}):`, {
                  message: altErr.message,
                  statusCode: altErr.statusCode,
                  code: altErr.code,
                  time: alternativeTime.toISOString()
                });
                // Se for erro de autenticação ou permissão, não continuar tentando
                if (altErr.statusCode === 401 || altErr.statusCode === 403) {
                  calendarError = altErr;
                  break;
                }
              } else {
                console.log(`   ⚠️ Tentativa ${attemptsCount}: Horário ${alternativeTime.toLocaleString('pt-BR')} também ocupado`);
              }
            }
          }

          if (!foundAlternative) {
            console.error('❌ [createAppointmentFromAI] Não foi possível encontrar horário disponível próximo');
            console.error('   Tentou os seguintes horários alternativos:', alternativeOffsets.map(offset => {
              const altTime = new Date(startTime.getTime() + offset * 60000);
              return altTime.toLocaleString('pt-BR');
            }).join(', '));
            calendarError = new Error('Horário solicitado ocupado e não foi possível encontrar alternativa disponível. Tente um horário diferente.');
            calendarError.statusCode = 409;
          }
        } else {
          // Outro tipo de erro
          console.error('❌ [createAppointmentFromAI] Erro ao criar agendamento no Google Calendar:', {
            message: err.message,
            statusCode: err.statusCode,
            stack: err.stack?.substring(0, 200)
          });
          calendarError = err;
        }
      }

      // Verificar se já existe agendamento duplicado (mesmo telefone, horário similar, status confirmed)
      // Antes de salvar, verificar duplicatas para evitar criar múltiplos agendamentos
      try {
        const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
        const duplicateCheck = await query(
          `SELECT id, google_calendar_event_id, external_event_id, scheduler_type, start_time, status
           FROM booking_appointments
           WHERE user_id = $1 
             AND phone = $2 
             AND status = 'confirmed'
             AND ABS(EXTRACT(EPOCH FROM (start_time - $3::timestamp))) < 3600
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, cleanPhone, finalStartTime]
        );

        if (duplicateCheck.rows.length > 0) {
          const duplicate = duplicateCheck.rows[0];
          const duplicateEventId = duplicate.external_event_id || duplicate.google_calendar_event_id;
          console.log(`⚠️ [createAppointmentFromAI] Agendamento duplicado detectado:`, {
            duplicateId: duplicate.id,
            existingEventId: duplicateEventId?.substring(0, 30),
            schedulerType: duplicate.scheduler_type,
            existingTime: new Date(duplicate.start_time).toLocaleString('pt-BR'),
            newTime: finalStartTime.toLocaleString('pt-BR')
          });

          // Se o novo agendamento foi criado, cancelar o anterior no sistema de agendamento
          if (appt && appt.eventId && duplicateEventId) {
            try {
              const serviceToUse = duplicate.scheduler_type === 'premium_shears' ? premiumShearsScheduler : googleCalendarOAuth;
              await serviceToUse.deleteAppointment({ userId, eventId: duplicateEventId });
              console.log(`✅ [createAppointmentFromAI] Agendamento anterior cancelado no ${duplicate.scheduler_type === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}`);
            } catch (delError) {
              console.warn(`⚠️ [createAppointmentFromAI] Erro ao cancelar agendamento anterior:`, delError.message);
            }
          }

          // Atualizar status do agendamento anterior para cancelled
          await query(
            `UPDATE booking_appointments 
             SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [duplicate.id]
          );
          console.log(`✅ [createAppointmentFromAI] Agendamento anterior marcado como cancelado no banco`);
        }
      } catch (dupError) {
        console.warn(`⚠️ [createAppointmentFromAI] Erro ao verificar duplicatas:`, dupError.message);
        // Continuar mesmo se falhar a verificação de duplicatas
      }

      // Salvar no banco de dados
      // IMPORTANTE: Se o evento foi criado, SEMPRE salvar no banco com o eventId
      const finalEndTime = new Date(finalStartTime.getTime() + duration * 60000);
      const eventIdToSave = appt?.eventId || appt?.id || null;
      
      // Se criou mas não tem eventId, isso é um erro crítico
      if (appt && !eventIdToSave) {
        console.error(`❌ [createAppointmentFromAI] CRÍTICO: Evento criado no ${schedulerType} mas sem eventId!`, appt);
      }
      
      try {
        console.log(`📅 [createAppointmentFromAI] Salvando agendamento no banco de dados...`, {
          hasEventId: !!eventIdToSave,
          eventId: eventIdToSave?.substring(0, 30),
          schedulerType: schedulerType,
          hasCalendarError: !!calendarError
        });
        
        const savedAppt = await this.saveAppointmentToDatabase({
          userId,
          profileId,
          phone: cleanPhone,
          clientName: clientName,
          service: service,
          startTime: finalStartTime,
          endTime: finalEndTime,
          googleCalendarEventId: schedulerType === 'google_calendar' ? eventIdToSave : null,
          externalEventId: schedulerType === 'premium_shears' ? eventIdToSave : null,
          schedulerType: schedulerType,
          notes: calendarError ? `Erro ao criar no ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}: ${calendarError.message}` : notes
        });

        const savedAppointmentId = savedAppt?.id || eventIdToSave;

        // Enviar mensagem de confirmação com lista de agendamentos
        try {
          await appointmentNotifier.sendAppointmentConfirmation(cleanPhone, userId, savedAppointmentId);
        } catch (notifyError) {
          console.warn('⚠️ [createAppointmentFromAI] Erro ao enviar notificação WhatsApp:', notifyError.message);
          // Não falhar o agendamento se a notificação falhar
        }
        
        console.log(`✅ [createAppointmentFromAI] Agendamento salvo no banco de dados`, {
          savedWithEventId: !!eventIdToSave,
          eventId: eventIdToSave?.substring(0, 30)
        });
      } catch (dbError) {
        console.error('❌ [createAppointmentFromAI] Erro ao salvar agendamento no banco de dados:', {
          message: dbError.message,
          stack: dbError.stack?.substring(0, 200),
          eventId: eventIdToSave?.substring(0, 30)
        });
        
        // Se o evento foi criado no Google Calendar mas falhou ao salvar no banco,
        // isso é crítico - o evento ficará órfão no calendário
        if (eventIdToSave) {
          console.error('⚠️ [createAppointmentFromAI] ATENÇÃO: Evento criado no Google Calendar mas não salvo no banco!');
          console.error('   EventId:', eventIdToSave);
          console.error('   Isso pode causar inconsistência entre calendário e banco de dados.');
        }
        
        return { success: false, error: `Erro ao salvar agendamento no banco de dados: ${dbError.message}` };
      }

      const result = {
        success: appt !== null && (appt.eventId || appt.id),
        eventId: appt?.eventId || appt?.id || null,
        htmlLink: appt?.htmlLink || null,
        startTime: finalStartTime,
        endTime: finalEndTime,
        calendarError: calendarError ? calendarError.message : null,
        timeAdjusted: triedAlternativeTimes && appt !== null,
        originalTime: triedAlternativeTimes ? startTime : null
      };

      console.log(`✅ [createAppointmentFromAI] Agendamento processado:`, {
        success: result.success,
        eventId: result.eventId,
        hasHtmlLink: !!result.htmlLink,
        hasCalendarError: !!result.calendarError,
        apptIsNull: appt === null,
        hasEventId: !!(appt?.eventId || appt?.id)
      });

      // Se não conseguiu criar no Google Calendar, retornar erro
      if (!result.success && !calendarError) {
        console.error('❌ [createAppointmentFromAI] Agendamento não foi criado no Google Calendar e não há erro registrado!');
        return { 
          success: false, 
          error: 'Falha ao criar agendamento no Google Calendar. Tente novamente.',
          calendarError: 'Erro desconhecido ao criar evento'
        };
      }

      return result;
    } catch (error) {
      console.error('❌ [createAppointmentFromAI] Erro geral ao criar agendamento:', {
        message: error.message,
        stack: error.stack?.substring(0, 300)
      });
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  }

  /**
   * Lista agendamentos do cliente
   */
  async handleListAppointments({ userId, profileId, phone }) {
    try {
      console.log(`📋 [handleListAppointments] Listando agendamentos:`, {
        userId: userId ? 'presente' : 'AUSENTE',
        phone: phone?.substring(0, 15)
      });

      if (!userId) {
        return { handled: true, reply: 'Para consultar seus agendamentos, você precisa estar logado no sistema.' };
      }

      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');

      // Buscar agendamentos futuros do cliente
      const result = await query(
        `SELECT id, client_name, service, start_time, end_time, status, google_calendar_event_id
         FROM booking_appointments
         WHERE user_id = $1 AND phone = $2 AND start_time >= NOW()
         ORDER BY start_time ASC
         LIMIT 10`,
        [userId, cleanPhone]
      );

      if (result.rows.length === 0) {
        return { handled: true, reply: 'Você não tem agendamentos futuros no momento. Quer agendar um horário?' };
      }

      const appointments = result.rows.map(apt => {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);
        return {
          service: apt.service || 'Serviço',
          clientName: apt.client_name || 'Cliente',
          date: start.toLocaleDateString('pt-BR'),
          time: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          endTime: end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: apt.status,
          eventId: apt.google_calendar_event_id
        };
      });

      let message = `📅 *Seus Agendamentos Programados:*\n\n`;
      appointments.forEach((apt, index) => {
        message += `*${index + 1}.* ${apt.service}\n`;
        message += `   📅 ${apt.date}\n`;
        message += `   ⏰ ${apt.time} - ${apt.endTime}\n`;
        if (apt.clientName && apt.clientName !== 'Cliente') {
          message += `   👤 ${apt.clientName}\n`;
        }
        message += `   Status: ${apt.status === 'confirmed' ? '✅ Confirmado' : apt.status}\n\n`;
      });

      message += `\n💡 *Para cancelar ou remarcar, entre em contato diretamente com o estabelecimento.*`;

      return { handled: true, reply: message };
    } catch (error) {
      console.error('❌ [handleListAppointments] Erro:', error);
      return { handled: true, reply: 'Erro ao consultar agendamentos. Tente novamente mais tarde.' };
    }
  }

  /**
   * Cancela agendamento do cliente
   * Sempre mostra lista de agendamentos primeiro, depois aceita apenas números (1, 2, 3, etc.)
   */
  async handleCancelAppointment({ userId, profileId, phone, message }) {
    try {
      console.log(`🗑️ [handleCancelAppointment] Processando cancelamento:`, {
        userId: userId ? 'presente' : 'AUSENTE',
        phone: phone?.substring(0, 15),
        message: message?.substring(0, 50)
      });

      if (!userId) {
        return { handled: true, reply: 'Para cancelar agendamentos, você precisa estar logado no sistema.' };
      }

      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      const msg = message.toLowerCase().trim();

      // Buscar agendamentos futuros primeiro
      const result = await query(
        `SELECT id, client_name, service, start_time, end_time, status, google_calendar_event_id
         FROM booking_appointments
         WHERE user_id = $1 AND phone = $2 AND start_time >= NOW() AND status = 'confirmed'
         ORDER BY start_time ASC
         LIMIT 10`,
        [userId, cleanPhone]
      );

      if (result.rows.length === 0) {
        return { handled: true, reply: 'Você não tem agendamentos confirmados para cancelar.' };
      }

      // Verificar se a mensagem é apenas um número (escolha de agendamento)
      const isNumberOnly = /^\s*\d+\s*$/.test(msg);
      let appointmentIndex = null;
      
      if (isNumberOnly) {
        appointmentIndex = parseInt(msg.trim(), 10) - 1; // Converter para índice (0-based)
      } else {
        // Se não é apenas número, tentar extrair número da mensagem (ex: "cancelar agendamento 1")
        const numberMatch = msg.match(/(\d+)/);
        if (numberMatch) {
          appointmentIndex = parseInt(numberMatch[1], 10) - 1;
        }
      }

      // Se não especificou número válido, SEMPRE mostrar lista para escolher
      // NUNCA pedir data/hora - sempre mostrar lista numerada
      if (appointmentIndex === null || appointmentIndex < 0 || appointmentIndex >= result.rows.length) {
        const totalAppointments = result.rows.length;
        let listMessage = `📅 *Seus Agendamentos Programados*\n`;
        listMessage += `📊 *Total: ${totalAppointments} agendamento${totalAppointments > 1 ? 's' : ''}*\n\n`;
        
        result.rows.forEach((apt, index) => {
          const start = new Date(apt.start_time);
          const end = new Date(apt.end_time);
          const dayOfWeek = start.toLocaleDateString('pt-BR', { weekday: 'short' });
          const date = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          
          listMessage += `*${index + 1}.* ${apt.service || 'Serviço'}\n`;
          listMessage += `   📅 ${dayOfWeek}, ${date}\n`;
          listMessage += `   ⏰ ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
          if (apt.client_name && apt.client_name !== 'Cliente') {
            listMessage += `   👤 ${apt.client_name}\n`;
          }
          listMessage += `\n`;
        });
        listMessage += `❌ *Para cancelar, digite APENAS o número*\n`;
        listMessage += `   Exemplo: digite *1* para cancelar o primeiro agendamento\n`;
        listMessage += `   Exemplo: digite *2* para cancelar o segundo agendamento\n\n`;
        listMessage += `⚠️ *NÃO é necessário informar data ou hora!*`;
        
        console.log(`📋 [handleCancelAppointment] Mostrando lista de ${totalAppointments} agendamentos`);
        return { handled: true, reply: listMessage };
      }

      // Cancelar o agendamento selecionado
      const appointment = result.rows[appointmentIndex];
      const appointmentId = appointment.id;
      const eventId = appointment.google_calendar_event_id;

      console.log(`🗑️ [handleCancelAppointment] Cancelando agendamento:`, {
        appointmentId,
        eventId: eventId?.substring(0, 50),
        service: appointment.service
      });

      // Deletar do sistema de agendamento se tiver eventId
      if (eventId) {
        try {
          // Determinar qual serviço usar baseado no scheduler_type
          const appointmentResult = await query(
            `SELECT scheduler_type, external_event_id, google_calendar_event_id 
             FROM booking_appointments 
             WHERE id = $1`,
            [appointmentId]
          );
          
          const appointment = appointmentResult.rows[0];
          const schedulerType = appointment?.scheduler_type || 'google_calendar';
          const actualEventId = appointment?.external_event_id || appointment?.google_calendar_event_id || eventId;
          const serviceToUse = schedulerType === 'premium_shears' ? premiumShearsScheduler : googleCalendarOAuth;
          
          await serviceToUse.deleteAppointment({ userId, eventId: actualEventId });
          console.log(`✅ [handleCancelAppointment] Evento deletado do ${schedulerType === 'premium_shears' ? 'Premium Shears' : 'Google Calendar'}`);
        } catch (calendarError) {
          console.error('⚠️ [handleCancelAppointment] Erro ao deletar do sistema de agendamento:', calendarError.message);
          // Continuar mesmo se falhar
        }
      }

      // Atualizar status no banco de dados
      try {
        await query(
          `UPDATE booking_appointments 
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [appointmentId]
        );
        console.log(`✅ [handleCancelAppointment] Status atualizado no banco de dados`);
      } catch (dbError) {
        console.error('❌ [handleCancelAppointment] Erro ao atualizar no banco:', dbError);
        throw dbError;
      }

      const start = new Date(appointment.start_time);
      const serviceName = appointment.service || 'Agendamento';
      const dateStr = start.toLocaleDateString('pt-BR');
      const timeStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        handled: true,
        reply: `✅ *Agendamento cancelado com sucesso!*\n\n` +
               `📅 ${serviceName}\n` +
               `📆 ${dateStr} às ${timeStr}\n\n` +
               `Quer agendar um novo horário?`
      };
    } catch (error) {
      console.error('❌ [handleCancelAppointment] Erro:', error);
      return { handled: true, reply: 'Erro ao cancelar agendamento. Tente novamente mais tarde.' };
    }
  }

  /**
   * Reagenda um agendamento existente
   */
  async handleRescheduleAppointment({ userId, profileId, phone, message, cfg }) {
    try {
      console.log(`🔄 [handleRescheduleAppointment] Processando remarcação:`, {
        userId: userId ? 'presente' : 'AUSENTE',
        phone: phone?.substring(0, 15)
      });

      if (!userId) {
        return { handled: true, reply: 'Para remarcar agendamentos, você precisa estar logado no sistema.' };
      }

      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');

      // Buscar agendamentos futuros
      const result = await query(
        `SELECT id, client_name, service, start_time, end_time, status, google_calendar_event_id
         FROM booking_appointments
         WHERE user_id = $1 AND phone = $2 AND start_time >= NOW() AND status = 'confirmed'
         ORDER BY start_time ASC
         LIMIT 1`,
        [userId, cleanPhone]
      );

      if (result.rows.length === 0) {
        return { handled: true, reply: 'Você não tem agendamentos confirmados para remarcar. Quer agendar um novo horário?' };
      }

      const appointment = result.rows[0];
      const start = new Date(appointment.start_time);

      return {
        handled: true,
        reply: `Para remarcar seu agendamento de *${appointment.service || 'Serviço'}* ` +
               `agendado para *${start.toLocaleDateString('pt-BR')} às ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}*,\n\n` +
               `Primeiro preciso cancelar o agendamento atual. Digite "cancelar agendamento 1" e depois faça um novo agendamento.`
      };
    } catch (error) {
      console.error('❌ [handleRescheduleAppointment] Erro:', error);
      return { handled: true, reply: 'Erro ao processar remarcação. Tente novamente mais tarde.' };
    }
  }

  /**
   * Salva agendamento no banco de dados (Supabase ou PostgreSQL)
   */
  async saveAppointmentToDatabase({ userId, profileId, phone, clientName, service, startTime, endTime, googleCalendarEventId = null, externalEventId = null, schedulerType = 'google_calendar', notes = null }) {
    try {
      const cleanPhone = phone.replace('@c.us', '').replace(/\D/g, '');
      
      // Salvar no Supabase primeiro (se configurado)
      if (isConfigured && supabase) {
        const { error } = await supabase
          .from('booking_appointments')
          .insert([{
            user_id: userId,
            profile_id: profileId || null,
            phone: cleanPhone,
            client_name: clientName || null,
            service: service || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'confirmed',
            google_calendar_event_id: googleCalendarEventId || null,
            notes: notes || null
          }]);

        if (!error) {
          console.log(`✅ Agendamento salvo no Supabase: ${cleanPhone} - ${service} - ${startTime.toISOString()}`);
          return;
        } else {
          console.warn('⚠️  Erro ao salvar agendamento no Supabase:', error);
          // Continuar para tentar PostgreSQL
        }
      }

      // Fallback: PostgreSQL local
      await query(
        `INSERT INTO booking_appointments (
          user_id, profile_id, phone, client_name, service,
          start_time, end_time, status, google_calendar_event_id, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          profileId || null,
          cleanPhone,
          clientName || null,
          service || null,
          startTime,
          endTime,
          'confirmed',
          googleCalendarEventId || null,
          notes || null
        ]
      );
      console.log(`✅ Agendamento salvo no PostgreSQL: ${cleanPhone} - ${service} - ${startTime.toISOString()}`);
    } catch (error) {
      console.error('❌ Erro ao salvar agendamento no banco de dados:', error);
      throw error;
    }
  }
}

module.exports = new BookingService();

