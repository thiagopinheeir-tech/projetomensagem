/**
 * Script para criar agendamento de teste no Google Calendar
 * Tenta vários horários até encontrar um disponível
 */

const bookingService = require('../services/booking');
const { query } = require('../config/database');

async function createTestAppointment() {
  try {
    console.log('🧪 Criando agendamento de teste no Google Calendar...\n');

    // Buscar usuário e perfil ativo
    const userResult = await query(
      `SELECT u.id::text as user_id, cp.id::text as profile_id
       FROM users u
       JOIN chatbot_profiles cp ON cp.user_id = u.id
       WHERE cp.is_active = true
       LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Nenhum usuário com perfil ativo encontrado!');
      process.exit(1);
    }

    const { user_id, profile_id } = userResult.rows[0];
    console.log(`✅ Usuário: ${user_id}, Perfil: ${profile_id}\n`);

    // Tentar vários horários (próximas 24 horas, a cada 2 horas)
    const now = new Date();
    const testTimes = [];
    
    for (let i = 1; i <= 12; i++) {
      const testTime = new Date(now);
      testTime.setHours(now.getHours() + (i * 2), 0, 0, 0);
      testTimes.push(testTime);
    }

    console.log(`📅 Tentando criar agendamento em um dos horários disponíveis...\n`);

    let success = false;
    let lastError = null;

    for (const testTime of testTimes) {
      const testAppointment = {
        userId: user_id,
        profileId: profile_id,
        phone: '5582999999999',
        clientName: 'TESTE AUTOMÁTICO - Sistema',
        service: 'Agendamento de Teste',
        startISO: testTime.toISOString(),
        durationMinutes: 30,
        notes: 'Agendamento de teste criado automaticamente pelo sistema'
      };

      console.log(`🔄 Tentando: ${testTime.toLocaleString('pt-BR')}...`);

      try {
        const result = await bookingService.createAppointmentFromAI(testAppointment);

        if (result.success && result.eventId) {
          console.log('\n✅ ✅ ✅ AGENDAMENTO CRIADO COM SUCESSO! ✅ ✅ ✅\n');
          console.log('📋 Detalhes:');
          console.log(`   - Event ID: ${result.eventId}`);
          console.log(`   - Cliente: ${testAppointment.clientName}`);
          console.log(`   - Serviço: ${testAppointment.service}`);
          console.log(`   - Data/Hora: ${testTime.toLocaleString('pt-BR')}`);
          console.log(`   - Duração: 30 minutos`);
          
          if (result.htmlLink) {
            console.log(`\n🔗 Link do calendário:`);
            console.log(`   ${result.htmlLink}`);
          }
          
          console.log(`\n📧 Verifique seu Google Calendar:`);
          console.log(`   Email: thiagopinheeir@gmail.com`);
          console.log(`   Data: ${testTime.toLocaleDateString('pt-BR')}`);
          console.log(`   Hora: ${testTime.toLocaleTimeString('pt-BR')}`);
          
          success = true;
          break;
        } else if (result.calendarError) {
          lastError = result.calendarError;
          console.log(`   ⚠️ ${result.calendarError}`);
        }
      } catch (error) {
        lastError = error.message;
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }

    if (!success) {
      console.log('\n❌ Não foi possível criar agendamento em nenhum horário testado.');
      console.log(`   Último erro: ${lastError}`);
      console.log('\n💡 Tente novamente mais tarde ou verifique se há conflitos no calendário.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar
createTestAppointment()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Processo falhou:', error);
    process.exit(1);
  });
