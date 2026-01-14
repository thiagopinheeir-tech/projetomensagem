const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');

// Google Calendar foi removido - todas as rotas retornam 404
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Google Calendar integration foi removido. Use Premium Shears Scheduler.'
  });
});

module.exports = router;

