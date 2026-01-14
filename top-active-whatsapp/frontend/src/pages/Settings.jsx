import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, CheckCircle, XCircle, Loader } from 'lucide-react';
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
  // Google Calendar removido

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Verificar se OpenAI API key está configurada
      const openaiResponse = await api.get('/api/api-keys/openai');
      setOpenaiConfigured(openaiResponse.data.configured);
      
      // Google Calendar removido
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      // Google Calendar removido
    } finally {
      setLoading(false);
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

        {/* Google Calendar removido - usar Premium Shears Scheduler */}
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
            <strong className="text-gray-900 dark:text-white">Sistema de Agendamento:</strong> Use o Premium Shears Scheduler 
            configurado em "Chaves e Integrações" para gerenciar seus agendamentos.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
