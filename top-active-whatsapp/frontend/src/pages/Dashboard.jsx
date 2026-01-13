import { useState, useEffect } from 'react';
import { MessageSquare, Users, TrendingUp, Send } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import api from '../lib/axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMessages: 0,
    activeUsers: 0,
    revenue: 0,
    deliveryRate: 0,
  });
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Mock data por enquanto (vamos implementar os endpoints depois)
      setStats({
        totalMessages: 1250,
        activeUsers: 342,
        revenue: 12500.50,
        deliveryRate: 94.5,
      });

      setRecentMessages([
        {
          id: 1,
          phone: '+55 11 99999-9999',
          message: 'Olá, tudo bem?',
          status: 'delivered',
          sentAt: '2026-01-09T15:30:00Z',
        },
        {
          id: 2,
          phone: '+55 11 88888-8888',
          message: 'Promoção especial hoje!',
          status: 'sent',
          sentAt: '2026-01-09T14:20:00Z',
        },
        {
          id: 3,
          phone: '+55 11 77777-7777',
          message: 'Confirmar pedido?',
          status: 'pending',
          sentAt: '2026-01-09T13:10:00Z',
        },
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status) => {
    const variants = {
      delivered: 'success',
      sent: 'primary',
      pending: 'warning',
      failed: 'danger',
    };
    const labels = {
      delivered: 'Entregue',
      sent: 'Enviado',
      pending: 'Pendente',
      failed: 'Falhou',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const statCards = [
    {
      title: 'Total de Mensagens',
      value: stats.totalMessages.toLocaleString('pt-BR'),
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
      change: '+12%',
    },
    {
      title: 'Usuários Ativos',
      value: stats.activeUsers.toLocaleString('pt-BR'),
      icon: Users,
      color: 'from-green-500 to-green-600',
      change: '+8%',
    },
    {
      title: 'Receita',
      value: `R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      change: '+23%',
    },
    {
      title: 'Taxa de Entrega',
      value: `${stats.deliveryRate}%`,
      icon: Send,
      color: 'from-orange-500 to-orange-600',
      change: '+2%',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <div className={`bg-gradient-to-br ${stat.color} p-4 -m-6 mb-4`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.title}
              </h3>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {stat.change}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Messages Table */}
      <Card title="Mensagens Recentes">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Carregando...
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.HeaderCell>Telefone</Table.HeaderCell>
              <Table.HeaderCell>Mensagem</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Data/Hora</Table.HeaderCell>
            </Table.Header>
            <Table.Body>
              {recentMessages.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan="4" className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Nenhuma mensagem encontrada
                  </Table.Cell>
                </Table.Row>
              ) : (
                recentMessages.map((message) => (
                  <Table.Row key={message.id}>
                    <Table.Cell className="font-medium">{message.phone}</Table.Cell>
                    <Table.Cell className="max-w-md truncate">{message.message}</Table.Cell>
                    <Table.Cell>{getStatusBadge(message.status)}</Table.Cell>
                    <Table.Cell>{formatDate(message.sentAt)}</Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
