#!/bin/bash

echo "🚀 Iniciando Medical Record Service en modo desarrollo..."

# Verificar que existe el archivo .env.development
if [ ! -f .env.development ]; then
    echo "⚠️  No se encontró .env.development, copiando desde .env.example..."
    cp .env.example .env.development
fi

# Crear directorios necesarios
mkdir -p logs uploads

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Iniciar servidor en modo desarrollo
echo "✅ Iniciando servidor..."
npm run dev
