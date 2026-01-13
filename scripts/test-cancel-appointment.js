/**
 * Script para testar o cancelamento de agendamentos
 */

const bookingService = require('../services/booking');
const { query } = require('../config/database');

async function testCancel() {
  try {
    console.log('🧪 ========================================');
    console.log('🧪 TESTE DE CANCELAMENTO DE AGENDAMENTOS');
    console.log('🧪 ========================================\n');

    // 1. Buscar usuário e perfil ativo
    const userResult = await query(
      `SELECT u.id::text as user_id, cp.id::text as profile_id
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

    const { user_id, profile_id } = userResult.rows[0];
    console.log(`✅ Usuário: ${user_id}, Perfil: ${profile_id}\n`);

    // 2. Buscar agendamentos futuros
    const appointmentsResult = await query(
      `SELECT id, client_name, service, start_time, status, phone
       FROM booking_appointments
       WHERE user_id = $1 AND start_time >= NOW() AND status = 'confirmed'
       ORDER BY start_time ASC
       LIMIT 5`,
      [user_id]
    );

    console.log(`📊 Agendamentos encontrados: ${appointmentsResult.rows.length}\n`);

    if (appointmentsResult.rows.length === 0) {
      console.log('⚠️ Nenhum agendamento futuro encontrado para testar cancelamento.');
      process.exit(0);
    }

    // 3. Testar comando de cancelamento
    const testPhone = appointmentsResult.rows[0].phone || '5582999999999';
    console.log(`📱 Testando com telefone: ${testPhone}\n`);

    // Teste 1: Comando "cancelar"
    console.log('🧪 Teste 1: Comando "cancelar"');
    const result1 = await bookingService.handleMessage({
      userId: user_id,
      profileId: profile_id,
      phone: testPhone,
      message: 'cancelar',
      cfg: {}
    });

    console.log(`   Handled: ${result1?.handled}`);
    console.log(`   Reply (primeiros 200 chars): ${result1?.reply?.substring(0, 200)}...\n`);

    if (result1?.handled && result1?.reply?.includes('Total:')) {
      console.log('✅ Teste 1 PASSOU: Lista de agendamentos foi mostrada\n');
    } else {
      console.log('❌ Teste 1 FALHOU: Lista não foi mostrada corretamente\n');
    }

    // Teste 2: Comando "cancelar agendamento"
    console.log('🧪 Teste 2: Comando "cancelar agendamento"');
    const result2 = await bookingService.handleMessage({
      userId: user_id,
      profileId: profile_id,
      phone: testPhone,
      message: 'cancelar agendamento',
      cfg: {}
    });

    console.log(`   Handled: ${result2?.handled}`);
    console.log(`   Reply (primeiros 200 chars): ${result2?.reply?.substring(0, 200)}...\n`);

    if (result2?.handled && result2?.reply?.includes('Total:')) {
      console.log('✅ Teste 2 PASSOU: Lista de agendamentos foi mostrada\n');
    } else {
      console.log('❌ Teste 2 FALHOU: Lista não foi mostrada corretamente\n');
    }

    // Teste 3: Número apenas (se houver agendamentos)
    if (appointmentsResult.rows.length > 0) {
      console.log('🧪 Teste 3: Número apenas "1"');
      const result3 = await bookingService.handleMessage({
        userId: user_id,
        profileId: profile_id,
        phone: testPhone,
        message: '1',
        cfg: {}
      });

      console.log(`   Handled: ${result3?.handled}`);
      console.log(`   Reply (primeiros 200 chars): ${result3?.reply?.substring(0, 200)}...\n`);

      if (result3?.handled) {
        if (result3?.reply?.includes('cancelado')) {
          console.log('✅ Teste 3 PASSOU: Agendamento foi cancelado\n');
        } else if (result3?.reply?.includes('Total:')) {
          console.log('⚠️ Teste 3: Mostrou lista novamente (pode ser esperado se número não corresponde)\n');
        }
      }
    }

    console.log('✅ Testes concluídos!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testCancel()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
