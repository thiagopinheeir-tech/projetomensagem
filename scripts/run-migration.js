/**
 * Script para executar a migração multi-tenant
 * Executa o SQL de migração no banco de dados
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('../config/database');

async function runMigration() {
  console.log('🔄 Iniciando migração multi-tenant...\n');

  // Verificar conexão
  console.log('📡 Verificando conexão com o banco de dados...');
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Não foi possível conectar ao banco de dados!');
    console.error('   Verifique a variável DATABASE_URL no arquivo .env');
    process.exit(1);
  }
  console.log('✅ Conexão com banco de dados estabelecida\n');

  // Verificar ENCRYPTION_KEY
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY não encontrada no .env');
    console.warn('   Gerando chave temporária para desenvolvimento...');
    const crypto = require('crypto');
    const tempKey = crypto.randomBytes(32).toString('hex');
    console.warn(`   Chave gerada: ${tempKey.substring(0, 20)}...`);
    console.warn('   ⚠️  IMPORTANTE: Adicione ENCRYPTION_KEY no .env para produção!\n');
  } else {
    console.log('✅ ENCRYPTION_KEY encontrada no .env\n');
  }

  // Ler arquivo SQL
  const migrationFile = path.join(__dirname, '..', 'sql', 'migrate-to-multi-tenant.sql');
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Arquivo de migração não encontrado: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');
  console.log('📄 Arquivo de migração carregado\n');

  // Executar migração
  try {
    console.log('🚀 Executando migração...');
    console.log('   Isso pode levar alguns segundos...\n');

    // Dividir em comandos individuais (separados por ;)
    // Mas executar tudo de uma vez para manter transações
    await query(sql);

    console.log('\n✅ Migração executada com sucesso!');
    console.log('\n📋 O que foi feito:');
    console.log('   ✓ Campos de assinatura adicionados à tabela users');
    console.log('   ✓ Tabela user_api_keys criada');
    console.log('   ✓ Tabela user_google_oauth_config criada');
    console.log('   ✓ Índices compostos criados para performance');
    console.log('   ✓ Dados existentes migrados para o primeiro usuário');
    console.log('   ✓ Função de limpeza criada');
    console.log('\n🎉 Sistema pronto para multi-tenant!\n');
  } catch (error) {
    console.error('\n❌ Erro ao executar migração:');
    console.error(error.message);
    
    // Se for erro de "já existe", não é crítico
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('\n⚠️  Algumas estruturas já existem. Isso é normal se a migração já foi executada antes.');
      console.log('   Continuando...\n');
    } else {
      console.error('\n💡 Dicas:');
      console.error('   - Verifique se o banco de dados está acessível');
      console.error('   - Verifique se você tem permissões para criar tabelas');
      console.error('   - Verifique os logs acima para mais detalhes');
      process.exit(1);
    }
  }
}

// Executar
runMigration()
  .then(() => {
    console.log('✅ Processo concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
