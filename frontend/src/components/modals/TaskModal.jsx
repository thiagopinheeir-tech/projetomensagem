import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

const TaskModal = ({ isOpen, onClose, task = null, leadId = null, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'call',
    priority: 'medium',
    due_date: '',
    reminder_at: '',
    lead_id: leadId || null,
    contact_id: null
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        type: task.type || 'call',
        priority: task.priority || 'medium',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        reminder_at: task.reminder_at ? new Date(task.reminder_at).toISOString().slice(0, 16) : '',
        lead_id: task.lead_id || leadId || null,
        contact_id: task.contact_id || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'call',
        priority: 'medium',
        due_date: '',
        reminder_at: '',
        lead_id: leadId || null,
        contact_id: null
      });
    }
  }, [task, leadId, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        reminder_at: formData.reminder_at ? new Date(formData.reminder_at).toISOString() : null
      };

      if (task) {
        const response = await api.put(`/api/crm/tasks/${task.id}`, payload);
        if (response.data.success) {
          toast.success('Tarefa atualizada com sucesso!');
          onSuccess?.();
          onClose();
        }
      } else {
        const response = await api.post('/api/crm/tasks', payload);
        if (response.data.success) {
          toast.success('Tarefa criada com sucesso!');
          onSuccess?.();
          onClose();
        }
      }
    } catch (error) {
      toast.error(task ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Título *"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Título da tarefa"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descrição detalhada da tarefa..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="call">Ligação</option>
                <option value="email">Email</option>
                <option value="meeting">Reunião</option>
                <option value="note">Nota</option>
                <option value="follow_up">Follow-up</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <Input
              label="Data de Vencimento"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
            />

            <Input
              label="Lembrete"
              type="datetime-local"
              value={formData.reminder_at}
              onChange={(e) => handleChange('reminder_at', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !formData.title}
              className="flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : task ? 'Atualizar' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
