# ContractClarity - Project Plan

**Version:** 3.0
**Created:** 2026-01-29
**Updated:** 2026-01-29
**Author:** Macdara
**Status:** Active Development

---

## Executive Summary

ContractClarity is a **production-quality** AI-powered contract analysis platform for M&A due diligence. It demonstrates enterprise-grade RAG systems, knowledge graphs, and LLM-powered document analysis - built to production standards even though regulatory barriers (SOC 2, compliance) prevent immediate enterprise sales.

**This is a full product, not a demo.**

**Primary Goals:**
1. Build production-quality contract analysis with full technical implementation
2. Demonstrate enterprise-grade AI engineering skills (portfolio value)
3. Create a working product ready for SMB market or open-source release

**Secondary Goals:**
- Fine-tune custom models for legal document understanding
- Part of the "Clarity Suite" branding (BloodClarity, RadioClarity)
- Potential SMB revenue stream (solo lawyers, small firms)

**What We're Building:**
- ✅ Full OCR pipeline (4 tiers: PyMuPDF → Tesseract → PaddleOCR → Pixtral)
- ✅ Production file storage (MinIO)
- ✅ Async job processing (Celery + Redis)
- ✅ Knowledge graph with entity extraction
- ✅ User authentication (NextAuth.js)
- ✅ Custom model fine-tuning (LoRA)
- ✅ Production deployment on VPS

**What We're NOT Pursuing (Regulatory Barriers):**
- ❌ Enterprise sales (PE firms, investment banks, Big Law)
- ❌ SOC 2 Type II certification ($50-100K, 12 months)
- ❌ Enterprise security questionnaires

**Market Strategy:**
- Target SMB market (solo lawyers, small firms, startups) - no SOC 2 required
- Open-source option for community/portfolio value
- The tech is enterprise-grade; the compliance is not

---

## Problem Statement

### The Pain Points

**For M&A Teams:**
- Reviewing hundreds of contracts during due diligence takes weeks
- Critical clauses (change of control, IP assignment, termination rights) get missed
- Legal jargon obscures actual business implications
- No standardized way to compare terms across multiple contracts
- Junior analysts spend 60-70% of time on manual extraction

**For Legal Teams:**
- Contract review is tedious and error-prone
- Inconsistent analysis across team members
- Hard to track which contracts have unusual terms
- No easy way to answer "show me all contracts with X clause"

### The Opportunity

A tool that:
- Extracts key clauses automatically
- Flags risks and unusual terms
- Translates legal language to plain English
- Enables semantic search across contract corpus
- Compares terms across multiple agreements

---

## Target Audience

### For the Demo (MVP)
**Primary audience:** Interviewers at AI engineering roles (NOHUP, similar companies)

**What they need to see:**
- Working RAG pipeline (document → chunks → embeddings → retrieval)
- Structured extraction (clauses, parties, dates)
- Knowledge graph concepts (entity relationships)
- Clean, professional UI
- Code quality on GitHub

### For Future Product (Post-MVP, If Pursued)

**Viable markets (SMB, not enterprise):**
1. **Solo lawyers** - Freelance contract review
2. **Small law firms** (<10 people) - No SOC 2 requirements
3. **Startup legal teams** - Reviewing their own contracts
4. **Real estate agents** - Residential/commercial contract review
5. **Small business owners** - Vendor contract management

**Why NOT enterprise (PE, investment banks, Big Law):**
- Require SOC 2 Type II ($50-100K, 12 months)
- 6-18 month sales cycles
- Won't trust indie developer's VPS with M&A docs
- Established competitors (Kira, Luminance) with 10+ year head start

### Demo Data Source

