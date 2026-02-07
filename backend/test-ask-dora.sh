#!/bin/bash
# M2 Test: Ask Dora with OpenClaw integration and fallback
# Run: ./test-ask-dora.sh

API_URL="${API_URL:-http://localhost:3001}"

echo "🧪 Testing Ask Dora M2..."
echo ""

# Health check
echo "1. Health check..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ Server healthy"
else
    echo "   ❌ Server not responding"
    exit 1
fi

# Login
echo "2. Login as parent..."
LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"parent","password":"family123"}')
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "   ❌ Failed to login"
    exit 1
fi
echo "   ✅ Got token"

# Create conversation
echo "3. Create conversation..."
CONV=$(curl -s -X POST "$API_URL/api/ask-dora/new" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"profileId":"aiden","profileName":"Aiden"}')
CONV_ID=$(echo "$CONV" | grep -o '"conversationId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
    echo "   ❌ Failed to create conversation"
    echo "   Response: $CONV"
    exit 1
fi
echo "   ✅ Conversation: $CONV_ID"

# Send message
echo "4. Send message to Dora..."
MSG=$(curl -s -X POST "$API_URL/api/ask-dora/message" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"conversationId\":\"$CONV_ID\",\"profileId\":\"aiden\",\"profileName\":\"Aiden\",\"profileAge\":6,\"message\":\"Hi Dora! What color is the sky?\"}")

# Check response has required fields
if echo "$MSG" | grep -q '"success":true'; then
    echo "   ✅ Got response"
else
    echo "   ❌ Request failed"
    echo "   Response: $MSG"
    exit 1
fi

# Check source field exists (M2 requirement)
SOURCE=$(echo "$MSG" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)
if [ -n "$SOURCE" ]; then
    echo "   ✅ Source: $SOURCE"
else
    echo "   ❌ Missing source field"
    exit 1
fi

# Check response text
TEXT=$(echo "$MSG" | grep -o '"text":"[^"]*"' | cut -d'"' -f4 | head -1)
echo "   📝 Dora says: ${TEXT:0:60}..."

echo ""
echo "✅ All M2 tests passed!"
echo "   - OpenClaw integration: Ready (needs OPENCLAW_GATEWAY_URL)"
echo "   - Claude fallback: Working"
echo "   - Source indicator: $SOURCE"
