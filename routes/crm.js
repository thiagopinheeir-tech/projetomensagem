const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireUserId } = require('../middleware/data-isolation');
const crmController = require('../controllers/crmController');

// ============================================
// LEADS/OPORTUNIDADES
// ============================================

// Listar leads
router.get('/leads', authMiddleware, requireUserId, crmController.getLeads);

// Criar lead
router.post('/leads', authMiddleware, requireUserId, crmController.createLead);

// Atualizar lead
router.put('/leads/:id', authMiddleware, requireUserId, crmController.updateLead);

// Deletar lead
router.delete('/leads/:id', authMiddleware, requireUserId, crmController.deleteLead);

// ============================================
// TAREFAS/ATIVIDADES
// ============================================

// Listar tarefas
router.get('/tasks', authMiddleware, requireUserId, crmController.getTasks);

// Criar tarefa
router.post('/tasks', authMiddleware, requireUserId, crmController.createTask);

// Atualizar tarefa
router.put('/tasks/:id', authMiddleware, requireUserId, crmController.updateTask);

// ============================================
// NOTAS/HISTÓRICO
// ============================================

// Listar notas
router.get('/notes', authMiddleware, requireUserId, crmController.getNotes);

// Criar nota
router.post('/notes', authMiddleware, requireUserId, crmController.createNote);

// Atualizar nota
router.put('/notes/:id', authMiddleware, requireUserId, crmController.updateNote);

// ============================================
// ESTATÍSTICAS
// ============================================

// Estatísticas do CRM
router.get('/stats', authMiddleware, requireUserId, crmController.getStats);

module.exports = router;
