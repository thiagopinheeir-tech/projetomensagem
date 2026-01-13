import { useState, useEffect } from 'react';
import { MessageSquare, Search, Eye, TrendingUp, Users, RefreshCw, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import ChatModal from '../components/ChatModal';

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    phone: '',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadConversations();
    loadStats();

    // Auto-refresh a cada 30 segundos
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadConversations();
        loadStats();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pagination.page, filters, autoRefresh]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await api.get(`/api/conversations?${params}`);
      
      if (response.data.success) {
        setConversations(response.data.conversations);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([k, v]) => k.startsWith('date') && v))
      });

      const response = await api.get(`/api/conversations/stats/summary?${params}`);
      
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewChat = (phone) => {
    setSelectedPhone(phone);
    setShowChatModal(true);
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length > 10) {
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
    }
    return phone;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return '';
    return message.length > maxLength 
      ? message.substring(0, maxLength) + '...'
      : message;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conversas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie todas as conversas do chatbot
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <RefreshCw size={20} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="primary"
            onClick={() => { loadConversations(); loadStats(); }}
            className="flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contatos Únicos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.uniqueContacts}
                </p>
              </div>
              <Users className="text-primary" size={32} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Mensagens</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalMessages}
                </p>
              </div>
              <MessageSquare className="text-primary" size={32} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Média por Contato</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.uniqueContacts > 0 
                    ? Math.round(stats.totalMessages / stats.uniqueContacts)
                    : 0}
                </p>
              </div>
              <TrendingUp className="text-primary" size={32} />
            </div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card title="Filtros" icon={Search}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Buscar por Telefone"
            value={filters.phone}
            onChange={(e) => handleFilterChange('phone', e.target.value)}
            placeholder="5511999999999"
            icon={Search}
          />

          <Input
            label="Data Inicial"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            icon={Calendar}
          />

          <Input
            label="Data Final"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            icon={Calendar}
          />
        </div>
      </Card>

      {/* Tabela de Conversas */}
      <Card title="Conversas Recentes" icon={MessageSquare}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Telefone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Última Mensagem
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Última Interação
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conv, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatPhone(conv.phone)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="max-w-xs">
                          <p className="truncate">{truncateMessage(conv.last_user_message)}</p>
                          {conv.last_ai_response && (
                            <p className="truncate text-xs text-gray-500 dark:text-gray-500 mt-1">
                              🤖 {truncateMessage(conv.last_ai_response, 40)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="default">{conv.total_messages}</Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(conv.last_interaction)}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewChat(conv.phone)}
                          className="flex items-center gap-2"
                        >
                          <Eye size={16} />
                          Ver Chat
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} conversas
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal de Chat */}
      {showChatModal && selectedPhone && (
        <ChatModal
          phone={selectedPhone}
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedPhone(null);
          }}
        />
      )}
    </div>
  );
};

export default Conversations;
