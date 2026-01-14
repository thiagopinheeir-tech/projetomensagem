import { useState } from 'react';
import { X, CheckCircle, Circle, ArrowRight, ArrowLeft, BookOpen, Bot, Key, Calendar, MessageSquare } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

const SetupWizard = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'openai',
      title: 'Configurar OpenAI',
      icon: Key,
      description: 'Adicione sua chave da OpenAI para habilitar o chatbot com IA',
      instructions: [
        '1. Acesse https://platform.openai.com/api-keys',
        '2. Crie uma nova API key ou use uma existente',
        '3. Copie a chave (começa com "sk-")',
        '4. Cole no campo "OpenAI API Key" acima',
        '5. Clique em "Salvar Configuração OpenAI"',
        '6. Aguarde a confirmação de que a chave foi salva'
      ],
      checkpoints: [
        'API Key da OpenAI configurada',
        'Chave validada e funcionando'
      ]
    },
    {
      id: 'chatbot',
      title: 'Configurar Chatbot',
      icon: Bot,
      description: 'Configure o perfil e comportamento do seu chatbot',
      instructions: [
        '1. Vá para "Chatbot IA" no menu lateral',
        '2. Selecione um template (ex: "Barbearia")',
        '3. Preencha as informações do seu negócio:',
        '   - Nome do negócio',
        '   - Descrição',
        '   - Serviços oferecidos',
        '   - Horário de funcionamento',
        '4. Configure mensagens de saudação e despedida',
        '5. Ative o chatbot usando o toggle',
        '6. Salve as configurações'
      ],
      checkpoints: [
        'Perfil do chatbot criado',
        'Template selecionado',
        'Informações do negócio preenchidas',
        'Chatbot ativado'
      ]
    },
    {
      id: 'scheduler',
      title: 'Configurar Sistema de Agendamento',
      icon: Calendar,
      description: 'Configure o sistema de agendamento Premium Shears',
      instructions: [
        '1. Na seção "Sistema de Agendamento" abaixo',
        '2. Cole a URL da API do Premium Shears',
        '3. (Opcional) Adicione a API Key se necessário',
        '4. Configure o número do WhatsApp da barbearia',
        '5. Ative o sistema marcando a checkbox',
        '6. Clique em "Salvar Configuração do Scheduler"',
        '7. Verifique se o status mostra "Configurado"'
      ],
      checkpoints: [
        'URL da API configurada',
        'Sistema de agendamento ativado',
        'Número da barbearia configurado (opcional)'
      ]
    },
    {
      id: 'whatsapp',
      title: 'Conectar WhatsApp',
      icon: MessageSquare,
      description: 'Conecte seu WhatsApp para começar a receber mensagens',
      instructions: [
        '1. Vá para "WhatsApp" no menu lateral',
        '2. Clique em "Conectar"',
        '3. Escaneie o QR Code com seu WhatsApp',
        '4. Aguarde a confirmação de conexão',
        '5. Verifique se o status mostra "Conectado"',
        '6. Teste enviando uma mensagem para o número conectado'
      ],
      checkpoints: [
        'WhatsApp conectado',
        'QR Code escaneado com sucesso',
        'Status mostra "Conectado"'
      ]
    },
    {
      id: 'test',
      title: 'Testar Sistema',
      icon: CheckCircle,
      description: 'Teste se tudo está funcionando corretamente',
      instructions: [
        '1. Envie uma mensagem para o WhatsApp conectado',
        '2. Verifique se o chatbot responde automaticamente',
        '3. Teste agendar um horário (ex: "Quero agendar para amanhã às 14h")',
        '4. Verifique se o agendamento foi criado',
        '5. Confira se as notificações foram enviadas',
        '6. Teste consultar agendamentos (ex: "meus agendamentos")'
      ],
      checkpoints: [
        'Chatbot responde corretamente',
        'Agendamentos funcionam',
        'Notificações são enviadas',
        'Sistema 100% funcional!'
      ]
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Guia de Configuração
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Passo a passo para deixar seu sistema 100% funcional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      index < currentStep
                        ? 'bg-primary border-primary text-white'
                        : index === currentStep
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600 text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center max-w-[80px] ${
                    index === currentStep ? 'text-primary font-medium' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Step Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon className="text-primary" size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {currentStepData.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentStepData.description}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Instruções:
              </h4>
              <ol className="space-y-2">
                {currentStepData.instructions.map((instruction, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-primary font-medium mt-0.5">{instruction.split('.')[0]}.</span>
                    <span>{instruction.substring(instruction.indexOf(' ') + 1)}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Checkpoints */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Checklist:
              </h4>
              <div className="space-y-2">
                {currentStepData.checkpoints.map((checkpoint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {checkpoint}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="default">
              {currentStep + 1} de {steps.length}
            </Badge>
          </div>

          {currentStep < steps.length - 1 ? (
            <Button
              variant="primary"
              onClick={nextStep}
              className="flex items-center gap-2"
            >
              Próximo
              <ArrowRight size={18} />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              Concluir
              <CheckCircle size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
