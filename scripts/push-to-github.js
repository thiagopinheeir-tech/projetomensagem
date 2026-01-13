/**
 * Script para fazer push automático para GitHub
 * Tenta múltiplas formas de fazer commit e push
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WHATSAPP_JS_PATH = path.join(__dirname, '..', 'services', 'whatsapp.js');

console.log('🚀 Iniciando push automático para GitHub...\n');

// Verificar se arquivo existe
if (!fs.existsSync(WHATSAPP_JS_PATH)) {
  console.error('❌ Arquivo whatsapp.js não encontrado!');
  process.exit(1);
}

// Verificar se tem a correção
const fileContent = fs.readFileSync(WHATSAPP_JS_PATH, 'utf8');
if (!fileContent.includes('NÃO inicializar automaticamente sem userId')) {
  console.error('❌ Correção não encontrada no arquivo!');
  process.exit(1);
}

console.log('✅ Arquivo verificado e correto!\n');

// Tentar encontrar Git
let gitPath = null;
const possiblePaths = [
  'git',
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\bin\\git.exe',
  process.env.LOCALAPPDATA + '\\GitHubDesktop\\app-*\\resources\\app\\git\\cmd\\git.exe'
];

for (const git of possiblePaths) {
  try {
    if (git.includes('*')) {
      // Para GitHub Desktop, precisa encontrar a versão
      const githubDesktopPath = git.replace('*', '');
      if (fs.existsSync(githubDesktopPath.replace('git.exe', ''))) {
        const versions = fs.readdirSync(path.dirname(githubDesktopPath.replace('\\git\\cmd\\git.exe', '')));
        if (versions.length > 0) {
          const latestVersion = versions.sort().reverse()[0];
          gitPath = git.replace('*', latestVersion);
          if (fs.existsSync(gitPath)) break;
        }
      }
    } else {
      execSync(`${git} --version`, { stdio: 'ignore' });
      gitPath = git;
      break;
    }
  } catch (e) {
    // Continuar tentando
  }
}

if (!gitPath) {
  console.log('⚠️ Git não encontrado no sistema.');
  console.log('\n📋 SOLUÇÃO ALTERNATIVA:');
  console.log('1. Acesse: https://github.com/thiagopinheeir-tech/projetomensagem/blob/main/top-active-whatsapp/services/whatsapp.js');
  console.log('2. Clique no ícone de lápis (✏️) para editar');
  console.log('3. Siga as instruções em: SOLUCAO-ALTERNATIVA-PUSH.md');
  process.exit(0);
}

console.log(`✅ Git encontrado: ${gitPath}\n`);

// Verificar se é repositório Git
try {
  process.chdir(path.join(__dirname, '..'));
  execSync(`${gitPath} rev-parse --git-dir`, { stdio: 'ignore' });
  console.log('✅ Repositório Git encontrado!\n');
} catch (e) {
  console.log('⚠️ Diretório atual não é um repositório Git.');
  console.log('\n📋 SOLUÇÃO:');
  console.log('1. Abra GitHub Desktop');
  console.log('2. Adicione este repositório: File → Add Local Repository');
  console.log('3. Selecione: C:\\Users\\thiag\\Desktop\\top-active-whatsapp');
  console.log('4. Faça commit e push manualmente');
  process.exit(0);
}

// Tentar fazer commit e push
try {
  console.log('[1/3] Adicionando arquivo...');
  execSync(`${gitPath} add services/whatsapp.js`, { stdio: 'inherit' });
  
  console.log('[2/3] Fazendo commit...');
  execSync(`${gitPath} commit -m "Fix: Prevent WhatsApp auto-initialization without userId"`, { stdio: 'inherit' });
  
  console.log('[3/3] Fazendo push...');
  execSync(`${gitPath} push origin main`, { stdio: 'inherit' });
  
  console.log('\n✅ Push realizado com sucesso!');
  console.log('⏱️ Aguarde 1-2 minutos e verifique no Railway.');
} catch (error) {
  console.error('\n❌ Erro ao fazer push:', error.message);
  console.log('\n📋 SOLUÇÃO ALTERNATIVA:');
  console.log('1. Acesse: https://github.com/thiagopinheeir-tech/projetomensagem/blob/main/top-active-whatsapp/services/whatsapp.js');
  console.log('2. Clique no ícone de lápis (✏️) para editar');
  console.log('3. Siga as instruções em: SOLUCAO-ALTERNATIVA-PUSH.md');
}
