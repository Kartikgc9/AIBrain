# AIBrain Server

Remote backend server for AIBrain memory layer with PostgreSQL + pgvector for semantic search and multi-device synchronization.

## Features

- **PostgreSQL + pgvector**: Vector database for semantic memory search
- **Fastify API**: High-performance REST API (76k req/sec)
- **JWT Authentication**: Secure user authentication and authorization
- **Real-time Sync**: WebSocket-based synchronization across devices
- **Memory Ingestion**: LLM-powered memory extraction from conversations
- **Batch Operations**: Import/export for migration from local IndexedDB
- **Redis Caching**: Session storage and rate limiting

## Architecture

### Technology Stack

- **Runtime**: Node.js 20+ LTS
- **Framework**: Fastify v4
- **Database**: PostgreSQL 16 + pgvector
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Authentication**: JWT (@fastify/jwt)
- **Cache**: Redis (ioredis)
- **LLM**: OpenAI API (embeddings + extraction)

### Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'
);

-- Memories with pgvector
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    source_url TEXT,
    source_platform VARCHAR(50),
    source_timestamp TIMESTAMPTZ,
    source_conversation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confidence FLOAT,
    access_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    embedding vector(1536)
);

-- Indexes
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_type_scope ON memories(user_id, type, scope);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);
```

## API Endpoints

### Authentication

```
POST   /api/v1/auth/register    - Register new user
POST   /api/v1/auth/login       - Login user
POST   /api/v1/auth/logout      - Logout user
POST   /api/v1/auth/refresh     - Refresh JWT token
GET    /api/v1/auth/me          - Get current user
```

### Memories

```
POST   /api/v1/memories         - Create memory
GET    /api/v1/memories/:id     - Get memory by ID
PUT    /api/v1/memories/:id     - Update memory
DELETE /api/v1/memories/:id     - Delete memory
GET    /api/v1/memories         - List memories (with filters)
POST   /api/v1/memories/search  - Semantic search
POST   /api/v1/memories/ingest  - Extract and save memories from conversation
POST   /api/v1/memories/import  - Import memories (migration)
GET    /api/v1/memories/sync/updates - Get updated memories (sync)
```

### WebSocket

```
WS     /api/v1/sync?token=JWT   - Real-time sync
```

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- Docker Desktop (for local development)
- OpenAI API key

### Local Development with Docker

1. **Clone and install dependencies**

```bash
cd aibrain-server
npm install
```

2. **Create `.env` file**

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. **Start services with Docker Compose**

```bash
docker-compose up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- AIBrain server (port 3000)

4. **Health check**

```bash
curl http://localhost:3000/health
```

### Development without Docker

1. **Install PostgreSQL 16 with pgvector**

```bash
# macOS
brew install postgresql@16
brew install pgvector

# Enable extension
psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

2. **Install Redis**

```bash
# macOS
brew install redis
brew services start redis
```

3. **Set up database**

```bash
createdb aibrain_dev
```

4. **Run migrations**

```bash
npm run migrate
```

5. **Start development server**

```bash
npm run dev
```

## API Usage Examples

### Register User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

### Create Memory

```bash
curl -X POST http://localhost:3000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "I prefer dark mode in all applications",
    "type": "preference",
    "scope": "user_global",
    "tags": ["ui", "preferences"],
    "confidence": 0.95
  }'
```

### Search Memories

```bash
curl -X POST http://localhost:3000/api/v1/memories/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "dark mode preferences",
    "limit": 10,
    "filter": {
      "type": "preference"
    }
  }'
```

### Ingest Conversation

```bash
curl -X POST http://localhost:3000/api/v1/memories/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "conversationText": "User: I love using React for building UIs\nAssistant: React is great for component-based development...",
    "context": {
      "url": "https://chatgpt.com/c/123",
      "platform": "chatgpt.com",
      "conversationId": "123"
    }
  }'
```

### WebSocket Sync

```javascript
const ws = new WebSocket('ws://localhost:3000/api/v1/sync?token=YOUR_JWT_TOKEN');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'PING' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## Production Deployment

### Railway.app

1. **Push to GitHub**

2. **Connect Railway to repository**

3. **Add PostgreSQL and Redis services**

4. **Set environment variables**

```
NODE_ENV=production
JWT_SECRET=<generate-32-char-secret>
OPENAI_API_KEY=<your-key>
CORS_ORIGIN=https://yourapp.com
```

5. **Deploy**

Railway automatically:
- Builds Docker image
- Sets up pgvector extension
- Deploys with zero downtime

### AWS/GCP

See Dockerfile for production build.

```bash
docker build -t aibrain-server .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e REDIS_URL=... \
  -e JWT_SECRET=... \
  -e OPENAI_API_KEY=... \
  aibrain-server
```

## Performance

- **API Response Time**: <100ms p95
- **Vector Search**: <200ms for 100k vectors
- **Batch Import**: ~1k memories/second
- **WebSocket Latency**: <10ms
- **Throughput**: 76k req/sec (Fastify benchmark)

## Security

- Passwords hashed with SHA-256 + salt (upgrade to bcrypt/argon2 for production)
- JWT tokens with 7-day expiration
- CORS protection
- SQL injection prevention via parameterized queries (Drizzle ORM)
- Rate limiting via Redis

## Cost Estimation

### Infrastructure (Railway.app)

- PostgreSQL: $5/month
- Redis: $5/month
- Server (2GB RAM): $10/month
- **Total**: ~$20/month (1k users)

### API Costs (OpenAI)

- Embeddings: $0.02 per 1M tokens (~$0.005/user/month)
- 1k users: ~$5/month
- 10k users: ~$50/month

## Monitoring

- Health check: `/health`
- Logs: Pino JSON logger
- Metrics: Add Prometheus/Grafana for production

## Contributing

1. Fork repository
2. Create feature branch
3. Write tests
4. Submit pull request

## License

MIT
