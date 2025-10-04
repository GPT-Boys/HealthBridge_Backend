#!/bin/bash
# =====================================================
# auth-service/setup.sh
# Script de configuración inicial
# =====================================================

echo "🚀 Configurando HealthBridge Auth Service..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -e "${BLUE}Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js 18+ desde https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Se requiere Node.js 18 o superior${NC}"
    echo "Versión actual: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Crear estructura de carpetas
echo -e "${BLUE}Creando estructura de carpetas...${NC}"
mkdir -p logs
mkdir -p src/{config,controllers,middleware,models,routes,services,utils}

# Instalar dependencias
echo -e "${BLUE}Instalando dependencias...${NC}"
npm install

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo -e "${BLUE}Creando archivo .env...${NC}"
    cat > .env << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb+srv://osquimenacho2002_db_user:LLLWy0c83sos1xN0@healthbridge.pykxi5g.mongodb.net/?retryWrites=true&w=majority&appName=HealthBridge

# JWT Configuration
JWT_SECRET=healthbridge-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=healthbridge-refresh-secret-key-change-in-production-2024
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15m

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# CORS
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=debug

# Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Other Services
USER_SERVICE_URL=http://localhost:3002
SUBSCRIPTION_SERVICE_URL=http://localhost:3007
EOF
    echo -e "${GREEN}✅ Archivo .env creado${NC}"
else
    echo -e "${YELLOW}⚠️  Archivo .env ya existe${NC}"
fi

# Crear .gitignore
echo -e "${BLUE}Creando .gitignore...${NC}"
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Misc
*.pem
EOF

echo -e "${GREEN}✅ Configuración completada${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo "1. Edita el archivo .env con tus configuraciones"
echo "2. Asegúrate de que MongoDB esté corriendo"
echo "3. Ejecuta: npm run dev"
echo ""
echo -e "${GREEN}🎉 ¡Listo para empezar!${NC}"