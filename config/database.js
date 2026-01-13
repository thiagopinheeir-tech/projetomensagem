require('dotenv').config();
const { Pool } = require('pg');

// Suporte para DATABASE_URL (formato de conexão completa) ou variáveis individuais
let poolConfig;

if (process.env.DATABASE_URL) {
  // Usar DATABASE_URL se disponível (formato: postgresql://user:password@host:port/database)
  let connectionString = process.env.DATABASE_URL;
  
  // Corrigir URL se contiver endereço IPv6: substituir por hostname do Supabase
  // O Supabase às vezes retorna IPs IPv6 que não funcionam no Railway
  if (connectionString.includes('supabase')) {
    // Detectar se há um IP IPv6 na URL (formato: [2600:1f1e:...] ou 2600:1f1e:...)
    const ipv6Match = connectionString.match(/@(\[?[0-9a-fA-F:]+\]?):5432/);
    if (ipv6Match && ipv6Match[1].includes(':')) {
      // Extrair o project ID do Supabase da URL original ou de variáveis de ambiente
      const projectId = process.env.SUPABASE_URL 
        ? process.env.SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1]
        : connectionString.match(/db\.([^.]+)\.supabase\.co/)?.[1];
      
      if (projectId) {
        // Substituir IP IPv6 pelo hostname do Supabase
        connectionString = connectionString.replace(/@\[?[0-9a-fA-F:]+\]?:5432/, `@db.${projectId}.supabase.co:5432`);
        console.log('⚠️ Substituído IP IPv6 por hostname do Supabase na DATABASE_URL');
      } else {
        console.warn('⚠️ Detectado IP IPv6 na DATABASE_URL, mas não foi possível extrair project ID do Supabase');
      }
    }
  }
  
  poolConfig = {
    connectionString: connectionString,
    ssl: connectionString.includes('supabase') || connectionString.includes('localhost') === false 
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
