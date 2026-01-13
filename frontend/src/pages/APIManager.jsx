import { useState, useEffect } from 'react';
import { Key, Save, AlertCircle, Eye, EyeOff, RefreshCw, Calendar, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const APIManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [config, setConfig] = useState({
    openai_key: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 300,
    // Prompt do chatbot é gerenciado por Perfil/ChatbotSettings.
  });
  const [keyPreview, setKeyPreview] = useState('');

  const [activeProfileId, setActiveProfileId] = useState('');
  const [googleOAuth, setGoogleOAuth] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  });

  const [googleStatus, setGoogleStatus] = useState({ connected: false, calendarIdDefault: null });
  const [googleCalendars, setGoogleCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  
  const [premiumShearsConfig, setPremiumShearsConfig] = useState({
    api_url: '',
    api_key: '',
    enabled: false,
    api_url_preview: null,
    has_key: false
  });
  const [showPremiumShearsKey, setShowPremiumShearsKey] = useState(false);
  const [loadingScheduler, setLoadingScheduler] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.allSettled([loadConfig(), loadActiveProfileAndGoogle(), loadGoogleStatus(), loadSchedulerConfig()]);
    })();
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

  const loadActiveProfileAndGoogle = async () => {
    try {
      const profilesResp = await api.get('/api/chatbot/profiles');
      const list = profilesResp.data?.profiles || [];
      const active = list.find(p => p.is_active);
      if (!active?.id) {
        setActiveProfileId('');
        return;
      }
      setActiveProfileId(active.id);

      const profileResp = await api.get(`/api/chatbot/profiles/${active.id}`);
      const p = profileResp.data?.profile;
      if (profileResp.data?.success && p) {
        setGoogleOAuth(prev => ({
          ...prev,
          clientId: p.google_oauth_client_id || '',
          redirectUri: p.google_oauth_redirect_uri || ''
          // secret nunca volta do backend; usuário redefine se quiser
        }));
      }
    } catch (error) {
      // silencioso: não travar a tela de API se chatbot/perfis não estiverem prontos
      console.warn('Erro ao carregar perfil ativo/Google OAuth:', error?.response?.data || error);
    }
  };

  const loadGoogleStatus = async () => {
    try {
      const resp = await api.get('/api/google/status');
      if (resp.data.success) {
        setGoogleStatus({
          connected: !!resp.data.connected,
          calendarIdDefault: resp.data.calendarIdDefault || null
        });
        setSelectedCalendarId(resp.data.calendarIdDefault || '');
      }
    } catch (e) {
      console.warn('Google status error:', e?.response?.data || e);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setLoadingGoogle(true);
      if (!activeProfileId) {
        toast.error('Ative um perfil em Chatbot antes de conectar o Google.');
        return;
      }
      const resp = await api.get('/api/google/oauth/start');
      const url = resp.data?.url;
      if (!url) throw new Error('URL OAuth não retornada');
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Conclua a conexão na aba do Google e depois clique em “Atualizar status”.');
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Erro ao iniciar conexão com Google';
      toast.error(msg);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleLoadCalendars = async () => {
    try {
      setLoadingGoogle(true);
      const resp = await api.get('/api/google/calendars');
      if (resp.data.success) {
        setGoogleCalendars(resp.data.calendars || []);
        setSelectedCalendarId(resp.data.selected || selectedCalendarId || '');
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Erro ao listar calendários';
      toast.error(msg);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleSelectCalendar = async () => {
    if (!selectedCalendarId) {
      toast.error('Selecione um calendário');
      return;
    }
    try {
      setLoadingGoogle(true);
      const resp = await api.post('/api/google/calendar/select', { calendarId: selectedCalendarId });
      if (resp.data.success) {
        toast.success('Calendário selecionado!');
        await loadGoogleStatus();
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Erro ao selecionar calendário';
      toast.error(msg);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Tem certeza que deseja remover as credenciais do Google? Você precisará conectar novamente para usar o Google Calendar.')) {
      return;
    }

    setLoadingGoogle(true);
    try {
      await api.delete('/api/google/disconnect');
      toast.success('Credenciais do Google removidas com sucesso!');
      setGoogleStatus({ connected: false, calendarIdDefault: null });
      setGoogleCalendars([]);
      setSelectedCalendarId('');
      // Recarregar status após remover
      await loadGoogleStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao remover credenciais do Google');
      console.error(error);
    } finally {
      setLoadingGoogle(false);
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

      // Salvar Google OAuth no perfil ativo (se existir)
      if (activeProfileId) {
        const hasAnyGoogle =
          (googleOAuth.clientId && googleOAuth.clientId.trim()) ||
          (googleOAuth.clientSecret && googleOAuth.clientSecret.trim()) ||
          (googleOAuth.redirectUri && googleOAuth.redirectUri.trim());

        if (hasAnyGoogle) {
          const googlePayload = {
            googleOAuthClientId: googleOAuth.clientId?.trim() || undefined,
            googleOAuthClientSecret: googleOAuth.clientSecret?.trim() || undefined,
            googleOAuthRedirectUri: googleOAuth.redirectUri?.trim() || undefined
          };

          const googleResp = await api.put(`/api/chatbot/profiles/${activeProfileId}`, googlePayload);
          if (googleResp.data.success) {
            toast.success('Credenciais do Google salvas no perfil ativo!');
            setGoogleOAuth(prev => ({ ...prev, clientSecret: '' })); // nunca manter secret em memória
            await loadActiveProfileAndGoogle();
          }
        }
      } else {
        const hasAnyGoogle =
          (googleOAuth.clientId && googleOAuth.clientId.trim()) ||
          (googleOAuth.clientSecret && googleOAuth.clientSecret.trim()) ||
          (googleOAuth.redirectUri && googleOAuth.redirectUri.trim());
        if (hasAnyGoogle) {
          toast.error('Nenhum perfil ativo encontrado. Ative um perfil em Chatbot antes de salvar credenciais do Google.');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleGoogleChange = (field, value) => {
    setGoogleOAuth(prev => ({ ...prev, [field]: value }));
  };

  const loadSchedulerConfig = async () => {
    try {
      setLoadingScheduler(true);
      const response = await api.get('/api/config/scheduler');

      if (response.data.success) {
        const cfg = response.data.config;
        setPremiumShearsConfig({
          api_url: cfg.api_url || '',
          api_key: '',
          enabled: cfg.enabled || false,
          api_url_preview: cfg.api_url_preview || null,
          has_key: cfg.has_key || false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do scheduler:', error);
      toast.error('Erro ao carregar configuração do scheduler');
    } finally {
      setLoadingScheduler(false);
    }
  };

  const handleSaveScheduler = async () => {
    try {
      setSaving(true);
      const payload = {
        api_url: premiumShearsConfig.api_url?.trim() || null,
        api_key: premiumShearsConfig.api_key?.trim() || null,
        enabled: premiumShearsConfig.enabled
      };

      const response = await api.put('/api/config/scheduler', payload);

      if (response.data.success) {
        toast.success('Configuração do scheduler salva com sucesso!');
        setPremiumShearsConfig(prev => ({ ...prev, api_key: '' }));
        setTimeout(loadSchedulerConfig, 1000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração do scheduler');
      console.error(error);
    } finally {
      setSaving(false);
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
            Gerencie suas chaves de API e integrações (OpenAI, Google Agenda, etc.)
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadConfig}
          className="flex items-center gap-2"
        >
          <RefreshCw size={20} />
          Recarregar
        </Button>
      </div>

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

        {/* Card Google */}
        <Card title="Google" icon={Calendar}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Essas credenciais serão salvas no <span className="font-medium">perfil ativo</span> do Chatbot. Perfil ativo detectado: {activeProfileId ? activeProfileId : '(nenhum)'}.
            </p>

            <Input
              label="Google OAuth Client ID"
              value={googleOAuth.clientId}
              onChange={(e) => handleGoogleChange('clientId', e.target.value)}
              placeholder="Seu Client ID do Google"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Google OAuth Client Secret
              </label>
              <div className="relative">
                <Input
                  type={showGoogleSecret ? 'text' : 'password'}
                  value={googleOAuth.clientSecret}
                  onChange={(e) => handleGoogleChange('clientSecret', e.target.value)}
                  placeholder="Deixe em branco para manter o secret atual"
                  icon={Key}
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showGoogleSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Dica: para salvar o secret, o backend precisa ter <span className="font-mono">ENCRYPTION_KEY</span> definido no <span className="font-mono">.env</span>.
              </p>
            </div>

            <Input
              label="Google Redirect URI"
              value={googleOAuth.redirectUri}
              onChange={(e) => handleGoogleChange('redirectUri', e.target.value)}
              placeholder="http://localhost:5000/api/google/oauth/callback"
            />

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={googleStatus.connected ? 'success' : 'default'} className="flex items-center gap-2 px-4 py-2">
                  <Calendar size={16} />
                  {googleStatus.connected ? 'Conectado' : 'Não conectado'}
                </Badge>
                <Button
                  type="button"
                  variant="primary"
                  className="flex items-center gap-2"
                  onClick={handleConnectGoogle}
                  disabled={loadingGoogle}
                >
                  <Calendar size={18} />
                  Conectar Google
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={loadGoogleStatus}
                  disabled={loadingGoogle}
                >
                  <RefreshCw size={18} />
                  Atualizar status
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="flex items-center gap-2"
                  onClick={handleDisconnectGoogle}
                  disabled={loadingGoogle}
                >
                  <XCircle size={18} />
                  Remover Credenciais
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calendário padrão
                  </label>
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loadingGoogle || !googleStatus.connected}
                  >
                    <option value="">Selecione um calendário...</option>
                    {googleCalendars.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.summary}{c.primary ? ' (principal)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selecionado atualmente: {googleStatus.calendarIdDefault || '(nenhum)'}
                  </p>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center gap-2 w-full justify-center"
                    onClick={handleLoadCalendars}
                    disabled={loadingGoogle || !googleStatus.connected}
                  >
                    <RefreshCw size={18} />
                    Listar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 w-full justify-center"
                    onClick={handleSelectCalendar}
                    disabled={loadingGoogle || !googleStatus.connected || !selectedCalendarId}
                  >
                    <Save size={18} />
                    Usar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Card Sistema de Agendamento (Premium Shears) */}
        <Card title="Sistema de Agendamento" icon={Calendar}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL da API do Premium Shears Scheduler
              </label>
              
              {premiumShearsConfig.api_url_preview && !premiumShearsConfig.api_url && (
                <div className="mb-2">
                  <Badge variant="success" className="flex items-center gap-2 w-fit">
                    <Key size={14} />
                    URL configurada: {premiumShearsConfig.api_url_preview}
                  </Badge>
                </div>
              )}

              <Input
                type="text"
                value={premiumShearsConfig.api_url}
                onChange={(e) => setPremiumShearsConfig({...premiumShearsConfig, api_url: e.target.value})}
                placeholder={premiumShearsConfig.api_url_preview ? 'Deixe em branco para manter a URL atual' : 'https://seu-projeto.supabase.co/functions/v1/api'}
                icon={Key}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Configure a URL da API do seu sistema de agendamento
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key (opcional)
              </label>
              
              {premiumShearsConfig.has_key && !premiumShearsConfig.api_key && (
                <div className="mb-2">
                  <Badge variant="success" className="flex items-center gap-2 w-fit">
                    <Key size={14} />
                    API Key configurada
                  </Badge>
                </div>
              )}

              <div className="relative">
                <Input
                  type={showPremiumShearsKey ? 'text' : 'password'}
                  value={premiumShearsConfig.api_key}
                  onChange={(e) => setPremiumShearsConfig({...premiumShearsConfig, api_key: e.target.value})}
                  placeholder={premiumShearsConfig.has_key ? 'Deixe em branco para manter a chave atual' : 'Sua API key se necessário'}
                  icon={Key}
                />
                <button
                  type="button"
                  onClick={() => setShowPremiumShearsKey(!showPremiumShearsKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPremiumShearsKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-premium-shears"
                checked={premiumShearsConfig.enabled}
                onChange={(e) => setPremiumShearsConfig({...premiumShearsConfig, enabled: e.target.checked})}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="use-premium-shears" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Usar Premium Shears Scheduler ao invés de Google Calendar
              </label>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Webhook URL para o Premium Shears:</strong>
              </p>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-300 mt-1 break-all">
                {api.defaults.baseURL || 'https://projetomensagem-production.up.railway.app'}/api/webhooks/premium-shears/appointment-created
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Configure esta URL no seu sistema de agendamento para receber notificações quando agendamentos forem criados
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleSaveScheduler}
              disabled={saving || loadingScheduler}
              className="w-full"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Configuração do Scheduler'}
            </Button>
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
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default APIManager;
