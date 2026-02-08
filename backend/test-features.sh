#!/bin/bash
# Test script for Card #16 (Telegram Bot) and Card #18 (Progress Tracking)

set -e

BASE_URL="http://localhost:3001"
PASS=0
FAIL=0

echo "🧪 Testing Dora Learning App Features"
echo "======================================"
echo ""

# Helper function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5
  
  echo -n "Testing: $description... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint" 2>/dev/null)
  fi
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" = "$expected_status" ]; then
    echo "✅ PASS (HTTP $status_code)"
    ((PASS++))
    return 0
  else
    echo "❌ FAIL (Expected $expected_status, got $status_code)"
    echo "   Response: $body"
    ((FAIL++))
    return 1
  fi
}

# Wait for server to be ready
echo "Checking server health..."
for i in {1..10}; do
  if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Server is running"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Server not responding. Please start the server first."
    exit 1
  fi
  sleep 1
done
echo ""

# ===========================================
# Card #16 - Telegram Bot Handling Tests
# ===========================================
echo "📱 Card #16 - Telegram Bot Handling"
echo "-----------------------------------"

# Test Telegram webhook status endpoint
test_endpoint "GET" "/webhook/telegram/status" "" "200" "Telegram status endpoint"

# Test Telegram webhook info endpoint  
test_endpoint "GET" "/webhook/telegram/info" "" "400" "Telegram info (no token configured)"

# Test Telegram webhook with mock message
echo -n "Testing: Telegram webhook handler exists... "
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"update_id": 123}' \
  "$BASE_URL/webhook/telegram" 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "200" ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL (got $status_code)"
  ((FAIL++))
fi

# Test webhook with text message (simulate Telegram update)
echo -n "Testing: Telegram text message handling... "
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 12345,
    "message": {
      "message_id": 1,
      "from": {"id": 123456, "first_name": "Test", "last_name": "User"},
      "chat": {"id": 123456, "type": "private"},
      "date": 1234567890,
      "text": "Hello Dora!"
    }
  }' \
  "$BASE_URL/webhook/telegram" 2>/dev/null)
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "200" ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL (got $status_code)"
  ((FAIL++))
fi

echo ""

# ===========================================
# Card #18 - Progress Tracking Tests
# ===========================================
echo "📊 Card #18 - Progress Tracking"
echo "--------------------------------"

# Test exploration tracking
test_endpoint "POST" "/api/progress/exploration" \
  '{"profileId": "test_profile", "type": "question", "content": "What is the sun?"}' \
  "201" "Track exploration"

# Test get explorations
test_endpoint "GET" "/api/progress/explorations/test_profile" "" "200" "Get explorations for profile"

# Test topic tracking (new topic)
test_endpoint "POST" "/api/progress/topic" \
  '{"profileId": "test_profile", "topicName": "astronomy", "source": "question"}' \
  "201" "Track new topic"

# Test topic tracking (existing topic)
test_endpoint "POST" "/api/progress/topic" \
  '{"profileId": "test_profile", "topicName": "astronomy", "source": "question"}' \
  "200" "Track existing topic (increment count)"

# Test get topics
test_endpoint "GET" "/api/progress/topics/test_profile" "" "200" "Get topics for profile"

# Test dashboard endpoint
test_endpoint "GET" "/api/progress/dashboard/test_profile" "" "200" "Get progress dashboard"

# Test timeline endpoint
test_endpoint "GET" "/api/progress/timeline/test_profile?days=7" "" "200" "Get exploration timeline"

# Test lesson progress
test_endpoint "POST" "/api/progress/lessons" \
  '{"user_id": 1, "lesson_id": 1, "status": "in_progress", "progress_percent": 50}' \
  "200" "Update lesson progress"

test_endpoint "GET" "/api/progress/lessons/1" "" "200" "Get lesson progress for user"

# Test complete lesson
test_endpoint "POST" "/api/progress/lessons/1/1/complete" \
  '{"score": 100}' \
  "200" "Complete lesson"

# Test response tracking
test_endpoint "POST" "/api/progress/responses" \
  '{"user_id": 1, "lesson_id": 1, "question_id": 1, "answer": "Blue", "is_correct": true}' \
  "201" "Track response"

test_endpoint "GET" "/api/progress/responses/1" "" "200" "Get responses for user"

# Test user dashboard (parent view)
test_endpoint "GET" "/api/progress/dashboard/user/1" "" "200" "Get parent dashboard"

# Test exploration with photo type
test_endpoint "POST" "/api/progress/exploration" \
  '{"profileId": "test_profile", "userId": 1, "type": "photo", "content": "sunset photo", "metadata": {"filename": "test.jpg"}}' \
  "201" "Track photo exploration"

echo ""

# ===========================================
# Summary
# ===========================================
echo "======================================"
echo "📋 Test Summary"
echo "======================================"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed. Please review."
  exit 1
fi
