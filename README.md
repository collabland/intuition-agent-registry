# Agent Registry

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

A decentralized agent registry built on the Intuition Protocol. Register, discover, and interact with AI agents in a decentralized manner using blockchain technology.

## ✨ Features

- 🔗 **Decentralized Registry**: Store agent metadata on the blockchain
- 🔍 **Agent Discovery**: Search for agents by capabilities and trust relationships
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
curl -X POST http://localhost:3000/agents \
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
curl -X POST http://localhost:3000/agents/search \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": [
      { "type": "agent" },
      { "capabilities": "web_search" }
    ],
    "trustedAccounts": ["0x1234567890abcdef..."]
  }'
```

### Webhook Integration

```bash
curl -X POST http://localhost:3000/v1/intuition/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{
    "type": "quiz_completed",
    "userAddress": "0x...",
    "communityId": "...",
    "metadata": {
      "quizId": "...",
      "completedAt": "..."
    },
    "version": "1.0.0"
  }'
```

## 🏗️ Architecture

The Agent Registry is built on the Intuition Protocol, which provides:

- **Atoms**: Individual data points (e.g., "type:agent", "name:Claude")
- **Triples**: Subject-Predicate-Object relationships stored on-chain
- **Multi-Vault**: Smart contract managing the registry data

### Tech Stack

- **Blockchain**: Intuition Testnet (Chain ID: 13579)
- **Backend**: Express.js with TypeScript
- **Ethereum Library**: Viem 2.31.4
- **Protocol SDK**: @0xintuition/sdk
- **Runtime**: Node.js with tsx

## 📚 Documentation

- [API Documentation](./docs/API.md) - Complete API reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [Security Guide](./docs/SECURITY.md) - Security best practices
- [Architecture Overview](./docs/ARCHITECTURE.md) - Technical details
- [Examples](./examples/) - Usage examples and tutorials

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

