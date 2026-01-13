/**
 * Script para inicializar configurações do chatbot
 * Pré-preenche com valores de empréstimo pessoal
 */

require('dotenv').config();
const { supabase, db, isConfigured } = require('../config/supabase');
const { Pool } = require('pg');

// Pool para PostgreSQL local (fallback)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

const DEFAULT_CONFIG = {
  business_name: 'JP Financeira',
  business_description: 'Empresa especializada em empréstimo pessoal rápido e seguro. Aprovamos seu crédito em até 24 horas com as melhores taxas do mercado. Atendimento de segunda a sábado, das 8h às 18h.',
  services: ['Empréstimo Pessoal', 'Crédito Rápido', 'Antecipação de Recebíveis', 'Refinanciamento'],
  business_services: 'Empréstimo Pessoal, Crédito Rápido, Antecipação de Recebíveis, Refinanciamento',
  tone: 'amigavel',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 350,
  custom_prompt: `Você é um atendente especializado em empréstimo pessoal da JP Financeira.

REGRAS IMPORTANTES:
1. SEMPRE colete estas informações ANTES de prosseguir:
   - Nome completo do cliente
   - CPF
   - Valor desejado (R$ 500 a R$ 50.000)
   - Prazo de pagamento (6 a 48 meses)

2. INFORMAÇÕES SOBRE O EMPRÉSTIMO:
   - Valores: R$ 500,00 a R$ 50.000,00
   - Taxa de juros: A partir de 2,5% ao mês (varia conforme análise de crédito)
   - Prazo: 6 a 48 meses
   - Aprovação: Em até 24 horas após envio da documentação completa
   - Forma de pagamento: Depósito em conta bancária ou PIX

3. DOCUMENTAÇÃO NECESSÁRIA:
   - CPF (frente e verso)
   - RG (frente e verso) ou CNH
   - Comprovante de renda (holerite, extratos bancários ou declaração)
   - Comprovante de residência (últimos 3 meses)
   - Foto selfie segurando o documento de identidade

4. HORÁRIO DE ATENDIMENTO:
   - Segunda a Sexta: 8h às 18h
   - Sábado: 8h às 13h
   - Domingos e feriados: Fechado
   - Se receber mensagem fora do horário, informe e peça para retornar no horário comercial

5. TOM DE VOZ:
   - Seja amigável, empático e profissional
   - Use emojis moderadamente (máximo 2 por mensagem)
   - Seja claro e objetivo
   - Mostre interesse genuíno em ajudar

6. IMPORTANTE:
   - NUNCA prometa aprovação garantida antes da análise
   - NUNCA informe valores exatos sem saber o perfil do cliente
   - SEMPRE seja transparente sobre taxas e condições
   - Se não souber algo, seja honesto e diga que vai consultar
   - Sempre termine com um próximo passo claro

7. EXEMPLOS DE RESPOSTAS:
   - Para valores: "Oferecemos de R$ 500 a R$ 50.000. A taxa varia conforme a análise, mas começa em 2,5% ao mês. Qual valor você precisa?"
   - Para prazo: "O prazo pode ser de 6 a 48 meses. Quanto mais longo o prazo, menor a parcela, mas maior o valor total. Qual prazo se encaixa melhor na sua situação?"
   - Para documentação: "Precisa enviar: CPF, RG, comprovante de renda, comprovante de residência e uma selfie com seu documento. Posso te ajudar a entender algum documento específico?"

Mantenha a conversa natural, faça perguntas para entender a necessidade do cliente e sempre ofereça ajuda.`,
  special_instructions: 'Sempre coletar nome completo, CPF, valor desejado e prazo antes de prosseguir. Informar valores e taxas quando solicitado. Ser claro sobre documentação necessária. NUNCA prometer aprovação garantida. Atendimento apenas Segunda a Sábado, 8h-18h.',
  greeting_message: 'Olá! 👋 Como posso te ajudar hoje?',
  farewell_message: 'Foi um prazer te atender! 💙 Se precisar de mais alguma coisa sobre empréstimo pessoal, estou aqui! Tenha um ótimo dia!',
  default_responses: {
    preco: 'Oferecemos empréstimo pessoal de R$ 500 a R$ 50.000 com taxa a partir de 2,5% ao mês. O valor final depende da análise de crédito. Qual valor você precisa?',
    site: 'Você pode acessar nosso site: www.jpfinanceira.com.br ou continuar aqui pelo WhatsApp mesmo! Posso te ajudar agora mesmo 😊',
    teste: 'Para solicitar seu empréstimo, preciso de algumas informações: nome completo, CPF, valor desejado e prazo de pagamento. Posso te ajudar agora?',
    juros: 'Nossas taxas começam em 2,5% ao mês e variam conforme a análise de crédito e o perfil do cliente. Quanto maior o prazo e melhor o perfil, melhores as condições!',
    prazo: 'Oferecemos prazos de 6 a 48 meses. Quanto mais longo o prazo, menor a parcela mensal. Qual prazo se encaixa melhor na sua situação?',
    aprovacao: 'A análise é feita em até 24 horas após o envio de toda a documentação. Após a aprovação, o dinheiro cai na sua conta no mesmo dia!',
    documentacao: 'Precisa enviar: CPF (frente/verso), RG ou CNH (frente/verso), comprovante de renda, comprovante de residência (últimos 3 meses) e uma selfie segurando seu documento. Posso te ajudar com alguma dúvida sobre os documentos?'
  },
  enable_chatbot: true
};

