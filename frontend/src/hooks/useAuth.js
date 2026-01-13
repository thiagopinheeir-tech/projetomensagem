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
      const response = await api.post('/api/auth/register', {
        email,
        password,
        full_name,
        company_name,
      });
      
      if (!response.data.success) {
        return { success: false, error: response.data.message || 'Erro ao criar conta' };
      }
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      toast.success('Conta criada com sucesso!');
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar:', error);
      
      // Tratamento de erros específicos
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || !error.response) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return { 
          success: false, 
          error: `Não foi possível conectar ao servidor. Verifique se o backend está rodando em ${apiUrl}` 
        };
      }
      
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message };
      }
      
      if (error.response?.status === 409) {
        return { success: false, error: 'Este email já está cadastrado' };
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
