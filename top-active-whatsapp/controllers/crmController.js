const { query } = require('../config/database');
const { supabase, db, isConfigured } = require('../config/supabase');
const { convertUserIdForTable } = require('../utils/userId-converter');

// ============================================
// LEADS/OPORTUNIDADES
// ============================================

const getLeads = async (req, res, next) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'controllers/crmController.js:8',message:'getLeads ENTRY',data:{hasUserId:!!req.userId,userId:req.userId,hasUser:!!req.user,user_id:req.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F3'})}).catch(()=>{});
    // #endregion
    let userId = req.userId || req.user?.id;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'controllers/crmController.js:12',message:'getLeads userId resolved',data:{userId:userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F3'})}).catch(()=>{});
    // #endregion
    if (!userId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'controllers/crmController.js:15',message:'getLeads ERROR no userId',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F3'})}).catch(()=>{});
      // #endregion
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    // Converter userId para o tipo correto da tabela leads
    userId = await convertUserIdForTable('leads', userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'controllers/crmController.js:20',message:'getLeads userId converted',data:{convertedUserId:userId,convertedType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F3'})}).catch(()=>{});
    // #endregion
    const { page = 1, limit = 20, status, stage, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tentar buscar do Supabase primeiro
    if (isConfigured && supabase) {
      let supabaseQuery = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('user_id', userId) // Filtrar por userId
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (status) supabaseQuery = supabaseQuery.eq('status', status);
      if (stage) supabaseQuery = supabaseQuery.eq('stage', stage);
      if (search) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error, count } = await supabaseQuery;

      if (!error && data) {
        return res.json({
          success: true,
          leads: data,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / parseInt(limit))
          }
        });
      }
    }

    // Fallback: PostgreSQL local
    let whereConditions = [`user_id = $1`];
    let params = [userId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (stage) {
      whereConditions.push(`stage = $${paramIndex}`);
      params.push(stage);
      paramIndex++;
    }
    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    const result = await query(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) as total FROM leads ${whereClause}`, params);

    res.json({
      success: true,
      leads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0]?.total || 0),
        totalPages: Math.ceil((countResult.rows[0]?.total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/193afe74-fa18-4a91-92da-dc9b7118deab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'controllers/crmController.js:89',message:'getLeads ERROR',data:{errorMessage:error.message,errorStack:error.stack,errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F3'})}).catch(()=>{});
    // #endregion
    console.error('❌ Erro em getLeads:', error);
    next(error);
  }
};

const createLead = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    userId = await convertUserIdForTable('leads', userId);
    const {
      phone, name, email, company, title, source, status, stage,
      value, probability, expected_close_date, tags, notes, priority
    } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }

    // Salvar no Supabase primeiro
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          phone,
          name,
          email,
          company,
          title,
          source,
          status: status || 'new',
          stage: stage || null,
          value: value ? parseFloat(value) : null,
          probability: probability ? parseInt(probability) : 0,
          expected_close_date,
          tags: tags || [],
          notes,
          priority: priority || 'medium',
          user_id: userId
        }])
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          lead: data,
          message: 'Lead criado com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    const result = await query(
      `INSERT INTO leads (phone, name, email, company, title, source, status, stage, value, probability, expected_close_date, tags, notes, priority, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [phone, name, email, company, title, source, status || 'new', stage, value, probability || 0, expected_close_date, tags || [], notes, priority || 'medium', userId]
    );

    res.json({
      success: true,
      lead: result.rows[0],
      message: 'Lead criado com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    userId = await convertUserIdForTable('leads', userId);
    const { id } = req.params;
    const updateFields = req.body;

    // Verificar ownership antes de atualizar
    const checkResult = await query(
      'SELECT user_id FROM leads WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado'
      });
    }
    
    if (String(checkResult.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar este lead'
      });
    }

    // Salvar no Supabase primeiro
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('leads')
        .update(updateFields)
        .eq('id', id)
        .eq('user_id', userId) // Garantir ownership
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          lead: data,
          message: 'Lead atualizado com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const result = await query(
      `UPDATE leads SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
      [...values, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado'
      });
    }

    res.json({
      success: true,
      lead: result.rows[0],
      message: 'Lead atualizado com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    userId = await convertUserIdForTable('leads', userId);
    const { id } = req.params;

    // Verificar ownership antes de deletar
    const checkResult = await query(
      'SELECT user_id FROM leads WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado'
      });
    }
    
    if (String(checkResult.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para deletar este lead'
      });
    }

    // Deletar do Supabase primeiro
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Garantir ownership

      if (!error) {
        return res.json({
          success: true,
          message: 'Lead deletado com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    await query('DELETE FROM leads WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({
      success: true,
      message: 'Lead deletado com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// TAREFAS/ATIVIDADES
// ============================================

const getTasks = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    // Converter userId para o tipo correto da tabela tasks
    userId = await convertUserIdForTable('tasks', userId);
    const { page = 1, limit = 50, status, lead_id, contact_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tentar buscar do Supabase primeiro
    if (isConfigured && supabase) {
      let supabaseQuery = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId) // Filtrar por userId
        .order('due_date', { ascending: true, nullsFirst: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (status) supabaseQuery = supabaseQuery.eq('status', status);
      if (lead_id) supabaseQuery = supabaseQuery.eq('lead_id', lead_id);
      if (contact_id) supabaseQuery = supabaseQuery.eq('contact_id', contact_id);

      const { data, error, count } = await supabaseQuery;

      if (!error && data) {
        return res.json({
          success: true,
          tasks: data,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / parseInt(limit))
          }
        });
      }
    }

    // Fallback: PostgreSQL local
    let whereConditions = [`user_id = $1`];
    let params = [userId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (lead_id) {
      whereConditions.push(`lead_id = $${paramIndex}`);
      params.push(lead_id);
      paramIndex++;
    }
    if (contact_id) {
      whereConditions.push(`contact_id = $${paramIndex}`);
      params.push(contact_id);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    const result = await query(
      `SELECT * FROM tasks ${whereClause} ORDER BY due_date ASC NULLS LAST LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      tasks: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    userId = await convertUserIdForTable('tasks', userId);
    const {
      lead_id, contact_id, title, description, type, priority,
      due_date, reminder_at, assigned_to
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Título é obrigatório'
      });
    }

    // Salvar no Supabase primeiro
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: userId, // Adicionar user_id
          lead_id,
          contact_id,
          title,
          description,
          type: type || 'call',
          status: 'pending',
          priority: priority || 'medium',
          due_date,
          reminder_at,
          assigned_to
        }])
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          task: data,
          message: 'Tarefa criada com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    const result = await query(
      `INSERT INTO tasks (user_id, lead_id, contact_id, title, description, type, status, priority, due_date, reminder_at, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)
       RETURNING *`,
      [userId, lead_id, contact_id, title, description, type || 'call', priority || 'medium', due_date, reminder_at, assigned_to]
    );

    res.json({
      success: true,
      task: result.rows[0],
      message: 'Tarefa criada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Se status for 'completed', definir completed_at
    if (updateFields.status === 'completed' && !updateFields.completed_at) {
      updateFields.completed_at = new Date().toISOString();
    }

    // Salvar no Supabase primeiro
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          task: data,
          message: 'Tarefa atualizada com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const result = await query(
      `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    res.json({
      success: true,
      task: result.rows[0],
      message: 'Tarefa atualizada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// NOTAS/HISTÓRICO
// ============================================

const getNotes = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    // Converter userId para o tipo correto da tabela notes
    userId = await convertUserIdForTable('notes', userId);
    const { lead_id, contact_id, conversation_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tentar buscar do Supabase primeiro
    if (isConfigured && supabase) {
      let supabaseQuery = supabase
        .from('notes')
        .select('*', { count: 'exact' })
        .eq('user_id', userId) // Filtrar por userId
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (lead_id) supabaseQuery = supabaseQuery.eq('lead_id', lead_id);
      if (contact_id) supabaseQuery = supabaseQuery.eq('contact_id', contact_id);
      if (conversation_id) supabaseQuery = supabaseQuery.eq('conversation_id', conversation_id);

      const { data, error, count } = await supabaseQuery;

      if (!error && data) {
        return res.json({
          success: true,
          notes: data,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });
      }
    }

    // Fallback: PostgreSQL local
    let whereConditions = [`user_id = $1`];
    let params = [userId];
    let paramIndex = 2;

    if (lead_id) {
      whereConditions.push(`lead_id = $${paramIndex}`);
      params.push(lead_id);
      paramIndex++;
    }
    if (contact_id) {
      whereConditions.push(`contact_id = $${paramIndex}`);
      params.push(contact_id);
      paramIndex++;
    }
    if (conversation_id) {
      whereConditions.push(`conversation_id = $${paramIndex}`);
      params.push(conversation_id);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    const result = await query(
      `SELECT * FROM notes ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      notes: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const createNote = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    userId = await convertUserIdForTable('notes', userId);
    const {
      lead_id, contact_id, conversation_id, title, content, type, tags, is_important
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Conteúdo é obrigatório'
      });
    }

    // Salvar no Supabase primeiro
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: userId, // Adicionar user_id
          lead_id,
          contact_id,
          conversation_id,
          title,
          content,
          type: type || 'note',
          tags: tags || [],
          is_important: is_important || false
        }])
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          note: data,
          message: 'Nota criada com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    const result = await query(
      `INSERT INTO notes (user_id, lead_id, contact_id, conversation_id, title, content, type, tags, is_important)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, lead_id, contact_id, conversation_id, title, content, type || 'note', tags || [], is_important || false]
    );

    res.json({
      success: true,
      note: result.rows[0],
      message: 'Nota criada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Salvar no Supabase primeiro
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('notes')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          note: data,
          message: 'Nota atualizada com sucesso'
        });
      }
    }

    // Fallback: PostgreSQL local
    const fields = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const result = await query(
      `UPDATE notes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nota não encontrada'
      });
    }

    res.json({
      success: true,
      note: result.rows[0],
      message: 'Nota atualizada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ESTATÍSTICAS CRM
// ============================================

const getStats = async (req, res, next) => {
  try {
    let userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    // Converter para ambos os tipos (leads e tasks podem ter tipos diferentes)
    const leadsUserId = await convertUserIdForTable('leads', userId);
    const tasksUserId = await convertUserIdForTable('tasks', userId);
    // Tentar buscar do Supabase primeiro
    if (isConfigured && supabase) {
      const [leadsResult, tasksResult] = await Promise.all([
        supabase.from('leads').select('status, stage', { count: 'exact' }).eq('user_id', leadsUserId),
        supabase.from('tasks').select('status', { count: 'exact' }).eq('user_id', tasksUserId)
      ]);

      const leads = leadsResult.data || [];
      const tasks = tasksResult.data || [];

      const stats = {
        totalLeads: leads.length,
        leadsByStatus: {},
        leadsByStage: {},
        totalTasks: tasks.length,
        tasksByStatus: {},
        totalValue: 0
      };

      leads.forEach(lead => {
        stats.leadsByStatus[lead.status] = (stats.leadsByStatus[lead.status] || 0) + 1;
        if (lead.stage) {
          stats.leadsByStage[lead.stage] = (stats.leadsByStage[lead.stage] || 0) + 1;
        }
        if (lead.value) {
          stats.totalValue += parseFloat(lead.value);
        }
      });

      tasks.forEach(task => {
        stats.tasksByStatus[task.status] = (stats.tasksByStatus[task.status] || 0) + 1;
      });

      return res.json({
        success: true,
        stats
      });
    }

    // Fallback: PostgreSQL local
    const leadsResult = await query('SELECT status, stage, value FROM leads WHERE user_id = $1', [leadsUserId]);
    const tasksResult = await query('SELECT status FROM tasks WHERE user_id = $1', [tasksUserId]);

    const stats = {
      totalLeads: leadsResult.rows.length,
      leadsByStatus: {},
      leadsByStage: {},
      totalTasks: tasksResult.rows.length,
      tasksByStatus: {},
      totalValue: 0
    };

    leadsResult.rows.forEach(lead => {
      stats.leadsByStatus[lead.status] = (stats.leadsByStatus[lead.status] || 0) + 1;
      if (lead.stage) {
        stats.leadsByStage[lead.stage] = (stats.leadsByStage[lead.stage] || 0) + 1;
      }
      if (lead.value) {
        stats.totalValue += parseFloat(lead.value);
      }
    });

    tasksResult.rows.forEach(task => {
      stats.tasksByStatus[task.status] = (stats.tasksByStatus[task.status] || 0) + 1;
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Leads
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  // Tasks
  getTasks,
  createTask,
  updateTask,
  // Notes
  getNotes,
  createNote,
  updateNote,
  // Stats
  getStats
};
