import axios from 'axios';
import toast from 'react-hot-toast';

// Obter URL da API e validar
const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Validar URL (remover espaços e caracteres inválidos no início)
  let cleanUrl = apiUrl.trim();
  
  // Remover underscore ou outros caracteres inválidos no início
  if (cleanUrl.startsWith('_') || cleanUrl.startsWith(' ')) {
    // URL do backend tinha caracteres inválidos, removidos automaticamente
    cleanUrl = cleanUrl.replace(/^[_\s]+/, '');
  }
  
  // Garantir que começa com http:// ou https://
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    // URL do backend não tinha protocolo, adicionado https:// automaticamente
    cleanUrl = `https://${cleanUrl}`;
  }
  
  // API URL configurada e validada
  
  return cleanUrl;
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 segundos de timeout
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log de erro para debug
    if (!error.response) {
      console.error('❌ Erro de conexão:', {
        message: error.message,
        code: error.code,
        baseURL: api.defaults.baseURL,
        url: error.config?.url
      });
    }
    
    // Não mostra toast aqui - deixa os componentes tratarem os erros
    // Apenas trata 401 para logout automático
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      toast.error('Sessão expirada. Faça login novamente.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
