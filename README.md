# Agent Registry

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Deploy to Heroku](https://img.shields.io/badge/Deploy-Heroku-purple?logo=heroku)](https://github.com/your-username/agent-registry/actions)

A decentralized agent registry built on the Intuition Protocol. Register, discover, and interact with AI agents in a decentralized manner - onchain.

## ✨ Features

- 🔗 **Decentralized Registry**: Store agent metadata on the blockchain
- 🌐 **REST API**: HTTP endpoints for registration and search
- 🔐 **Secure Authentication**: API key-based authentication
- 📡 **Webhook Support**: External integration capabilities
- 🏥 **Health Monitoring**: Built-in health checks and monitoring
- 🚀 **Production Ready**: Heroku deployment configuration included

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Private key for blockchain transactions

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/agent-registry.git
cd agent-registry

# Install dependencies
pnpm install

# Copy environment template
cp env.example .env
```

### Configuration

Edit your `.env` file:

```bash
# Required: Private key for blockchain transactions
SIGNER=0xyour_private_key_here

# API Key for webhook authentication
API_KEY=your_secure_api_key_here

# Optional: Server port (defaults to 3000)
PORT=3000
```

### Running the Server

```bash
# Development mode (with auto-reload)
pnpm run dev

# Production mode
pnpm start
```

## 📖 Usage

### Register an Agent

```bash
curl -X POST http://localhost:3001/agents \
  -H "Content-Type: application/json" \
  -d '{
    "did:example:myagent": {
      "type": "agent",
      "name": "My AI Agent",
      "description": "An AI assistant specialized in DeFi",
      "url": "https://myagent.example.com/a2a",
      "capabilities": ["web_search", "defi", "file_search"]
    }
  }'
```

### Search for Agents

```bash
curl -X POST http://localhost:3001/agents/search \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": [
      { "type": "agent" },
      { "capabilities": "web_search" }
    ],
    "trustedAccounts": ["0x1234567890abcdef..."]
  }'
```

### Generic Sync (any JSON → flattened with ":")

POST `/v1/intuition/` accepts any JSON object. The payload is flattened into one level using `:` as the key joiner (e.g., `profile:meta:capabilities`). The DID used is derived from `SIGNER` in `.env` (`did:eth:<signer>`). The sync is idempotent; re-sending existing atoms returns 200.

```bash
# If you run on port 3001, adjust the URL accordingly
curl -X POST http://localhost:3001/v1/intuition/ \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "type": "agent",
    "profile": {
      "name": "Alpha",
      "meta": { "capabilities": ["web_search", {"nested": "obj"}] }
    },
    "score": 42
  }'
```

JavaScript (fetch):

```javascript
await fetch('http://localhost:3001/v1/intuition/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({
    type: 'agent',
    profile: { name: 'Alpha', meta: { capabilities: ['web_search', { nested: 'obj' }] } },
    score: 42,
  }),
});
```

Resulting on-chain key/value pairs (example):

```
{
  "type": "agent",
  "profile:name": "Alpha",
  "profile:meta:capabilities": ["web_search", "{\"nested\":\"obj\"}"],
  "score": "42"
}
```

### Agent Sync from URL (fetch JSON → flatten with ":")

POST `/v1/intuition/agent` with body `{ "url": "https://.../agent.json" }`. The server fetches JSON from the URL, flattens it using `:`, and syncs under the `SIGNER` DID. Idempotent: existing atoms return 200 with a no-op message.

```bash
curl -X POST http://localhost:3001/v1/intuition/agent \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"url":"https://system-integration.telex.im/chessagent/.well-known/agent.json"}'
```

Raw string (text/plain) URL body:

```bash
curl -X POST http://localhost:3001/v1/intuition/agent \
  -H "Content-Type: text/plain" \
  -H "x-api-key: $API_KEY" \
  --data-binary 'https://system-integration.telex.im/chessagent/.well-known/agent.json'
