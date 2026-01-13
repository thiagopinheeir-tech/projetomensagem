import { useState } from 'react';
import { Plus, GripVertical, DollarSign, Calendar, User } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const PipelineKanban = ({ leads = [], onLeadUpdate }) => {
  // Etapas padrão do pipeline
  const [stages] = useState([
    { id: 'new', name: 'Novo', color: 'bg-gray-100 dark:bg-gray-800' },
    { id: 'contacted', name: 'Contatado', color: 'bg-blue-100 dark:bg-blue-900' },
    { id: 'qualified', name: 'Qualificado', color: 'bg-yellow-100 dark:bg-yellow-900' },
    { id: 'proposal', name: 'Proposta', color: 'bg-purple-100 dark:bg-purple-900' },
    { id: 'negotiation', name: 'Negociação', color: 'bg-orange-100 dark:bg-orange-900' },
    { id: 'won', name: 'Ganho', color: 'bg-green-100 dark:bg-green-900' },
    { id: 'lost', name: 'Perdido', color: 'bg-red-100 dark:bg-red-900' }
  ]);

  const handleDragStart = (e, lead) => {
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.setData('currentStage', lead.status);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const currentStage = e.dataTransfer.getData('currentStage');

    if (currentStage === newStage) return;

    try {
      const response = await api.put(`/api/crm/leads/${leadId}`, {
        status: newStage,
        stage: stages.find(s => s.id === newStage)?.name || newStage
      });

      if (response.data.success) {
        toast.success('Lead movido com sucesso!');
        onLeadUpdate?.();
      }
    } catch (error) {
      toast.error('Erro ao mover lead');
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getLeadsByStage = (stageId) => {
    return leads.filter(lead => lead.status === stageId);
  };

  const getStageTotal = (stageId) => {
    const stageLeads = getLeadsByStage(stageId);
    return stageLeads.reduce((sum, lead) => sum + (parseFloat(lead.value) || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline de Vendas</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Arraste os leads entre as colunas para atualizar o status
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const stageTotal = getStageTotal(stage.id);

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className={`${stage.color} border-2 border-transparent`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {stage.name}
                    </h3>
                    <Badge variant="default">{stageLeads.length}</Badge>
                  </div>
                  {stageTotal > 0 && (
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(stageTotal)}
                    </p>
                  )}
                </div>

                <div className="p-2 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-move"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {lead.name || 'Sem nome'}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {lead.phone}
                            </p>
                          </div>
                          <GripVertical
                            size={16}
                            className="text-gray-400 flex-shrink-0 ml-2"
                          />
                        </div>

                        {lead.company && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <User size={12} />
                            {lead.company}
                          </div>
                        )}

                        {lead.value && (
                          <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                            <DollarSign size={12} />
                            {formatCurrency(lead.value)}
                          </div>
                        )}

                        {lead.probability > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Probabilidade</span>
                              <span className="font-medium">{lead.probability}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${lead.probability}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {lead.expected_close_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar size={12} />
                            {formatDate(lead.expected_close_date)}
                          </div>
                        )}

                        {lead.priority && lead.priority !== 'medium' && (
                          <div className="mt-2">
                            <Badge
                              variant={
                                lead.priority === 'high' || lead.priority === 'urgent'
                                  ? 'danger'
                                  : 'default'
                              }
                              className="text-xs"
                            >
                              {lead.priority}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineKanban;
