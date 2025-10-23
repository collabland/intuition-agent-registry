# Architecture Overview

This document provides a comprehensive overview of the Agent Registry architecture, design decisions, and technical implementation.

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Webhooks     │    │   External      │
│                 │    │   (Zapier,     │    │   Services      │
│                 │    │    Make, etc)  │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Registry API                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │   Express   │  │  Middleware │  │     Route Handlers    │   │
│  │   Server    │  │   (Auth,    │  │   (Health, Events)   │   │
│  │             │  │   CORS)     │  │                       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                Intuition Protocol SDK                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │    Sync     │  │   Search    │  │    GraphQL Client      │   │
│  │  Functions  │  │  Functions  │  │   (Intuition API)      │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Blockchain Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │   Viem      │  │  Intuition  │  │    Multi-Vault         │   │
│  │  (Ethereum  │  │  Testnet    │  │   Smart Contract       │   │
│  │   Client)   │  │             │  │                        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. Express.js Server (`src/server.ts`)

**Purpose**: Main application entry point and HTTP server setup.

**Key Features**:
- CORS enabled for cross-origin requests
- JSON body parsing
- Request logging middleware
- Error handling
- Route registration

**Architecture**:
```typescript
app.use(cors());
app.use(express.json());
app.use(requestLogging);
app.use(healthRoutes);
app.use(eventRoutes);
app.use(errorHandler);
```

### 2. Blockchain Integration (`src/setup.ts`)

**Purpose**: Configure blockchain clients and wallet connections.

**Components**:
- **Wallet Client**: For signing transactions
- **Public Client**: For reading blockchain data
- **Account Management**: Private key handling
- **Network Configuration**: Intuition testnet setup

**Key Features**:
- Environment variable validation
- Private key security
- Network configuration
- GraphQL client setup

### 3. Authentication Middleware (`src/middleware/auth.ts`)

**Purpose**: API key validation for protected endpoints.

**Features**:
- Multiple API key support
- Environment variable parsing
- Security logging
- Error handling

**Supported Formats**:
```bash
# Single API key
API_KEY=your_key_here

# Multiple numbered keys
API_KEY_1=key1
API_KEY_2=key2

# Comma-separated keys
API_KEYS=key1,key2,key3
```

### 4. Route Handlers

#### Health Routes (`src/routes/health.ts`)
- Health check endpoint
- API information
- Account status

#### Event Routes (`src/routes/events.ts`)
- Webhook processing
- Event validation
- Blockchain synchronization

### 5. Data Models

#### Agent Entity
```typescript
interface Agent {
  type: 'agent';
  name: string;
  description: string;
  url: string;
  capabilities: string[];
}
```

#### Event Types
```typescript
interface QuizCompletedEvent {
  type: 'quiz_completed';
  userAddress: string;
  communityId: string;
  metadata: {
    quizId: string;
    completedAt: string;
  };
  version: string;
}
```

## 🔗 Blockchain Integration

### Intuition Protocol

The Agent Registry is built on the Intuition Protocol, which provides:

1. **Atoms**: Individual data points
   - Example: `"type": "agent"`
   - Example: `"name": "Claude"`

2. **Triples**: Subject-Predicate-Object relationships
   - Example: `(did:example:123, type, agent)`
   - Example: `(did:example:123, capabilities, web_search)`

3. **Multi-Vault Contract**: Smart contract managing registry data
   - Address: Retrieved from chain ID
   - Functions: `sync()` and `search()`

### Network Configuration

```typescript
const intuitionTestnet = defineChain({
  id: 13579,
  name: "Intuition testnet",
  nativeCurrency: { name: "Test Trust", symbol: "tTRUST", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.intuition.systems/http"] }
  },
  blockExplorers: {
    default: { url: "https://testnet.explorer.intuition.systems" }
  }
});
```

## 📊 Data Flow

### Agent Registration Flow

```
1. Client Request
   ↓
2. Express Router
   ↓
3. Validation & Parsing
   ↓
4. Intuition SDK Sync
   ↓
5. Blockchain Transaction
   ↓
6. Confirmation Response
```

### Agent Search Flow

```
1. Search Request
   ↓
2. Criteria Validation
   ↓
3. Intuition SDK Search
   ↓
4. Blockchain Query
   ↓
5. Results Processing
   ↓
6. Response Formatting
```

### Webhook Processing Flow

```
1. Webhook Request
   ↓
2. API Key Validation
   ↓
3. Event Structure Validation
   ↓
4. Event Type Processing
   ↓
5. Data Transformation
   ↓
6. Blockchain Sync
   ↓
7. Success Response
```

## 🔒 Security Architecture

### Authentication Flow

```
1. Request with API Key
   ↓
2. Middleware Validation
   ↓
3. Key Verification
   ↓
4. Access Granted/Denied
```

### Security Layers

1. **API Key Authentication**
   - Multiple key support
   - Environment variable storage
   - Request logging

2. **Input Validation**
   - Event structure validation
   - DID format validation
   - Data type checking

3. **Error Handling**
   - Graceful error responses
   - Security logging
   - No sensitive data exposure

## 🚀 Deployment Architecture

### Production Setup

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │   Blockchain    │
│   (Nginx/HAProxy│    │   Instances     │    │   Network       │
│                 │    │   (PM2/Docker) │    │   (Intuition)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Health Check  │    │   Environment   │    │   Monitoring    │
│   Endpoints     │    │   Variables     │    │   & Logging     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Scaling Considerations

1. **Horizontal Scaling**
   - Multiple application instances
   - Load balancer distribution
   - Stateless design

2. **Blockchain Limitations**
   - Transaction rate limits
   - Gas cost considerations
   - Network congestion handling

## 🔄 Development Workflow

### Code Organization

```
src/
├── server.ts          # Main application
├── setup.ts           # Blockchain configuration
├── middleware/        # Authentication & utilities
├── routes/           # API endpoints
├── types/            # TypeScript definitions
└── sync.ts           # CLI utilities
```

### Testing Strategy

```
tests/
├── setup.ts          # Test configuration
├── health.test.ts    # Health endpoint tests
├── auth.test.ts      # Authentication tests
└── integration/      # End-to-end tests
```

## 📈 Performance Considerations

### Optimization Strategies

1. **Caching**
   - Blockchain query caching
   - Response caching
   - Session management

2. **Rate Limiting**
   - API request limiting
   - Blockchain transaction queuing
   - Resource management

3. **Monitoring**
   - Health check endpoints
   - Performance metrics
   - Error tracking

## 🔮 Future Architecture

### Planned Enhancements

1. **Multi-Chain Support**
   - Multiple blockchain networks
   - Cross-chain compatibility
   - Network abstraction layer

2. **Advanced Features**
   - Agent verification system
   - Trust scoring
   - Reputation management

3. **Scalability Improvements**
   - Database integration
   - Caching layers
   - Microservices architecture

---

*This architecture document is maintained alongside the codebase and updated with each major release.*
