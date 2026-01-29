# ContractClarity

AI-powered contract analysis for M&A due diligence - a technical demonstration of RAG systems, knowledge graphs, and LLM-powered document analysis.

**Part of the Clarity Suite** (BloodClarity, RadioClarity)

## Status

Portfolio demonstration project - not production software.

## Quick Start

```bash
# Start services
docker compose up -d

# Backend API runs on http://localhost:8002
# Frontend (when added) runs on http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (FastAPI)                        │
│    PDF Upload → Chunking → Embeddings → Clause Extraction       │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────────┐
│  PostgreSQL   │      │    Redis      │      │     Ollama        │
│  + pgvector   │      │   (Queue)     │      │  (LLM Inference)  │
└───────────────┘      └───────────────┘      └───────────────────┘
```

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15 + pgvector
- **LLM**: Ollama (Llama 3.2, Qwen 2.5, Mistral 7B)
- **Embeddings**: nomic-embed-text via Ollama
- **PDF Processing**: PyMuPDF
- **Frontend**: Next.js 14 + shadcn/ui (coming soon)

## Features (MVP)

- [x] PDF upload and text extraction
- [x] Document chunking pipeline
- [x] Vector embeddings via pgvector
- [ ] Semantic search across contracts
- [ ] Clause extraction (change of control, IP assignment, termination)
- [ ] Plain English summaries
- [ ] Risk flagging

## Project Structure

```
ContractClarity/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/              # Next.js (coming soon)
├── docker-compose.yml
├── PLAN.md
└── README.md
```

## Development

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for frontend)

### Local Development

```bash
# Start infrastructure
docker compose up -d postgres redis ollama

# Pull required Ollama models
docker exec ollama ollama pull llama3.2
docker exec ollama ollama pull nomic-embed-text

# Run backend locally
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

## Demo Data

Uses public contract datasets (no real user data):
- [CUAD Dataset](https://github.com/TheAtticusProject/cuad) - 13K labeled clauses
- [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar) - Public M&A filings
- [MAUD Dataset](https://www.mauldataset.org/) - 152 merger agreements

## License

MIT - Portfolio project, use freely.

## Author

Macdara - [GitHub](https://github.com/m4cd4r4)
