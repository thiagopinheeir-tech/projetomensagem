const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const { query } = require('../config/database');
const ConversationManager = require('../services/conversation-manager');
const { convertUserIdForTable } = require('../utils/userId-converter');

// Listar conversas recentes (últimas 20) - filtrado por userId
router.get('/recent', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const conversations = await ConversationManager.getRecentConversations(20, req.userId);
    res.json(conversations);
  } catch (error) {
    console.error('Erro ao buscar conversas recentes:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar conversas',
      message: error.message 
    });
  }
});

// Deletar conversa - validar ownership
router.delete('/:id', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar ownership antes de deletar
    const checkResult = await query(
      'SELECT user_id FROM conversations WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversa não encontrada' 
      });
    }
    
    if (String(checkResult.rows[0].user_id) !== String(req.userId)) {
      return res.status(403).json({ 
        success: false,
        message: 'Você não tem permissão para deletar esta conversa' 
      });
    }
    
    await query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true, message: 'Conversa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao deletar conversa',
      message: error.message 
    });
  }
});

// 📋 TODAS conversas (paginado) - filtrado por userId
router.get('/', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/conversations.js:60',message:'GET / ENTRY',data:{userId:req.userId,userIdType:typeof req.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F6'})}).catch(()=>{});
    // #endregion
    const { page = 1, limit = 20, phone, dateFrom, dateTo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Converter userId para o tipo correto da tabela conversations
    const convertedUserId = await convertUserIdForTable('conversations', req.userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/conversations.js:67',message:'GET / userId converted',data:{originalUserId:req.userId,convertedUserId:convertedUserId,convertedType:typeof convertedUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F6'})}).catch(()=>{});
    // #endregion

    // Construir WHERE clause dinamicamente (sempre incluir user_id)
    let whereConditions = [`c.user_id = $1`];
    let params = [convertedUserId];
    let paramIndex = 2;

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

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Adicionar limit e offset aos parâmetros
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    params.push(parseInt(limit));
    params.push(offset);

    // Query para buscar conversas agrupadas por telefone
    // Usa CTE para pegar a última mensagem e agrupar por telefone
    const conversationsQuery = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (phone)
          phone,
          user_message,
          ai_response,
          created_at
        FROM conversations c
        ${whereClause}
        ORDER BY phone, created_at DESC
      ),
      message_counts AS (
        SELECT 
          phone,
          COUNT(*) as total_messages
        FROM conversations c
        ${whereClause}
        GROUP BY phone
      )
      SELECT 
        lm.phone,
        lm.user_message as last_user_message,
        lm.ai_response as last_ai_response,
        lm.created_at as last_interaction,
        mc.total_messages
      FROM latest_messages lm
      JOIN message_counts mc ON lm.phone = mc.phone
      ORDER BY lm.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const conversationsResult = await query(conversationsQuery, params);

    // Contar total para paginação (removendo LIMIT/OFFSET da query)
    const countParams = params.slice(0, params.length - 2); // Remove limit e offset
    const countQuery = `
      SELECT COUNT(DISTINCT phone) as total
      FROM conversations c
      ${whereClause}
    `;

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/conversations.js:149',message:'GET / ERROR',data:{errorMessage:error.message,errorStack:error.stack,errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F5'})}).catch(()=>{});
    // #endregion
    console.error('❌ Erro ao buscar conversas:', error);
    next(error);
  }
});

// 👁️ Conversa específica - filtrado por userId
router.get('/:phone', authMiddleware, requireUserId, async (req, res, next) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }

    // Buscar histórico completo da conversa (filtrado por userId)
    const history = await ConversationManager.getHistory(phone, 100, req.userId);
    
    // Buscar estatísticas da conversa (filtrado por userId)
    const stats = await query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN user_message IS NOT NULL AND user_message != '' THEN 1 END) as received_count,
        COUNT(CASE WHEN ai_response IS NOT NULL AND ai_response != '' THEN 1 END) as sent_count,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM conversations 
      WHERE phone = $1 AND user_id = $2`,
      [phone, req.userId]
    );

    res.json({
      success: true,
      phone: phone,
      history: history,
      stats: stats.rows[0] || {
        total_messages: 0,
        received_count: 0,
        sent_count: 0,
        first_message: null,
        last_message: null
      }
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
