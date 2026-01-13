/**
 * Script de diagnóstico para problemas de agendamento
 * Verifica todos os pontos críticos do sistema
 */

const { query } = require('../config/database');
const googleCalendarOAuth = require('../services/google-calendar-oauth');

async function diagnoseAppointmentIssue() {
  console.log('🔍 DIAGNÓSTICO DE AGENDAMENTOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar usuário e perfil
    console.log('\n1️⃣ Verificando usuário e perfil...');
    const userResult = await query(
      `SELECT u.id::text as user_id, cp.id::text as profile_id, cp.is_active
       FROM users u
       JOIN chatbot_profiles cp ON cp.user_id = u.id
       WHERE cp.is_active = true
       LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Nenhum usuário com perfil ativo encontrado!');
      return;
    }

    const { user_id, profile_id } = userResult.rows[0];
    console.log(`✅ Usuário: ${user_id}, Perfil: ${profile_id}`);

    // 2. Verificar configuração OAuth
    console.log('\n2️⃣ Verificando configuração OAuth...');
    try {
      // Verificar se consegue obter cliente do calendário (isso valida OAuth internamente)
      const { calendar, calendarId } = await googleCalendarOAuth.getCalendarClientForUser(user_id);
      console.log(`✅ OAuth configurado e funcionando:`, {
        calendarId: calendarId?.substring(0, 50)
      });
    } catch (oauthError) {
      console.error('❌ Erro na configuração OAuth:', oauthError.message);
      return;
    }

    // 3. Verificar tokens do Google
    console.log('\n3️⃣ Verificando tokens do Google Calendar...');
    const tokenResult = await query(
      `SELECT refresh_token_encrypted, access_token_encrypted, calendar_id_default
       FROM profile_google_tokens
       WHERE profile_id = $1`,
      [profile_id]
    );

    if (tokenResult.rows.length === 0) {
      console.error('❌ Nenhum token encontrado! Faça a autenticação OAuth primeiro.');
      return;
    }

    const tokens = tokenResult.rows[0];
    console.log(`✅ Tokens encontrados:`, {
      hasRefreshToken: !!tokens.refresh_token_encrypted,
      hasAccessToken: !!tokens.access_token_encrypted,
      calendarId: tokens.calendar_id_default || 'NÃO DEFINIDO ❌'
    });

    if (!tokens.calendar_id_default) {
      console.error('❌ Calendário padrão não selecionado!');
      return;
    }

    // 4. Testar conexão com Google Calendar (já feito no passo 2, mas vamos testar listagem)
    console.log('\n4️⃣ Testando listagem de eventos do Google Calendar...');
    try {
      const { calendar, calendarId } = await googleCalendarOAuth.getCalendarClientForUser(user_id);
      
      // Tentar listar eventos recentes para verificar conexão
      const testEvents = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 1
      });
      console.log(`✅ Conexão com Google Calendar funcionando!`);
      console.log(`   Eventos futuros encontrados: ${testEvents?.data?.items?.length || 0}`);
    } catch (calendarError) {
      console.error('❌ Erro ao conectar com Google Calendar:', {
        message: calendarError.message,
        code: calendarError.code,
        statusCode: calendarError.statusCode
      });
      return;
    }

    // 5. Testar criação de evento de teste
    console.log('\n5️⃣ Testando criação de evento...');
    const testTime = new Date();
    testTime.setHours(testTime.getHours() + 2, 0, 0, 0);

    try {
      const testAppointment = await googleCalendarOAuth.createAppointment({
        userId: user_id,
        name: 'TESTE DIAGNÓSTICO',
        phone: '5582999999999',
        service: 'Teste de Sistema',
        startISO: testTime.toISOString(),
        durationMinutes: 15,
        intervalMinutes: 0,
        notes: 'Evento de teste criado pelo script de diagnóstico'
      });

      console.log(`✅ Evento de teste criado com sucesso!`, {
        eventId: testAppointment.eventId,
        htmlLink: testAppointment.htmlLink?.substring(0, 80)
      });

      // Verificar se o evento realmente existe
      console.log('\n6️⃣ Verificando se evento existe no calendário...');
      const { calendar, calendarId } = await googleCalendarOAuth.getCalendarClientForUser(user_id);
      const verifyEvent = await calendar.events.get({
        calendarId: calendarId,
        eventId: testAppointment.eventId
      });

      if (verifyEvent?.data?.id === testAppointment.eventId) {
        console.log(`✅ Evento confirmado no calendário!`);
        console.log(`\n📅 Verifique seu Google Calendar:`);
        console.log(`   Email: ${calendarId}`);
        console.log(`   Data: ${testTime.toLocaleString('pt-BR')}`);
        console.log(`   Link: ${testAppointment.htmlLink}`);
      } else {
        console.error('❌ Evento criado mas não encontrado na verificação!');
      }

      // Deletar evento de teste
      console.log('\n7️⃣ Removendo evento de teste...');
      await googleCalendarOAuth.deleteAppointment({
        userId: user_id,
        eventId: testAppointment.eventId
      });
      console.log(`✅ Evento de teste removido`);

    } catch (testError) {
      console.error('❌ Erro ao criar evento de teste:', {
        message: testError.message,
        statusCode: testError.statusCode,
        code: testError.code
      });
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNÓSTICO CONCLUÍDO - Sistema funcionando corretamente!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro durante diagnóstico:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar diagnóstico
diagnoseAppointmentIssue()
  .then(() => {
    console.log('\n✅ Diagnóstico finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnóstico falhou:', error);
    process.exit(1);
  });
