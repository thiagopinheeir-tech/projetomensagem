const googleCalendarOAuth = require('../services/google-calendar-oauth');

function parseIntOr(value, fallback) {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function requiredQuery(req, key) {
  const v = req.query[key];
  if (v === undefined || v === null || String(v).trim() === '') {
    const err = new Error(`Missing query param: ${key}`);
    err.statusCode = 400;
    throw err;
  }
  return String(v);
}

module.exports = {
  async getAvailability(req, res) {
    try {
      const fromISO = requiredQuery(req, 'from');
      const toISO = requiredQuery(req, 'to');
      const durationMinutes = parseIntOr(req.query.durationMinutes, parseIntOr(process.env.BOOKING_DURATION_MINUTES, 30));
      const userId = req.user?.id;

      const slots = await googleCalendarOAuth.getAvailableSlots({
        userId,
        fromISO,
        toISO,
        durationMinutes
      });

      return res.json({
        success: true,
        slots,
        count: slots.length
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Erro ao consultar disponibilidade',
        error: process.env.NODE_ENV === 'development' ? String(error.stack || error) : undefined
      });
    }
  },

  async bookAppointment(req, res) {
    try {
      const {
        name,
        phone,
        service,
        startISO,
        durationMinutes,
        notes
      } = req.body || {};
      const userId = req.user?.id;

      if (!name || !service || !startISO) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: name, service, startISO'
        });
      }

      const duration = parseIntOr(durationMinutes, parseIntOr(process.env.BOOKING_DURATION_MINUTES, 30));

      const result = await googleCalendarOAuth.createAppointment({
        userId,
        name: String(name),
        phone: phone ? String(phone) : '',
        service: String(service),
        startISO: String(startISO),
        durationMinutes: duration,
        notes: notes ? String(notes) : ''
      });

      return res.json({
        success: true,
        appointment: result
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Erro ao agendar no Google Agenda',
        error: process.env.NODE_ENV === 'development' ? String(error.stack || error) : undefined
      });
    }
  }
};

