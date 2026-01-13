import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, XCircle, RefreshCw, Loader } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const WhatsAppConnection = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadStatus();
    // Verificar status a cada 5 segundos
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get('/api/whatsapp/status');
      if (response.data.success) {
        setStatus(response.data);
        setPhoneNumber(response.data.phoneNumber || '');
        
        // Se está inicializando, buscar QR code
        if (response.data.status === 'initializing' && !qrCode) {
          loadQRCode();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQRCode = async () => {
    try {
      const response = await api.get('/api/whatsapp/qr');
      if (response.data.success && response.data.qrCode) {
        setQrCode(response.data.qrCode);
      }
    } catch (error) {
      console.error('Erro ao carregar QR code:', error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await api.post('/api/whatsapp/connect');
      toast.success('Conexão WhatsApp iniciada! Escaneie o QR code quando aparecer.');
      
      // Aguardar um pouco e carregar QR code
      setTimeout(() => {
        loadQRCode();
        loadStatus();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao iniciar conexão');
      console.error(error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
      return;
    }

    try {
      await api.post('/api/whatsapp/logout');
      toast.success('WhatsApp desconectado com sucesso');
      setStatus(null);
      setQrCode(null);
      setPhoneNumber('');
    } catch (error) {
      toast.error('Erro ao desconectar WhatsApp');
      console.error(error);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    switch (status.status) {
      case 'ready':
        return <Badge variant="success">Conectado</Badge>;
      case 'initializing':
        return <Badge variant="warning">Conectando...</Badge>;
      case 'disconnected':
        return <Badge variant="danger">Desconectado</Badge>;
      default:
        return <Badge variant="default">{status.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conexão WhatsApp</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Conecte seu WhatsApp para começar a receber mensagens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status da Conexão */}
        <Card title="Status da Conexão" icon={MessageCircle}>
          <div className="space-y-4">
            {status ? (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {status.status === 'ready' ? (
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : status.status === 'initializing' ? (
                      <Loader className="w-6 h-6 text-yellow-600 dark:text-yellow-400 animate-spin" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {status.status === 'ready' ? 'Conectado' : 
                         status.status === 'initializing' ? 'Conectando...' : 
                         'Desconectado'}
                      </div>
                      {phoneNumber && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge()}
                </div>

                {status.status === 'ready' ? (
                  <Button
                    variant="danger"
                    onClick={handleDisconnect}
                    className="w-full"
                  >
                    Desconectar WhatsApp
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnect}
                    loading={connecting}
                    className="w-full"
                  >
                    {status.status === 'initializing' ? 'Reconectar' : 'Conectar WhatsApp'}
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Não conectado
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Conecte seu WhatsApp para começar
                      </div>
                    </div>
                  </div>
                  <Badge variant="default">Desconectado</Badge>
                </div>
                <Button
                  onClick={handleConnect}
                  loading={connecting}
                  className="w-full"
                >
                  Conectar WhatsApp
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* QR Code */}
        <Card title="QR Code de Conexão">
          {qrCode || status?.status === 'initializing' ? (
            <div className="space-y-4">
              {qrCode ? (
                <>
                  <div className="flex justify-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="max-w-full h-auto"
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    <p className="font-medium mb-2">Como conectar:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Toque em Menu ou Configurações</li>
                      <li>Selecione "Dispositivos conectados"</li>
                      <li>Toque em "Conectar um dispositivo"</li>
                      <li>Escaneie este QR code</li>
                    </ol>
                  </div>
                  <Button
                    onClick={loadQRCode}
                    variant="secondary"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar QR Code
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Gerando QR code...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Clique em "Conectar WhatsApp" para gerar o QR code</p>
            </div>
          )}
        </Card>
      </div>

      {/* Instruções */}
      <Card title="Instruções">
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <strong className="text-gray-900 dark:text-white">Primeira conexão:</strong> Escaneie o QR code com seu WhatsApp. 
            A conexão será mantida mesmo após fechar o navegador.
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">Segurança:</strong> Sua sessão WhatsApp é isolada e segura. 
            Apenas você tem acesso às suas mensagens.
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">Desconexão:</strong> Se desconectar, você precisará escanear 
            o QR code novamente para reconectar.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WhatsAppConnection;
