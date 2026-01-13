const { query } = require('../config/database');

const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, uuid, email, full_name, company_name, phone, plan, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, company_name, phone, plan } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }

    if (company_name !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(company_name);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }

    if (plan !== undefined && ['free', 'pro', 'enterprise'].includes(plan)) {
      updates.push(`plan = $${paramCount++}`);
      values.push(plan);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const queryText = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, uuid, email, full_name, company_name, phone, plan, created_at, updated_at
    `;

    const result = await query(queryText, values);

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
