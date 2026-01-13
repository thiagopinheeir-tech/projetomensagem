require('dotenv').config();
const { Pool } = require('pg');

// Configurar pool - corrigir URL se contiver IPv6
let connectionString = process.env.DATABASE_URL;

console.log('🔍 Verificando DATABASE_URL...');
console.log('   DATABASE_URL existe:', !!connectionString);
console.log('   SUPABASE_URL existe:', !!process.env.SUPABASE_URL);
if (connectionString) {
  console.log('   DATABASE_URL (primeiros 80 chars):', connectionString.substring(0, 80) + '...');
}

// Corrigir URL se contiver endereço IPv6: substituir por hostname do Supabase
if (connectionString && connectionString.includes('supabase')) {
  // Detectar IPv6 - padrão mais simples: qualquer sequência de hexadecimais e dois pontos após @
  // IPv6 tem formato: 2600:1f1e:75b:4b16:cce:f47b:a990:71b0
  const ipv6Pattern = /@(\[?[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){3,}\]?):5432/;
  const ipv6Match = connectionString.match(ipv6Pattern);
  
  if (ipv6Match) {
    console.log('⚠️ Detectado IP IPv6 na DATABASE_URL:', ipv6Match[1]);
    
    // Extrair o project ID do Supabase
    let projectId = null;
    
    // Tentar 1: De SUPABASE_URL
    if (process.env.SUPABASE_URL) {
      const supabaseMatch = process.env.SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
      if (supabaseMatch) {
        projectId = supabaseMatch[1];
        console.log('✅ Project ID extraído de SUPABASE_URL:', projectId);
      }
    }
    
    // Tentar 2: Da própria DATABASE_URL (se tiver hostname em algum lugar)
    if (!projectId) {
      const dbMatch = connectionString.match(/db\.([^.]+)\.supabase\.co/);
      if (dbMatch) {
        projectId = dbMatch[1];
        console.log('✅ Project ID extraído da DATABASE_URL:', projectId);
      }
    }
    
    // Tentar 3: Do hostname do Supabase (formato: hhhifxikyhvruwvmaduq)
    if (!projectId && process.env.SUPABASE_URL) {
      const urlMatch = process.env.SUPABASE_URL.match(/https?:\/\/([^.]+)/);
      if (urlMatch) {
        projectId = urlMatch[1];
        console.log('✅ Project ID extraído do hostname SUPABASE_URL:', projectId);
      }
    }
    
    if (projectId) {
      // Substituir IP IPv6 pelo hostname do Supabase
      const oldUrl = connectionString;
      // Regex mais robusta: captura qualquer IPv6 (com ou sem colchetes)
      connectionString = connectionString.replace(/@\[?[0-9a-fA-F:]{15,}\]?:5432/, `@db.${projectId}.supabase.co:5432`);
      console.log('✅ Substituído IP IPv6 por hostname do Supabase');
      console.log('   Antes:', oldUrl.substring(0, 60) + '...');
      console.log('   Depois:', connectionString.substring(0, 60) + '...');
    } else {
      console.error('❌ Não foi possível extrair project ID do Supabase!');
      console.error('   SUPABASE_URL:', process.env.SUPABASE_URL || 'NÃO CONFIGURADO');
      console.error('   DATABASE_URL (primeiros 100 chars):', connectionString.substring(0, 100));
      console.error('   ⚠️ ATENÇÃO: A DATABASE_URL precisa ser atualizada manualmente no Railway!');
      console.error('   📋 Siga as instruções em: ATUALIZAR-DATABASE-URL-RAILWAY.md');
    }
  } else {
    // Verificar se não tem IPv6 mas também não tem hostname correto
    if (!connectionString.includes('db.') && !connectionString.includes('pooler.supabase.com')) {
      console.warn('⚠️ DATABASE_URL pode estar incorreta - não contém hostname do Supabase');
    }
  }
}

// Log da URL final antes de criar o pool
console.log('🔍 URL final para conexão (primeiros 100 chars):', connectionString.substring(0, 100));
console.log('🔍 URL completa (mascarada para segurança):', connectionString.replace(/:[^:@]+@/, ':****@'));

// Verificar se a URL está completa
if (!connectionString.includes('@db.') && !connectionString.includes('@pooler.')) {
  console.error('❌ ERRO: URL não contém hostname válido do Supabase!');
  console.error('   URL atual:', connectionString.substring(0, 150));
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
