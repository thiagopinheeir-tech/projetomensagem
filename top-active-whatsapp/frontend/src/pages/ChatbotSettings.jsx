import { useState, useEffect } from 'react';
import { Bot, Save, Settings, MessageSquare, TrendingUp, Users, Power } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const ChatbotSettings = () => {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [config, setConfig] = useState({
    businessName: '',
    businessDescription: '',
    services: '',
    tone: 'amigavel',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 300,
    specialInstructions: '',
    greetingMessage: 'Olá! Como posso ajudar você hoje?',
    farewellMessage: 'Obrigado pelo contato! Até logo!',
    defaultResponses: {
      preco: '',
      site: '',
      teste: ''
    }
  });

  useEffect(() => {
    loadConfig();
  }, []);

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
          model: cfg.model || 'gpt-4o-mini',
          temperature: cfg.temperature || 0.7,
          maxTokens: cfg.maxTokens || 300,
          specialInstructions: cfg.specialInstructions || '',
          greetingMessage: cfg.greetingMessage || '',
          farewellMessage: cfg.farewellMessage || '',
          defaultResponses: {
            preco: cfg.defaultResponses?.preco || '',
            site: cfg.defaultResponses?.site || '',
            teste: cfg.defaultResponses?.teste || ''
          }
        });
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
    setLoading(true);

    try {
      const payload = {
        ...config,
        services: config.services.split(',').map(s => s.trim()).filter(s => s),
        defaultResponses: config.defaultResponses
      };

      const response = await api.put('/api/chatbot/config', payload);

      if (response.data.success) {
        toast.success('Configuração salva com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração');
      console.error(error);
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
        {/* Informações da Empresa */}
        <Card title="Informações da Empresa" icon={Bot}>
          <div className="space-y-4">
            <Input
              label="Nome da Empresa"
              value={config.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="JT DEV NOCODE"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição da Empresa
              </label>
              <textarea
                value={config.businessDescription}
                onChange={(e) => handleChange('businessDescription', e.target.value)}
                placeholder="Descreva sua empresa e o que você oferece..."
                rows={4}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <Input
              label="Serviços/Produtos (separados por vírgula)"
              value={config.services}
              onChange={(e) => handleChange('services', e.target.value)}
              placeholder="Agendamento, CRM, Chatbot IA, Relatórios"
              required
            />
          </div>
        </Card>

        {/* Configurações de IA */}
        <Card title="Configurações de IA" icon={Settings}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modelo GPT
              </label>
              <select
                value={config.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tom de Voz
              </label>
              <select
                value={config.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="formal">Formal</option>
                <option value="amigavel">Amigável</option>
                <option value="informal">Informal</option>
                <option value="vendedor">Vendedor</option>
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
                Menor = mais focado | Maior = mais criativo
              </p>
            </div>

            <Input
              label="Máximo de Tokens"
              type="number"
              value={config.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              min={50}
              max={1000}
              required
            />
          </div>
        </Card>

        {/* Mensagens e Instruções */}
        <Card title="Mensagens Personalizadas" icon={MessageSquare}>
          <div className="space-y-4">
            <Input
              label="Mensagem de Saudação"
              value={config.greetingMessage}
              onChange={(e) => handleChange('greetingMessage', e.target.value)}
              placeholder="Olá! Como posso ajudar você hoje?"
            />

            <Input
              label="Mensagem de Despedida"
              value={config.farewellMessage}
              onChange={(e) => handleChange('farewellMessage', e.target.value)}
              placeholder="Obrigado pelo contato! Até logo!"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instruções Especiais
              </label>
              <textarea
                value={config.specialInstructions}
                onChange={(e) => handleChange('specialInstructions', e.target.value)}
                placeholder="Ex: Sempre coletar nome do cliente primeiro. Perguntar sobre interesse em agendamento..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        </Card>

        {/* Respostas Padrão */}
        <Card title="Respostas Padrão" icon={TrendingUp}>
          <div className="space-y-4">
            <Input
              label="Resposta sobre Preços"
              value={config.defaultResponses.preco}
              onChange={(e) => handleChange('defaultResponses.preco', e.target.value)}
              placeholder="Planos a partir de R$49/mês!"
            />

            <Input
              label="Resposta sobre Site"
              value={config.defaultResponses.site}
              onChange={(e) => handleChange('defaultResponses.site', e.target.value)}
              placeholder="Acesse: topactive.com.br"
            />

            <Input
              label="Resposta sobre Teste Grátis"
              value={config.defaultResponses.teste}
              onChange={(e) => handleChange('defaultResponses.teste', e.target.value)}
              placeholder="Teste grátis por 7 dias!"
            />
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
