/**
 * Script de teste para criar agendamento diretamente no Google Calendar
 * Uso: node scripts/test-google-calendar.js
 */

const bookingService = require('../services/booking');
const { query } = require('../config/database');
const googleCalendarOAuth = require('../services/google-calendar-oauth');

async function testGoogleCalendarAppointment() {
  try {
    console.log('🧪 Iniciando teste de criação de agendamento no Google Calendar...\n');

    // 1. Buscar primeiro usuário ativo com perfil ativo
    console.log('1️⃣ Buscando usuário e perfil ativo...');
    const userResult = await query(
      `SELECT u.id::text as user_id, cp.id::text as profile_id
       FROM users u
       JOIN chatbot_profiles cp ON cp.user_id = u.id
       WHERE cp.is_active = true
       LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Nenhum usuário com perfil ativo encontrado!');
      console.log('💡 Certifique-se de ter um perfil ativo no sistema.');
      process.exit(1);
    }

    const { user_id, profile_id } = userResult.rows[0];
    console.log(`✅ Usuário encontrado: ${user_id}, Perfil: ${profile_id}\n`);

    // 2. Verificar se Google Calendar está conectado
    console.log('2️⃣ Verificando conexão com Google Calendar...');
    try {
      // profile_id pode ser INTEGER (PostgreSQL local) ou UUID (Supabase)
      // Tentar como INTEGER primeiro
      let tokenResult;
      try {
        tokenResult = await query(
          `SELECT refresh_token_encrypted, calendar_id_default
           FROM profile_google_tokens
           WHERE profile_id = $1::integer`,
          [profile_id]
        );
      } catch (e) {
        // Se falhar, tentar como UUID
        tokenResult = await query(
          `SELECT refresh_token_encrypted, calendar_id_default
           FROM profile_google_tokens
           WHERE profile_id = $1::uuid`,
          [profile_id]
        );
      }

      if (tokenResult.rows.length === 0 || !tokenResult.rows[0].refresh_token_encrypted) {
        console.error('❌ Google Calendar não está conectado para este perfil!');
        console.log('💡 Vá em "Chaves e Integrações" e conecte sua conta Google.');
        process.exit(1);
      }

      if (!tokenResult.rows[0].calendar_id_default) {
        console.error('❌ Calendário padrão não selecionado!');
        console.log('💡 Vá em "Chaves e Integrações" e selecione um calendário padrão.');
        process.exit(1);
      }

      console.log(`✅ Google Calendar conectado. Calendário: ${tokenResult.rows[0].calendar_id_default}\n`);
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error.message);
      process.exit(1);
    }

    // 3. Criar agendamento de teste
    console.log('3️⃣ Criando agendamento de teste...');
    
    // Agendamento para amanhã às 14:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const testAppointment = {
      userId: user_id,
      profileId: profile_id,
      phone: '5582999999999', // Telefone de teste
      clientName: 'Cliente Teste',
      service: 'Corte de Cabelo',
      startISO: tomorrow.toISOString(),
      durationMinutes: 30,
      notes: 'Agendamento de teste criado pelo script'
    };

    console.log('📅 Dados do agendamento:');
    console.log(`   - Cliente: ${testAppointment.clientName}`);
    console.log(`   - Serviço: ${testAppointment.service}`);
    console.log(`   - Data/Hora: ${tomorrow.toLocaleString('pt-BR')}`);
    console.log(`   - Duração: ${testAppointment.durationMinutes} minutos\n`);

    const result = await bookingService.createAppointmentFromAI(testAppointment);

    if (result.success) {
      console.log('✅ Agendamento criado com sucesso!\n');
      console.log('📋 Detalhes:');
      console.log(`   - Event ID: ${result.eventId}`);
      console.log(`   - Link: ${result.htmlLink || 'N/A'}`);
      console.log(`   - Início: ${new Date(result.startTime).toLocaleString('pt-BR')}`);
      console.log(`   - Fim: ${new Date(result.endTime).toLocaleString('pt-BR')}`);
      
      if (result.calendarError) {
        console.log(`   ⚠️ Aviso: ${result.calendarError}`);
      }
      
      console.log('\n✅ Verifique seu Google Calendar para confirmar que o evento apareceu!');
      console.log(`📧 Email: thiagopinheeir@gmail.com`);
      
      if (result.htmlLink) {
        console.log(`🔗 Link direto: ${result.htmlLink}`);
      }
    } else {
      console.error('❌ Erro ao criar agendamento:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar teste
testGoogleCalendarAppointment()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error);
    process.exit(1);
  });
