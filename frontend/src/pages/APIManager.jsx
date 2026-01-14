import { useState, useEffect } from 'react';
import { Key, Save, AlertCircle, Eye, EyeOff, RefreshCw, BookOpen, Calendar, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SetupWizard from '../components/SetupWizard';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const APIManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showSchedulerKey, setShowSchedulerKey] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [config, setConfig] = useState({
    openai_key: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 300,
    // Prompt do chatbot é gerenciado por Perfil/ChatbotSettings.
  });
  const [schedulerConfig, setSchedulerConfig] = useState({
    api_url: '',
    api_key: '',
    enabled: false,
    barbearia_phone: ''
  });
  const [keyPreview, setKeyPreview] = useState('');

  useEffect(() => {
    loadConfig();
    loadSchedulerConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/config/ai');

      if (response.data.success) {
        const cfg = response.data.config;
        setConfig({
          openai_key: '',
          model: cfg.model || 'gpt-4o-mini',
          temperature: cfg.temperature || 0.7,
          max_tokens: cfg.max_tokens || 300
        });
        setKeyPreview(cfg.key_preview || '');
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...config,
        // Só enviar chave se foi modificada
        ...(config.openai_key.trim() ? { openai_key: config.openai_key.trim() } : {})
      };

      const response = await api.put('/api/config/ai', payload);

      if (response.data.success) {
        toast.success('Configuração OpenAI salva com sucesso!');
        
        // Limpar campo de chave após salvar
        setConfig(prev => ({ ...prev, openai_key: '' }));
        
        // Recarregar para atualizar preview
        setTimeout(loadConfig, 1000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const loadSchedulerConfig = async () => {
    try {
      const response = await api.get('/api/config/scheduler');
      if (response.data.success) {
        setSchedulerConfig({
          api_url: response.data.config.api_url || '',
          api_key: '',
          enabled: response.data.config.enabled || false,
          barbearia_phone: response.data.config.barbearia_phone || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do scheduler:', error);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSchedulerChange = (field, value) => {
    setSchedulerConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveScheduler = async (e) => {
    e.preventDefault();
    setSavingScheduler(true);

    try {
      const response = await api.put('/api/config/scheduler', {
        api_url: schedulerConfig.api_url,
        api_key: schedulerConfig.api_key || undefined,
        enabled: schedulerConfig.enabled,
        barbearia_phone: schedulerConfig.barbearia_phone
      });

      if (response.data.success) {
        toast.success('Configuração do Scheduler salva com sucesso!');
        setTimeout(loadSchedulerConfig, 500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração do scheduler');
      console.error(error);
    } finally {
      setSavingScheduler(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chaves e Integrações</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie suas chaves de API e integrações
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2"
          >
            <BookOpen size={18} />
            Guia de Configuração
          </Button>
          <Button
            variant="secondary"
            onClick={loadConfig}
            className="flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Recarregar
          </Button>
        </div>
      </div>

      {showWizard && (
        <SetupWizard onClose={() => setShowWizard(false)} />
      )}

      {/* Alert */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Segurança das Chaves
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Suas chaves são criptografadas e armazenadas de forma segura. 
            Apenas você pode visualizar e modificar suas configurações.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card OpenAI */}
        <Card title="OpenAI" icon={Key}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OpenAI API Key
              </label>
              
              {keyPreview && !config.openai_key && (
                <div className="mb-2">
                  <Badge variant="success" className="flex items-center gap-2 w-fit">
                    <Key size={14} />
                    Chave configurada: {keyPreview}
                  </Badge>
                </div>
              )}

              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={config.openai_key}
                  onChange={(e) => handleChange('openai_key', e.target.value)}
                  placeholder={keyPreview ? 'Deixe em branco para manter a chave atual' : 'sk-proj-...'}
                  icon={Key}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Deixe em branco para manter a chave atual. 
                Nova chave: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Obter em platform.openai.com</a>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modelo GPT
                </label>
                <select
                  value={config.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Rápido e Econômico)</option>
                  <option value="gpt-4o">GPT-4o (Mais Capaz)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legado)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Temperatura ({config.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  0 = Focado e Determinístico | 1 = Criativo e Variado
                </p>
              </div>
            </div>

            <div>
              <Input
                label="Máximo de Tokens"
                type="number"
                value={config.max_tokens}
                onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
                min={50}
                max={2000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Número máximo de tokens na resposta (50-2000)
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={loadConfig}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex items-center gap-2"
            disabled={saving}
          >
            <Save size={20} />
            {saving ? 'Salvando...' : 'Salvar Configuração OpenAI'}
          </Button>
        </div>
      </form>

      {/* Card Premium Shears Scheduler */}
      <form onSubmit={handleSaveScheduler} className="space-y-6">
        <Card title="Sistema de Agendamento Premium Shears" icon={Calendar}>
          <div className="space-y-4">
            {schedulerConfig.api_url && (
              <div className="mb-2">
                <Badge variant="success" className="flex items-center gap-2 w-fit">
                  <CheckCircle size={14} />
                  Sistema configurado
                </Badge>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL da API do Premium Shears
              </label>
              <Input
                type="url"
                value={schedulerConfig.api_url}
                onChange={(e) => handleSchedulerChange('api_url', e.target.value)}
                placeholder="https://seu-projeto.supabase.co/functions/v1/api"
                icon={Calendar}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL completa da API do Premium Shears Scheduler
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key (Opcional)
              </label>
              <div className="relative">
                <Input
                  type={showSchedulerKey ? 'text' : 'password'}
                  value={schedulerConfig.api_key}
                  onChange={(e) => handleSchedulerChange('api_key', e.target.value)}
                  placeholder="Deixe em branco para manter a chave atual"
                  icon={Key}
                />
                <button
                  type="button"
                  onClick={() => setShowSchedulerKey(!showSchedulerKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showSchedulerKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número do WhatsApp da Barbearia
              </label>
              <Input
                type="tel"
                value={schedulerConfig.barbearia_phone}
                onChange={(e) => handleSchedulerChange('barbearia_phone', e.target.value)}
                placeholder="5511999999999"
                icon={Calendar}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Número que receberá notificações de agendamentos (formato: 5511999999999)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scheduler_enabled"
                checked={schedulerConfig.enabled}
                onChange={(e) => handleSchedulerChange('enabled', e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="scheduler_enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ativar sistema de agendamento
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                className="flex items-center gap-2"
                disabled={savingScheduler}
              >
                <Save size={20} />
                {savingScheduler ? 'Salvando...' : 'Salvar Configuração do Scheduler'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default APIManager;
