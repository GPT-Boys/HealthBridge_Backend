# =====================================================
# auth-service/test-api.sh
# Script para probar la API
# =====================================================

#!/bin/bash

echo "🧪 Probando HealthBridge Auth Service API..."

API_URL="http://localhost:3001"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para test
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo ""
    echo -e "${BLUE}Testing: ${description}${NC}"
    echo "Endpoint: ${method} ${endpoint}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${API_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${API_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success (${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ Failed (${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
}

# 1. Health Check
test_endpoint "GET" "/health" "" "Health Check"

# 2. Registrar usuario
echo ""
read -p "¿Deseas probar el registro de usuario? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    test_endpoint "POST" "/api/auth/register" '{
        "email": "test.doctor@healthbridge.bo",
        "password": "Test123!@#05qu1",
        "firstName": "Dr Test",
        "lastName": "Usuario",
        "role": "doctor",
        "profile": {
            "phone": "+59171234567",
            "specialization": "Medicina General",
            "licenseNumber": "MED-TEST-001"
        }
    }' "Registro de usuario"
    
    # Guardar tokens si el registro fue exitoso
    TOKENS=$(echo "$body" | jq -r '.accessToken + " " + .refreshToken' 2>/dev/null)
    if [ ! -z "$TOKENS" ]; then
        ACCESS_TOKEN=$(echo $TOKENS | cut -d' ' -f1)
        REFRESH_TOKEN=$(echo $TOKENS | cut -d' ' -f2)
        echo ""
        echo "🔑 Tokens guardados para pruebas posteriores"
    fi
fi

# 3. Login
echo ""
read -p "¿Deseas probar el login? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    test_endpoint "POST" "/api/auth/login" '{
        "email": "test.doctor@healthbridge.bo",
        "password": "Test123!@#05qu1"
    }' "Login de usuario"
    
    # Guardar tokens del login
    TOKENS=$(echo "$body" | jq -r '.accessToken + " " + .refreshToken' 2>/dev/null)
    if [ ! -z "$TOKENS" ]; then
        ACCESS_TOKEN=$(echo $TOKENS | cut -d' ' -f1)
        REFRESH_TOKEN=$(echo $TOKENS | cut -d' ' -f2)
    fi
fi

# 4. Verify Token (si tenemos access token)
if [ ! -z "$ACCESS_TOKEN" ]; then
    echo ""
    read -p "¿Deseas verificar el token? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -s -X POST "${API_URL}/api/auth/verify-token" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "Content-Type: application/json" | jq '.'
    fi
fi

# 5. Refresh Token
if [ ! -z "$REFRESH_TOKEN" ]; then
    echo ""
    read -p "¿Deseas probar refresh token? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_endpoint "POST" "/api/auth/refresh-token" "{
            \"refreshToken\": \"${REFRESH_TOKEN}\"
        }" "Refresh Token"
    fi
fi

echo ""
echo "✅ Tests completados"