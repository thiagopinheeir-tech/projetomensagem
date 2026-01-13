require('dotenv').config();
const { Pool } = require('pg');

// Configurar pool - corrigir URL se contiver IPv6
let connectionString = process.env.DATABASE_URL;

// Corrigir URL se contiver endereço IPv6: substituir por hostname do Supabase
if (connectionString && connectionString.includes('supabase')) {
  // Detectar se há um IP IPv6 na URL
  const ipv6Match = connectionString.match(/@(\[?[0-9a-fA-F:]+\]?):5432/);
  if (ipv6Match && ipv6Match[1].includes(':')) {
    // Extrair o project ID do Supabase
    const projectId = process.env.SUPABASE_URL 
      ? process.env.SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
      : connectionString.match(/db\.([^.]+)\.supabase\.co/)?.[1];
    
    if (projectId) {
      // Substituir IP IPv6 pelo hostname do Supabase
      connectionString = connectionString.replace(/@\[?[0-9a-fA-F:]+\]?:5432/, `@db.${projectId}.supabase.co:5432`);
      console.log('⚠️ Substituído IP IPv6 por hostname do Supabase na DATABASE_URL');
    }
  }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString && connectionString.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

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
