/**
 * Script para criar agendamento manual de teste no Google Calendar
 * Valida todo o fluxo: busca usuário/perfil, cria evento, salva no banco
 */

const bookingService = require('../services/booking');
const { query } = require('../config/database');

async function createManualAppointment() {
  try {
    console.log('🧪 ========================================');
    console.log('🧪 TESTE DE AGENDAMENTO MANUAL');
    console.log('🧪 ========================================\n');

    // 1. Buscar usuário e perfil ativo
    console.log('📋 Passo 1: Buscando usuário e perfil ativo...');
    const userResult = await query(
      `SELECT u.id::text as user_id, cp.id::text as profile_id, u.email
       FROM users u
       JOIN chatbot_profiles cp ON cp.user_id = u.id
       WHERE cp.is_active = true
       ORDER BY cp.updated_at DESC
       LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Nenhum usuário com perfil ativo encontrado!');
      process.exit(1);
    }

    const { user_id, profile_id, email } = userResult.rows[0];
    console.log(`✅ Usuário encontrado:`);
    console.log(`   - ID: ${user_id}`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Perfil ID: ${profile_id}\n`);

    // 2. Definir horário de teste (próxima hora disponível, arredondada)
    const now = new Date();
    const testTime = new Date(now);
    testTime.setMinutes(0, 0, 0); // Arredondar para hora cheia
    testTime.setHours(testTime.getHours() + 2); // 2 horas a partir de agora
    
    // Garantir que está dentro do horário de funcionamento (9h-20h)
    if (testTime.getHours() < 9) {
      testTime.setHours(9, 0, 0, 0);
    } else if (testTime.getHours() >= 20) {
      // Se passou das 20h, agendar para amanhã às 9h
      testTime.setDate(testTime.getDate() + 1);
      testTime.setHours(9, 0, 0, 0);
    }

    console.log('📋 Passo 2: Preparando dados do agendamento...');
    console.log(`   - Data/Hora: ${testTime.toLocaleString('pt-BR')}`);
    console.log(`   - ISO: ${testTime.toISOString()}\n`);

    // 3. Criar agendamento
    console.log('📋 Passo 3: Criando agendamento no Google Calendar...');
    const testAppointment = {
      userId: user_id,
      profileId: profile_id,
      phone: '5582999999999',
      clientName: 'TESTE MANUAL - Sistema',
      service: 'Validação de Agendamento',
      startISO: testTime.toISOString(),
      durationMinutes: 30,
      notes: `Agendamento de teste manual criado em ${new Date().toLocaleString('pt-BR')} para validar integração com Google Calendar`
    };

    console.log('   Dados do agendamento:');
    console.log(`   - Cliente: ${testAppointment.clientName}`);
    console.log(`   - Serviço: ${testAppointment.service}`);
    console.log(`   - Telefone: ${testAppointment.phone}`);
    console.log(`   - Duração: ${testAppointment.durationMinutes} minutos\n`);

    const result = await bookingService.createAppointmentFromAI(testAppointment);

    // 4. Verificar resultado
    console.log('📋 Passo 4: Verificando resultado...\n');
    
    if (result.success && result.eventId) {
      console.log('✅ ✅ ✅ AGENDAMENTO CRIADO COM SUCESSO! ✅ ✅ ✅\n');
      console.log('📋 Detalhes do agendamento:');
      console.log(`   ✅ Event ID: ${result.eventId}`);
      console.log(`   ✅ Cliente: ${testAppointment.clientName}`);
      console.log(`   ✅ Serviço: ${testAppointment.service}`);
      console.log(`   ✅ Data/Hora: ${new Date(result.startTime).toLocaleString('pt-BR')}`);
      console.log(`   ✅ Duração: 30 minutos`);
      
      if (result.htmlLink) {
        console.log(`\n🔗 Link do calendário:`);
        console.log(`   ${result.htmlLink}`);
      }
      
      if (result.timeAdjusted) {
        console.log(`\n⚠️ Horário foi ajustado automaticamente:`);
        console.log(`   Original: ${new Date(result.originalTime).toLocaleString('pt-BR')}`);
        console.log(`   Novo: ${new Date(result.startTime).toLocaleString('pt-BR')}`);
      }
      
      console.log(`\n📧 Verifique seu Google Calendar:`);
      console.log(`   Email: ${email}`);
      console.log(`   Data: ${new Date(result.startTime).toLocaleDateString('pt-BR')}`);
      console.log(`   Hora: ${new Date(result.startTime).toLocaleTimeString('pt-BR')}`);
      
      // 5. Verificar no banco de dados
      console.log('\n📋 Passo 5: Verificando no banco de dados...');
      const dbCheck = await query(
        `SELECT id, google_calendar_event_id, status, start_time, client_name, service
         FROM booking_appointments
         WHERE google_calendar_event_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [result.eventId]
      );
      
      if (dbCheck.rows.length > 0) {
        const dbAppt = dbCheck.rows[0];
        console.log('✅ Agendamento encontrado no banco de dados:');
        console.log(`   - ID no banco: ${dbAppt.id}`);
        console.log(`   - Status: ${dbAppt.status}`);
        console.log(`   - Cliente: ${dbAppt.client_name}`);
        console.log(`   - Serviço: ${dbAppt.service}`);
        console.log(`   - Data/Hora: ${new Date(dbAppt.start_time).toLocaleString('pt-BR')}`);
        console.log(`   ✅ EventId salvo corretamente: ${dbAppt.google_calendar_event_id?.substring(0, 30)}...`);
      } else {
        console.log('⚠️ Agendamento criado no Google Calendar mas NÃO encontrado no banco de dados!');
        console.log('   Isso indica um problema no salvamento.');
      }
      
      console.log('\n✅ ✅ ✅ TESTE CONCLUÍDO COM SUCESSO! ✅ ✅ ✅');
      return true;
      
    } else {
      console.log('❌ ❌ ❌ FALHA AO CRIAR AGENDAMENTO ❌ ❌ ❌\n');
      console.log('📋 Detalhes do erro:');
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Event ID: ${result.eventId || 'NÃO CRIADO'}`);
      
      if (result.calendarError) {
        console.log(`   - Erro do Google Calendar: ${result.calendarError}`);
      }
      
      if (result.error) {
        console.log(`   - Erro geral: ${result.error}`);
      }
      
      console.log('\n💡 Possíveis causas:');
      console.log('   1. Horário ocupado no calendário');
      console.log('   2. Problema de autenticação OAuth');
      console.log('   3. Permissões insuficientes no Google Calendar');
      console.log('   4. Token de acesso expirado');
      
      return false;
    }

  } catch (error) {
    console.error('\n❌ ❌ ❌ ERRO DURANTE O TESTE ❌ ❌ ❌');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Executar
createManualAppointment()
  .then((success) => {
    if (success) {
      console.log('\n✅ Processo concluído com sucesso!');
      process.exit(0);
    } else {
      console.log('\n❌ Processo concluído com falhas.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Processo falhou:', error);
    process.exit(1);
  });
