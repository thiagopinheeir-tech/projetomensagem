import { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, ArrowRight, ArrowLeft, Key, Bot, ExternalLink } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import api from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SetupWizard = ({ onClose }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [openAIConfigured, setOpenAIConfigured] = useState(false);
  const [schedulerConfigured, setSchedulerConfigured] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      
      // Verificar OpenAI
      const openAIResp = await api.get('/api/config/ai');
      if (openAIResp.data.success && openAIResp.data.config?.key_preview) {
        setOpenAIConfigured(true);
      }

      // Verificar Scheduler
      const schedulerResp = await api.get('/api/config/scheduler');
      if (schedulerResp.data.success && (schedulerResp.data.config?.api_url || schedulerResp.data.config?.has_key)) {
        setSchedulerConfigured(true);
      }

      // Verificar Perfil do Chatbot
      const profileResp = await api.get('/api/chatbot/profiles');
      if (profileResp.data.success && profileResp.data.profiles?.length > 0) {
        setProfileExists(true);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Configurar APIs',
      description: 'Configure suas chaves de API necessárias',
      icon: Key,
      route: '/api-manager',
      checks: [
        { label: 'OpenAI API Key configurada', checked: openAIConfigured },
        { label: 'Premium Shears Scheduler configurado', checked: schedulerConfigured },
      ],
    },
    {
      id: 2,
      title: 'Configurar Chatbot',
      description: 'Crie e configure seu perfil de chatbot',
      icon: Bot,
      route: '/chatbot',
      checks: [
        { label: 'Perfil do chatbot criado', checked: profileExists },
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToStep = (stepId) => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      navigate(step.route);
      onClose();
    }
  };

  const currentStepData = steps.find(s => s.id === currentStep);
  const allStepsCompleted = openAIConfigured && schedulerConfigured && profileExists;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Guia de Configuração Inicial
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Siga os passos para configurar seu sistema corretamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep || 
                (step.id === 1 && openAIConfigured && schedulerConfigured) ||
                (step.id === 2 && profileExists);

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-primary border-primary text-white'
                          : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={24} />
                      ) : (
                        <Icon size={24} />
                      )}
                    </div>
                    <p className={`text-xs mt-2 text-center ${
                      isActive ? 'font-semibold text-primary' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Step Content */}
        {currentStepData && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const Icon = currentStepData.icon;
                  return <Icon size={24} className="text-primary" />;
                })()}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {currentStepData.description}
              </p>

              {/* Checklist */}
              <div className="space-y-2 mb-6">
                {currentStepData.checks.map((check, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {check.checked ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <Circle size={20} className="text-gray-400" />
                    )}
                    <span className={`text-sm ${
                      check.checked 
                        ? 'text-gray-500 dark:text-gray-400 line-through' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              {currentStepData.id === 1 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                    O que você precisa fazer:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
                    <li>Configure sua chave da OpenAI (obtenha em platform.openai.com)</li>
                    <li>Configure o Premium Shears Scheduler (URL da API e chave se necessário)</li>
                    <li>Ative o sistema de agendamento se desejar usar essa funcionalidade</li>
                  </ol>
                </div>
              )}

              {currentStepData.id === 2 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                    O que você precisa fazer:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
                    <li>Crie um novo perfil de chatbot</li>
                    <li>Configure o nome do negócio e instruções especiais</li>
                    <li>Escolha um template (barbearia, clínica, manicure, etc.)</li>
                    <li>Ative o perfil para começar a usar</li>
                  </ol>
                </div>
              )}

              {/* Action Button */}
              <Button
                variant="primary"
                onClick={() => handleGoToStep(currentStepData.id)}
                className="w-full flex items-center justify-center gap-2"
              >
                Ir para {currentStepData.title}
                <ExternalLink size={18} />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Anterior
          </Button>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Passo {currentStep} de {steps.length}
          </div>

          {currentStep < steps.length ? (
            <Button
              variant="primary"
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              Próximo
              <ArrowRight size={18} />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={onClose}
              className="flex items-center gap-2"
              disabled={!allStepsCompleted}
            >
              {allStepsCompleted ? (
                <>
                  <CheckCircle size={18} />
                  Concluir
                </>
              ) : (
                'Fechar'
              )}
            </Button>
          )}
        </div>

        {/* Completion Message */}
        {allStepsCompleted && currentStep === steps.length && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle size={20} />
              <p className="font-semibold">Parabéns! Todas as configurações estão completas.</p>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2">
              Seu sistema está pronto para uso. Você pode conectar o WhatsApp na página de conexão.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SetupWizard;
