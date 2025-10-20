# =====================================================
# start-dev.sh
# =====================================================
#!/bin/bash

echo "🚀 Iniciando Subscription Service en desarrollo..."

if [ ! -d "node_modules" ]; then
    echo "❌ Dependencias no instaladas. Ejecuta ./setup.sh primero"
    exit 1
fi

mkdir -p logs

echo ""
echo "📋 Información del servicio:"
echo "   🌐 URL: http://localhost:3007"
echo "   🏥 Health: http://localhost:3007/health"
echo "   💳 Planes: http://localhost:3007/api/plans"
echo ""
echo "💡 Presiona Ctrl+C para detener"
echo ""

npm run dev