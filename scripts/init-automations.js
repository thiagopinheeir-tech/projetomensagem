require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function initAutomations() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL');

    const schemaPath = path.join(__dirname, '..', 'sql', 'automations-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔄 Executando schema de automações...');
    await client.query(schema);
    console.log('✅ Schema de automações executado com sucesso!');

    client.release();
    await pool.end();
    
    console.log('✅ Tabelas de automações criadas!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar schema de automações:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Algumas tabelas já existem (isso é normal)');
    } else {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

initAutomations();
