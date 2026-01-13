const whatsappManager = require('./whatsapp-manager');
const { query } = require('../config/database');
const { supabase, isConfigured } = require('../config/supabase');

/**
 * Formata lista de agendamentos para mensagem WhatsApp
 */
function formatAppointmentsList(appointments) {
  if (!appointments || appointments.length === 0) {
    return '';
  }

  let message = '\n📅 *Seus Agendamentos:*\n\n';
  
  appointments.forEach((appt, index) => {
    const date = new Date(appt.start_time);
    const endDate = new Date(appt.end_time);
    
    const dateStr = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const startTime = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const endTime = endDate.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    message += `${index + 1}. ${appt.service || 'Serviço'}\n`;
    message += `   📆 ${dateStr}\n`;
    message += `   ⏰ ${startTime} - ${endTime}\n`;
    
    if (appt.notes) {
      message += `   📝 ${appt.notes}\n`;
    }
    
    message += '\n';
  });

  return message;
}

/**
 * Busca todos os agendamentos futuros do cliente ordenados por data
 */
async function getFutureAppointments(phone, userId) {
  const now = new Date();

  // Tentar buscar do Supabase primeiro
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('booking_appointments')
        .select('*')
        .eq('phone', phone)
        .eq('user_id', userId)
        .gte('start_time', now.toISOString())
        .eq('status', 'confirmed')
        .order('start_time', { ascending: true });

      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.warn('⚠️ [getFutureAppointments] Erro ao buscar do Supabase:', error.message);
    }
  }

  // Fallback: buscar do PostgreSQL local
  try {
    const result = await query(
      `SELECT * FROM booking_appointments
       WHERE phone = $1 
         AND user_id = $2 
         AND start_time >= $3 
         AND status = 'confirmed'
       ORDER BY start_time ASC`,
      [phone, userId, now]
    );

    return result.rows || [];
  } catch (error) {
    console.error('❌ [getFutureAppointments] Erro ao buscar agendamentos:', error);
    return [];
  }
}

/**
 * Envia mensagem de confirmação via WhatsApp com lista de agendamentos
 */
async function sendAppointmentConfirmation(phone, userId, newAppointmentId = null) {
  try {
    console.log(`📱 [sendAppointmentConfirmation] Enviando confirmação para ${phone} (user: ${userId})`);

    // Verificar se WhatsApp está conectado
    if (!whatsappManager.isReady(userId)) {
      console.warn(`⚠️ [sendAppointmentConfirmation] WhatsApp não conectado para usuário ${userId}`);
      return { success: false, error: 'WhatsApp não conectado' };
    }

    // Buscar todos os agendamentos futuros do cliente
    const appointments = await getFutureAppointments(phone, userId);

    if (appointments.length === 0) {
      console.warn(`⚠️ [sendAppointmentConfirmation] Nenhum agendamento futuro encontrado para ${phone}`);
      return { success: false, error: 'Nenhum agendamento encontrado' };
    }

    // Formatar mensagem
    let message = '✅ *Agendamento confirmado!*\n';
    message += formatAppointmentsList(appointments);
    message += '\nObrigado por escolher nossa barbearia! 🎉';

    // Enviar via WhatsApp
    const result = await whatsappManager.sendMessage(userId, phone, message);

    console.log(`✅ [sendAppointmentConfirmation] Mensagem enviada com sucesso para ${phone}`);
    
    return { 
      success: true, 
      messageId: result.id,
      appointmentsCount: appointments.length 
    };
  } catch (error) {
    console.error(`❌ [sendAppointmentConfirmation] Erro ao enviar mensagem:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

module.exports = {
  sendAppointmentConfirmation,
  formatAppointmentsList,
  getFutureAppointments
};
