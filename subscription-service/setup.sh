# =====================================================
# setup.sh
# =====================================================
#!/bin/bash

echo "🔧 Configurando HealthBridge Subscription Service..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Se requiere Node.js 18 o superior"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Crear directorios
mkdir -p logs dist

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Crear .env.development si no existe
if [ ! -f ".env.development" ]; then
    echo "⚙️  Creando .env.development..."
    cp .env.example .env.development
fi

# Compilar
echo "🔨 Compilando TypeScript..."
npm run build

echo ""
echo "✅ Subscription Service configurado!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Configurar variables de entorno en .env.development"
echo "   2. Configurar cuenta de Stripe y obtener API keys"
echo "   3. Ejecutar ./start-dev.sh"
echo ""