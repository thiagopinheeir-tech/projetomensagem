import { useState, useEffect } from 'react';
import { 
  Users, Briefcase, CheckSquare, FileText, TrendingUp, 
  Plus, Filter, Search, Calendar, DollarSign, Target, Columns, Edit, Trash2
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import LeadModal from '../components/modals/LeadModal';
import TaskModal from '../components/modals/TaskModal';
import NoteModal from '../components/modals/NoteModal';
import PipelineKanban from '../components/PipelineKanban';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const CRM = () => {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    loadStats();
    loadLeads();
    loadTasks();
    loadNotes();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/crm/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/crm/leads');
      if (response.data.success) {
        setLeads(response.data.leads || []);
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get('/api/crm/tasks');
      if (response.data.success) {
        setTasks(response.data.tasks || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await api.get('/api/crm/notes');
      if (response.data.success) {
        setNotes(response.data.notes || []);
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
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
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadgeVariant = (status) => {
    const variants = {
      new: 'default',
      contacted: 'secondary',
      qualified: 'primary',
      proposal: 'primary',
      negotiation: 'primary',
      won: 'success',
      lost: 'danger',
      pending: 'default',
      completed: 'success',
      cancelled: 'danger'
    };
    return variants[status] || 'default';
  };

  if (loading && !stats) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CRM</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus leads, tarefas e oportunidades
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab !== 'pipeline' && (
            <Button
              variant="primary"
              onClick={() => {
                if (activeTab === 'leads') {
                  setSelectedLead(null);
                  setShowLeadModal(true);
                } else if (activeTab === 'tasks') {
                  setSelectedTask(null);
                  setShowTaskModal(true);
                } else if (activeTab === 'notes') {
                  setSelectedNote(null);
                  setShowNoteModal(true);
                }
              }}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              Adicionar {activeTab === 'leads' ? 'Lead' : activeTab === 'tasks' ? 'Tarefa' : 'Nota'}
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalLeads || 0}
                </p>
              </div>
              <Users className="text-primary" size={32} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tarefas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTasks || 0}
                </p>
              </div>
              <CheckSquare className="text-primary" size={32} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalValue || 0)}
                </p>
              </div>
              <DollarSign className="text-primary" size={32} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalLeads > 0 
                    ? Math.round((stats.leadsByStatus?.won || 0) / stats.totalLeads * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="text-primary" size={32} />
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pipeline'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Columns size={18} />
            Pipeline
          </div>
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'leads'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase size={18} />
            Leads ({leads.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckSquare size={18} />
            Tarefas ({tasks.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'notes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Notas ({notes.length})
          </div>
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'pipeline' && (
        <PipelineKanban
          leads={leads}
          onLeadUpdate={() => {
            loadLeads();
            loadStats();
          }}
        />
      )}

      {activeTab === 'leads' && (
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Nenhum lead encontrado</p>
              <Button
                variant="primary"
                onClick={() => setShowLeadModal(true)}
                className="mt-4"
              >
                Criar Primeiro Lead
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Telefone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Etapa
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Criado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {lead.name || 'Sem nome'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lead.phone}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lead.stage || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(lead.value)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowLeadModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              if (window.confirm('Tem certeza que deseja deletar este lead?')) {
                                try {
                                  const response = await api.delete(`/api/crm/leads/${lead.id}`);
                                  if (response.data.success) {
                                    toast.success('Lead deletado com sucesso!');
                                    loadLeads();
                                  }
                                } catch (error) {
                                  toast.error('Erro ao deletar lead');
                                }
                              }
                            }}
                            className="flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Nenhuma tarefa encontrada</p>
              <Button
                variant="primary"
                onClick={() => setShowTaskModal(true)}
                className="mt-4"
              >
                Criar Primeira Tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
                      {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {task.title}
                            </h3>
                            <Badge variant={getStatusBadgeVariant(task.status)}>
                              {task.status}
                            </Badge>
                            {task.priority && (
                              <Badge variant={task.priority === 'high' || task.priority === 'urgent' ? 'danger' : 'default'}>
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                {formatDate(task.due_date)}
                              </div>
                            )}
                            <span>Tipo: {task.type}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setShowTaskModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Edit size={14} />
                          </Button>
                          {task.status !== 'completed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const response = await api.put(`/api/crm/tasks/${task.id}`, {
                                    status: 'completed'
                                  });
                                  if (response.data.success) {
                                    toast.success('Tarefa concluída!');
                                    loadTasks();
                                    loadStats();
                                  }
                                } catch (error) {
                                  toast.error('Erro ao atualizar tarefa');
                                }
                              }}
                              className="flex items-center gap-1"
                            >
                              <CheckSquare size={14} />
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card>
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Nenhuma nota encontrada</p>
              <Button
                variant="primary"
                onClick={() => setShowNoteModal(true)}
                className="mt-4"
              >
                Criar Primeira Nota
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {note.title || 'Sem título'}
                    </h3>
                    <div className="flex gap-2 items-center">
                      {note.is_important && (
                        <Badge variant="danger">Importante</Badge>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedNote(note);
                          setShowNoteModal(true);
                        }}
                        className="flex items-center gap-1"
                      >
                        <Edit size={14} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Tipo: {note.type}</span>
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      <LeadModal
        isOpen={showLeadModal}
        onClose={() => {
          setShowLeadModal(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onSuccess={() => {
          loadLeads();
          loadStats();
        }}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        leadId={selectedLead?.id}
        onSuccess={() => {
          loadTasks();
          loadStats();
        }}
      />

      <NoteModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setSelectedNote(null);
        }}
        note={selectedNote}
        leadId={selectedLead?.id}
        onSuccess={() => {
          loadNotes();
        }}
      />
    </div>
  );
};

export default CRM;
