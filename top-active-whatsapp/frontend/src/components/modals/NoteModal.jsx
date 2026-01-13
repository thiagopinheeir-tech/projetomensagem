import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

const NoteModal = ({ isOpen, onClose, note = null, leadId = null, contactId = null, conversationId = null, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'note',
    tags: '',
    is_important: false,
    lead_id: leadId || null,
    contact_id: contactId || null,
    conversation_id: conversationId || null
  });

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        content: note.content || '',
        type: note.type || 'note',
        tags: Array.isArray(note.tags) ? note.tags.join(', ') : note.tags || '',
        is_important: note.is_important || false,
        lead_id: note.lead_id || leadId || null,
        contact_id: note.contact_id || contactId || null,
        conversation_id: note.conversation_id || conversationId || null
      });
    } else {
      setFormData({
        title: '',
        content: '',
        type: 'note',
        tags: '',
        is_important: false,
        lead_id: leadId || null,
        contact_id: contactId || null,
        conversation_id: conversationId || null
      });
    }
  }, [note, leadId, contactId, conversationId, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };

      if (note) {
        const response = await api.put(`/api/crm/notes/${note.id}`, payload);
        if (response.data.success) {
          toast.success('Nota atualizada com sucesso!');
          onSuccess?.();
          onClose();
        }
      } else {
        const response = await api.post('/api/crm/notes', payload);
        if (response.data.success) {
          toast.success('Nota criada com sucesso!');
          onSuccess?.();
          onClose();
        }
      }
    } catch (error) {
      toast.error(note ? 'Erro ao atualizar nota' : 'Erro ao criar nota');
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
            {note ? 'Editar Nota' : 'Nova Nota'}
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
            label="Título"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Título da nota (opcional)"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conteúdo *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escreva sua nota aqui..."
              required
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
                <option value="note">Nota</option>
                <option value="call_summary">Resumo de Ligação</option>
                <option value="meeting_summary">Resumo de Reunião</option>
                <option value="email_summary">Resumo de Email</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <Input
              label="Tags (separadas por vírgula)"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_important"
              checked={formData.is_important}
              onChange={(e) => handleChange('is_important', e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_important" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Marcar como importante
            </label>
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
              disabled={loading || !formData.content}
              className="flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : note ? 'Atualizar' : 'Criar Nota'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
