# =====================================================
# appointment-service/start-dev.sh
# Script para iniciar en modo desarrollo
# =====================================================

#!/bin/bash

echo "📅 Iniciando HealthBridge Appointment Service en modo desarrollo..."

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que existe .env.development
if [ ! -f .env.development ]; then
    echo -e "${RED}❌ Archivo .env.development no encontrado${NC}"
    echo "Creando archivo de ejemplo..."
    cp .env.development.example .env.development 2>/dev/null || echo "Cree manualmente el archivo .env.development"
    exit 1
fi

# Verificar MongoDB
echo -e "${BLUE}🔍 Verificando MongoDB...${NC}"
if ! nc -z localhost 27017 2>/dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB no está corriendo en localhost:27017${NC}"
    echo ""
    echo "Opciones para iniciar MongoDB:"
    echo ""
    echo "1. Docker:"
    echo "   docker run -d --name mongodb -p 27017:27017 \\"
    echo "     -e MONGO_INITDB_ROOT_USERNAME=admin \\"
    echo "     -e MONGO_INITDB_ROOT_PASSWORD=password123 \\"
    echo "     mongo:7.0"
    echo ""
    echo "2. Sistema (si está instalado):"
    echo "   sudo systemctl start mongod"
    echo ""
    read -p "¿Continuar de todas formas? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ MongoDB está corriendo${NC}"
fi

# Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Instalando dependencias...${NC}"
    npm install
fi

# Limpiar logs antiguos si existen
if [ -d "logs" ]; then
    echo -e "${BLUE}🧹 Limpiando logs antiguos...${NC}"
    rm -f logs/*.log
fi

# Crear carpeta de logs si no existe
mkdir -p logs

echo ""
echo -e "${GREEN}✅ Todo listo! Iniciando servidor de citas...${NC}"
echo -e "${BLUE}📍 Puerto: 3003${NC}"
echo -e "${BLUE}📍 Environment: development${NC}"
echo -e "${BLUE}📍 Database: healthbridge_appointments${NC}"
echo ""

# Iniciar el servidor
npm run dev