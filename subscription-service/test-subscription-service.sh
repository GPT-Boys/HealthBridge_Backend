# =====================================================
# test-subscription-service.sh
# =====================================================
#!/bin/bash

echo "🧪 Testing Subscription Service..."
echo ""

SERVICE_URL="http://localhost:3007"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected=$4

    echo -n "Testing: $description ... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$SERVICE_URL$endpoint")
    
    if [ "$status" = "$expected" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status)"
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected, Got: $status)"
    fi
}

# Tests
test_endpoint "GET" "/" "Service root" "200"
test_endpoint "GET" "/health" "Health check" "200"
test_endpoint "GET" "/api/plans" "Get all plans" "200"
test_endpoint "GET" "/api/plans/basic" "Get basic plan" "200"
test_endpoint "GET" "/api/plans/premium" "Get premium plan" "200"
test_endpoint "GET" "/api/plans/enterprise" "Get enterprise plan" "200"

echo ""
echo "✅ Testing completed!"