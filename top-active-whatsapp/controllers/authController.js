const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const register = async (req, res, next) => {
  try {
    const { email, password, full_name, company_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email já cadastrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password, full_name, company_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, uuid, email, full_name, company_name, plan, created_at`,
      [email, hashedPassword, full_name || null, company_name || null]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        uuid: user.uuid,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        plan: user.plan,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    const result = await query(
      'SELECT id, uuid, email, password, full_name, company_name, plan, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Conta desativada'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        uuid: user.uuid,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        plan: user.plan
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const userResult = await query(
      'SELECT id, uuid, email, full_name, company_name, plan, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      user: userResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verify
};
