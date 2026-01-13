import { useState, useEffect } from 'react';
import { Bot, Save, MessageSquare, Briefcase, Power } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const ChatbotSettings = () => {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [promptOnlyMode, setPromptOnlyMode] = useState(true);
  const [config, setConfig] = useState({
    businessName: '',
    businessDescription: '',
    services: '',
    tone: 'amigavel',
    specialInstructions: '',
    greetingMessage: 'Olá! Como posso ajudar você hoje?',
    farewellMessage: 'Obrigado pelo contato! Até logo!',
    defaultResponses: {
      preco: '',
      site: '',
      teste: ''
    }
  });

  // Template variables removidas - tudo fica direto no prompt único

  useEffect(() => {
    (async () => {
      await loadTemplates();
      await loadConfig();
    })();
  }, []);

  // Carregar prompt automaticamente ao selecionar template
  useEffect(() => {
    if (selectedTemplateKey) {
      loadTemplatePrompt(selectedTemplateKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateKey]);

  const loadTemplatePrompt = async (templateKey) => {
    if (!templateKey) return;
    try {
      const response = await api.get(`/api/chatbot/templates/${templateKey}/prompt`);
      if (response.data.success && response.data.prompt) {
        setConfig(prev => ({
          ...prev,
          specialInstructions: response.data.prompt
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar prompt do template:', error);
      // Não mostrar erro ao usuário (pode ser template sem arquivo)
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.get('/api/chatbot/templates');
      if (response.data.success) {
        setTemplates(response.data.templates || []);
        const first = response.data.templates?.[0]?.template_key;
        if (first && !selectedTemplateKey) setSelectedTemplateKey(first);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar tipos de negócio (templates)');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const response = await api.get('/api/chatbot/config');
      
      if (response.data.success) {
        const cfg = response.data.config;
        setConfig({
          businessName: cfg.businessName || '',
          businessDescription: cfg.businessDescription || '',
          services: Array.isArray(cfg.services) ? cfg.services.join(', ') : cfg.services || '',
          tone: cfg.tone || 'amigavel',
          specialInstructions: cfg.specialInstructions || '',
          greetingMessage: cfg.greetingMessage || '',
          farewellMessage: cfg.farewellMessage || '',
          defaultResponses: {
            preco: cfg.defaultResponses?.preco || '',
            site: cfg.defaultResponses?.site || '',
            teste: cfg.defaultResponses?.teste || ''
          }
        });
        setPromptOnlyMode(cfg.promptOnlyMode !== undefined ? !!cfg.promptOnlyMode : true);
        setChatbotEnabled(response.data.enabled || false);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração do chatbot');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!selectedTemplateKey) {
      toast.error('Selecione um tipo de negócio (template)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        templateKey: selectedTemplateKey,
        promptOnlyMode,
        specialInstructions: config.specialInstructions
      };

      const response = await api.post('/api/chatbot/profiles/save', payload);

      if (response.data.success) {
        toast.success('Configuração salva e ativada com sucesso!');
        await loadConfig();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar configuração';
      toast.error(errorMessage);
      console.error('Erro ao salvar:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const response = await api.post('/api/chatbot/toggle', {
        enabled: !chatbotEnabled
      });

      if (response.data.success) {
        setChatbotEnabled(response.data.enabled);
        toast.success(`Chatbot ${response.data.enabled ? 'habilitado' : 'desabilitado'}!`);
      }
    } catch (error) {
      toast.error('Erro ao alterar status do chatbot');
    }
  };

  const handleChange = (field, value) => {
    if (field.startsWith('defaultResponses.')) {
      const key = field.split('.')[1];
      setConfig(prev => ({
        ...prev,
        defaultResponses: {
          ...prev.defaultResponses,
          [key]: value
        }
      }));
    } else {
      setConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  // handleVarChange removido - não usamos mais variáveis do template

  if (loadingConfig) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações do Chatbot</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configure seu chatbot IA personalizado</p>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant={chatbotEnabled ? 'success' : 'default'} className="flex items-center gap-2 px-4 py-2">
            <Power size={16} />
            {chatbotEnabled ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button
            variant={chatbotEnabled ? 'danger' : 'primary'}
            onClick={handleToggle}
            className="flex items-center gap-2"
          >
            <Power size={20} />
            {chatbotEnabled ? 'Desativar' : 'Ativar'} Chatbot
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tipo de Negócio */}
        <Card title="Tipo de Negócio" icon={Briefcase}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Selecione o tipo de negócio
            </label>
            <select
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loadingTemplates}
            >
              <option value="">Selecione um tipo...</option>
              {templates.map(t => (
                <option key={t.template_key} value={t.template_key}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ao selecionar, o prompt será carregado automaticamente. Você pode editá-lo antes de salvar.
            </p>
          </div>
        </Card>

        {/* Prompt Único (robusto) */}
        <Card title="Prompt (Único e Completo)" icon={MessageSquare}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Com o <span className="font-medium">Modo Prompt Único</span> ligado, este texto vira o <span className="font-medium">System Prompt completo</span>.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Edite o prompt diretamente e inclua todas as informações do seu negócio (endereço, horários, preços, etc.).
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={promptOnlyMode}
                  onChange={(e) => setPromptOnlyMode(e.target.checked)}
                />
                Modo Prompt Único
              </label>
            </div>

            <div>
              <textarea
                value={config.specialInstructions}
                onChange={(e) => handleChange('specialInstructions', e.target.value)}
                placeholder="Cole aqui seu prompt completo (regras, tom, funil de atendimento, etc.)"
                rows={18}
                className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Dica: se quiser um atendimento super consistente, inclua regras de CTA, limites, e passos do funil no próprio prompt.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={loadConfig}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotSettings;
