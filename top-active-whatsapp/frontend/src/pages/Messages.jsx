import { useState, useEffect } from 'react';
import { Send, MessageSquare, Wifi, WifiOff, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const Messages = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    ready: false,
    hasQRCode: false
  });
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    checkWhatsAppStatus();
    loadMessageHistory();
    
    // Verificar status a cada 5 segundos
    const statusInterval = setInterval(checkWhatsAppStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const checkWhatsAppStatus = async () => {
    try {
      const response = await api.get('/api/messages/status');
      setWhatsappStatus({
        connected: response.data.connected,
        ready: response.data.ready,
        hasQRCode: response.data.hasQRCode
      });
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setWhatsappStatus({
        connected: false,
        ready: false,
        hasQRCode: false
      });
    }
  };

  const loadMessageHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get('/api/messages/history?limit=10');
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de mensagens');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phone || !message) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!whatsappStatus.ready) {
      toast.error('WhatsApp não está conectado. Escaneie o QR code primeiro.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/messages/send-simple', {
        phone: phone.replace(/\D/g, ''), // Remove caracteres não numéricos
        message
      });

      if (response.data.success) {
        toast.success('Mensagem enviada com sucesso!');
        setPhone('');
        setMessage('');
        loadMessageHistory(); // Recarregar histórico
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao enviar mensagem';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phoneNumber;
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
      sent: 'success',
      delivered: 'success',
      pending: 'warning',
      failed: 'danger',
    };
    const labels = {
      sent: 'Enviado',
      delivered: 'Entregue',
      pending: 'Pendente',
      failed: 'Falhou',
    };
    
    const Icon = status === 'sent' || status === 'delivered' ? CheckCircle2 : 
                 status === 'failed' ? XCircle : Clock;

    return (
      <Badge variant={variants[status] || 'default'} className="flex items-center gap-1">
        <Icon size={12} />
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mensagens WhatsApp</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Envie mensagens para seus contatos</p>
        </div>
        
        {/* Status WhatsApp */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {whatsappStatus.ready ? (
              <>
                <Wifi size={20} className="text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Conectado</span>
              </>
            ) : (
              <>
                <WifiOff size={20} className="text-red-500" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Desconectado</span>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkWhatsAppStatus}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alerta se desconectado */}
      {!whatsappStatus.ready && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <WifiOff className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                WhatsApp não está conectado
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Escaneie o QR code no terminal do backend para conectar o WhatsApp. 
                O QR code aparece automaticamente quando você inicia o servidor.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Nova Mensagem" icon={MessageSquare}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Número do WhatsApp"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999999999 (com DDD e código do país)"
                required
                disabled={!whatsappStatus.ready || loading}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensagem
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  required
                  rows={8}
                  disabled={!whatsappStatus.ready || loading}
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {message.length} caracteres
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                disabled={loading || !whatsappStatus.ready}
              >
                <Send size={20} />
                {loading ? 'Enviando...' : 'Enviar Mensagem WhatsApp'}
              </Button>
            </form>
          </Card>

          {/* Histórico de mensagens */}
          <Card title="Mensagens Recentes">
            {loadingHistory ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                Carregando...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma mensagem enviada ainda
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
                  {messages.map((msg) => (
                    <Table.Row key={msg.id}>
                      <Table.Cell className="font-medium">{formatPhone(msg.phone)}</Table.Cell>
                      <Table.Cell className="max-w-md truncate">{msg.message}</Table.Cell>
                      <Table.Cell>{getStatusBadge(msg.status)}</Table.Cell>
                      <Table.Cell className="text-xs">{formatDate(msg.created_at)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Card>
        </div>

        {/* Sidebar com dicas */}
        <div className="space-y-6">
          <Card title="Dicas">
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Use o formato: 5511999999999 (código do país + DDD + número)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>O WhatsApp precisa estar conectado (verifique o status acima)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Escaneie o QR code no terminal do backend na primeira vez</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Mensagens são salvas automaticamente no histórico</span>
              </li>
            </ul>
          </Card>

          <Card title="Templates Rápidos">
            <div className="space-y-2">
              <button
                onClick={() => setMessage('Olá! Como posso ajudar você hoje?')}
                disabled={!whatsappStatus.ready}
                className="w-full text-left px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Saudação
              </button>
              <button
                onClick={() => setMessage('Sua mensagem foi recebida! Em breve retornaremos.')}
                disabled={!whatsappStatus.ready}
                className="w-full text-left px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmação
              </button>
              <button
                onClick={() => setMessage('Obrigado pelo contato!')}
                disabled={!whatsappStatus.ready}
                className="w-full text-left px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agradecimento
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
