# =====================================================
# auth-service/start-prod.sh
# Script para producción
# =====================================================

#!/bin/bash

echo "🚀 Iniciando HealthBridge Auth Service en modo producción..."

# Build
echo "🔨 Construyendo aplicación..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build"
    exit 1
fi

echo "✅ Build exitoso"

# Iniciar
NODE_ENV=production npm start