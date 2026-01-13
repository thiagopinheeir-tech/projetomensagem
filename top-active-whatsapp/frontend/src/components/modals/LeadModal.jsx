import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

const LeadModal = ({ isOpen, onClose, lead = null, onSuccess }) => {
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
        stage: '',
        value: '',
        probability: 0,
        expected_close_date: '',
        tags: '',
        notes: '',
        priority: 'medium'
      });
    }
  }, [lead, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : null,
        probability: formData.probability ? parseInt(formData.probability) : 0,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };

      if (lead) {
        // Update
        const response = await api.put(`/api/crm/leads/${lead.id}`, payload);
        if (response.data.success) {
          toast.success('Lead atualizado com sucesso!');
          onSuccess?.();
          onClose();
        }
      } else {
        // Create
        const response = await api.post('/api/crm/leads', payload);
        if (response.data.success) {
          toast.success('Lead criado com sucesso!');
          onSuccess?.();
          onClose();
        }
      }
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
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
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
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="5511999999999"
              required
            />

            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nome do contato"
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@exemplo.com"
            />

            <Input
              label="Empresa"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Nome da empresa"
            />

            <Input
              label="Cargo"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Cargo/posição"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Origem
              </label>
              <select
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="site">Site</option>
                <option value="indicacao">Indicação</option>
                <option value="email">Email</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
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
              label="Etapa"
              value={formData.stage}
              onChange={(e) => handleChange('stage', e.target.value)}
              placeholder="Etapa no pipeline"
            />

            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="0.00"
            />

            <Input
              label="Probabilidade (%)"
              type="number"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) => handleChange('probability', e.target.value)}
              placeholder="0"
            />

            <Input
              label="Data Prevista de Fechamento"
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => handleChange('expected_close_date', e.target.value)}
            />

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
              label="Tags (separadas por vírgula)"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Observações sobre o lead..."
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
              disabled={loading || !formData.phone}
              className="flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : lead ? 'Atualizar' : 'Criar Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
