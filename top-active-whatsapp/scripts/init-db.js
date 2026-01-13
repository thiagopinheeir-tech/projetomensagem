require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'top_active_whatsapp',
});

async function initDatabase() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL');

    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔄 Executando schema SQL...');
    await client.query(schema);
    console.log('✅ Schema executado com sucesso!');

    client.release();
    await pool.end();
    
    console.log('✅ Banco de dados inicializado!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

initDatabase();