async function initChatbotConfig() {
  try {
    console.log('🚀 Inicializando configuração do chatbot...\n');

    if (isConfigured && supabase) {
      console.log('📦 Salvando no Supabase...');
      
      // Verificar se já existe configuração
      const { data: existing } = await db.getChatbotConfig();
      
      if (existing && existing.data) {
        console.log('⚠️  Configuração já existe no Supabase. Atualizando...');
        // Fazer UPSERT
        const { error: updateError } = await db.saveChatbotConfig(DEFAULT_CONFIG);
        if (updateError) {
          console.error('❌ Erro ao atualizar:', updateError);
          throw updateError;
        }
        console.log('✅ Configuração atualizada no Supabase!');
      } else {
        // Inserir nova configuração
        const { error: insertError } = await db.saveChatbotConfig(DEFAULT_CONFIG);
        if (insertError) {
          console.error('❌ Erro ao inserir:', insertError);
          throw insertError;
        }
        console.log('✅ Configuração criada no Supabase!');
      }
    } else {
      console.log('⚠️  Supabase não configurado. Usando PostgreSQL local...');
      
      // Fallback para PostgreSQL local
      const checkQuery = 'SELECT id FROM configurations LIMIT 1';
      const existing = await query(checkQuery);
      
      if (existing.rows.length > 0) {
        // UPDATE
        await query(`
          UPDATE configurations SET
            business_name = $1,
            business_description = $2,
            services = $3,
            business_services = $4,
            tone = $5,
            model = $6,
            temperature = $7,
            max_tokens = $8,
            custom_prompt = $9,
            special_instructions = $10,
            greeting_message = $11,
            farewell_message = $12,
            default_responses = $13,
            enable_chatbot = $14,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT id FROM configurations LIMIT 1)
        `, [
          DEFAULT_CONFIG.business_name,
          DEFAULT_CONFIG.business_description,
          JSON.stringify(DEFAULT_CONFIG.services),
          DEFAULT_CONFIG.business_services,
          DEFAULT_CONFIG.tone,
          DEFAULT_CONFIG.model,
          DEFAULT_CONFIG.temperature,
          DEFAULT_CONFIG.max_tokens,
          DEFAULT_CONFIG.custom_prompt,
          DEFAULT_CONFIG.special_instructions,
          DEFAULT_CONFIG.greeting_message,
          DEFAULT_CONFIG.farewell_message,
          JSON.stringify(DEFAULT_CONFIG.default_responses),
          DEFAULT_CONFIG.enable_chatbot
        ]);
        console.log('✅ Configuração atualizada no PostgreSQL!');
      } else {
        // INSERT
        await query(`
          INSERT INTO configurations (
            business_name, business_description, services, business_services,
            tone, model, temperature, max_tokens, custom_prompt,
            special_instructions, greeting_message, farewell_message,
            default_responses, enable_chatbot
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          DEFAULT_CONFIG.business_name,
          DEFAULT_CONFIG.business_description,
          JSON.stringify(DEFAULT_CONFIG.services),
          DEFAULT_CONFIG.business_services,
          DEFAULT_CONFIG.tone,
          DEFAULT_CONFIG.model,
          DEFAULT_CONFIG.temperature,
          DEFAULT_CONFIG.max_tokens,
          DEFAULT_CONFIG.custom_prompt,
          DEFAULT_CONFIG.special_instructions,
          DEFAULT_CONFIG.greeting_message,
          DEFAULT_CONFIG.farewell_message,
          JSON.stringify(DEFAULT_CONFIG.default_responses),
          DEFAULT_CONFIG.enable_chatbot
        ]);
        console.log('✅ Configuração criada no PostgreSQL!');
      }
    }

    console.log('\n✨ Configuração do chatbot inicializada com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`   Nome: ${DEFAULT_CONFIG.business_name}`);
    console.log(`   Serviços: ${DEFAULT_CONFIG.business_services}`);
    console.log(`   Modelo: ${DEFAULT_CONFIG.model}`);
    console.log(`   Chatbot: ${DEFAULT_CONFIG.enable_chatbot ? '✅ Habilitado' : '❌ Desabilitado'}`);
    console.log('\n💡 Dica: Reinicie o servidor para aplicar as configurações!');

  } catch (error) {
    console.error('\n❌ Erro ao inicializar configuração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initChatbotConfig()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initChatbotConfig, DEFAULT_CONFIG };
