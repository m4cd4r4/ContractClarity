# ContractClarity

<div align="center">

**AI-Powered Contract Analysis for M&A Due Diligence**

[![Playwright Tests](https://img.shields.io/badge/E2E_Tests-12%20passed-brightgreen?style=flat-square)](./frontend/tests)
[![Next.js](https://img.shields.io/badge/Next.js-14.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

[Live Demo](http://45.77.233.102:8003) | [Documentation](./docs/DEMO.md) | [API Reference](#api-reference)

</div>

---

## Overview

ContractClarity transforms contract review from weeks to minutes. Upload PDFs, extract key clauses with AI, assess risk levels, and explore entity relationships through an interactive knowledge graph.

**Part of the Clarity Suite** - BloodClarity, RadioClarity

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **4-Tier OCR** | PyMuPDF, Tesseract, PaddleOCR, Vision LLM fallback |
| **Clause Extraction** | 20+ clause types with AI-powered risk scoring |
| **Knowledge Graph** | Entity extraction with relationship mapping |
| **Hybrid Search** | Semantic + keyword search with configurable weights |
| **Risk Assessment** | 4-level scoring (Critical, High, Medium, Low) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js 14)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────────────┐│
│  │Dashboard │  │ Document │  │  Search  │  │   Knowledge Graph         ││
│  │          │  │  Detail  │  │          │  │   Visualization           ││
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────────────┘│
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Backend API (FastAPI)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────────────┐│
│  │Documents │  │  Search  │  │ Analysis │  │   Knowledge Graph API     ││
│  │   API    │  │   API    │  │   API    │  │                           ││
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────────────┘│
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   PostgreSQL     │   │      MinIO       │   │     Ollama       │
│   + pgvector     │   │    (Storage)     │   │     (LLM)        │
│   768-dim vectors│   │   S3-compatible  │   │   llama3.2       │
└──────────────────┘   └──────────────────┘   └──────────────────┘
         │
         ▼
┌──────────────────┐   ┌──────────────────┐
│      Redis       │   │     Celery       │
│     (Queue)      │   │    (Workers)     │
└──────────────────┘   └──────────────────┘
```

---

## Document Processing Pipeline

```
Upload PDF
    │
    ▼
┌────────────────────────────────────────────┐
│  4-Tier OCR Pipeline                       │
│  ├─ Tier 0: PyMuPDF (native text)          │
│  ├─ Tier 1: Tesseract (clean scans)        │
│  ├─ Tier 2: PaddleOCR (complex layouts)    │
│  └─ Tier 3: Vision LLM (handwriting)       │
└────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────┐
│  Chunking (6000 chars, 600 overlap)        │
│  Semantic boundary preservation            │
└────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────┐
│  Vector Embeddings (nomic-embed-text)      │
│  768 dimensions, IVFFlat indexing          │
└────────────────────────────────────────────┘
    │
    ├──────────────────────┐
    ▼                      ▼
┌───────────────┐   ┌───────────────┐
│    Clause     │   │    Entity     │
│  Extraction   │   │  Extraction   │
│  (15+ types)  │   │  (7 types)    │
└───────────────┘   └───────────────┘
    │                      │
    ▼                      ▼
┌───────────────┐   ┌───────────────┐
│     Risk      │   │   Knowledge   │
│  Assessment   │   │     Graph     │
└───────────────┘   └───────────────┘
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Async Python web framework |
| **PostgreSQL + pgvector** | Vector database for semantic search |
| **SQLAlchemy 2.0** | Async ORM |
| **Celery + Redis** | Background task processing |
| **MinIO** | S3-compatible object storage |
| **Ollama** | Local LLM inference (llama3.2, nomic-embed-text) |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety |
| **TailwindCSS** | Utility-first styling |
| **Framer Motion** | Animations |
| **React Query** | Data fetching & caching |
| **Playwright** | E2E testing (12 tests) |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- 8GB RAM minimum (for Ollama)

### 1. Clone & Start Services

```bash
git clone https://github.com/m4cd4r4/ContractClarity.git
cd ContractClarity

# Start all backend services
docker-compose up -d

# Pull required Ollama models
docker exec contractclarity-ollama ollama pull llama3.2
docker exec contractclarity-ollama ollama pull nomic-embed-text
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Docs | http://localhost:8003/docs |
| MinIO Console | http://localhost:9001 |

---

## API Reference

### Documents API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/documents/upload` | Upload PDF contract |
| `GET` | `/documents` | List all documents |
| `GET` | `/documents/{id}` | Get document details |
| `DELETE` | `/documents/{id}` | Delete document |
| `GET` | `/documents/{id}/chunks` | Get text chunks |

### Search API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?q={query}` | Hybrid semantic + keyword search |
| `GET` | `/search/stats` | Index statistics |

**Parameters:** `limit`, `mode` (hybrid/semantic/keyword), `semantic_weight`

### Analysis API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analysis/{id}/extract` | Trigger clause extraction |
| `GET` | `/analysis/{id}/summary` | Get risk summary |
| `GET` | `/analysis/{id}/clauses` | Get extracted clauses |
| `GET` | `/analysis/clause-types` | List clause types |

### Knowledge Graph API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/graph/{id}/extract` | Trigger entity extraction |
| `GET` | `/graph/{id}` | Get graph nodes & edges |
| `GET` | `/graph/search/entity?name={name}` | Cross-document entity search |

---

## Clause Types & Risk Assessment

### Supported Clause Types

| Category | Types |
|----------|-------|
| **Deal Terms** | Change of Control, Assignment, Exclusivity |
| **IP & Data** | IP Ownership, Confidentiality, Data Privacy |
| **Liability** | Indemnification, Limitation of Liability, Warranty |
| **Term** | Termination, Renewal, Notice Periods |
| **Competition** | Non-Compete, Non-Solicitation |
| **Financial** | Payment Terms, Audit Rights |

### Risk Levels

| Level | Color | Trigger Examples |
|-------|-------|------------------|
| **Critical** | Red | Automatic termination, uncapped liability, IP transfer |
| **High** | Orange | Consent required, gross negligence, material restrictions |
| **Medium** | Amber | 30-day notice, standard indemnification |
| **Low** | Green | Market-standard terms, reasonable limitations |

---

## Project Structure

```
ContractClarity/
├── backend/
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   │   ├── documents.py
│   │   │   ├── search.py
│   │   │   ├── analysis.py
│   │   │   └── graph.py
│   │   ├── core/             # Config, database
│   │   ├── models/           # SQLAlchemy models
│   │   ├── services/         # Business logic
│   │   │   ├── ocr_pipeline.py
│   │   │   ├── chunking.py
│   │   │   ├── embeddings.py
│   │   │   ├── clause_extraction.py
│   │   │   └── entity_extraction.py
│   │   └── tasks/            # Celery tasks
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── search/page.tsx             # Search
│   │   │   └── documents/[id]/
│   │   │       ├── page.tsx                # Document detail
│   │   │       └── graph/page.tsx          # Knowledge graph
│   │   └── lib/api.ts                      # API client
│   └── tests/
│       └── dashboard.spec.ts               # Playwright E2E
├── docker-compose.yml
├── docs/
│   └── DEMO.md                             # Demo walkthrough
└── README.md
```

---

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `ink-950` | `#0a0a0b` | Background |
| `ink-900` | `#18181b` | Cards |
| `accent` | `#c9a227` | Legal gold (primary) |
| `critical` | `#ef4444` | Red - Critical risk |
| `high` | `#f97316` | Orange - High risk |
| `medium` | `#f59e0b` | Amber - Medium risk |
| `low` | `#10b981` | Emerald - Low risk |

### Typography

| Font | Usage |
|------|-------|
| **Cormorant Garamond** | Display headings |
| **DM Sans** | Body text |
| **JetBrains Mono** | Code, data labels |

---

## Development

### Run Tests

```bash
cd frontend

# Run all E2E tests
npm test

# With Playwright UI
npm run test:ui

# Headed mode (visible browser)
npm run test:headed
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/contractclarity

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=contractclarity
MINIO_SECRET_KEY=contractclarity_dev

# Ollama
OLLAMA_URL=http://localhost:11434
LLM_MODEL=llama3.2
EMBEDDING_MODEL=nomic-embed-text

# Processing
CHUNK_SIZE=6000
CHUNK_OVERLAP=600
MAX_FILE_SIZE=52428800
```

---

## Demo Data

Public contract datasets for testing:
- [CUAD Dataset](https://github.com/TheAtticusProject/cuad) - 13K labeled clauses
- [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar) - Public M&A filings
- [MAUD Dataset](https://www.mauldataset.org/) - 152 merger agreements

---

## Roadmap

- [x] PDF upload with 4-tier OCR pipeline
- [x] Clause extraction with risk scoring
- [x] Knowledge graph visualization
- [x] Hybrid semantic search
- [x] Playwright E2E tests (12 tests)
- [ ] Comparison matrix (multiple contracts)
- [ ] Custom extraction templates
- [ ] Export to Excel/Word/PDF
- [ ] Deal room (transaction grouping)
- [ ] Playbook compliance checking

---

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

## Author

**Macdara** - [GitHub](https://github.com/m4cd4r4)

Built with enterprise-grade engineering practices to demonstrate production AI/ML systems.
