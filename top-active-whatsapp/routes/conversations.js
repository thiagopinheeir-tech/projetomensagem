const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('../config/database');
const ConversationManager = require('../services/conversation-manager');

// Listar todas as conversas com paginação e filtros
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, phone = '', dateFrom = '', dateTo = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query com filtros
    let whereConditions = ['1=1'];
    const params = [];
    let paramIndex = 1;

    if (phone) {
      whereConditions.push(`c.phone ILIKE $${paramIndex}`);
      params.push(`%${phone}%`);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`c.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`c.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Buscar conversas com últimas mensagens por telefone
    const conversationsQuery = `
      SELECT DISTINCT ON (c.phone)
        c.phone,
        c.user_message as last_user_message,
        c.ai_response as last_ai_response,
        c.created_at as last_interaction,
        COUNT(*) OVER (PARTITION BY c.phone) as total_messages
      FROM conversations c
      WHERE ${whereClause}
      ORDER BY c.phone, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    const conversationsResult = await query(conversationsQuery, params);

    // Contar total
    const countQuery = `
      SELECT COUNT(DISTINCT phone) as total
      FROM conversations
      WHERE ${whereClause}
    `;

    const countParams = params.slice(0, params.length - 2); // Remover limit e offset
    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      conversations: conversationsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0]?.total || 0),
        totalPages: Math.ceil((countResult.rows[0]?.total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Obter histórico completo de um telefone específico
router.get('/:phone/history', authMiddleware, async (req, res, next) => {
  try {
    const { phone } = req.params;
    const { limit = 50 } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }

    const history = await ConversationManager.getHistory(phone, parseInt(limit));

    res.json({
      success: true,
      phone: phone,
      history: history,
      total: history.length
    });
  } catch (error) {
    next(error);
  }
});

// Estatísticas das conversas
router.get('/stats/summary', authMiddleware, async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (dateFrom) {
      whereClause += ' AND created_at >= $1';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ` AND created_at <= $${params.length + 1}`;
      params.push(dateTo);
    }

    // Total de conversas únicas
    const uniqueResult = await query(
      `SELECT COUNT(DISTINCT phone) as unique_contacts FROM conversations WHERE ${whereClause}`,
      params
    );

    // Total de mensagens
    const totalResult = await query(
      `SELECT COUNT(*) as total_messages FROM conversations WHERE ${whereClause}`,
      params
    );

    // Mensagens por dia (últimos 7 dias)
    const dailyResult = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as messages,
        COUNT(DISTINCT phone) as unique_contacts
      FROM conversations
      WHERE ${whereClause}
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      params
    );

    res.json({
      success: true,
      stats: {
        uniqueContacts: parseInt(uniqueResult.rows[0]?.unique_contacts || 0),
        totalMessages: parseInt(totalResult.rows[0]?.total_messages || 0),
        dailyBreakdown: dailyResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
