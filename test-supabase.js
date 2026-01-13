#!/usr/bin/env node

require('dotenv').config();
const { supabase, isConfigured } = require('./config/supabase');

async function testSupabaseConnection() {
  console.log('\n🧪 Testando conexão com Supabase...\n');
  
  if (!isConfigured) {
    console.error('❌ Supabase não configurado. Verifique .env');
    process.exit(1);
  }

  try {
    // Teste 1: Health check - tenta ler um registro para verificar conexão
    console.log('1️⃣  Verificando saúde do servidor...');
    const { data, error } = await supabase
      .from('chat_history')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro:', error.message);
      console.log('\n💡 Solução: Execute o SQL em sql/supabase-setup.sql no Supabase Dashboard');
      process.exit(1);
    }
    
    console.log('✅ Servidor Supabase respondendo\n');

    // Teste 2: Inserir dados de teste
    console.log('2️⃣  Inserindo mensagem de teste...');
    const testMessage = {
      phone: '5511987654321',
      user_message: 'Teste de conexão do sistema',
      ai_response: 'Conexão bem-sucedida! ✅'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('chat_history')
      .insert([testMessage]);
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError.message);
      process.exit(1);
    }
    
    console.log('✅ Mensagem inserida com sucesso\n');

    // Teste 3: Buscar dados
    console.log('3️⃣  Buscando dados...');
    const { data: messages, error: fetchError } = await supabase
      .from('chat_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Erro ao buscar:', fetchError.message);
      process.exit(1);
    }
    
    console.log('✅ Últimas 5 mensagens:\n');
    messages.forEach((msg, i) => {
      console.log(`  ${i+1}. [${msg.phone}] "${msg.user_message}" → "${msg.ai_response}"`);
    });
    console.log('');

    // Teste 4: Contar registros
    console.log('4️⃣  Estatísticas...');
    const { data: allMessages, error: countError } = await supabase
      .from('chat_history')
      .select('id', { count: 'exact' });
    
    if (!countError && allMessages) {
      console.log(`✅ Total de mensagens: ${allMessages.length}\n`);
    } else {
      console.log('✅ (Contagem indisponível)\n');
    }

    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
    console.log('═'.repeat(55));
    console.log('✅ Supabase está pronto para uso!');
    console.log('═'.repeat(55) + '\n');
    
    console.log('📊 Dashboard: https://app.supabase.com/project/hhhifxikyhvruwvmaduq');
    console.log('💾 Dados salvos em: chat_history, conversations, contacts, etc.\n');

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
  }
}

testSupabaseConnection();
