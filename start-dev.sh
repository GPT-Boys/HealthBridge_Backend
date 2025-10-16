# Scripts de desarrollo
# backend/start-dev.sh
#!/bin/bash

echo "🚀 Iniciando HealthBridge Backend en modo desarrollo..."

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker Desktop."
    exit 1
fi

# Crear red si no existe
docker network create healthbridge-network 2>/dev/null || true

echo "📦 Iniciando servicios de infraestructura..."

# Iniciar MongoDB
docker run -d \
  --name healthbridge-mongodb \
  --network healthbridge-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -v healthbridge_mongodb_data:/data/db \
  mongo:7.0 2>/dev/null || echo "MongoDB ya está corriendo"

# Iniciar RabbitMQ
docker run -d \
  --name healthbridge-rabbitmq \
  --network healthbridge-network \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password123 \
  -v healthbridge_rabbitmq_data:/var/lib/rabbitmq \
  rabbitmq:3.12-management 2>/dev/null || echo "RabbitMQ ya está corriendo"

echo "⏳ Esperando que los servicios estén listos..."
sleep 10

echo "🔧 Instalando dependencias..."

# Instalar dependencias en paralelo
(cd api-gateway && npm install) &
(cd auth-service && npm install) &
(cd user-service && npm install) &
(cd appointment-service && npm install) &
(cd medical-record-service && npm install) &
(cd notification-service && npm install) &
(cd billing-service && npm install) &

wait

echo "🎯 Iniciando microservicios en modo desarrollo..."

# Configurar variables de entorno
export JWT_SECRET="your-super-secret-jwt-key-here"
export MONGODB_URI_BASE="mongodb+srv://osquimenacho2002_db_user:LLLWy0c83sos1xN0@healthbridge.pykxi5g.mongodb.net"
export RABBITMQ_URL="amqp://admin:password123@localhost:5672"
export INTERNAL_API_KEY="ffQ56sSjipEcRMtrtNsqShb1qFZUB98S"

# Iniciar servicios en paralelo
(cd auth-service && PORT=3001 MONGODB_URI="${MONGODB_URI_BASE}/HB_auth-service_prod_DB?retryWrites=true&w=majority&appName=HealthBridge" npm run dev) &
(cd user-service && PORT=3002 MONGODB_URI="${MONGODB_URI_BASE}/HB_user-service_prod_DB?retryWrites=true&w=majority&appName=HealthBridge" npm run dev) &
(cd appointment-service && PORT=3003 MONGODB_URI="${MONGODB_URI_BASE}/HB_appointment-service_prod_DB?retryWrites=true&w=majority&appName=HealthBridge" npm run dev) &
(cd medical-record-service && PORT=3004 MONGODB_URI="${MONGODB_URI_BASE}/HB_medical-record-servic_prod_DB?retryWrites=true&w=majority&appName=HealthBridge" npm run dev) &
(cd notification-service && PORT=3005 MONGODB_URI="${MONGODB_URI_BASE}/HB_notification-service_prod_DB?retryWrites=true&w=majority&appName=HealthBridge" npm run dev) &
(cd billing-service && PORT=3006 MONGODB_URI="${MONGODB_URI_BASE}/HB_billing-service_prod_DB?retryWrites=true&w=majority&appName=HealthBridge" npm run dev) &

# Esperar un poco antes de iniciar el api-gateway
sleep 5

(cd api-gateway && PORT=3000 npm run dev) &

echo ""
echo "✅ HealthBridge Backend iniciado exitosamente!"
echo ""
echo "📋 Servicios disponibles:"
echo "   🚪 API Gateway:          http://localhost:3000"
echo "   🔐 Auth Service:         http://localhost:3001"
echo "   👤 User Service:         http://localhost:3002"
echo "   📅 Appointment Service:  http://localhost:3003"
echo "   📋 Medical Records:      http://localhost:3004"
echo "   🔔 Notifications:        http://localhost:3005"
echo "   💰 Billing:              http://localhost:3006"
echo ""
echo "🗄️  Base de datos:          mongodb+srv://osquimenacho2002_db_user:LLLWy0c83sos1xN0@healthbridge.pykxi5g.mongodb.net"
echo "🐰 RabbitMQ Management:     http://localhost:15672 (admin/password123)"
echo ""
echo "💡 Para detener todos los servicios, presiona Ctrl+C"
echo ""

# Esperar y mantener el script corriendo
wait