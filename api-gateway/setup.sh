#!/bin/bash
# =====================================================
# setup.sh - Script de instalación inicial
# =====================================================

echo "🔧 Configurando HealthBridge API Gateway..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instala Node.js 18+ desde https://nodejs.org/"
    exit 1
fi

node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Se requiere Node.js 18 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p logs
mkdir -p dist

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Crear archivo .env.development si no existe
if [ ! -f ".env.development" ]; then
    echo "⚙️  Creando .env.development..."
    cp .env.example .env.development
fi

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

echo ""
echo "✅ API Gateway configurado exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Revisar y ajustar .env.development si es necesario"
echo "   2. Ejecutar ./start-dev.sh para iniciar en modo desarrollo"
echo "   3. O ejecutar npm run dev directamente"
echo ""