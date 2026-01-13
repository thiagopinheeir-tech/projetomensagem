# Como Instalar Chromium no Railway

## Problema
O QR code do WhatsApp não aparece porque o Chromium não está instalado no Railway.

## Solução 1: Usar Buildpack do Puppeteer (RECOMENDADO)

O Railway tem um buildpack específico para Puppeteer que instala o Chromium automaticamente.

### Passos:

1. **No Railway, vá em Settings do seu serviço**
2. **Procure por "Buildpacks" ou "Build Packs"**
3. **Adicione este buildpack:**
   ```
   https://github.com/ryannono/Puppeteer-Railway-Buildpack
   ```
4. **Ou use via variável de ambiente:**
   - Nome: `BUILDPACK_URL`
   - Valor: `https://github.com/ryannono/Puppeteer-Railway-Buildpack`

## Solução 2: Usar Dockerfile (ALTERNATIVA)

Se o buildpack não funcionar, podemos usar um Dockerfile customizado.

### Passos:

1. O arquivo `Dockerfile` já existe em `top-active-whatsapp/Dockerfile`
2. Atualize o `railway.json` para usar Docker:
   ```json
   {
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "top-active-whatsapp/Dockerfile"
     }
   }
   ```

## Solução 3: Verificar se nixpacks.toml está sendo usado

1. **Verifique os logs de build do Railway**
2. **Procure por mensagens sobre instalação do Chromium**
3. **Se não aparecer, o `nixpacks.toml` pode não estar sendo detectado**

### Como verificar:
- Nos logs de build, procure por: `Installing apt packages` ou `chromium`
- Se não aparecer, o Railway pode não estar usando o `nixpacks.toml`

## Solução 4: Configurar Variável de Ambiente (TEMPORÁRIA)

Enquanto o Chromium não é instalado, você pode remover a variável `PUPPETEER_EXECUTABLE_PATH` e deixar o Puppeteer tentar baixar o Chrome automaticamente (pode não funcionar devido a limitações do Railway).

## Recomendação

**Use a Solução 1 (Buildpack)** - é a mais confiável e mantida pela comunidade Railway.
