# =====================================================
# start-prod.sh - Iniciar en modo producción
# =====================================================
#!/bin/bash

echo "🚀 Iniciando HealthBridge API Gateway en modo producción..."

# Verificar build
if [ ! -d "dist" ]; then
    echo "❌ Build no encontrado. Ejecutando npm run build..."
    npm run build
fi

# Verificar .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ Archivo .env.production no encontrado"
    echo "Por favor crea el archivo .env.production con las configuraciones de producción"
    exit 1
fi

# Crear directorio de logs
mkdir -p logs

echo ""
echo "📋 Iniciando API Gateway en modo producción..."
echo "   Environment: production"
echo "   Port: 3000"
echo ""

# Iniciar con Node directamente
NODE_ENV=production node dist/index.js