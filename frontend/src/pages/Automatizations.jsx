import { useState, useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Power } from 'lucide-react';

export default function Automatizations() {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' ou 'menus'
  const [rules, setRules] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingMenu, setEditingMenu] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [automationsEnabled, setAutomationsEnabled] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Form states
  const [ruleForm, setRuleForm] = useState({
    name: '',
    keywords: [],
    keywordInput: '',
    response: '',
    is_active: true,
    priority: 0,
    case_sensitive: false
  });

  const [menuForm, setMenuForm] = useState({
    name: '',
    trigger_keywords: [],
    triggerKeywordInput: '',
    menu_text: '',
    options: [],
    is_active: true
  });

  const [menuOptionForm, setMenuOptionForm] = useState({
    number: 1,
    keyword: '',
    text: '',
    response: ''
  });

  useEffect(() => {
    loadTemplates();
    loadActiveProfile();
    loadAutomationsStatus();
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      loadRules();
      loadMenus();
      seedAutomations();
      loadAutomationsStatus();
    }
  }, [activeProfileId]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.get('/api/chatbot/templates');
      if (response.data.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadActiveProfile = async () => {
    try {
      const response = await api.get('/api/chatbot/profiles');
      const activeProfile = response.data.profiles?.find(p => p.is_active);
      if (activeProfile) {
        setActiveProfileId(activeProfile.id);
        setSelectedTemplateKey(activeProfile.template_key || null);
      } else {
        toast.error('Nenhum perfil ativo encontrado. Crie ou ative um perfil no Chatbot IA.');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil ativo:', error);
      toast.error('Erro ao carregar perfil ativo.');
    }
  };

  const handleTemplateChange = async (templateKey) => {
    if (!activeProfileId) {
      toast.error('Nenhum perfil ativo encontrado.');
      return;
    }

    if (!templateKey) {
      return; // Não fazer nada se selecionar "Selecione..."
    }

    if (templateKey === selectedTemplateKey) {
      return; // Já está selecionado
    }

    const templateName = templates.find(t => t.template_key === templateKey)?.name || templateKey;
    if (!window.confirm(`Alterar template para "${templateName}"? Isso irá recriar todas as automações do novo template. As automações existentes serão substituídas.`)) {
      // Resetar o select para o valor anterior
      return;
    }

    setLoading(true);
    try {
      // Buscar perfil atual
      const profileResponse = await api.get(`/api/chatbot/profiles/${activeProfileId}`);
      const currentProfile = profileResponse.data.profile;

      if (!currentProfile) {
        toast.error('Perfil não encontrado');
        return;
      }

      // Atualizar perfil com novo template usando saveOrCreateProfile
      await api.post('/api/chatbot/profiles/save', {
        templateKey: templateKey,
        promptOnlyMode: currentProfile.prompt_only_mode,
        specialInstructions: currentProfile.special_instructions,
        model: currentProfile.model,
        temperature: currentProfile.temperature,
        maxTokens: currentProfile.max_tokens
      });

      // Aguardar um pouco para o perfil ser atualizado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Recarregar perfil ativo para garantir que temos o ID correto
      await loadActiveProfile();

      // Deletar automações existentes e recriar do novo template
      const rulesResponse = await api.get('/api/automations/rules', { params: { profileId: activeProfileId } });
      const menusResponse = await api.get('/api/automations/menus', { params: { profileId: activeProfileId } });

      // Deletar regras
      for (const rule of rulesResponse.data.rules || []) {
        await api.delete(`/api/automations/rules/${rule.id}`, { params: { profileId: activeProfileId } });
      }

      // Deletar menus
      for (const menu of menusResponse.data.menus || []) {
        await api.delete(`/api/automations/menus/${menu.id}`, { params: { profileId: activeProfileId } });
      }

      // Recriar do novo template
      const seedResponse = await api.get('/api/automations/seed', {
        params: { profileId: activeProfileId }
      });

      if (seedResponse.data.success) {
        setSelectedTemplateKey(templateKey);
        toast.success(`Template alterado e automações recriadas! (${seedResponse.data.rulesCreated || 0} regras, ${seedResponse.data.menusCreated || 0} menus)`);
        loadRules();
        loadMenus();
      } else {
        toast.error('Erro ao recriar automações do novo template');
      }
    } catch (error) {
      console.error('Erro ao alterar template:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Erro ao alterar template');
      // Recarregar perfil para resetar o select
      await loadActiveProfile();
    } finally {
      setLoading(false);
    }
  };

  const seedAutomations = async () => {
    if (!activeProfileId) return;
    
    try {
      const response = await api.get('/api/automations/seed', {
        params: { profileId: activeProfileId }
      });

      if (response.data.success && response.data.created) {
        const { rulesCreated, menusCreated } = response.data;
        toast.success(`Automações pré-configuradas criadas! (${rulesCreated} regras, ${menusCreated} menus)`);
        // Recarregar listas após seed
        loadRules();
        loadMenus();
      }
      // Se alreadyExists, não fazer nada (silencioso)
    } catch (error) {
      console.error('Erro ao fazer seed de automações:', error);
      // Não mostrar erro ao usuário (seed é opcional)
    }
  };

  const loadAutomationsStatus = async () => {
    try {
      const response = await api.get('/api/automations/status');
      if (response.data.success) {
        setAutomationsEnabled(response.data.enabled !== false);
      }
    } catch (error) {
      console.error('Erro ao carregar status das automações:', error);
    }
  };

  const handleToggleAutomations = async () => {
    setLoadingStatus(true);
    try {
      const newStatus = !automationsEnabled;
      const response = await api.put('/api/automations/toggle', { enabled: newStatus });
      
      if (response.data.success) {
        setAutomationsEnabled(newStatus);
        toast.success(response.data.message || `Automações ${newStatus ? 'ativadas' : 'desativadas'}`);
      }
    } catch (error) {
      console.error('Erro ao alternar automações:', error);
      toast.error(error.response?.data?.error || 'Erro ao alternar automações');
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadRules = async () => {
    setLoading(true);
    try {
      const params = activeProfileId ? { profileId: activeProfileId } : {};
      const response = await api.get('/api/automations/rules', { params });
      setRules(response.data.rules || []);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
      alert('Erro ao carregar regras: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadMenus = async () => {
    setLoading(true);
    try {
      const params = activeProfileId ? { profileId: activeProfileId } : {};
      const response = await api.get('/api/automations/menus', { params });
      setMenus(response.data.menus || []);
    } catch (error) {
      console.error('Erro ao carregar menus:', error);
      alert('Erro ao carregar menus: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ruleData = {
        ...ruleForm,
        profileId: activeProfileId
      };
      delete ruleData.keywordInput;

      if (editingRule) {
        await api.put(`/api/automations/rules/${editingRule.id}`, ruleData);
      } else {
        await api.post('/api/automations/rules', ruleData);
      }

      resetRuleForm();
      loadRules();
      alert('Regra salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      alert('Erro ao salvar regra: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta regra?')) return;

    try {
      await api.delete(`/api/automations/rules/${id}`);
      loadRules();
      alert('Regra deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar regra:', error);
      alert('Erro ao deletar regra: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      keywords: rule.keywords || [],
      keywordInput: '',
      response: rule.response,
      is_active: rule.is_active,
      priority: rule.priority || 0,
      case_sensitive: rule.case_sensitive || false
    });
  };

  const resetRuleForm = () => {
    setEditingRule(null);
    setRuleForm({
      name: '',
      keywords: [],
      keywordInput: '',
      response: '',
      is_active: true,
      priority: 0,
      case_sensitive: false
    });
  };

  const addKeyword = () => {
    const keyword = ruleForm.keywordInput.trim();
    if (keyword && !ruleForm.keywords.includes(keyword)) {
      setRuleForm({
        ...ruleForm,
        keywords: [...ruleForm.keywords, keyword],
        keywordInput: ''
      });
    }
  };

  const removeKeyword = (keyword) => {
    setRuleForm({
      ...ruleForm,
      keywords: ruleForm.keywords.filter(k => k !== keyword)
    });
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const menuData = {
        ...menuForm,
        profileId: activeProfileId
      };
      delete menuData.triggerKeywordInput;

      if (editingMenu) {
        await api.put(`/api/automations/menus/${editingMenu.id}`, menuData);
      } else {
        await api.post('/api/automations/menus', menuData);
      }

      resetMenuForm();
      loadMenus();
      alert('Menu salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar menu:', error);
      alert('Erro ao salvar menu: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este menu?')) return;

    try {
      await api.delete(`/api/automations/menus/${id}`);
      loadMenus();
      alert('Menu deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar menu:', error);
      alert('Erro ao deletar menu: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditMenu = (menu) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      trigger_keywords: menu.trigger_keywords || [],
      triggerKeywordInput: '',
      menu_text: menu.menu_text,
      options: menu.options || [],
      is_active: menu.is_active
    });
  };

  const resetMenuForm = () => {
    setEditingMenu(null);
    setMenuForm({
      name: '',
      trigger_keywords: [],
      triggerKeywordInput: '',
      menu_text: '',
      options: [],
      is_active: true
    });
    setMenuOptionForm({
      number: 1,
      keyword: '',
      text: '',
      response: ''
    });
  };

  const addTriggerKeyword = () => {
    const keyword = menuForm.triggerKeywordInput.trim();
    if (keyword && !menuForm.trigger_keywords.includes(keyword)) {
      setMenuForm({
        ...menuForm,
        trigger_keywords: [...menuForm.trigger_keywords, keyword],
        triggerKeywordInput: ''
      });
    }
  };

  const removeTriggerKeyword = (keyword) => {
    setMenuForm({
      ...menuForm,
      trigger_keywords: menuForm.trigger_keywords.filter(k => k !== keyword)
    });
  };

  const addMenuOption = () => {
    if (!menuOptionForm.text && !menuOptionForm.response) {
      alert('Preencha pelo menos o texto ou a resposta da opção');
      return;
    }

    const newOption = {
      number: menuOptionForm.number,
      keyword: menuOptionForm.keyword,
      text: menuOptionForm.text,
      response: menuOptionForm.response || menuOptionForm.text
    };

    setMenuForm({
      ...menuForm,
      options: [...menuForm.options, newOption]
    });

    setMenuOptionForm({
      number: menuForm.options.length + 2,
      keyword: '',
      text: '',
      response: ''
    });
  };

  const removeMenuOption = (index) => {
    setMenuForm({
      ...menuForm,
      options: menuForm.options.filter((_, i) => i !== index)
    });
  };

  const recreateAutomations = async () => {
    if (!activeProfileId) {
      toast.error('Nenhum perfil ativo encontrado.');
      return;
    }

    if (!window.confirm('Isso irá RECRIAR todas as automações do template atual. As automações existentes serão mantidas, mas novas serão criadas se necessário. Deseja continuar?')) {
      return;
    }

    setLoading(true);
    try {
      // Primeiro, deletar automações existentes para este perfil
      const rulesResponse = await api.get('/api/automations/rules', { params: { profileId: activeProfileId } });
      const menusResponse = await api.get('/api/automations/menus', { params: { profileId: activeProfileId } });

      // Deletar regras
      for (const rule of rulesResponse.data.rules || []) {
        await api.delete(`/api/automations/rules/${rule.id}`, { params: { profileId: activeProfileId } });
      }

      // Deletar menus
      for (const menu of menusResponse.data.menus || []) {
        await api.delete(`/api/automations/menus/${menu.id}`, { params: { profileId: activeProfileId } });
      }

      // Recriar do template
      const seedResponse = await api.get('/api/automations/seed', {
        params: { profileId: activeProfileId }
      });

      if (seedResponse.data.success && seedResponse.data.created) {
        const { rulesCreated, menusCreated } = seedResponse.data;
        toast.success(`Automações recriadas! (${rulesCreated} regras, ${menusCreated} menus)`);
        loadRules();
        loadMenus();
      } else {
        toast.info('Automações já existentes. Para recriar, delete manualmente e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao recriar automações:', error);
      toast.error(error.response?.data?.error || 'Erro ao recriar automações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Automações sem IA</h1>
        {activeProfileId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>Template:</label>
            <select
              value={selectedTemplateKey || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={loading || loadingTemplates}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                backgroundColor: 'white',
                cursor: loading || loadingTemplates ? 'not-allowed' : 'pointer',
                opacity: loading || loadingTemplates ? 0.6 : 1,
                minWidth: '150px'
              }}
            >
              {!selectedTemplateKey && <option value="">Selecione...</option>}
              {templates.map(template => (
                <option key={template.template_key} value={template.template_key}>
                  {template.name || template.template_key}
                </option>
              ))}
            </select>
          </div>
        )}
        {activeProfileId && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: automationsEnabled ? '#d1fae5' : '#fee2e2', borderRadius: '6px', border: `1px solid ${automationsEnabled ? '#10b981' : '#ef4444'}` }}>
              <Power size={16} color={automationsEnabled ? '#10b981' : '#ef4444'} />
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: automationsEnabled ? '#10b981' : '#ef4444' }}>
                {automationsEnabled ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <button
              onClick={handleToggleAutomations}
              disabled={loadingStatus}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: automationsEnabled ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingStatus ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                opacity: loadingStatus ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Power size={16} />
              {loadingStatus ? 'Aguarde...' : (automationsEnabled ? 'Desativar' : 'Ativar')} Automações
            </button>
            <button
              onClick={recreateAutomations}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Recriando...' : '🔄 Recriar do Template'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'rules' ? '#3b82f6' : 'transparent',
            color: activeTab === 'rules' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontWeight: activeTab === 'rules' ? 'bold' : 'normal',
            borderBottom: activeTab === 'rules' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Regras de Palavras-chave
        </button>
        <button
          onClick={() => setActiveTab('menus')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'menus' ? '#3b82f6' : 'transparent',
            color: activeTab === 'menus' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontWeight: activeTab === 'menus' ? 'bold' : 'normal',
            borderBottom: activeTab === 'menus' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Menus Interativos
        </button>
      </div>

      {/* Informações sobre independência */}
      {activeProfileId && (
        <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #93c5fd' }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e40af' }}>ℹ️ Sobre Automações</p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.25rem' }}>
            As automações funcionam <strong>independentemente do Chatbot IA</strong>.
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
            Você pode desativar o Chatbot IA na página <strong>"Chatbot IA"</strong> e manter apenas as automações ativas.
          </p>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {editingRule ? 'Editar Regra' : 'Nova Regra'}
            </h2>
            <form onSubmit={handleSaveRule}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nome da Regra</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Palavras-chave</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    value={ruleForm.keywordInput}
                    onChange={(e) => setRuleForm({ ...ruleForm, keywordInput: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Digite uma palavra-chave e pressione Enter"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {ruleForm.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: '#e5e7eb',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Resposta</label>
                <textarea
                  value={ruleForm.response}
                  onChange={(e) => setRuleForm({ ...ruleForm, response: e.target.value })}
                  required
                  rows={4}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Prioridade</label>
                  <input
                    type="number"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={ruleForm.is_active}
                      onChange={(e) => setRuleForm({ ...ruleForm, is_active: e.target.checked })}
                    />
                    Ativo
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={ruleForm.case_sensitive}
                      onChange={(e) => setRuleForm({ ...ruleForm, case_sensitive: e.target.checked })}
                    />
                    Case Sensitive
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                >
                  {loading ? 'Salvando...' : editingRule ? 'Atualizar' : 'Criar Regra'}
                </button>
                {editingRule && (
                  <button
                    type="button"
                    onClick={resetRuleForm}
                    style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Regras Cadastradas</h2>
            {rules.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Nenhuma regra cadastrada. Crie uma nova regra acima.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: '1.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: rule.is_active ? 'white' : '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.25rem' }}>{rule.name}</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          Prioridade: {rule.priority} | {rule.is_active ? '✅ Ativo' : '❌ Inativo'}
                          {rule.case_sensitive && ' | Case Sensitive'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditRule(rule)}
                          style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Palavras-chave:</strong>{' '}
                      {rule.keywords?.map((k, i) => (
                        <span key={i} style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#e5e7eb', borderRadius: '4px' }}>
                          {k}
                        </span>
                      ))}
                    </div>
                    <div>
                      <strong>Resposta:</strong>
                      <p style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {rule.response}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menus Tab */}
      {activeTab === 'menus' && (
        <div>
          <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {editingMenu ? 'Editar Menu' : 'Novo Menu'}
            </h2>
            <form onSubmit={handleSaveMenu}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nome do Menu</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Palavras que Ativam o Menu</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    value={menuForm.triggerKeywordInput}
                    onChange={(e) => setMenuForm({ ...menuForm, triggerKeywordInput: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTriggerKeyword())}
                    placeholder="Digite uma palavra e pressione Enter"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={addTriggerKeyword}
                    style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {menuForm.trigger_keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: '#e5e7eb',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeTriggerKeyword(keyword)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Texto do Menu</label>
                <textarea
                  value={menuForm.menu_text}
                  onChange={(e) => setMenuForm({ ...menuForm, menu_text: e.target.value })}
                  required
                  rows={3}
                  placeholder='Ex: Digite 1 para agendar, 2 para preços, 3 para endereço'
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: '500' }}>Opções do Menu</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    value={menuOptionForm.number}
                    onChange={(e) => setMenuOptionForm({ ...menuOptionForm, number: parseInt(e.target.value) || 1 })}
                    placeholder="Número"
                    style={{ width: '80px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    value={menuOptionForm.keyword}
                    onChange={(e) => setMenuOptionForm({ ...menuOptionForm, keyword: e.target.value })}
                    placeholder="Palavra-chave (opcional)"
                    style={{ width: '150px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    value={menuOptionForm.text}
                    onChange={(e) => setMenuOptionForm({ ...menuOptionForm, text: e.target.value })}
                    placeholder="Texto da opção"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    value={menuOptionForm.response}
                    onChange={(e) => setMenuOptionForm({ ...menuOptionForm, response: e.target.value })}
                    placeholder="Resposta (opcional, usa texto se vazio)"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={addMenuOption}
                    style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  {menuForm.options.map((option, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        background: '#f9fafb',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>
                        <strong>{option.number}</strong> - {option.text}
                        {option.keyword && ` (${option.keyword})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMenuOption(idx)}
                        style={{ padding: '0.25rem 0.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={menuForm.is_active}
                    onChange={(e) => setMenuForm({ ...menuForm, is_active: e.target.checked })}
                  />
                  Ativo
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={loading || menuForm.options.length === 0}
                  style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                >
                  {loading ? 'Salvando...' : editingMenu ? 'Atualizar' : 'Criar Menu'}
                </button>
                {editingMenu && (
                  <button
                    type="button"
                    onClick={resetMenuForm}
                    style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Menus Cadastrados</h2>
            {menus.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Nenhum menu cadastrado. Crie um novo menu acima.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    style={{
                      padding: '1.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: menu.is_active ? 'white' : '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.25rem' }}>{menu.name}</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {menu.is_active ? '✅ Ativo' : '❌ Inativo'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditMenu(menu)}
                          style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(menu.id)}
                          style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Palavras que ativam:</strong>{' '}
                      {menu.trigger_keywords?.map((k, i) => (
                        <span key={i} style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#e5e7eb', borderRadius: '4px' }}>
                          {k}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Texto do menu:</strong>
                      <p style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '4px' }}>
                        {menu.menu_text}
                      </p>
                    </div>
                    <div>
                      <strong>Opções:</strong>
                      <div style={{ marginTop: '0.5rem' }}>
                        {menu.options?.map((opt, idx) => (
                          <div key={idx} style={{ padding: '0.5rem', background: '#f9fafb', borderRadius: '4px', marginBottom: '0.25rem' }}>
                            <strong>{opt.number}</strong> - {opt.text}
                            {opt.keyword && ` (palavra-chave: ${opt.keyword})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
