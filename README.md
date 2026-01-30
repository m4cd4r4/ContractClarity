# ContractClarity

AI-powered contract analysis platform for M&A due diligence. Upload contracts, extract clauses, assess risk levels, and visualize entity relationships.

**Part of the Clarity Suite** (BloodClarity, RadioClarity)

## Status

Production-ready portfolio demonstration - deployed on VPS.

- **Backend API**: http://45.77.233.102:8003
- **Frontend**: http://localhost:3000 (or deploy to Vercel)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  localhost:3000 or deployed to Vercel                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │Dashboard │ │ Document │ │  Search  │ │   Knowledge Graph    ││
│  │          │ │  Detail  │ │          │ │    Visualization     ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │ API Calls
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend API (FastAPI)                          │
│  45.77.233.102:8003                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │Documents │ │  Search  │ │ Analysis │ │    Knowledge Graph   ││
│  │   API    │ │   API    │ │   API    │ │         API          ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    MinIO     │    │    Celery    │
│   + pgvector │    │   Storage    │    │   Workers    │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Features

### Document Management
- [x] PDF upload and text extraction with OCR
- [x] Document chunking pipeline
- [x] Vector embeddings via pgvector
- [x] MinIO object storage

### Hybrid Search
- [x] Semantic search (AI-powered meaning-based search)
- [x] Keyword search (BM25 ranking)
- [x] Hybrid mode (combines both)

### Clause Extraction & Risk Assessment
- [x] 15+ clause types (termination, indemnification, liability, non-compete, etc.)
- [x] 4 risk levels (Critical, High, Medium, Low)
- [x] Risk factors with detailed explanations
- [x] AI-generated clause summaries

### Knowledge Graph
- [x] Entity extraction (parties, persons, dates, amounts, locations, terms)
- [x] Relationship mapping
- [x] Interactive visualization
- [x] Cross-document entity search

## Quick Start

### Backend (Docker)

```bash
cd backend
docker-compose up -d
```

Services:
- API: http://localhost:8003
- MinIO Console: http://localhost:9001
- Celery Flower: http://localhost:5555

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## API Endpoints

### Documents
- `GET /documents` - List all documents
- `GET /documents/{id}` - Get document details
- `POST /documents/upload` - Upload PDF
- `DELETE /documents/{id}` - Delete document
- `GET /documents/{id}/chunks` - Get document chunks

### Search
- `GET /search?q={query}` - Search contracts
- `GET /search/stats` - Index statistics

### Analysis
- `POST /analysis/{id}/extract` - Trigger clause extraction
- `GET /analysis/{id}/summary` - Get risk summary
- `GET /analysis/{id}/clauses` - Get extracted clauses
- `GET /analysis/clause-types` - List clause types

### Knowledge Graph
- `POST /graph/{id}/extract` - Trigger entity extraction
- `GET /graph/{id}` - Get graph data (nodes & edges)
- `GET /graph/{id}/entities` - Get entities
- `GET /graph/{id}/relationships` - Get relationships
- `GET /graph/search/entity?name={name}` - Cross-document entity search
- `GET /graph/stats` - Graph statistics
- `GET /graph/types` - List entity/relationship types

## Tech Stack

### Backend
- **FastAPI** - Async Python web framework
- **PostgreSQL + pgvector** - Vector database for embeddings
- **MinIO** - S3-compatible object storage
- **Celery + Redis** - Async task processing
- **Tesseract** - OCR engine
- **OpenAI/Claude** - LLM for clause extraction

### Frontend
- **Next.js 14** - React framework with App Router
- **TailwindCSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Lucide Icons** - Icon library
- **React Query** - Data fetching

## Project Structure

```
ContractClarity/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI app
│   ├── docker-compose.yml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── search/            # Search page
│   │   │   └── documents/[id]/    # Document detail
│   │   │       ├── page.tsx       # Clause view
│   │   │       └── graph/         # Knowledge graph
│   │   └── lib/
│   │       └── api.ts     # API client
│   ├── package.json
│   └── tailwind.config.ts
├── sample-contracts/      # Test documents
└── README.md
```

## Design System

### Colors
- **Ink palette**: Deep dark theme (#0a0a0b to #27272a)
- **Accent**: Legal gold (#c9a227)
- **Risk levels**: Critical (red), High (orange), Medium (amber), Low (emerald)

### Typography
- **Display**: Cormorant Garamond
- **Body**: DM Sans
- **Mono**: JetBrains Mono

## Demo Data

Uses public contract datasets:
- [CUAD Dataset](https://github.com/TheAtticusProject/cuad) - 13K labeled clauses
- [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar) - Public M&A filings
- [MAUD Dataset](https://www.mauldataset.org/) - 152 merger agreements
- Scribd public contract samples

## License

MIT - Portfolio project, use freely.

## Author

Macdara - [GitHub](https://github.com/m4cd4r4)