```

JavaScript (fetch):

```javascript
await fetch('http://localhost:3001/v1/intuition/agent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({ url: 'https://system-integration.telex.im/chessagent/.well-known/agent.json' }),
});

// text/plain raw URL variant
await fetch('http://localhost:3001/v1/intuition/agent', {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'x-api-key': API_KEY,
  },
  body: 'https://system-integration.telex.im/chessagent/.well-known/agent.json',
});
```

Notes:

- JSON is required at the URL; non-JSON returns 415.
- Upstream timeouts are 15s (504).
- The DID is `did:eth:<SIGNER>`. Keys use the `:` joiner.
- Re-sending the same data is treated as success (idempotent no-op).

### Search Endpoint (flatten JSON or URL → criteria)

POST `/v1/intuition/search` accepts either:

- A JSON object (nested allowed; it will be flattened with `:`), or
- A single-key JSON object `{ "URL": "https://.../criteria.json" }` (server fetches JSON), or
- A raw string body (text/plain) that is a URL.

The flattened map becomes search criteria: each key/value pair turns into `{ key: value }`. Arrays produce multiple criteria entries for the same key. Searches are scoped by your `SIGNER` as the trusted account.

Examples:

```bash
# 1) Direct JSON body (multiple criteria)
curl -X POST http://localhost:3001/v1/intuition/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "type": "agent",
    "capabilities": "web_search"
  }'

# 2) Nested JSON body (flattened with ':')
curl -X POST http://localhost:3001/v1/intuition/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "profile": { "meta": { "capabilities": ["web_search", "coding"] } }
  }'

# 3) URL wrapper (server fetches JSON from URL)
curl -X POST http://localhost:3001/v1/intuition/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"URL":"https://example.com/criteria.json"}'

# 4) Raw string body (text/plain) that is a URL
curl -X POST http://localhost:3001/v1/intuition/search \
  -H "Content-Type: text/plain" \
  -H "x-api-key: $API_KEY" \
  --data-binary 'https://example.com/criteria.json'
```

JavaScript (fetch):

```javascript
// 1) Direct JSON body
await fetch('http://localhost:3001/v1/intuition/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({ type: 'agent', capabilities: 'web_search' }),
});

// 2) URL wrapper
await fetch('http://localhost:3001/v1/intuition/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({ URL: 'https://example.com/criteria.json' }),
});

// 3) Raw string body (text/plain URL)
await fetch('http://localhost:3001/v1/intuition/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'x-api-key': API_KEY,
  },
  body: 'https://example.com/criteria.json',
});
```

Response (shape):

```
{
  "success": true,
  "count": 1,
  "criteria": [{ "type": "agent" }, { "capabilities": "web_search" }],
  "trusted": ["0x...SIGNER"],
  "result": { /* SDK response */ }
}
```

### Mother Open Registry Endpoints

The Mother Open Registry provides specialized endpoints for registering and discovering agents using ERC8004 identity cards and NFT-based identifiers.

#### Register ERC8004 Identity Card

POST `/v1/mother/erc8004` accepts a token URI pointing to an ERC8004 identity card metadata. The endpoint validates the ERC8004 format, extracts the NFT ID from the metadata, fetches and merges A2A agent card data if available, and syncs the agent data to Intuition.

**Request Body**: `text/plain` - A token URI (e.g., `https://ipfs.io/ipfs/...` or `ipfs://...`)

```bash
curl -X POST http://localhost:3001/v1/mother/erc8004 \
  -H "Content-Type: text/plain" \
  -H "x-api-key: $API_KEY" \
  --data-binary 'https://ipfs.io/ipfs/Qm...'
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "ERC8004 identity card processed and synced",
  "nftId": "11155111:0x...:123",
  "timestamp": "2025-01-13T12:00:00.000Z"
}
```

