import { useState, useEffect } from 'react';
import { MessageSquare, Users, TrendingUp, Send } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import WhatsAppAuth from '../components/WhatsAppAuth';
import RecentConversations from '../components/RecentConversations';
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import api from '../lib/axios';

const Dashboard = () => {
  const { user } = useAuth(); // Get user from auth context
  const [stats, setStats] = useState({
    totalMessages: 0,
    activeUsers: 0,
    revenue: 0,
    deliveryRate: 0,
  });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    // Obter URL do backend (usar variável de ambiente ou localhost)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const WS_PORT = import.meta.env.VITE_WS_PORT || '5001';
    
    // Construir URL do WebSocket
    let wsUrl;
    if (API_URL.includes('localhost')) {
      // Local: usar porta separada para WebSocket
      wsUrl = `ws://localhost:${WS_PORT}?user=${user.id}`;
    } else {
      // Produção (Railway): WebSocket está na mesma porta do Express, no path /ws
      const url = new URL(API_URL);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      // WebSocket está anexado ao servidor HTTP na mesma porta, path /ws
      wsUrl = `${wsProtocol}//${url.hostname}${url.port ? ':' + url.port : ''}/ws?user=${user.id}`;
    }
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔌 WebSocket conectado!');
      setLoading(false);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('📥 Mensagem recebida:', message);

      switch (message.type) {
        case 'init':
          setConversations(message.conversations || []);
          break;
        case 'new_conversation':
          setConversations(prev => [message.data, ...prev]);
          break;
        case 'qr':
          console.log('🔍 QR code recebido:', message.data.qr);
          setQrCode(message.data.qr);
          break;
        case 'status':
          // Poderíamos usar isso para mostrar o status da conexão do WhatsApp
          console.log('Status do WhatsApp:', message.data.status);
          if (message.data.status === 'connected') {
            setQrCode(null); // Limpa o QR code quando conectado
          }
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado.');
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    // Cleanup
    return () => {
      ws.close();
    };
  }, [user]);

  const statCards = [
    {
      title: 'Total de Mensagens',
      value: stats.totalMessages.toLocaleString('pt-BR'),
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
      change: '+12%',
    },
    {
      title: 'Conversas Ativas',
      value: conversations.length,
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
        <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral do seu negócio em tempo real</p>
      </div>

      {/* WhatsApp Auth Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WhatsAppAuth qrCode={qrCode} />
        <RecentConversations conversations={conversations} loading={loading} />
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
                <span className="text-sm font-semibold text-green-500">{stat.change}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
