const OpenAI = require('openai');
const ConversationManager = require('./conversation-manager');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Inicializar OpenAI
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Processa mensagem de áudio do WhatsApp
 * 1. Download do áudio
 * 2. Transcrição com Whisper
 * 3. Processamento com GPT (JP Financeira)
 * 4. Salva no Supabase
 * 5. Broadcast real-time
 */
async function handleAudioMessage(client, msg, chatbot, wsManager) {
  try {
    // Verificar se é áudio (hasMedia e type audio/ptt)
    if (!msg.hasMedia || (msg.type !== 'audio' && msg.type !== 'ptt')) {
      return false; // Não é áudio, continuar processamento normal
    }

    console.log(`🔊 Áudio recebido de ${msg.from}`);

    const phone = msg.from.replace('@c.us', '');
    const cleanPhone = phone.replace(/\D/g, '');

    if (!openai) {
      console.warn('⚠️  OpenAI não configurado. Não é possível processar áudio.');
      await msg.reply('💰 Desculpe, processamento de áudio não disponível no momento. Envie uma mensagem de texto!');
      return true;
    }

    // 1. Download do áudio
    console.log('📥 Baixando áudio...');
    const media = await msg.downloadMedia();
    
    if (!media || !media.data) {
      console.error('❌ Erro ao baixar áudio');
      await msg.reply('💰 Não consegui processar o áudio. Pode enviar por texto?');
      return true;
    }

    // 2. Converter base64 para buffer e salvar temporariamente
    const audioBuffer = Buffer.from(media.data, 'base64');
    const tempDir = path.join(__dirname, '..', 'temp');
    
    // Criar diretório temp se não existir
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileExtension = media.mimetype.includes('ogg') ? 'ogg' : media.mimetype.includes('mp3') ? 'mp3' : 'm4a';
    const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${cleanPhone}.${fileExtension}`);
    
    try {
      await writeFile(tempFilePath, audioBuffer);

      // 3. Transcrição com Whisper (PT-BR)
      console.log('🎤 Transcrevendo áudio com Whisper...');
      
      // OpenAI SDK para Node.js aceita fs.createReadStream diretamente
      const audioFile = fs.createReadStream(tempFilePath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        prompt: 'Cliente JP Financeira falando sobre empréstimo pessoal, juros ao dia, condições, valores. Transcreva fielmente em português brasileiro.'
      });

      const transcribedText = transcription.text.trim();
      const audioMessageText = `[ÁUDIO] ${transcribedText}`;

      console.log(`✅ Transcrição: ${transcribedText.substring(0, 100)}...`);

      // 4. Buscar histórico da conversa
      const history = await ConversationManager.getHistory(cleanPhone, 10);

      // 5. Gerar resposta com GPT (JP Financeira) - usar texto transcrito (sem [ÁUDIO])
      console.log('🤖 Gerando resposta GPT...');
      const aiResponse = await chatbot.generateResponse(transcribedText, history);

      // 6. Salvar mensagem e resposta usando ConversationManager (já salva no Supabase)
      await ConversationManager.saveMessage(cleanPhone, audioMessageText, aiResponse);

      // 7. Responder ao cliente
      await msg.reply(aiResponse);

      // 8. Broadcast real-time para dashboard
      if (wsManager) {
        wsManager.broadcast('new_conversation', {
          phone: cleanPhone,
          userMessage: audioMessageText,
          aiResponse: aiResponse,
          timestamp: Date.now(),
          isAudio: true
        });
      }

      console.log(`✅ Áudio processado com sucesso: ${cleanPhone}`);
      console.log(`🤖 Resposta: ${aiResponse.substring(0, 50)}...`);

      // Limpar arquivo temporário
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️  Erro ao limpar arquivo temporário:', cleanupError.message);
      }

      return true; // Áudio processado com sucesso

    } catch (audioError) {
      // Limpar arquivo temporário em caso de erro
      try {
        if (fs.existsSync(tempFilePath)) {
          await unlink(tempFilePath);
        }
      } catch (cleanupError) {
        // Ignorar erro de limpeza
      }
      throw audioError;
    }

  } catch (error) {
    console.error('❌ Erro ao processar áudio:', error);
    
    try {
      await msg.reply('💰 Desculpe, não consegui processar o áudio. Pode enviar sua mensagem por texto? 📱');
    } catch (replyError) {
      console.error('❌ Erro ao enviar mensagem de erro:', replyError);
    }
    
    return true; // Retornar true para não processar como texto normal
  }
}

module.exports = { handleAudioMessage };
