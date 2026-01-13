import { MessageSquare, Clock, Phone, Trash2, Volume2 } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

export default function RecentConversations({ conversations, loading }) {

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Agora';
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const deleteConversation = async (id) => {
    // TODO: Implementar lógica de exclusão no backend
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold">Conversas Recentes</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando conversas...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Nenhuma conversa ainda</p>
          <p className="text-sm text-gray-400 mt-1">As novas conversas aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {conversations.map((convo, index) => {
            // Mapeia propriedades do backend para o frontend se necessário, ou usa direto
            const message = convo.lastMessage || convo.userMessage || convo.aiResponse;
            const time = convo.lastMessageTime || convo.timestamp;
            // Usar chave única: id se existir, senão phone normalizado + index para evitar duplicatas
            const uniqueKey = convo.id || `${(convo.phone || '').replace(/\D/g, '')}_${index}`;
            
            return (
            <li key={uniqueKey} className="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                {convo.phone ? convo.phone.slice(-2) : '??'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">{convo.phone || 'Desconhecido'}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <Clock size={12} /> {formatTime(time)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex items-center gap-1" title={message}>
                  {message && message.startsWith('[ÁUDIO]') && (
                    <Volume2 size={14} className="text-blue-500 flex-shrink-0" title="Mensagem de áudio" />
                  )}
                  <span>{message || 'Sem mensagens'}</span>
                </p>
              </div>
              {convo.unread > 0 && (
                <Badge variant="primary" className="self-center">{convo.unread}</Badge>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
