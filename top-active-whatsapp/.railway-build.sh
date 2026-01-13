#!/bin/bash
# Script de build para Railway - Instala Chromium e dependências

set -e

echo "🔧 Instalando Chromium e dependências..."

# Atualizar pacotes
apt-get update

# Instalar Chromium e dependências
apt-get install -y \
  chromium \
  chromium-sandbox \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils

echo "✅ Chromium instalado"

# Verificar se Chromium foi instalado
if [ -f "/usr/bin/chromium" ]; then
  echo "✅ Chromium encontrado em /usr/bin/chromium"
  /usr/bin/chromium --version
elif [ -f "/usr/bin/chromium-browser" ]; then
  echo "✅ Chromium encontrado em /usr/bin/chromium-browser"
  /usr/bin/chromium-browser --version
else
  echo "⚠️ Chromium não encontrado nos caminhos esperados"
  which chromium || echo "   chromium não encontrado no PATH"
  which chromium-browser || echo "   chromium-browser não encontrado no PATH"
fi

# Instalar dependências Node
echo "📦 Instalando dependências Node..."
npm install

echo "✅ Build concluído"
