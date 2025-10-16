# backend/stop-dev.sh
#!/bin/bash

echo "🛑 Deteniendo HealthBridge Backend..."

# Matar todos los procesos de Node.js relacionados con el proyecto
pkill -f "healthbridge"
pkill -f "node.*3001"
pkill -f "node.*3002"
pkill -f "node.*3003"
pkill -f "node.*3004"
pkill -f "node.*3005"
pkill -f "node.*3006"
pkill -f "node.*3000"

# Detener contenedores Docker
echo "📦 Deteniendo servicios de infraestructura..."
docker stop healthbridge-mongodb healthbridge-rabbitmq 2>/dev/null || true
docker rm healthbridge-mongodb healthbridge-rabbitmq 2>/dev/null || true

echo "✅ Todos los servicios han sido detenidos."