const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { supabase, isConfigured } = require('../config/supabase');
const appointmentNotifier = require('../services/appointment-notifier');
const { convertUserIdForTable } = require('../middleware/data-isolation');

/**
 * POST /api/webhooks/premium-shears/appointment-created
 * Webhook para receber notificações quando um agendamento é criado no premium-shears-sched
 */
router.post('/premium-shears/appointment-created', async (req, res) => {
  try {
    const { appointmentId, clientName, phone, service, startTime, endTime, userId, notes } = req.body;

    console.log('📥 [webhook] Recebido agendamento do Premium Shears:', {
      appointmentId,
      clientName,
      phone: phone?.substring(0, 15),
      userId
    });

    // Validações obrigatórias
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId é obrigatório no payload do webhook'
      });
    }

    if (!phone || !service || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: phone, service, startTime, endTime'
      });
    }

    // Converter userId se necessário
    let finalUserId = userId;
    try {
      finalUserId = await convertUserIdForTable('booking_appointments', userId);
    } catch (error) {
      console.warn('⚠️ [webhook] Erro ao converter userId:', error.message);
    }

    // Verificar se agendamento já existe (por external_event_id)
    let existingAppointment = null;

    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('booking_appointments')
          .select('id')
          .eq('external_event_id', String(appointmentId))
          .eq('user_id', finalUserId)
          .single();

        if (!error && data) {
          existingAppointment = data;
        }
      } catch (error) {
        console.warn('⚠️ [webhook] Erro ao verificar no Supabase:', error.message);
      }
    }

    if (!existingAppointment) {
      try {
        const result = await query(
          `SELECT id FROM booking_appointments 
           WHERE external_event_id = $1 AND user_id = $2`,
          [String(appointmentId), finalUserId]
        );
        if (result.rows.length > 0) {
          existingAppointment = result.rows[0];
        }
      } catch (error) {
        console.warn('⚠️ [webhook] Erro ao verificar no PostgreSQL:', error.message);
      }
    }

    // Se já existe, não criar novamente, apenas enviar notificação
    if (existingAppointment) {
      console.log('ℹ️ [webhook] Agendamento já existe, enviando apenas notificação');
    } else {
      // Salvar no banco de dados
      const appointmentData = {
        user_id: finalUserId,
        phone: phone,
        client_name: clientName || null,
        service: service,
        start_time: new Date(startTime),
        end_time: new Date(endTime),
        status: 'confirmed',
        external_event_id: String(appointmentId),
        scheduler_type: 'premium_shears',
        notes: notes || null
      };

      // Salvar no Supabase primeiro
      if (isConfigured) {
        try {
          const { error: supabaseError } = await supabase
            .from('booking_appointments')
            .insert([appointmentData]);

          if (supabaseError) {
            console.error('❌ [webhook] Erro ao salvar no Supabase:', supabaseError);
          } else {
            console.log('✅ [webhook] Agendamento salvo no Supabase');
          }
        } catch (error) {
          console.error('❌ [webhook] Erro ao salvar no Supabase:', error);
        }
      }

      // Fallback: salvar no PostgreSQL local
      try {
        await query(
          `INSERT INTO booking_appointments 
           (user_id, phone, client_name, service, start_time, end_time, status, external_event_id, scheduler_type, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (external_event_id, user_id) DO NOTHING`,
          [
            appointmentData.user_id,
            appointmentData.phone,
            appointmentData.client_name,
            appointmentData.service,
            appointmentData.start_time,
            appointmentData.end_time,
            appointmentData.status,
            appointmentData.external_event_id,
            appointmentData.scheduler_type,
            appointmentData.notes
          ]
        );
        console.log('✅ [webhook] Agendamento salvo no PostgreSQL');
      } catch (error) {
        console.error('❌ [webhook] Erro ao salvar no PostgreSQL:', error);
        // Não falhar completamente se já salvou no Supabase
      }
    }

    // Enviar mensagem de confirmação via WhatsApp
    try {
      await appointmentNotifier.sendAppointmentConfirmation(phone, finalUserId, appointmentId);
      console.log('✅ [webhook] Notificação enviada via WhatsApp');
    } catch (notifyError) {
      console.error('⚠️ [webhook] Erro ao enviar notificação WhatsApp:', notifyError.message);
      // Não falhar o webhook se a notificação falhar
    }

    res.json({
      success: true,
      message: 'Agendamento processado com sucesso',
      appointmentId
    });

  } catch (error) {
    console.error('❌ [webhook] Erro ao processar webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
