import { useState, useEffect } from 'react';
import { User, Save, Crown } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, getProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        company_name: user.company_name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put('/api/users/profile', {
        full_name: formData.full_name,
        company_name: formData.company_name,
        phone: formData.phone,
      });

      toast.success('Perfil atualizado com sucesso!');
      getProfile(); // Atualizar dados do usuário
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const planBadges = {
    free: { variant: 'default', label: 'Grátis' },
    pro: { variant: 'primary', label: 'Pro' },
    enterprise: { variant: 'success', label: 'Enterprise' },
  };

  const currentPlan = user?.plan || 'free';
  const planBadge = planBadges[currentPlan] || planBadges.free;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Perfil</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário principal */}
        <div className="lg:col-span-2">
          <Card title="Informações Pessoais" icon={User}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome completo"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="João Silva"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  disabled
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da empresa"
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Minha Empresa"
                />

                <Input
                  label="Telefone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Save size={20} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Sidebar com informações */}
        <div className="space-y-6">
          {/* Plano atual */}
          <Card title="Plano Atual" icon={Crown}>
            <div className="space-y-4">
              <div>
                <Badge variant={planBadge.variant} className="text-base px-3 py-1">
                  {planBadge.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Você está no plano <strong>{planBadge.label}</strong>
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Atualizar Plano
              </Button>
            </div>
          </Card>

          {/* Estatísticas */}
          <Card title="Estatísticas">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Membro desde</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('pt-BR')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <Badge variant="success">Ativo</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
