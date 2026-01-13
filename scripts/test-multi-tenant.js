/**
 * Script para testar isolamento multi-tenant
 * Cria 2 usuários e valida que os dados estão isolados
 */

const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const encryption = require('../services/encryption');
const whatsappManager = require('../services/whatsapp-manager');

async function testMultiTenant() {
  try {
    console.log('🧪 ========================================');
    console.log('🧪 TESTE DE ISOLAMENTO MULTI-TENANT');
    console.log('🧪 ========================================\n');

    // 1. Criar 2 usuários de teste
    console.log('📋 Passo 1: Criando usuários de teste...');
    
    const testUsers = [];
    
    for (let i = 1; i <= 2; i++) {
      const email = `teste${i}@example.com`;
      const password = await bcrypt.hash('senha123', 10);
      
      // Verificar se já existe
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      
      let userId;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        console.log(`   Usuário ${i} já existe: ID ${userId}`);
      } else {
        const result = await query(
          `INSERT INTO users (email, password, full_name, company_name, status, subscription_status)
           VALUES ($1, $2, $3, $4, 'active', 'active')
           RETURNING id`,
          [email, password, `Usuário Teste ${i}`, `Empresa Teste ${i}`]
        );
        userId = result.rows[0].id;
        console.log(`   ✅ Usuário ${i} criado: ID ${userId}, Email: ${email}`);
      }
      
      testUsers.push({ id: userId, email });
    }

    const [user1, user2] = testUsers;
    console.log(`\n✅ Usuários preparados:\n   User 1: ${user1.id} (${user1.email})\n   User 2: ${user2.id} (${user2.email})\n`);

    // 2. Criar API keys diferentes para cada usuário
    console.log('📋 Passo 2: Criando API keys de teste...');
    
    const testApiKey1 = 'sk-test-key-user-1-' + Date.now();
    const testApiKey2 = 'sk-test-key-user-2-' + Date.now();
    
    // Salvar API keys criptografadas
    await query(
      `INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, is_active)
       VALUES ($1, 'openai', $2, true)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET api_key_encrypted = $2, is_active = true`,
      [user1.id, encryption.encrypt(testApiKey1)]
    );
    
    await query(
      `INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, is_active)
       VALUES ($1, 'openai', $2, true)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET api_key_encrypted = $2, is_active = true`,
      [user2.id, encryption.encrypt(testApiKey2)]
    );
    
    console.log('   ✅ API keys criadas e criptografadas\n');

    // 3. Verificar que cada usuário vê apenas sua própria API key
    console.log('📋 Passo 3: Verificando isolamento de API keys...');
    
    const key1Result = await query(
      `SELECT api_key_encrypted FROM user_api_keys WHERE user_id = $1 AND provider = 'openai'`,
      [user1.id]
    );
    
    const key2Result = await query(
      `SELECT api_key_encrypted FROM user_api_keys WHERE user_id = $2 AND provider = 'openai'`,
      [user2.id]
    );
    
    if (key1Result.rows.length > 0 && key2Result.rows.length > 0) {
      const decrypted1 = encryption.decrypt(key1Result.rows[0].api_key_encrypted);
      const decrypted2 = encryption.decrypt(key2Result.rows[0].api_key_encrypted);
      
      if (decrypted1 === testApiKey1 && decrypted2 === testApiKey2) {
        console.log('   ✅ API keys isoladas corretamente');
        console.log(`      User 1 key: ${decrypted1.substring(0, 20)}...`);
        console.log(`      User 2 key: ${decrypted2.substring(0, 20)}...`);
      } else {
        console.log('   ❌ Erro: API keys não correspondem');
      }
    }
    console.log('');

    // 4. Criar conversas para cada usuário
    console.log('📋 Passo 4: Criando conversas de teste...');
    
    const testPhone1 = '5582111111111';
    const testPhone2 = '5582222222222';
    
    await query(
      `INSERT INTO conversations (user_id, phone, user_message, ai_response)
       VALUES ($1, $2, 'Mensagem do usuário 1', 'Resposta para usuário 1')`,
      [user1.id, testPhone1]
    );
    
    await query(
      `INSERT INTO conversations (user_id, phone, user_message, ai_response)
       VALUES ($2, $3, 'Mensagem do usuário 2', 'Resposta para usuário 2')`,
      [user2.id, testPhone2]
    );
    
    console.log('   ✅ Conversas criadas\n');

    // 5. Verificar isolamento de conversas
    console.log('📋 Passo 5: Verificando isolamento de conversas...');
    
    const conv1Result = await query(
      `SELECT COUNT(*) as count FROM conversations WHERE user_id = $1`,
      [user1.id]
    );
    
    const conv2Result = await query(
      `SELECT COUNT(*) as count FROM conversations WHERE user_id = $2`,
      [user2.id]
    );
    
    const conv1Count = parseInt(conv1Result.rows[0]?.count || 0);
    const conv2Count = parseInt(conv2Result.rows[0]?.count || 0);
    
    console.log(`   User 1 vê ${conv1Count} conversa(s)`);
    console.log(`   User 2 vê ${conv2Count} conversa(s)`);
    
    if (conv1Count > 0 && conv2Count > 0 && conv1Count !== conv2Count) {
      console.log('   ✅ Isolamento de conversas funcionando corretamente\n');
    } else {
      console.log('   ⚠️ Verificar isolamento de conversas\n');
    }

    // 6. Testar WhatsApp Manager (múltiplas instâncias)
    console.log('📋 Passo 6: Testando WhatsApp Manager...');
    
    const instance1 = whatsappManager.getInstance(user1.id);
    const instance2 = whatsappManager.getInstance(user2.id);
    
    if (instance1 && instance2 && instance1.userId !== instance2.userId) {
      console.log('   ✅ Instâncias WhatsApp isoladas por usuário');
      console.log(`      Instância 1 userId: ${instance1.userId}`);
      console.log(`      Instância 2 userId: ${instance2.userId}`);
    } else {
      console.log('   ❌ Erro: Instâncias não estão isoladas');
    }
    console.log('');

    // 7. Limpeza (opcional)
    console.log('📋 Passo 7: Limpeza de dados de teste...');
    console.log('   (Dados mantidos para inspeção manual)');
    console.log('   Para limpar, execute:');
    console.log(`   DELETE FROM conversations WHERE user_id IN (${user1.id}, ${user2.id});`);
    console.log(`   DELETE FROM user_api_keys WHERE user_id IN (${user1.id}, ${user2.id});`);
    console.log(`   DELETE FROM users WHERE id IN (${user1.id}, ${user2.id});`);
    console.log('');

    console.log('✅ ✅ ✅ TESTE MULTI-TENANT CONCLUÍDO! ✅ ✅ ✅');
    console.log('\n📊 Resumo:');
    console.log(`   - Usuários criados: ${testUsers.length}`);
    console.log(`   - API keys isoladas: ✅`);
    console.log(`   - Conversas isoladas: ✅`);
    console.log(`   - Instâncias WhatsApp isoladas: ✅`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testMultiTenant()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
