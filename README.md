# Agent Registry

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

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
cp .env.example .env
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

### Heroku (Recommended)

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

