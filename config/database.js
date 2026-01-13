require('dotenv').config();
const { Pool } = require('pg');

// Suporte para DATABASE_URL (formato de conexão completa) ou variáveis individuais
let poolConfig;

if (process.env.DATABASE_URL) {
  // Usar DATABASE_URL se disponível (formato: postgresql://user:password@host:port/database)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('localhost') === false 
      ? { rejectUnauthorized: false } 
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  console.log('✅ Usando DATABASE_URL para conexão');
} else if (process.env.SUPABASE_DB_URL) {
  // Usar SUPABASE_DB_URL se disponível
  poolConfig = {
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  console.log('✅ Usando SUPABASE_DB_URL para conexão');
} else {
  // Fallback para variáveis individuais
  poolConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'top_active_whatsapp',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  console.log('✅ Usando variáveis individuais para conexão');
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Executed query (${duration}ms)`, { text: text.substring(0, 50) + '...' });
    }
    return result;
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
}

async function testConnection() {
  try {
    const result = await query('SELECT 1 as test');
    return result.rows[0].test === 1;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  testConnection
};
