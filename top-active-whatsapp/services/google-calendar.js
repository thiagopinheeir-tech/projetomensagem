const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

let cachedCalendar = null;

function isEnabled() {
  return String(process.env.GOOGLE_CALENDAR_ENABLED || '').toLowerCase() === 'true';
}

function getCalendarId() {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id || !String(id).trim()) {
    const err = new Error('GOOGLE_CALENDAR_ID não configurado no .env');
    err.statusCode = 400;
    throw err;
  }
  return String(id).trim();
}

function getTimeZone() {
  return process.env.BOOKING_TIMEZONE || 'America/Sao_Paulo';
}

function loadServiceAccountCredentials() {
  const jsonInline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

  if (jsonInline && String(jsonInline).trim()) {
    try {
      return JSON.parse(String(jsonInline));
    } catch (e) {
      const err = new Error('GOOGLE_SERVICE_ACCOUNT_JSON inválido (não é JSON válido)');
      err.statusCode = 400;
      throw err;
    }
  }

  if (filePath && String(filePath).trim()) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) {
      const err = new Error(`Arquivo não encontrado: GOOGLE_SERVICE_ACCOUNT_FILE => ${resolved}`);
      err.statusCode = 400;
      throw err;
    }
    const raw = fs.readFileSync(resolved, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      const err = new Error('GOOGLE_SERVICE_ACCOUNT_FILE aponta para um JSON inválido');
      err.statusCode = 400;
      throw err;
    }
  }

  const err = new Error('Configure GOOGLE_SERVICE_ACCOUNT_JSON ou GOOGLE_SERVICE_ACCOUNT_FILE no .env');
  err.statusCode = 400;
  throw err;
}

async function getCalendarClient() {
  if (!isEnabled()) {
    const err = new Error('Integração com Google Agenda está desabilitada (GOOGLE_CALENDAR_ENABLED=false)');
    err.statusCode = 400;
    throw err;
  }

  if (cachedCalendar) return cachedCalendar;

  const credentials = loadServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  const authClient = await auth.getClient();
  cachedCalendar = google.calendar({ version: 'v3', auth: authClient });
  return cachedCalendar;
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

function subtractBusy(from, to, busyIntervals) {
  // Retorna lista de intervalos livres (Date objects) dentro [from, to)
  let free = [{ start: from, end: to }];
  const busy = (busyIntervals || [])
    .map(b => ({ start: toDate(b.start), end: toDate(b.end) }))
    .filter(b => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  for (const b of busy) {
    const next = [];
    for (const f of free) {
      // Sem interseção
      if (b.end <= f.start || b.start >= f.end) {
        next.push(f);
        continue;
      }
      // Divide o intervalo livre em até 2 partes
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
  // Retorna "YYYY-MM-DDTHH:mm:ss" (sem offset). O Google usa `timeZone` do evento.
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
  isEnabled,
  getCalendarId,
  getTimeZone,

  async getBusyIntervals({ fromISO, toISO }) {
    const calendar = await getCalendarClient();
    const calendarId = getCalendarId();
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

    const busy = resp?.data?.calendars?.[calendarId]?.busy || [];
    return busy;
  },

  async getAvailableSlots({ fromISO, toISO, durationMinutes }) {
    const duration = parseInt(String(durationMinutes || ''), 10);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
      const err = new Error('durationMinutes inválido');
      err.statusCode = 400;
      throw err;
    }

    const from = toDate(fromISO);
    const to = toDate(toISO);
    const busy = await this.getBusyIntervals({ fromISO: from, toISO: to });
    const free = subtractBusy(from, to, busy);
    const starts = splitIntoSlots(free, duration);

    return starts.map(d => ({
      startISO: d.toISOString(),
      startLocal: buildLocalDateTimeString(d)
    }));
  },

  async isSlotFree({ startISO, durationMinutes }) {
    const start = toDate(startISO);
    const duration = parseInt(String(durationMinutes || ''), 10);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
      const err = new Error('durationMinutes inválido');
      err.statusCode = 400;
      throw err;
    }
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const busy = await this.getBusyIntervals({ fromISO: start, toISO: end });
    return busy.length === 0;
  },

  async createAppointment({ name, phone, service, startISO, durationMinutes, notes }) {
    const calendar = await getCalendarClient();
    const calendarId = getCalendarId();
    const tz = getTimeZone();

    const start = toDate(startISO);
    const duration = parseInt(String(durationMinutes || ''), 10);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
      const err = new Error('durationMinutes inválido');
      err.statusCode = 400;
      throw err;
    }
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const free = await this.isSlotFree({ startISO: start, durationMinutes: duration });
    if (!free) {
      const err = new Error('Horário indisponível (conflito no calendário)');
      err.statusCode = 409;
      throw err;
    }

    const summary = `Agendamento - ${service}${name ? ` - ${name}` : ''}`;
    const descriptionLines = [
      `Cliente: ${name || '-'}`,
      `Telefone: ${phone || '-'}`,
      `Serviço: ${service || '-'}`,
      notes ? `Observações: ${notes}` : null
    ].filter(Boolean);

    const resp = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description: descriptionLines.join('\n'),
        start: { dateTime: buildLocalDateTimeString(start), timeZone: tz },
        end: { dateTime: buildLocalDateTimeString(end), timeZone: tz }
      }
    });

    return {
      id: resp?.data?.id,
      htmlLink: resp?.data?.htmlLink,
      summary: resp?.data?.summary,
      start: resp?.data?.start,
      end: resp?.data?.end
    };
  }
};