**Notes**:
- The NFT must already be minted on Sepolia ETH (chain ID: 11155111)
- The token URI must point to valid ERC8004 metadata JSON
- A2A agent card data is automatically fetched and merged if an A2A endpoint is present
- The NFT ID format is `chainId:contractAddress:tokenId`
- Idempotent: re-syncing returns 200 with "already synced" message

#### Get All Agents

GET `/v1/mother/agents` retrieves all agents registered in the Mother Open Registry. Supports optional pagination.

**Query Parameters**:
- `page` (optional): Page number (defaults to 1 if provided)
- `limit` (optional): Items per page (defaults to 20 if provided, max 100)
- If neither `page` nor `limit` are provided, returns all agents

# Get all agents
```bash
curl -X GET "http://localhost:3001/v1/mother/agents" \
  -H "x-api-key: $API_KEY"

# Get paginated results
curl -X GET "http://localhost:3001/v1/mother/agents?page=1&limit=20" \
  -H "x-api-key: $API_KEY"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "agents": [
    {
      "nftId": "11155111:0x...:123",
      "name": "My Agent",
      "description": "...",
      ...
    }
  ]
}
```

#### Get Agent by NFT ID
GET `/v1/mother/agent/:nftId` retrieves detailed information for a specific agent by its NFT ID.

**Path Parameter**: `nftId` - The NFT identifier in format `chainId:contractAddress:tokenId`

```bash
curl -X GET "http://localhost:3001/v1/mother/agent/11155111:0x...:123" \
  -H "x-api-key: $API_KEY"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "nftId": "11155111:0x...:123",
  "agent": {
    "name": "My Agent",
    "description": "...",
    ...
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": "Agent not found",
  "message": "No atom found with subject: 11155111:0x...:123"
}
```

### Port and API key

- Default port is 3001; set `PORT=3001` (or any) in `.env` to change.
- Include `x-api-key` in requests. You can export from `.env`:

```bash
export API_KEY=$(grep '^API_KEY=' .env | cut -d= -f2)
```

### Search script

Run the sample search against the Intuition testnet using your `SIGNER`:

```bash
pnpm run search
# or: npx tsx src/search.ts
```

## 🏗️ Architecture

The Agent Registry is built on the Intuition Protocol, which provides:

- **Atoms**: Individual data points (e.g., "type:agent", "name:Claude")
- **Triples**: Subject-Predicate-Object relationships stored on-chain
- **Multi-Vault**: Smart contract managing the registry data

### Tech Stack

- **Chain**: Intuition Testnet (Chain ID: 13579)
- **Backend**: Express.js with TypeScript
- **Ethereum Library**: Viem 2.31.4
- **Protocol SDK**: @0xintuition/sdk
- **Runtime**: Node.js with tsx

## 🚀 Deployment

### Automated Deployment (GitHub Actions → Heroku)

**Automatic deployment on every push to main!**

The repository includes a GitHub Actions workflow that automatically deploys to Heroku whenever code is pushed to the main branch.

**Quick Setup:**

1. Create a Heroku app: `heroku create your-agent-registry`
2. Add three GitHub secrets: `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL`
3. Push to main branch - deployment happens automatically!

For detailed setup instructions, see [GitHub Actions Deployment Guide](./docs/GITHUB_ACTIONS_DEPLOYMENT.md).

### Manual Heroku Deployment

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login and create app
heroku login
heroku create your-agent-registry

# Set environment variables
heroku config:set SIGNER=0x...
heroku config:set API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Deploy
git push heroku main
```

### Docker

```bash
# Build and run
docker build -t agent-registry .
docker run -p 3000:3000 --env-file .env agent-registry
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/your-username/agent-registry/issues)
- 💬 [Discussions](https://github.com/your-username/agent-registry/discussions)

## 🙏 Acknowledgments

- [Intuition Protocol](https://intuition.systems/) for the blockchain infrastructure
- [Viem](https://viem.sh/) for Ethereum interactions
- [Express.js](https://expressjs.com/) for the web framework

---

**Built with ❤️ for the decentralized AI ecosystem**
