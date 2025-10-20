# =====================================================
# start-dev.sh - Iniciar en modo desarrollo
# =====================================================
#!/bin/bash

echo "🚀 Iniciando HealthBridge API Gateway en modo desarrollo..."

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencias no instaladas. Ejecuta ./setup.sh primero"
    exit 1
fi

# Verificar que .env.development existe
if [ ! -f ".env.development" ]; then
    echo "⚠️  Archivo .env.development no encontrado. Creando uno por defecto..."
    ./setup.sh
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Limpiar logs antiguos (opcional)
if [ "$1" = "--clean-logs" ]; then
    echo "🧹 Limpiando logs antiguos..."
    rm -f logs/*.log
fi

echo ""
echo "📋 Información del API Gateway:"
echo "   🌐 URL: http://localhost:3000"
echo "   🏥 Health: http://localhost:3000/health"
echo "   📊 Metrics: http://localhost:3000/metrics"
echo "   🔧 Services: http://localhost:3000/services"
echo ""
echo "📡 Servicios proxy configurados:"
echo "   /api/auth          -> Auth Service (3001)"
echo "   /api/user          -> User Service (3002)"
echo "   /api/appointment   -> Appointment Service (3003)"
echo "   /api/medical-record-> Medical Record Service (3004)"
echo "   /api/notification  -> Notification Service (3005)"
echo "   /api/billing       -> Billing Service (3006)"
echo "   /api/subscription  -> Subscription Service (3007)"
echo ""
echo "💡 Presiona Ctrl+C para detener"
echo ""

# Iniciar con nodemon para hot-reload
npm run dev