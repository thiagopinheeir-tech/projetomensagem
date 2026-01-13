import { useState, useEffect } from 'react';
import { QrCode, LogOut, RefreshCw } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import api from '../lib/axios';

export default function WhatsAppAuth({ qrCode: qrCodeFromProp }) {
  const [qrCode, setQrCode] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    checkAuthStatus();
    // Polling a cada 5 segundos para verificar status
    const interval = setInterval(checkAuthStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (qrCodeFromProp) {
      setQrCode(qrCodeFromProp);
      setStatus('Escaneie o QR Code com seu WhatsApp');
    }
  }, [qrCodeFromProp]);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/whatsapp/status');
      if (response.data.success) {
        setIsAuthenticated(response.data.isReady || response.data.status === 'connected');
        setPhoneNumber(response.data.phoneNumber || '');
        setStatus(response.data.status || '');
        if (response.data.isReady || response.data.status === 'connected') {
          setQrCode(null); // Limpa o QR code se já estiver autenticado
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setIsAuthenticated(false);
      setStatus('Desconectado');
    }
  };

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setStatus('Iniciando conexão...');
      const response = await api.post('/api/whatsapp/connect');
      setStatus('Aguardando QR Code...');
      // O QR code virá pelo WebSocket ou pode ser obtido via /api/whatsapp/qr
      // Buscar QR code após alguns segundos
      setTimeout(async () => {
        try {
          const qrResponse = await api.get('/api/whatsapp/qr');
          if (qrResponse.data.success && qrResponse.data.qrCode) {
            setQrCode(qrResponse.data.qrCode);
            setStatus('Escaneie o QR Code com seu WhatsApp');
          }
        } catch (qrError) {
          console.error('Erro ao buscar QR code:', qrError);
        }
      }, 2000);
    } catch (error) {
      setStatus('Erro ao conectar: ' + (error.response?.data?.message || error.message));
      console.error('❌ Erro ao conectar:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await api.post('/api/whatsapp/logout');
      setIsAuthenticated(false);
      setPhoneNumber('');
      setQrCode(null);
      setStatus('Desconectado com sucesso');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('Erro ao desconectar: ' + error.message);
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <QrCode className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">WhatsApp Connect</h2>
        </div>
        {isAuthenticated && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            ✓ Conectado
          </span>
        )}
      </div>

      {isAuthenticated ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <strong>Número:</strong> {phoneNumber}
            </p>
            <p className="text-sm text-green-700">
              <strong>Status:</strong> {status || 'Conectado'}
            </p>
          </div>
          <Button
            onClick={logout}
            disabled={loading}
            variant="danger"
            className="w-full"
          >
            <LogOut className="w-4 h-4" />
            Desconectar WhatsApp
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {qrCode && (
            <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <img src={qrCode} alt="QR Code do WhatsApp" className="mx-auto w-48 h-48" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{status}</p>
            </div>
          )}

          <Button
            onClick={generateQRCode}
            disabled={loading}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Gerando...' : (qrCode ? 'Atualizar QR Code' : 'Conectar WhatsApp')}
          </Button>
        </div>
      )}
    </Card>
  );
}
