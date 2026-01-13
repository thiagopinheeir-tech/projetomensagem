import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Calendar, CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleOAuthUrl, setGoogleOAuthUrl] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Verificar se OpenAI API key está configurada
      const openaiResponse = await api.get('/api/api-keys/openai');
      setOpenaiConfigured(openaiResponse.data.configured);
      
      // Verificar status do Google Calendar
      await handleRefreshGoogleStatus();
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setGoogleConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshGoogleStatus = async (showToast = false) => {
    setGoogleLoading(true);
    try {
      const googleResponse = await api.get('/api/google/status');
      console.log('🔄 Google status atualizado:', googleResponse.data);
      const isConnected = googleResponse.data?.success && googleResponse.data?.connected === true;
      setGoogleConnected(isConnected);
      if (showToast) {
        toast.success(isConnected ? 'Google Calendar conectado!' : 'Google Calendar não conectado');
      }
      if (!isConnected) {
        console.log('⚠️ Google não conectado. Detalhes:', {
          hasProfile: googleResponse.data?.hasProfile,
          hasTokenRow: googleResponse.data?.hasTokenRow,
          profileId: googleResponse.data?.profileId
        });
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status do Google:', error);
      setGoogleConnected(false);
      if (showToast) {
        toast.error('Erro ao verificar status do Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveOpenAIKey = async (e) => {
    e.preventDefault();
    if (!openaiApiKey.trim()) {
      toast.error('Por favor, informe a API Key da OpenAI');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/api-keys', {
        provider: 'openai',
        apiKey: openaiApiKey.trim()
      });

      toast.success('API Key da OpenAI salva com sucesso!');
      setOpenaiApiKey('');
      setOpenaiConfigured(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar API Key');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const response = await api.get('/api/google/oauth/start');
      if (response.data.success && response.data.url) {
        setGoogleOAuthUrl(response.data.url);
        // Abrir em nova janela
        window.open(response.data.url, 'google-oauth', 'width=600,height=700');
        
        // Verificar status após alguns segundos
        setTimeout(() => {
          handleRefreshGoogleStatus();
        }, 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao iniciar conexão com Google');
      console.error(error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Tem certeza que deseja remover as credenciais do Google? Você precisará conectar novamente para usar o Google Calendar.')) {
      return;
    }

    setGoogleLoading(true);
    try {
      await api.delete('/api/google/disconnect');
      toast.success('Credenciais do Google removidas com sucesso!');
      setGoogleConnected(false);
      setGoogleOAuthUrl(null);
      // Recarregar status após remover
      await loadSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao remover credenciais do Google');
      console.error(error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRemoveOpenAIKey = async () => {
    if (!confirm('Tem certeza que deseja remover a API Key da OpenAI?')) {
      return;
    }

    try {
      await api.delete('/api/api-keys/openai');
      toast.success('API Key removida com sucesso');
      setOpenaiConfigured(false);
    } catch (error) {
      toast.error('Erro ao remover API Key');
      console.error(error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas integrações e credenciais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAI API Key */}
        <Card title="OpenAI API Key" icon={Key}>
          <div className="space-y-4">
            {openaiConfigured ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      API Key configurada
                    </span>
                  </div>
                  <Badge variant="success">Ativo</Badge>
                </div>
                <Button
                  variant="danger"
                  onClick={handleRemoveOpenAIKey}
                  className="w-full"
                >
                  Remover API Key
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSaveOpenAIKey} className="space-y-4">
                <div>
                  <Input
                    label="OpenAI API Key"
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    required
                    helpText="Sua chave de API da OpenAI. Não será exibida após salvar."
                  />
                </div>
                <Button
                  type="submit"
                  loading={saving}
                  className="w-full"
                >
                  Salvar API Key
                </Button>
              </form>
            )}
          </div>
        </Card>

        {/* Google Calendar */}
        <Card title="Google Calendar" icon={Calendar}>
          <div className="space-y-4">
            {/* Botão de atualizar status - sempre visível */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleRefreshGoogleStatus(true)}
                loading={googleLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar Status
              </Button>
            </div>

            {googleConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Google Calendar conectado
                    </span>
                  </div>
                  <Badge variant="success">Conectado</Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Seus agendamentos serão sincronizados automaticamente com o Google Calendar.
                </div>
                <Button
                  onClick={handleDisconnectGoogle}
                  loading={googleLoading}
                  variant="danger"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Remover Credenciais do Google
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Google Calendar não conectado
                    </span>
                  </div>
                  <Badge variant="warning">Desconectado</Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Conecte sua conta do Google para sincronizar agendamentos automaticamente.
                </div>
                <Button
                  onClick={handleConnectGoogle}
                  loading={googleLoading}
                  className="w-full"
                >
                  Conectar Google Calendar
                </Button>
                {/* Botão de remover também quando desconectado (caso tenha dados residuais) */}
                <Button
                  onClick={handleDisconnectGoogle}
                  loading={googleLoading}
                  variant="danger"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Limpar Credenciais (se houver)
                </Button>
                {googleOAuthUrl && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Se a janela não abriu,{' '}
                    <a
                      href={googleOAuthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      clique aqui
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Informações adicionais */}
      <Card title="Informações">
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <strong className="text-gray-900 dark:text-white">OpenAI API Key:</strong> Necessária para o chatbot IA funcionar. 
            Você pode obter uma chave em{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              platform.openai.com
            </a>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">Google Calendar:</strong> Conecte sua conta do Google para 
            sincronizar agendamentos automaticamente. Os eventos serão criados no seu calendário principal.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
