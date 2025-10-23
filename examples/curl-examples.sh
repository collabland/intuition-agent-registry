#!/bin/bash

# Agent Registry API Examples using cURL
# Make sure your server is running on localhost:3000

API_BASE_URL="http://localhost:3000"
API_KEY="your_api_key_here"  # Replace with your actual API key

echo "=== Agent Registry cURL Examples ==="
echo

# 1. Health Check
echo "1. Health Check:"
curl -X GET "$API_BASE_URL/health"
echo -e "\n"

# 2. API Info
echo "2. API Information:"
curl -X GET "$API_BASE_URL/"
echo -e "\n"

# 3. Register an Agent
echo "3. Register an Agent:"
curl -X POST "$API_BASE_URL/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "did:example:mycoolbot": {
      "type": "agent",
      "name": "My Cool Bot",
      "description": "A helpful AI assistant",
      "url": "https://mycoolbot.com/a2a",
      "capabilities": ["web_search", "coding", "defi"]
    }
  }'
echo -e "\n"

# 4. Register Multiple Agents
echo "4. Register Multiple Agents:"
curl -X POST "$API_BASE_URL/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "did:example:agent1": {
      "type": "agent",
      "name": "Agent One",
      "description": "First agent",
      "url": "https://agent1.com/a2a",
      "capabilities": ["web_search"]
    },
    "did:example:agent2": {
      "type": "agent",
      "name": "Agent Two",
      "description": "Second agent",
      "url": "https://agent2.com/a2a",
      "capabilities": ["defi", "trading"]
    }
  }'
echo -e "\n"

# 5. Search for Agents
echo "5. Search for Agents:"
curl -X POST "$API_BASE_URL/agents/search" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": [
      { "type": "agent" },
      { "capabilities": "web_search" }
    ]
  }'
echo -e "\n"

# 6. Search with Trusted Accounts
echo "6. Search with Trusted Accounts:"
curl -X POST "$API_BASE_URL/agents/search" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": [
      { "type": "agent" },
      { "capabilities": "defi" }
    ],
    "trustedAccounts": ["0x1234567890abcdef1234567890abcdef12345678"]
  }'
echo -e "\n"

# 7. Webhook Event (Quiz Completed)
echo "7. Webhook Event (Quiz Completed):"
curl -X POST "$API_BASE_URL/v1/intuition/events" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "type": "quiz_completed",
    "userAddress": "0x4917e853DC273da5F84362aB9f13eE49775B263c",
    "communityId": "391378559945670667",
    "metadata": {
      "quizId": "3e961b41-e62d-4d8c-93ec-a18cb8a948ab",
      "completedAt": "2025-10-12T20:49:17.000Z"
    },
    "version": "1.0.0"
  }'
echo -e "\n"

# 8. Test API Key Authentication (Invalid Key)
echo "8. Test Invalid API Key:"
curl -X POST "$API_BASE_URL/v1/intuition/events" \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid_key" \
  -d '{
    "type": "quiz_completed",
    "userAddress": "0x123",
    "communityId": "test",
    "metadata": {
      "quizId": "test",
      "completedAt": "2025-01-01T00:00:00.000Z"
    },
    "version": "1.0.0"
  }'
echo -e "\n"

# 9. Test Missing API Key
echo "9. Test Missing API Key:"
curl -X POST "$API_BASE_URL/v1/intuition/events" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "quiz_completed",
    "userAddress": "0x123",
    "communityId": "test",
    "metadata": {
      "quizId": "test",
      "completedAt": "2025-01-01T00:00:00.000Z"
    },
    "version": "1.0.0"
  }'
echo -e "\n"

# 10. Test Invalid Endpoint
echo "10. Test Invalid Endpoint:"
curl -X GET "$API_BASE_URL/invalid-endpoint"
echo -e "\n"

echo "=== Examples Complete ==="
