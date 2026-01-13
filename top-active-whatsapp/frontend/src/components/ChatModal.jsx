import { useState, useEffect, useRef } from 'react';
import { X, Copy, Send, Bot, User as UserIcon } from 'lucide-react';
import Button from './ui/Button';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const ChatModal = ({ phone, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && phone) {
      loadHistory();
      // Auto-refresh a cada 5 segundos
      const interval = setInterval(loadHistory, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, phone]);

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    try {
      const response = await api.get(`/api/conversations/${phone}/history`);
      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico da conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const response = await api.post('/api/messages/send-simple', {
        phone: phone,
        message: message.trim()
      });

      if (response.data.success) {
        toast.success('Mensagem enviada!');
        setMessage('');
        // Recarregar histórico após enviar
        setTimeout(loadHistory, 1000);
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Mensagem copiada!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Conversa: {phone}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {history.length} mensagens
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Nenhuma mensagem ainda
            </div>
          ) : (
            history.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  msg.user_message ? 'justify-end' : 'justify-start'
                }`}
              >
                {!msg.user_message && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.user_message
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {msg.user_message || msg.ai_response}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs ${
                        msg.user_message
                          ? 'text-primary-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatDate(msg.timestamp)}
                    </span>
                    <button
                      onClick={() => handleCopyMessage(msg.user_message || msg.ai_response)}
                      className={`ml-2 p-1 rounded hover:bg-black/10 ${
                        msg.user_message ? 'text-primary-100' : 'text-gray-500'
                      }`}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                {msg.user_message && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <UserIcon size={18} className="text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Digite uma mensagem..."
              className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
              className="flex items-center gap-2"
            >
              <Send size={20} />
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
