import { useState, useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  useEffect(() => {
    if (isAuthenticated()) {
      getProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      toast.success('Login realizado com sucesso!');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Erro ao fazer login' };
    }
  };

  const register = async (email, password, full_name, company_name) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Registrando usuário...
      console.log('📝 Registrando usuário:', {
        apiUrl,
        endpoint: `${apiUrl}/api/auth/register`,
        email: email?.substring(0, 20)
      });

      const response = await api.post('/api/auth/register', {
        email,
        password,
        full_name,
        company_name,
      });
      
      // Usuário registrado com sucesso
      
      if (!response.data.success) {
        return { success: false, error: response.data.message || 'Erro ao criar conta' };
      }
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      toast.success('Conta criada com sucesso!');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro completo ao registrar:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      
      // Tratamento de erros específicos
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || !error.response) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        console.error('❌ Erro de conexão:', {
          apiUrl,
          errorCode: error.code,
          errorMessage: error.message
        });
        
        // Tentar verificar se a URL está correta
        if (apiUrl.startsWith('_') || apiUrl.startsWith(' ')) {
          return { 
            success: false, 
            error: `URL do backend inválida: "${apiUrl}". Verifique a variável VITE_API_URL no Vercel (não deve ter espaços ou caracteres extras no início).` 
          };
        }
        
        return { 
          success: false, 
          error: `Não foi possível conectar ao servidor em ${apiUrl}. Verifique se o backend está rodando e se a URL está correta.` 
        };
      }
      
      // Erro CORS
      if (error.message?.includes('CORS') || error.code === 'ERR_BLOCKED_BY_CLIENT') {
        return { 
          success: false, 
          error: 'Erro de CORS. O backend precisa permitir requisições do frontend. Verifique a configuração CORS_ORIGIN no Railway.' 
        };
      }
      
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message };
      }
      
      if (error.response?.status === 409) {
        return { success: false, error: 'Este email já está cadastrado' };
      }
      
      if (error.response?.status === 400) {
        return { success: false, error: error.response.data?.message || 'Dados inválidos. Verifique os campos preenchidos.' };
      }
      
      return { success: false, error: error.message || 'Erro ao criar conta. Tente novamente.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logout realizado com sucesso!');
  };

  const getProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/profile');
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    getProfile,
    isAuthenticated: isAuthenticated(),
  };
};
