# RAG Pipeline

A session-based, ephemeral RAG (Retrieval Augmented Generation) backend built with Express, Valkey, Qdrant, and BullMQ. Upload PDFs, query them via natural language, and get AI-powered answers—all scoped to short-lived sessions with automatic cleanup.

## Features

- **Session-scoped** – Each session is isolated; documents and embeddings are temporary
- **PDF ingestion** – Upload multiple PDFs per session (max 10, 10MB each)
- **Async processing** – BullMQ worker handles parsing, chunking, embedding, and storage
- **RAG query** – Ask questions and get answers grounded in your uploaded documents
- **No database schemas** – Valkey TTL drives lifecycle; filesystem and Qdrant act as cache
- **Automatic cleanup** – Orphaned uploads and vector collections are removed when sessions expire

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js (ES Modules) |
| API | Express |
| Session/Queue | Valkey (Redis-compatible) |
| Job Queue | BullMQ |
| Vector DB | Qdrant |
| PDF | LangChain PDFLoader + pdf-parse |
| Embeddings | Gemini / OpenAI (configurable) |
| LLM | Gemini / OpenAI (configurable) |

## Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Docker & Docker Compose (for Valkey and Qdrant)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/shwetank-antino/RAG-pipeline.git
cd RAG-pipeline
pnpm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000

# Valkey (Redis-compatible)
VALKEY_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333

# Embeddings (e.g. Gemini)
EMBEDDING_PROVIDER=gemini
EMBEDDING_API_KEY=your-gemini-api-key
EMBEDDING_MODEL=text-embedding-004

# LLM (e.g. Gemini)
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash
```

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Start dependencies

```bash
docker compose up -d
```

This starts Valkey (port 6379) and Qdrant (port 6333).

### 4. Run the API and worker

**Terminal 1 – API server:**
```bash
pnpm run dev
```

**Terminal 2 – Ingestion worker:**
```bash
pnpm run worker
```

### 5. Test the flow

1. **Upload PDFs**
   ```bash
   curl -X POST http://localhost:3000/v1/rag/upload \
     -H "x-session-id: YOUR-SESSION-ID" \
     -F "pdfs=@document.pdf"
   ```
   Or use Postman: `POST /v1/rag/upload` with `form-data` field `pdfs` (type: File).

2. **Check status**
   ```bash
   curl http://localhost:3000/v1/rag/status -H "x-session-id: YOUR-SESSION-ID"
   ```
   Poll until `"status": "ready"`.

3. **Query**
   ```bash
   curl -X POST http://localhost:3000/v1/rag/query \
     -H "x-session-id: YOUR-SESSION-ID" \
     -H "Content-Type: application/json" \
     -d '{"question": "What is this document about?"}'
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/rag/upload` | Upload PDFs (form-data, field: `pdfs`) |
| GET | `/v1/rag/status` | Get ingestion status (`idle` \| `ingesting` \| `ready`) |
| POST | `/v1/rag/query` | RAG query with `{ question, chatHistory? }` |

**Headers:** `x-session-id` – Use the same session ID for upload, status, and query. Omit on upload to get a new one from the response.

## Project Structure

```
rag-pipeline/
├── server.js
├── env.config.js
├── docker-compose.yml
├── src/
│   ├── app.js
│   ├── middleware/
│   │   ├── session.js      # Session validation (Valkey TTL)
│   │   └── rate-limiter.js
│   ├── routes/v1/routes.js
│   ├── v1/components/rag/
│   │   ├── rag.route.js
│   │   └── rag.controller.js
│   ├── queues/
│   │   └── ingestion.queue.js
│   ├── workers/
│   │   └── ingestion.worker.js
│   └── utils/
│       ├── multerConfig.js
│       ├── valkeyClient.js
│       ├── valkeyBullMQConnection.js
│       ├── qdrantClient.js
│       ├── embeddingFactory.js
│       ├── llmFactory.js
│       └── cleanup.js
└── uploads/                 # Session-scoped PDF storage (ephemeral)
```

## Architecture

```
Upload (PDF) → Multer → uploads/<sessionId>/
                    → BullMQ job
Worker → Parse PDF → Chunk → Embed → Qdrant (rag_<sessionId>)
                      → Delete PDF
                      → Update status (ready)

Query → Check status → Retrieve chunks → LLM → Answer
```

## Configuration

| Env Variable | Default | Description |
|--------------|---------|-------------|
| PORT | 3000 | API port |
| VALKEY_URL | redis://localhost:6379 | Valkey connection URL |
| QDRANT_URL | http://localhost:6333 | Qdrant REST URL |
| EMBEDDING_PROVIDER | gemini | `gemini` or `openai` |
| EMBEDDING_API_KEY | - | API key for embeddings |
| EMBEDDING_MODEL | text-embedding-004 | Embedding model name |
| LLM_PROVIDER | gemini | `gemini` or `openai` |
| LLM_API_KEY | - | API key for LLM |
| LLM_MODEL | gemini-2.5-flash | LLM model name |


## Author

Shwetank Tripathi
