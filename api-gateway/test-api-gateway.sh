# =====================================================
# test-gateway.sh - Script de testing
# =====================================================
#!/bin/bash

echo "🧪 Testing HealthBridge Gateway..."
echo ""

GATEWAY_URL="http://localhost:3000"

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para testing
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4
    local data=$5

    echo -n "Testing: $description ... "

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$GATEWAY_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$GATEWAY_URL$endpoint")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        if [ -n "$body" ] && command -v jq &> /dev/null; then
            echo "   Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | head -c 100)"
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        if [ -n "$body" ]; then
            echo "   Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body)"
        fi
    fi
    echo ""
}

echo -e "${BLUE}=== Gateway Core Endpoints ===${NC}"
test_endpoint "GET" "/" "Gateway Root" "200"
test_endpoint "GET" "/health" "Health Check" "200"
test_endpoint "GET" "/metrics" "Metrics" "200"
test_endpoint "GET" "/services" "Services Info" "200"

echo -e "${BLUE}=== Service Proxies ===${NC}"
test_endpoint "GET" "/api/auth/health" "Auth Service Health (via proxy)" "200"

echo -e "${BLUE}=== Authentication Tests ===${NC}"
test_endpoint "GET" "/api/user/profile" "Protected endpoint without token" "401"

echo -e "${BLUE}=== Error Handling ===${NC}"
test_endpoint "GET" "/api/nonexistent" "404 Handler" "404"

echo -e "${BLUE}=== Rate Limiting Test ===${NC}"
echo "Sending 12 rapid requests to test rate limiting..."
for i in {1..12}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health")
    if [ "$status" = "429" ]; then
        echo -e "Request $i: ${YELLOW}$status (Rate Limited)${NC}"
    else
        echo -e "Request $i: ${GREEN}$status${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Gateway testing completed!${NC}"
echo ""
echo "📋 Para más pruebas detalladas:"
echo "   1. Asegúrate de que todos los microservicios estén corriendo"
echo "   2. Prueba endpoints protegidos con un token válido"
echo "   3. Verifica los logs en logs/combined.log"