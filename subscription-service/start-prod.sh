# =====================================================
# start-prod.sh
# =====================================================
#!/bin/bash

echo "🚀 Iniciando Subscription Service en producción..."

if [ ! -d "dist" ]; then
    echo "❌ Build no encontrado. Ejecutando npm run build..."
    npm run build
fi

if [ ! -f ".env.production" ]; then
    echo "❌ Archivo .env.production no encontrado"
    exit 1
fi

mkdir -p logs

NODE_ENV=production node dist/index.js