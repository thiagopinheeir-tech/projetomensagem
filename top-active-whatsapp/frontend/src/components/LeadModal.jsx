import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const LeadModal = ({ isOpen, onClose, lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    company: '',
    title: '',
    source: 'whatsapp',
    status: 'new',
    stage: '',
    value: '',
    probability: 0,
    expected_close_date: '',
    tags: '',
    notes: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        phone: lead.phone || '',
        name: lead.name || '',
        email: lead.email || '',
        company: lead.company || '',
        title: lead.title || '',
        source: lead.source || 'whatsapp',
        status: lead.status || 'new',
        stage: lead.stage || '',
        value: lead.value || '',
        probability: lead.probability || 0,
        expected_close_date: lead.expected_close_date ? lead.expected_close_date.split('T')[0] : '',
        tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : lead.tags || '',
        notes: lead.notes || '',
        priority: lead.priority || 'medium'
      });
    } else {
      // Reset form
      setFormData({
        phone: '',
        name: '',
        email: '',
        company: '',
        title: '',
        source: 'whatsapp',
        status: 'new',
        stage: initialStage || '',
        value: '',
        probability: 0,
        expected_close_date: '',
        tags: '',
        notes: '',
        priority: 'medium'
      });
    }
  }, [lead, isOpen, initialStage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : null,
        probability: parseInt(formData.probability),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };

      if (lead) {
        // Update
        await api.put(`/api/crm/leads/${lead.id}`, payload);
        toast.success('Lead atualizado com sucesso!');
      } else {
        // Create
        await api.post('/api/crm/leads', payload);
        toast.success('Lead criado com sucesso!');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(lead ? 'Erro ao atualizar lead' : 'Erro ao criar lead');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefone *"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />

            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Empresa"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />

            <Input
              label="Cargo"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Origem
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="site">Site</option>
                <option value="indicacao">Indicação</option>
                <option value="redes_sociais">Redes Sociais</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="new">Novo</option>
                <option value="contacted">Contatado</option>
                <option value="qualified">Qualificado</option>
                <option value="proposal">Proposta</option>
                <option value="negotiation">Negociação</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
              </select>
            </div>

            <Input
              label="Etapa (Pipeline)"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              placeholder="Ex: Prospecção, Apresentação..."
            />

            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />

            <Input
              label="Probabilidade (%)"
              type="number"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
            />

            <Input
              label="Data Prevista de Fechamento"
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (separadas por vírgula)
            </label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="cliente, vip, ativo..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Footer */}
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
              disabled={loading}
            >
              {loading ? 'Salvando...' : lead ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
