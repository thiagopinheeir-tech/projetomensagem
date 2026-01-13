# Configurar Chromium no Railway para WhatsApp

## Problema
O QR code do WhatsApp não aparece porque o Puppeteer não consegue encontrar o Chrome/Chromium no Railway.

## Solução

### 1. Variável de Ambiente no Railway

Adicione a seguinte variável de ambiente no Railway:

**Nome:** `PUPPETEER_EXECUTABLE_PATH`  
**Valor:** `/usr/bin/chromium`

**Como adicionar:**
1. Acesse seu projeto no Railway
2. Vá em **Variables** (ou **Variáveis de Ambiente**)
3. Clique em **+ New Variable**
4. Nome: `PUPPETEER_EXECUTABLE_PATH`
5. Valor: `/usr/bin/chromium`
6. Clique em **Add**

### 2. Verificar se o nixpacks.toml está correto

O arquivo `nixpacks.toml` já foi criado e configurado para instalar o Chromium e todas as dependências necessárias.

### 3. Aguardar o Deploy

Após adicionar a variável de ambiente:
1. O Railway fará um novo deploy automaticamente
2. Aguarde o deploy terminar (pode levar 2-3 minutos)
3. Verifique os logs para confirmar que o Chromium foi instalado

### 4. Testar

Após o deploy:
1. Acesse o frontend
2. Clique em "Conectar WhatsApp"
3. O QR code deve aparecer agora

## Logs Esperados

Se tudo estiver funcionando, você verá nos logs:
```
🔧 [WhatsApp] Usando Chromium em: /usr/bin/chromium
📱 WHATSAPP QR CODE - ESCANEIE AGORA:
```

## Troubleshooting

Se ainda não funcionar:

1. **Verificar se o Chromium foi instalado:**
   - Nos logs do Railway, procure por mensagens de instalação do Chromium
   - Se não aparecer, o `nixpacks.toml` pode não estar sendo usado

2. **Verificar caminho do Chromium:**
   - Tente também: `/usr/bin/chromium-browser`
   - Ou verifique nos logs qual caminho foi detectado

3. **Forçar novo deploy:**
   - No Railway, vá em **Deployments**
   - Clique em **Redeploy**

## Nota

O `nixpacks.toml` instala automaticamente o Chromium e todas as dependências necessárias durante o build. A variável de ambiente apenas informa ao Puppeteer onde encontrar o executável.
