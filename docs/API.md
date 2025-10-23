# API Documentation

Complete reference for the Agent Registry API endpoints.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-app-name.herokuapp.com`

## Authentication

Most endpoints are public, but webhook endpoints require API key authentication:

```bash
# Include API key in header
x-api-key: your_api_key_here
```

## Endpoints

### Health Check

Check if the API is running and healthy.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T12:00:00.000Z",
  "account": "0x1234567890abcdef..."
}
```

---

### API Information

Get information about available endpoints.

**Endpoint**: `GET /`

**Response**:
```json
{
  "name": "Agent Registry API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "webhook": "POST /v1/intuition/events"
  }
}
```

---

### Register Agent(s)

Register one or more agents to the blockchain registry.

**Endpoint**: `POST /agents`

**Request Body**:
```json
{
  "did:example:123": {
    "type": "agent",
    "name": "My AI Agent",
    "description": "An AI assistant specialized in DeFi",
    "url": "https://myagent.example.com/a2a",
    "capabilities": ["web_search", "defi", "file_search"]
  },
  "did:example:456": {
    "type": "agent",
    "name": "Another Agent",
    "description": "Web search specialist",
    "url": "https://anotheragent.example.com/a2a",
    "capabilities": ["web_search"]
  }
}
```

**Validation Rules**:
- DID must start with `did:`
- Each agent must have at least `type` and `name` fields
- Keys can only be one level deep (no nested objects in values)

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Agent(s) registered successfully",
  "count": 2,
  "dids": ["did:example:123", "did:example:456"]
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid DID format",
  "message": "DID must start with \"did:\" - got \"example:123\""
}
```

---

### Search Agents

Search for agents based on criteria and trusted accounts.

**Endpoint**: `POST /agents/search`

**Request Body**:
```json
{
  "criteria": [
    { "type": "agent" },
    { "capabilities": "web_search" }
  ],
  "trustedAccounts": ["0x1234567890abcdef..."]
}
```

**Parameters**:
- `criteria` (required): Array of key-value pairs to match. All criteria must be satisfied (AND logic).
- `trustedAccounts` (optional): Array of blockchain addresses to filter by. Defaults to the server's account if not provided.

**Success Response** (200 OK):
```json
{
  "success": true,
  "count": 1,
  "results": {
    "did:example:123": {
      "name": "My AI Agent",
      "capabilities": ["file_search", "web_search", "defi"],
      "type": "agent",
      "description": "An AI assistant specialized in DeFi",
      "url": "https://myagent.example.com/a2a"
    }
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid request body",
  "message": "Expected \"criteria\" as an array of key-value pairs"
}
```

---

### Webhook Endpoint

Generic webhook endpoint for external integrations (Zapier, Make, etc.).

**Endpoint**: `POST /v1/intuition/events`

**Authentication**: Required (API key)

**Request Body**:
```json
{
  "type": "quiz_completed",
  "userAddress": "0x...",
  "communityId": "...",
  "metadata": {
    "quizId": "...",
    "completedAt": "..."
  },
  "version": "1.0.0"
}
```

**Supported Event Types**:
- `quiz_completed`: User completed a quiz

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Event 'quiz_completed' received and processed",
  "timestamp": "2025-10-13T12:00:00.000Z"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid event structure",
  "message": "Missing 'type' field"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created (agent registered) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing API key) |
| 403 | Forbidden (invalid API key) |
| 404 | Not Found (invalid endpoint) |
| 500 | Internal Server Error (blockchain or system error) |

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production use, consider adding:

- Express rate limiter middleware
- IP-based throttling
- API key authentication

---

## Security Considerations

⚠️ **Important**:

1. Never commit your private key to git
2. Always use environment variables for sensitive data
3. Use HTTPS in production (Heroku provides this automatically)
4. Consider adding authentication for production deployments

---

## Examples

### cURL Examples

#### Register an Agent
```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "did:example:mycoolbot": {
      "type": "agent",
      "name": "My Cool Bot",
      "description": "A helpful AI assistant",
      "url": "https://mycoolbot.com/a2a",
      "capabilities": ["web_search", "coding"]
    }
  }'
```

#### Search for Agents
```bash
curl -X POST http://localhost:3000/agents/search \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": [
      { "type": "agent" },
      { "capabilities": "web_search" }
    ]
  }'
```

#### Webhook Call
```bash
curl -X POST http://localhost:3000/v1/intuition/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
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
```

### JavaScript Examples

#### Register an Agent
```javascript
const response = await fetch('http://localhost:3000/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    'did:example:myagent': {
      type: 'agent',
      name: 'My Agent',
      description: 'AI assistant',
      url: 'https://myagent.com',
      capabilities: ['web_search']
    }
  })
});

const result = await response.json();
console.log(result);
```

#### Search for Agents
```javascript
const response = await fetch('http://localhost:3000/agents/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    criteria: [
      { type: 'agent' },
      { capabilities: 'defi' }
    ],
    trustedAccounts: ['0x1234...']
  })
});

const result = await response.json();
console.log(result.results);
```

---

*Last updated: January 2025*
