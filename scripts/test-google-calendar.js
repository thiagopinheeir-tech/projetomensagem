/**
 * Script de teste para criação de agendamento no Google Calendar
 * Testa diretamente a criação de um evento
 */

require('dotenv').config();
const { query } = require('../config/database');
const googleCalendarOAuth = require('../services/google-calendar-oauth');

async function testGoogleCalendarAppointment() {
  console.log('🧪 Iniciando teste de criação de agendamento no Google Calendar...\n');

  try {
    // 1. Buscar usuário e perfil ativo
    console.log('1️⃣ Buscando usuário e perfil ativo...');
    const userResult = await query(
      `SELECT u.id::text as user_id, cp.id::text as profile_id
       FROM users u
       INNER JOIN chatbot_profiles cp ON cp.user_id = u.id
       WHERE cp.is_active = true
       ORDER BY cp.updated_at DESC
       LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Nenhum usuário com perfil ativo encontrado');
      process.exit(1);
    }

    const { user_id: userId, profile_id: profileId } = userResult.rows[0];
    console.log(`✅ Usuário encontrado: ${userId}, Perfil: ${profileId}\n`);

    // 2. Verificar conexão com Google Calendar
    console.log('2️⃣ Verificando conexão com Google Calendar...');
    try {
      const { calendarId } = await googleCalendarOAuth.getCalendarClientForUser(userId);
      console.log(`✅ Google Calendar conectado. Calendário: ${calendarId}\n`);
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error.message);
      process.exit(1);
    }

    // 3. Criar agendamento de teste (amanhã às 14:00)
    console.log('3️⃣ Criando agendamento de teste...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    console.log('📅 Dados do agendamento:');
    console.log(`   - Cliente: Cliente Teste`);
    console.log(`   - Serviço: Corte de Cabelo`);
    console.log(`   - Data/Hora: ${tomorrow.toLocaleString('pt-BR')}`);
    console.log(`   - Duração: 30 minutos\n`);

    try {
      const result = await googleCalendarOAuth.createAppointment({
        userId,
        name: 'Cliente Teste',
        phone: '5582999999999',
        service: 'Corte de Cabelo',
        startISO: tomorrow.toISOString(),
        durationMinutes: 30,
        intervalMinutes: 0,
        notes: 'Agendamento de teste criado automaticamente'
      });

      console.log('✅ Agendamento criado com sucesso!\n');
      console.log('📋 Detalhes:');
      console.log(`   - Event ID: ${result.eventId || 'N/A'}`);
      console.log(`   - Link: ${result.htmlLink || 'N/A'}`);
      console.log(`   - Início: ${new Date(result.start?.dateTime || result.startTime).toLocaleString('pt-BR')}`);
      console.log(`   - Fim: ${new Date(result.end?.dateTime || result.endTime).toLocaleString('pt-BR')}\n`);

      if (result.eventId) {
        console.log('✅ Verifique seu Google Calendar para confirmar que o evento apareceu!');
        console.log(`📧 Email: ${userId}\n`);
      } else {
        console.warn('⚠️ Aviso: Evento criado mas sem eventId retornado');
      }
    } catch (error) {
      console.error('❌ Erro ao criar agendamento:', error.message);
      console.error('   Stack:', error.stack?.substring(0, 200));
      process.exit(1);
    }

    console.log('✅ Teste concluído!');
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

// Executar teste
testGoogleCalendarAppointment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
