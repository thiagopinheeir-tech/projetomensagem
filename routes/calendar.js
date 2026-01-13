const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

// Disponibilidade (slots)
// GET /api/calendar/availability?from=2026-01-11T00:00:00-03:00&to=2026-01-12T00:00:00-03:00&durationMinutes=30
router.get('/availability', authMiddleware, calendarController.getAvailability);

// Criar agendamento (evento)
// POST /api/calendar/book { name, phone, service, startISO, durationMinutes, notes }
router.post('/book', authMiddleware, calendarController.bookAppointment);

module.exports = router;

