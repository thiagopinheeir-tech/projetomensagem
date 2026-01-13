/**
 * Script para verificar agendamentos no banco
 */

const { query } = require('../config/database');

async function checkAppointments() {
  try {
    console.log('🔍 Verificando agendamentos no banco...\n');
    
    const result = await query(
      `SELECT id, client_name, service, start_time, end_time, 
              google_calendar_event_id, status, notes, created_at
       FROM booking_appointments 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    console.log(`📊 Total encontrado: ${result.rows.length} agendamentos recentes\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum agendamento encontrado no banco!');
      return;
    }

    result.rows.forEach((apt, i) => {
      const start = new Date(apt.start_time);
      const hasEventId = !!apt.google_calendar_event_id;
      
      console.log(`${i + 1}. ${apt.client_name || 'Sem nome'} - ${apt.service || 'Sem serviço'}`);
      console.log(`   📅 Data/Hora: ${start.toLocaleString('pt-BR')}`);
      console.log(`   📱 Telefone: ${apt.phone || 'N/A'}`);
      console.log(`   ✅ Status: ${apt.status}`);
      console.log(`   ${hasEventId ? '✅' : '❌'} Google Calendar: ${hasEventId ? apt.google_calendar_event_id.substring(0, 30) + '...' : 'SEM EVENTID'}`);
      if (apt.notes) {
        console.log(`   📝 Notas: ${apt.notes.substring(0, 50)}`);
      }
      console.log('');
    });

    // Estatísticas
    const withEventId = result.rows.filter(r => r.google_calendar_event_id).length;
    const withoutEventId = result.rows.length - withEventId;
    
    console.log('📊 Estatísticas:');
    console.log(`   ✅ Com EventId do Google: ${withEventId}`);
    console.log(`   ❌ Sem EventId do Google: ${withoutEventId}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkAppointments()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