**Use public contracts (no real user data needed):**
- [CUAD Dataset](https://github.com/TheAtticusProject/cuad) - 13,000 labeled contract clauses
- [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar) - Real M&A agreements (public filings)
- [MAUD Dataset](https://www.mauldataset.org/) - 152 labeled merger agreements

This demonstrates real skills without requiring user trust or security compliance.

---

## Core Features (MVP)

### Phase 1 - Foundation

| Feature | Description | Priority |
|---------|-------------|----------|
| **PDF Upload** | Upload contracts (PDF, DOCX, scanned) | P0 |
| **Text Extraction** | OCR + native text extraction | P0 |
| **Clause Extraction** | Identify key clause types | P0 |
| **Plain English Summary** | Translate legal → business language | P0 |
| **Risk Flagging** | Highlight unusual/risky terms | P1 |
| **Search** | Semantic search across contracts | P1 |

### Phase 2 - Intelligence

| Feature | Description | Priority |
|---------|-------------|----------|
| **Comparison Matrix** | Compare terms across contracts | P1 |
| **Knowledge Graph** | Entity relationships (parties, dates, obligations) | P2 |
| **Custom Extraction** | User-defined clause templates | P2 |
| **Deal Room** | Group contracts by transaction | P2 |
| **Export** | Excel, Word, PDF reports | P2 |

### Phase 3 - Advanced

| Feature | Description | Priority |
|---------|-------------|----------|
| **Anomaly Detection** | ML-based unusual term detection | P3 |
| **Playbook Compliance** | Check against standard terms | P3 |
| **Redlining Assistant** | Suggest markup based on playbook | P3 |
| **API Access** | Integrate with deal management tools | P3 |

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                     contractclarity.com                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (FastAPI)                        │
│                   api.contractclarity.com                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Auth      │  │   Upload    │  │   Analysis Pipeline     │ │
│  │   (JWT)     │  │   Handler   │  │   (Async Workers)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────────┐
│   PostgreSQL  │      │    Redis      │      │   MinIO (S3)      │
│   + pgvector  │      │   (Queue)     │      │   (Documents)     │
│               │      │               │      │                   │
│ - Contracts   │      │ - Job Queue   │      │ - PDFs            │
│ - Clauses     │      │ - Cache       │      │ - Extracted Text  │
│ - Embeddings  │      │ - Sessions    │      │ - Generated Docs  │
└───────────────┘      └───────────────┘      └───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI/ML PIPELINE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Ollama    │  │  Embeddings │  │   Document Processing   │ │
│  │  (LLM)      │  │  (Local)    │  │   (OCR, Chunking)       │ │
│  │             │  │             │  │                         │ │
│  │ - Llama 3.2 │  │ - nomic-   │  │ - PyMuPDF (native PDF)  │ │
│  │ - Mistral   │  │   embed     │  │ - Tesseract (scans)     │ │
│  │ - Qwen 2.5  │  │ - bge-small │  │ - PaddleOCR (complex)   │ │
│  │ - Pixtral   │  │             │  │ - LangChain splitters   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Details

#### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **State:** Zustand or React Context
- **Auth:** NextAuth.js (GitHub OAuth initially)
- **Hosting:** Vercel (free tier) OR self-hosted on VPS

#### Backend API
- **Framework:** FastAPI (Python)
- **Auth:** JWT tokens
- **Queue:** Redis + Celery/ARQ for async jobs
- **Hosting:** VPS (45.77.233.102)

#### Database Layer
- **Primary DB:** PostgreSQL 15+ with pgvector extension
- **Vector Storage:** pgvector (no separate vector DB needed)
- **Cache:** Redis
- **File Storage:** MinIO (S3-compatible, self-hosted)

#### AI/ML Pipeline
- **LLM Inference:** Ollama (local, free)
- **Embeddings:** Local models via Ollama or sentence-transformers
- **OCR:** Tesseract (open-source)
- **Document Processing:** LangChain/LlamaIndex

---

## Infrastructure

### Production Environment

**VPS (45.77.233.102 - Sydney):**
- 4 vCPU, 8GB RAM, 160GB SSD
- Shared with Donnacha, Chlann, other projects
- Running: nginx, postgres, redis, ollama

**Local Development Machine:**
- GPU available for model training
- Used for: LoRA fine-tuning, heavy inference testing, development

### VPS Service Architecture

**Existing Services (Donnacha Stack):**
```
- nginx (80/443)      - Reverse proxy, SSL termination
- donnacha-backend    - FastAPI (port 8001)
- postgres (5432)     - Shared database server
- redis (6379)        - Shared cache/queue
- whisper (9000)      - Voice transcription
- ollama (11434)      - LLM inference (shared)
```

**ContractClarity Services (New):**
```
- contractclarity-backend (8002)   - FastAPI application
- contractclarity-worker           - Celery worker (async jobs)
- minio (9000/9001)                - S3-compatible document storage
- tesseract                        - OCR (installed on host)
- paddleocr                        - Complex OCR (Python package)
```

### Local GPU Training Environment

**Hardware:**
- GPU for LoRA fine-tuning and experimentation
- Used for training, not production inference

**Training Stack:**
```
- PyTorch + CUDA
- Hugging Face Transformers
- PEFT (LoRA fine-tuning)
- Weights & Biases (experiment tracking)
- Ollama (local model serving)
```

**Training Workflow:**
1. Train/fine-tune model locally on GPU
2. Export to GGUF format
3. Deploy to Ollama on VPS
4. Model serves inference in production

### Shared Resources
| Resource | Shared With | Notes |
|----------|-------------|-------|
| PostgreSQL | Donnacha | Separate database, same instance |
| Redis | Donnacha | Separate key prefixes |
| Ollama | Donnacha | Shared LLM inference |
| nginx | All apps | Reverse proxy routing |

### DNS/Routing

```nginx
# nginx configuration
server {
    server_name contractclarity.com;

    location / {
        # Option A: Proxy to Vercel
        proxy_pass https://contractclarity.vercel.app;

        # Option B: Self-hosted frontend
        # root /var/www/contractclarity;
    }

    location /api {
        proxy_pass http://localhost:8002;
    }
}
```

### Docker Compose Addition

```yaml
# Added to existing docker-compose.yml
services:
  contractclarity-backend:
    build: ./contractclarity/backend
    ports:
      - "8002:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/contractclarity
      - REDIS_URL=redis://redis:6379/1
      - OLLAMA_URL=http://ollama:11434
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - postgres
      - redis
      - ollama

  contractclarity-worker:
    build: ./contractclarity/backend
    command: celery -A app.worker worker -l info
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/contractclarity
      - REDIS_URL=redis://redis:6379/1
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - redis
      - ollama
```

---

## Cost Optimization

### Monthly Cost Breakdown

| Component | Self-Hosted Cost | Cloud Alternative | Savings |
|-----------|------------------|-------------------|---------|
| LLM Inference | $0 (Ollama) | $200-500/mo (OpenAI) | $200-500 |
| Embeddings | $0 (local) | $50-100/mo (OpenAI) | $50-100 |
| OCR | $0 (Tesseract/PaddleOCR) | $100-300/mo (Google Vision/Textract) | $100-300 |
| Vector DB | $0 (pgvector) | $50-200/mo (Pinecone) | $50-200 |
| Object Storage | $0 (MinIO) | $20-50/mo (S3) | $20-50 |
| PostgreSQL | $0 (existing) | $30-100/mo (RDS) | $30-100 |
| Backend Hosting | $0 (VPS) | $50-200/mo (ECS) | $50-200 |
| **Total** | **~$0** | **$500-1450/mo** | **$500-1450** |

### Already Paid
- VPS: ~AU$60/mo (shared with Donnacha, Chlann, etc.)
- Domain: ~$12/year (contractclarity.com - need to register)

### External Costs (Optional)
| Service | When Needed | Cost |
|---------|-------------|------|
| Vercel (frontend) | MVP | Free tier |
| OpenAI API | Complex analysis fallback | Pay-per-use (~$0.01-0.10/doc) |
| Domain registration | Now | ~$12/year |
| SSL Certificate | Now | Free (Let's Encrypt) |

### Cost Reduction Tactics

1. **Use Ollama for all LLM inference**
   - Llama 3.2 8B for general tasks
   - Qwen 2.5 Coder for structured extraction
   - Mistral 7B as fallback

2. **Local embeddings**
   - `nomic-embed-text` via Ollama
   - `bge-small-en-v1.5` via sentence-transformers
   - Both are free and performant

3. **pgvector instead of Pinecone**
   - No separate vector DB cost
   - Good enough for 100K-1M documents
   - HNSW indexes for fast retrieval

4. **MinIO instead of S3**
   - Self-hosted, S3-compatible
   - No egress fees
   - Already may be running for Chlann

5. **Free OCR stack**
   - PyMuPDF for native PDFs (95% of cases)
   - Tesseract + PaddleOCR for scanned docs
   - Pixtral via Ollama for edge cases
   - Avoid Google Vision ($1.50/1K pages) and AWS Textract

6. **Batch processing**
   - Queue documents for off-peak processing
   - No need for real-time inference
   - More efficient GPU/CPU utilization

---

## AI/ML Strategy

### LLM Selection

| Task | Model | Why |
|------|-------|-----|
| Clause extraction | Qwen 2.5 7B | Good at structured output, JSON mode |
| Plain English summary | Llama 3.2 8B | Natural language, good reasoning |
| Risk identification | Mistral 7B | Good at nuanced analysis |
| OCR (edge cases) | Pixtral 12B | Vision model for poor scans, handwriting |
| Embeddings | nomic-embed-text | 768-dim, good for legal text |

### RAG Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Document  │    │   Chunk     │    │   Embed     │
│   Upload    │───▶│   (512 tok) │───▶│   Vectors   │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Generate  │◀───│   Retrieve  │◀───│   Store in  │
│   Response  │    │   Top-K     │    │   pgvector  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Chunking Strategy

For legal documents:
- **Primary:** Semantic chunking (by clause/section)
- **Chunk size:** 512 tokens with 50 token overlap
- **Metadata:** Clause type, page number, section header
- **Special handling:** Tables, exhibits, schedules

### Knowledge Graph (Phase 2)

Entities to extract:
- **Parties:** Company names, roles (buyer, seller, licensor)
- **Dates:** Effective date, termination, milestones
- **Obligations:** Payment terms, deliverables, restrictions
- **Rights:** IP assignment, exclusivity, termination rights
- **Relationships:** Parent/subsidiary, affiliates

Storage: PostgreSQL with JSONB + recursive CTEs for graph queries

### OCR Strategy (Free-First Approach)

**Reality:** 95% of contracts are native PDFs (text already embedded), only 5% need OCR.

#### Multi-Tier OCR Pipeline

| Tier | Tool | Cost | Accuracy | Speed | Use Case |
|------|------|------|----------|-------|----------|
| **Tier 0** | PyMuPDF | $0 | 100% | Instant | Native PDFs (95% of cases) |
| **Tier 1** | Tesseract 5 | $0 | 90-95% | Fast | Clean scans, printed text |
| **Tier 2** | PaddleOCR | $0 | 90-95% | Medium | Tables, multi-column, complex layouts |
| **Tier 3** | Pixtral 12B (Ollama) | $0 | 85-90% | Slow | Handwriting, poor quality, context needed |

#### Decision Logic

```python
def extract_text(pdf_path):
    # Tier 0: Try native PDF extraction first (95% success)
    if is_native_pdf(pdf_path):
        text = pymupdf_extract(pdf_path)
        if text_quality_check(text):  # Has actual text, not just images
            return text

    # Tier 1: Tesseract for standard scans (fastest, 90-95% accurate)
    images = pdf_to_images(pdf_path)
    text = tesseract_ocr(images)
    confidence = get_confidence_score(text)

    if confidence > 0.80:
        return text

    # Tier 2: PaddleOCR for complex layouts (better with tables)
    if has_tables_or_complex_layout(images):
        text = paddleocr_extract(images)
        confidence = get_confidence_score(text)

        if confidence > 0.75:
            return text

    # Tier 3: Pixtral for edge cases (slow but handles anything)
    # Use LLM with vision to extract and understand
    text = pixtral_vision_extract(images)
    return text
```

#### Why NOT Custom Training?

| Approach | Cost | Time | Improvement | Worth It? |
|----------|------|------|-------------|-----------|
| **Tesseract (pre-trained)** | $0 | 0 weeks | Baseline 92% | ✅ YES |
| **Custom OCR model** | $500-1000 | 2-3 weeks | +2-5% → 94-97% | ❌ NO |

**Verdict:** Tesseract + PaddleOCR already trained on millions of documents. Not worth the effort.

#### Cost Comparison (1000 pages)

| Method | Cost | Time | Accuracy | Recommended |
|--------|------|------|----------|-------------|
| PyMuPDF (native) | $0 | 1 min | 100% | ✅ Primary |
| Tesseract | $0 | 10 min | 92% | ✅ Tier 1 |
| PaddleOCR | $0 | 15 min | 94% | ✅ Tier 2 |
| Pixtral (Ollama) | $0 | 2 hours | 90% | ✅ Tier 3 |
| Google Cloud Vision | **$1.50** | 5 min | 98% | ❌ Paid |
| AWS Textract | **$1.50** | 5 min | 98% | ❌ Paid |
| Mistral Pixtral API | **$4-8** | 10 min | 95% | ❌ Paid |

**Total cost for all tiers: $0**

#### Implementation

```yaml
# Dependencies (all free)
dependencies:
  - PyMuPDF (fitz)           # Native PDF extraction
  - pytesseract              # Tesseract wrapper
  - pdf2image                # PDF to image conversion
  - pillow                   # Image processing
  - paddleocr                # Complex layout OCR
  - ollama (pixtral-12b)     # Vision LLM fallback

# System requirements
system:
  - tesseract-ocr (apt install)
  - poppler-utils (for pdf2image)
```

#### Quality Checks

Auto-detect OCR quality issues:
- **Gibberish ratio:** % of non-words in output
- **Confidence scores:** Tesseract provides per-word confidence
- **Layout detection:** Missing sections, scrambled order
- **Manual review flag:** If confidence < 80%, flag for human review

#### When to Use Pixtral (LLM Vision)

Pixtral 12B via Ollama is overkill for most docs, but perfect for:
- Handwritten signatures/annotations
- Very poor scan quality (faded, skewed, coffee stains)
- Need to extract structured data with context understanding
- Tables with merged cells, complex formatting

**Advantage:** Pixtral can understand context and extract fields directly:
```
"Extract: party names, effective date, termination rights"
→ Returns structured JSON, not just raw text
```

### Model Fine-Tuning (Optional)

If needed for better accuracy:
1. **Clause Classification** - Fine-tune on labeled legal clauses
2. **Named Entity Recognition** - Legal entities (parties, dates, amounts)
3. **Risk Scoring** - Custom model for risk assessment

Training approach:
- Use LoRA for efficient fine-tuning
- Dataset: Public contract datasets (EDGAR SEC filings, CUAD)
- Framework: Hugging Face Transformers + PEFT

---

## Tech Stack Summary

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Auth | NextAuth.js |
| PDF Viewer | react-pdf / pdf.js |
| File Upload | react-dropzone |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |

### Backend
| Layer | Technology |
|-------|------------|
| Framework | FastAPI |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Task Queue | Celery + Redis |
| Auth | python-jose (JWT) |
| Validation | Pydantic v2 |
| PDF Processing | PyMuPDF (native), pdf2image (scans) |
| OCR (Tier 1) | Tesseract 5 via pytesseract |
| OCR (Tier 2) | PaddleOCR (complex layouts) |
| OCR (Tier 3) | Pixtral 12B via Ollama (edge cases) |

### AI/ML
| Layer | Technology |
|-------|------------|
| LLM Framework | LangChain or LlamaIndex |
| LLM Inference | Ollama |
| Embeddings | sentence-transformers |
| Vector Store | pgvector |
| Document Loaders | LangChain/Unstructured |
| Chunking | LangChain text splitters |

### Infrastructure
| Layer | Technology |
|-------|------------|
| Database | PostgreSQL 15 + pgvector |
| Cache | Redis |
| Object Storage | MinIO |
| Reverse Proxy | nginx |
| Containerization | Docker + Docker Compose |
| SSL | Let's Encrypt (certbot) |

---

## Data Pipeline

### Document Ingestion Flow

```
1. UPLOAD
   └── User uploads PDF/DOCX
   └── Validate file type, size (<50MB)
   └── Store in MinIO with UUID
   └── Create job in queue

2. EXTRACTION
   └── Celery worker picks up job
   └── Try PyMuPDF first (native PDF - 95% success)
   └── If no text → Tesseract OCR (Tier 1)
   └── If low confidence → PaddleOCR (Tier 2)
   └── If still poor → Pixtral vision (Tier 3)
   └── Preserve page boundaries + confidence scores
   └── Store raw text + metadata

3. CHUNKING
   └── Split into semantic chunks
   └── Preserve section headers
   └── Maintain page references
   └── Generate chunk metadata

4. EMBEDDING
   └── Generate embeddings for each chunk
   └── Store in pgvector
   └── Index for similarity search

5. ANALYSIS
   └── Run clause extraction prompts
   └── Identify key terms (via LLM)
   └── Generate risk flags
   └── Store structured results

6. PRESENTATION
   └── Build summary view
   └── Populate clause cards
   └── Enable search
   └── User reviews results
```

### Database Schema (Conceptual)

```sql
-- Core tables
contracts (id, user_id, filename, status, created_at)
contract_pages (id, contract_id, page_num, raw_text)
contract_chunks (id, contract_id, page_id, text, embedding, metadata)
contract_clauses (id, contract_id, clause_type, text, summary, risk_level)

-- Analysis
contract_parties (id, contract_id, name, role, is_primary)
contract_dates (id, contract_id, date_type, date_value)
contract_obligations (id, contract_id, party_id, description, due_date)

-- User & Auth
users (id, email, name, created_at)
user_sessions (id, user_id, token, expires_at)

-- Search & Analytics
search_queries (id, user_id, query, results_count, created_at)
```

---

## Security Considerations

### For Demo (MVP)
**Not needed.** Using public contract data (CUAD, SEC filings), no real user data.

- Run locally or on Vercel preview
- No authentication needed
- No encryption needed
- No compliance needed

### For Future Product (If Pursued)

**If targeting SMB market later:**
- Basic auth (NextAuth.js with email/password or OAuth)
- HTTPS (standard)
- Per-user data isolation
- Basic input validation
- No SOC 2 needed for SMB

**Never try to sell to enterprise (PE/IB) without:**
- SOC 2 Type II ($50-100K, 12 months)
- Penetration testing ($10-30K)
- Cyber liability insurance
- Data processing agreements
- Dedicated security questionnaire responses

**Recommendation:** Don't pursue enterprise market. Too expensive, too slow.

---

## Development Phases (Full Product: 8 Weeks)

### Phase 1: Core Infrastructure (Weeks 1-2)
**Goal:** Production-ready backend with document ingestion

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Infrastructure | Docker, PostgreSQL + pgvector, Redis, MinIO, FastAPI skeleton |
| 2 | Document Pipeline | Full OCR pipeline (all 4 tiers), chunking, Celery workers |

**What to build:**
- Docker Compose with all services (postgres, redis, minio, ollama)
- FastAPI backend with async SQLAlchemy
- MinIO integration for document storage
- Full OCR pipeline: PyMuPDF → Tesseract → PaddleOCR → Pixtral
- Celery + Redis for async job processing
- Document status tracking (uploaded → processing → completed/failed)

**Exit Criteria:**
- Upload any PDF (native or scanned), get extracted text
- Documents stored in MinIO with metadata in PostgreSQL
- Background processing works reliably

### Phase 2: RAG Pipeline (Weeks 3-4)
**Goal:** Semantic search with vector embeddings

| Week | Focus | Deliverables |
|------|-------|--------------|
| 3 | Embeddings | Chunking strategy, embedding generation, pgvector storage |
| 4 | Search + Retrieval | Semantic search API, retrieval optimization, hybrid search |

**What to build:**
- Semantic chunking (clause-aware, 1500 tokens with overlap)
- Embedding generation via Ollama (nomic-embed-text)
- pgvector storage with HNSW indexing
- Semantic search endpoint with relevance scoring
- Hybrid search (vector + keyword) for better recall
- Search result ranking and filtering

**Exit Criteria:**
- Search "termination clause" returns relevant chunks
- Sub-second search across 1000+ documents
- Relevance is good (manual testing)

### Phase 3: AI Analysis (Weeks 5-6)
**Goal:** Structured extraction and summarization

| Week | Focus | Deliverables |
|------|-------|--------------|
| 5 | Clause Extraction | LLM prompts, structured JSON output, clause classification |
| 6 | Summaries + Risk | Plain English summaries, risk flagging, confidence scores |

**What to build:**
- Clause extraction prompts (Qwen 2.5 for structured output)
- Clause type classification (14 standard M&A clause types)
- Plain English summaries (Llama 3.2)
- Risk flagging logic (rule-based + LLM)
- Confidence scoring for extractions
- Entity extraction (parties, dates, amounts)

**Exit Criteria:**
- Upload contract, see extracted clauses with summaries
- Risk levels assigned (high/medium/low)
- Entities extracted and linked

### Phase 4: Knowledge Graph (Week 7)
**Goal:** Entity relationships and graph queries

| Week | Focus | Deliverables |
|------|-------|--------------|
| 7 | Knowledge Graph | Entity model, relationship extraction, graph queries |

**What to build:**
- Entity data model (parties, dates, obligations, rights)
- Relationship extraction (party→contract, party→obligation)
- Graph storage in PostgreSQL (JSONB + recursive CTEs)
- Graph query API (find all contracts with Party X)
- Basic graph visualization (D3.js force graph)

**Exit Criteria:**
- Can answer "show all contracts involving Company X"
- Relationships visible in UI
- Graph traversal works

### Phase 5: Frontend + Polish (Week 8)
**Goal:** Production-ready UI

| Week | Focus | Deliverables |
|------|-------|--------------|
| 8 | Frontend | Next.js app, document viewer, search UI, auth |

**What to build:**
- Next.js 14 with App Router
- shadcn/ui components
- Document upload with drag-and-drop
- Document viewer with clause highlighting
- Search interface with filters
- Knowledge graph visualization
- User authentication (NextAuth.js)
- Responsive design

**Exit Criteria:**
- Full user flow works (upload → process → search → view)
- Looks professional
- Auth works (GitHub OAuth or email)

### Phase 6: Model Fine-Tuning (Ongoing)
**Goal:** Custom models for legal domain

**What to build:**
- LoRA fine-tuning setup (local GPU)
- Clause classification model (fine-tuned Qwen 2.5)
- Legal NER model (parties, dates, amounts)
- Evaluation pipeline (precision, recall, F1)
- Model versioning and deployment

**Training Data:**
- CUAD dataset (13K labeled clauses)
- MAUD dataset (152 M&A agreements)
- SEC EDGAR filings (additional examples)

**Exit Criteria:**
- Custom model outperforms base model on clause extraction
- Model deployed to Ollama on VPS

---

## Timeline (Full Product: 8+ Weeks)

### Development Timeline

```
Week 1-2: Core Infrastructure
├── Docker compose (all services)
├── FastAPI backend with async SQLAlchemy
├── MinIO document storage
├── Full OCR pipeline (4 tiers)
├── Celery + Redis job queue
└── Document ingestion working

Week 3-4: RAG Pipeline
├── Semantic chunking (clause-aware)
├── Embedding generation (nomic-embed-text)
├── pgvector storage with HNSW
├── Semantic search API
├── Hybrid search (vector + keyword)
└── Search relevance tuning

Week 5-6: AI Analysis
├── Clause extraction prompts
├── Clause classification (14 types)
├── Plain English summaries
├── Risk flagging logic
├── Entity extraction
└── Confidence scoring

Week 7: Knowledge Graph
├── Entity data model
├── Relationship extraction
├── Graph queries
├── Graph visualization
└── Cross-document linking

Week 8: Frontend + Auth
├── Next.js 14 application
├── Document viewer with highlights
├── Search interface
├── Knowledge graph UI
├── User authentication
└── Production polish

Ongoing: Model Fine-Tuning
├── LoRA training setup
├── Clause classification model
├── Legal NER model
├── Evaluation pipeline
└── Deploy to VPS
```

### Milestones

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| M1: Ingestion Works | End of Week 2 | Upload any PDF, get extracted text |
| M2: Search Works | End of Week 4 | Semantic search returns relevant results |
| M3: Analysis Works | End of Week 6 | Clauses extracted with summaries |
| M4: Full Product | End of Week 8 | Complete UI with auth |
| M5: Custom Models | Ongoing | Fine-tuned models deployed |

### No Hard Deadline

Build it properly. Quality over speed. Each milestone produces something usable.

---

## Success Metrics (Demo Focus)

### Primary Success Metric
**Did it help land the NOHUP job (or similar)?** Yes/No

### Technical Demo Metrics
| Metric | Target | Notes |
|--------|--------|-------|
| PDF extraction accuracy | >95% | Native PDFs only (easy) |
| Clause extraction quality | Good enough to impress | Not enterprise-grade |
| Search relevance | Returns sensible results | MRR not critical for demo |
| Demo flow smoothness | No crashes | Works on happy path |

### Portfolio Metrics
| Metric | Target | Notes |
|--------|--------|-------|
| GitHub repo quality | Clean, documented | README, architecture diagram |
| Demo video | 2-3 minutes | Optional but valuable |
| Interview talking points | 5-10 | Technical decisions, trade-offs |
| LinkedIn post | 1 post | After demo is ready |

### What NOT to Measure
- ❌ User sign-ups (no real users)
- ❌ Documents processed in production (demo only)
- ❌ Monetization metrics (not a product yet)

---

## Risks & Mitigations

### Demo Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Demo crashes during interview | Medium | High | Test thoroughly, have backup demo video |
| LLM gives bad output | High | Medium | Cherry-pick demo documents, have fallback examples |
| Run out of time before interview | Medium | Medium | Prioritize core pipeline over polish |
| NOHUP doesn't respond | Medium | Low | ContractClarity is valuable regardless, apply to other jobs |

### Scope Creep Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Adding enterprise features | High | High | Stick to demo scope, no auth/security |
| Perfectionism | Medium | Medium | "Good enough" for demo, not production |
| Building too much | High | High | 4 weeks max, then stop |

### Market Risks (If Productizing Later)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Enterprise market is inaccessible | Certain | N/A | Don't pursue enterprise, target SMB |
| SMB market is small | Medium | Medium | Validate before investing more time |
| Competition | Medium | Low | Focus on differentiation (self-hosted, cheaper) |
| Low adoption | Medium | Medium | Free tier, marketing via portfolio |

### Execution Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | Medium | Strict MVP scope, phase features |
| Time overrun | Medium | Medium | Weekly reviews, cut features if needed |
| Burnout | Medium | High | Sustainable pace, breaks |

---

## Relationship to Clarity Suite

### Brand Consistency

| Product | Domain | Focus | Shared |
|---------|--------|-------|--------|
| BloodClarity | bloodclarity.com | Blood tests | UI patterns, Auth |
| RadioClarity | radioclarity.com | Radiology | Architecture, ML pipeline |
| ContractClarity | contractclarity.com | Contracts | All of above + legal focus |

### Shared Components (Future)

- **Auth system:** Single sign-on across Clarity products
- **UI library:** Shared shadcn components
- **ML pipeline:** Document → Extract → Summarize pattern
- **Infrastructure:** Shared VPS, shared services

### Cross-Promotion

- Mention other Clarity products in each app
- "From the makers of BloodClarity"
- Unified landing page (clarityai.com? or keep separate)

---

## NOHUP Application Synergy

### Why ContractClarity Helps NOHUP Application

1. **Directly relevant to their clients**
   - M&A teams at investment banks (their target)
   - PE firms doing due diligence (their target)
   - Law firms (their target)

2. **Demonstrates required skills**
   - RAG systems (document retrieval)
   - Knowledge graphs (entity extraction)
   - LLM integration (summarization)
   - Production deployment

3. **Shows domain interest**
   - Finance/legal specialization
   - Understanding of M&A workflows
   - Practical application of AI to business problems

4. **Talking points for interview**
   - "I'm building ContractClarity specifically because..."
   - "I learned about M&A due diligence workflows while..."
   - "This is the kind of work I want to do with NOHUP..."

### Proposal Enhancement

Add to NOHUP proposal:
```
CURRENT PROJECT:

I'm building ContractClarity - an AI-powered contract analysis tool for
M&A due diligence. It uses RAG for semantic search, extracts key clauses,
and translates legal language to plain English.

This directly aligns with your work for investment banks and PE firms -
I'm building it because I'm genuinely fascinated by how AI can streamline
deal workflows.

GitHub: https://github.com/m4cd4r4/ContractClarity (in development)
```

---

## Next Steps

### Priority #1: Apply to NOHUP (TODAY)

**ContractClarity is Plan B. NOHUP application is Plan A.**

1. [ ] Apply to NOHUP job on Upwork (proposal is ready in daily log)
2. [ ] Update Upwork profile (if not done)

### If NOHUP Responds with Interview

**Fast-track ContractClarity to have something to show:**

Week 1 (before interview if possible):
- [ ] Git repo with basic structure
- [ ] FastAPI + PDF upload working
- [ ] Semantic search with pgvector
- [ ] Prepare talking points about architecture

### If NOHUP Doesn't Respond (or as backup)

**Build full 4-week demo:**

Week 1:
- [ ] Initialize Git repo at I:\Scratch\ContractClarity
- [ ] Docker compose (postgres + pgvector + ollama)
- [ ] FastAPI skeleton
- [ ] PDF upload + PyMuPDF extraction
- [ ] Download CUAD dataset for demo data

Week 2:
- [ ] Embedding pipeline (nomic-embed-text)
- [ ] pgvector storage
- [ ] Semantic search endpoint
- [ ] Basic Next.js frontend

Week 3:
- [ ] Clause extraction (Qwen 2.5)
- [ ] Plain English summaries (Llama 3.2)
- [ ] Risk flagging
- [ ] Knowledge graph data model

Week 4:
- [ ] Polish UI (shadcn/ui)
- [ ] Document viewer
- [ ] Knowledge graph visualization
- [ ] README + screenshots
- [ ] Optional: Demo video

### What NOT to Do

- ❌ Register contractclarity.com domain yet (wait until demo works)
- ❌ Set up production infrastructure
- ❌ Build authentication
- ❌ Build OCR pipeline (native PDFs only)
- ❌ Pursue enterprise customers

---

## Appendix A: Clause Types to Extract

### Standard M&A Clauses

| Clause Type | Description | Risk Level |
|-------------|-------------|------------|
| Change of Control | What happens on acquisition | High |
| Assignment | Can contracts be transferred | High |
| Termination for Convenience | Can either party exit easily | Medium |
| Termination for Cause | Exit on breach | Medium |
| Auto-Renewal | Does it renew automatically | Medium |
| Notice Period | How much notice required | Low |
| Exclusivity | Are there exclusivity provisions | High |
| IP Assignment | Who owns created IP | High |
| Non-Compete | Any competitive restrictions | High |
| Indemnification | Who bears risk of loss | High |
| Limitation of Liability | Caps on damages | Medium |
| Confidentiality | NDA provisions | Low |
| Governing Law | Which jurisdiction | Low |
| Dispute Resolution | Arbitration vs litigation | Medium |

### Extraction Prompt Template

```
Analyze the following contract excerpt and extract structured information.

CONTRACT TEXT:
{chunk_text}

Extract the following if present:
1. Clause type (from: change_of_control, assignment, termination, ...)
2. Key terms (dates, amounts, conditions)
3. Parties involved
4. Risk assessment (high/medium/low)
5. Plain English summary (1-2 sentences)

Respond in JSON format:
{
  "clause_type": "...",
  "key_terms": [...],
  "parties": [...],
  "risk_level": "...",
  "summary": "..."
}
```

---

## Appendix B: Competitive Landscape

### Existing Solutions

| Product | Pricing | Strengths | Weaknesses |
|---------|---------|-----------|------------|
| Kira Systems | $$$$ | Market leader, accurate | Very expensive, enterprise only |
| Luminance | $$$$ | Good AI, established | Expensive, complex |
| Evisort | $$$ | Modern UI, good extraction | Still expensive |
| ContractPodAi | $$$ | CLM focus, integrations | Broad, not M&A focused |
| DocuSign CLM | $$ | Brand recognition | Weak AI, basic extraction |

### ContractClarity Differentiation

1. **Self-hosted option** - Own your data, no vendor lock-in
2. **Open-source (potentially)** - Transparency, customization
3. **M&A focused** - Specialized for due diligence, not general CLM
4. **Cost-effective** - Use local LLMs, no per-document fees
5. **Developer-friendly** - API-first, easy integration

---

## Appendix C: Dataset Resources

### Public Contract Datasets

| Dataset | Size | Use Case |
|---------|------|----------|
| CUAD (Contract Understanding Atticus Dataset) | 13,000 clauses | Clause classification training |
| EDGAR SEC Filings | Millions | Real contracts (8-K, 10-K, exhibits) |
| ContractNLI | 10,000 contracts | NLI for contract analysis |
| MAUD (Merger Agreement Understanding Dataset) | 152 M&A agreements | M&A specific training |

### Labeling Strategy

If fine-tuning needed:
1. Start with CUAD labels (41 clause types)
2. Supplement with MAUD for M&A specifics
3. Manual labeling: 100-200 documents for edge cases
4. Active learning: Focus labeling on low-confidence predictions

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-29 | Initial plan |
| 2.0 | 2026-01-29 | Major revision: Reframed as portfolio demo, not commercial product. Reduced scope from 8 weeks to 4 weeks. Removed enterprise market focus. Added honest assessment of market reality. |

---

## Summary: The Full Product

### What This Is
**A production-quality contract analysis platform** with enterprise-grade technology. The only barrier to enterprise sales is regulatory compliance (SOC 2), not technical capability.

### What This Is NOT
- ❌ A toy demo or prototype
- ❌ An enterprise product (we can't sell to PE/IB without SOC 2)
- ❌ A startup (yet) - it's a portfolio piece with product potential

### What We're Building

| Component | Implementation | Status |
|-----------|----------------|--------|
| OCR Pipeline | 4-tier (PyMuPDF → Tesseract → PaddleOCR → Pixtral) | Full |
| Document Storage | MinIO (S3-compatible) | Full |
| Job Queue | Celery + Redis | Full |
| Vector Search | pgvector with HNSW | Full |
| LLM Inference | Ollama (self-hosted) | Full |
| Knowledge Graph | PostgreSQL + entity extraction | Full |
| Frontend | Next.js 14 + shadcn/ui | Full |
| Authentication | NextAuth.js | Full |
| Model Training | LoRA fine-tuning (local GPU) | Full |
| VPS Deployment | 45.77.233.102 | Full |

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OCR | Full 4-tier pipeline | Handle any document quality |
| Storage | MinIO | Production-ready, S3-compatible |
| Processing | Celery + Redis | Async, scalable |
| LLMs | Ollama + custom fine-tuned | Free, customizable |
| Vector DB | pgvector | Free, integrated with PostgreSQL |
| Training | Local GPU + LoRA | Custom models, zero API cost |
| Deployment | VPS (shared infra) | Cost-effective, full control |

### Market Position

**Can sell to:**
- Solo lawyers
- Small law firms (<10 people)
- Startup legal teams
- Real estate agents
- Small business owners

**Cannot sell to (without SOC 2):**
- Investment banks
- PE firms
- Big Law
- Fortune 500 companies

### Success Criteria

1. **Technical:** Production-quality implementation that could handle real workloads
2. **Portfolio:** Demonstrates enterprise-grade AI engineering skills
3. **Learning:** Hands-on RAG, knowledge graphs, model fine-tuning
4. **Optional:** SMB revenue or open-source community adoption

---

**End of Plan**
