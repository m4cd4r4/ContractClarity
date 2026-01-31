# ContractClarity Demo Walkthrough

A guided demonstration of ContractClarity's AI-powered contract analysis capabilities. Use this guide for live demos, recorded walkthroughs, or portfolio presentations.

---

## Demo Flow (5-7 minutes)

| Step | Duration | What to Show |
|------|----------|--------------|
| 1. Overview | 30s | Dashboard, stats, value proposition |
| 2. Upload | 45s | PDF upload, processing pipeline |
| 3. Clause Analysis | 90s | Risk assessment, extracted clauses |
| 4. Knowledge Graph | 60s | Entity visualization, relationships |
| 5. Search | 60s | Semantic search, relevance scoring |
| 6. Technical Deep-Dive | 60s | Architecture, code quality |

---

## Step 1: Dashboard Overview

**Open**: http://localhost:3000

### Talking Points

> "This is ContractClarity - an AI-powered contract analysis platform for M&A due diligence. In a typical M&A deal, legal teams spend weeks reviewing hundreds of contracts manually. ContractClarity reduces that to minutes."

**Point out:**
- **Stats cards** - Documents indexed, text chunks, clauses extracted, ready for review
- **Contract Portfolio** - List of uploaded documents with processing status
- **Risk Assessment Panel** - Where analysis results appear

### Key Message

> "The dashboard gives you immediate visibility into your contract portfolio with real-time processing status."

---

## Step 2: Upload a Contract

**Action**: Click "Upload Contract" button

### Demo Script

> "Let's upload a contract. I'll use a sample SaaS agreement."

**Upload**: `sample-contracts/scribd-downloads/116987661-Sample-Saas-Agreement.pdf`

**Point out:**
1. **Immediate upload** - File goes to MinIO object storage
2. **Status change** - Watch it go from "uploading" to "processing"
3. **Background processing** - Celery worker handles extraction asynchronously

### Technical Note (optional)

> "Behind the scenes, a 4-tier OCR pipeline extracts text. It tries PyMuPDF first for native PDF text, then falls back to Tesseract, PaddleOCR, or even a Vision LLM for difficult documents. The text gets chunked into 6000-character segments with 600-character overlap to preserve context."

**Wait for processing to complete** (green checkmark appears)

---

## Step 3: Clause Analysis

**Action**: Click on the uploaded document

### Demo Script

> "Now that processing is complete, let's see what the AI found."

**Point out:**

#### Risk Assessment Panel
- **Overall Risk Level** - Critical/High/Medium/Low based on clause distribution
- **Risk Distribution Grid** - 2x2 grid showing count per risk level
- **Attention Required** - Highlighted critical and high-risk clauses

> "The AI has analyzed this contract and flagged it as [RISK LEVEL]. Let's see why."

#### High-Risk Highlights

> "These are the clauses that need immediate attention in due diligence. Each one shows the clause type, a plain English summary, and why it's flagged."

**Click "View Full Analysis"**

#### Document Detail Page
- **All Extracted Clauses** - Complete list with risk levels
- **Clause Types** - Termination, indemnification, change of control, etc.
- **Summaries** - AI-generated plain English explanations

### Key Message

> "What used to take a junior associate hours to extract and categorize, the AI does in seconds. And it never misses a clause due to fatigue."

---

## Step 4: Knowledge Graph

**Action**: Click "Knowledge Graph" button

### Demo Script

> "Now let's visualize the relationships in this contract."

**Point out:**

#### Entity Types (Nodes)
- **Parties** - Companies, individuals involved
- **Dates** - Effective date, termination date, renewal dates
- **Amounts** - Payment amounts, caps, thresholds
- **Terms** - Duration, notice periods
- **Locations** - Governing law, jurisdiction

#### Relationships (Edges)
- Party → Contract (party_to_contract)
- Date → Contract (effective_date, expiration_date)
- Term → Clause (governs)

> "This graph shows how all the key entities in the contract relate to each other. In a multi-contract scenario, you can see the same party appearing across different agreements."

### Technical Note (optional)

> "Entity extraction uses the same LLM that powers clause extraction, but with a different prompt template optimized for identifying named entities and their relationships."

---

## Step 5: Search

**Action**: Return to dashboard, use the search bar

### Demo Script

> "Finally, let's see how semantic search works."

**Type**: "termination rights" (or "indemnification", "change of control")

> "I'm searching for 'termination rights'. Watch what happens."

**Point out:**

#### Search Results
- **Document name** - Which contract the result came from
- **Relevance score** - Combined semantic + keyword ranking
- **Content snippet** - Preview of the matching text

> "Notice the relevance scores. This isn't just keyword matching - it's semantic understanding. If I search for 'ending the agreement', it will find termination clauses even if they don't use the exact words."

### Advanced Search

> "For power users, there's an Advanced Search page with configurable weights between semantic and keyword search, filtering by document or risk level."

---

## Step 6: Technical Deep-Dive (Optional)

**For technical audiences** - show code/architecture

### Architecture Overview

> "Let me show you what's under the hood."

**Open**: http://localhost:8003/docs (FastAPI Swagger UI)

**Point out:**
- **Clean API design** - RESTful endpoints
- **Async Python** - FastAPI with SQLAlchemy 2.0
- **Vector database** - PostgreSQL with pgvector extension

### Code Quality Indicators

- **12 Playwright E2E tests** - Comprehensive UI testing
- **TypeScript frontend** - Type safety throughout
- **Docker Compose** - Single command deployment
- **Celery workers** - Production-ready async processing

### Tech Stack Summary

```
Frontend: Next.js 14 + TypeScript + TailwindCSS
Backend:  FastAPI + SQLAlchemy + Celery
Database: PostgreSQL 16 + pgvector
LLM:      Ollama (llama3.2, nomic-embed-text)
Storage:  MinIO (S3-compatible)
Queue:    Redis
```

---

## Handling Questions

### "How accurate is the clause extraction?"

> "The accuracy depends on the LLM model and the quality of the input document. With llama3.2 and clean PDFs, we see high accuracy on standard commercial contracts. The system is designed to be conservative - it's better to flag something for human review than to miss it."

### "Can it handle scanned documents?"

> "Yes! The 4-tier OCR pipeline handles everything from native PDFs to handwritten notes. It tries the fastest method first (native text), then progressively falls back to more sophisticated OCR engines."

### "How does it compare to [Commercial Tool]?"

> "This is a demonstration of the engineering capabilities - production RAG pipelines, knowledge graphs, and LLM-powered extraction. The tech is enterprise-grade; what it lacks is the compliance certifications (SOC 2, etc.) that enterprise buyers require."

### "What's the processing time?"

> "Typical documents process in 30-90 seconds depending on length and OCR requirements. The async architecture means the UI never blocks - you can upload multiple documents and they'll process in parallel."

### "Can it handle different contract types?"

> "The clause types are configurable. Currently it's optimized for M&A due diligence (SaaS agreements, service contracts, leases), but the extraction prompts can be customized for any domain."

---

## Demo Checklist

Before starting:

- [ ] Frontend running at http://localhost:3000
- [ ] Backend running at http://localhost:8003
- [ ] At least one contract uploaded and processed
- [ ] Clause extraction completed on demo document
- [ ] Entity extraction completed (for knowledge graph)
- [ ] Screen resolution set to 1920x1080 or higher

### Sample Commands

```bash
# Check services are running
docker ps

# Check Ollama models
docker exec contractclarity-ollama ollama list

# Run E2E tests (to verify everything works)
cd frontend && npm test
```

---

## Recording Tips

1. **Use 1920x1080 resolution** - Standard for video
2. **Zoom browser to 110%** - Better readability
3. **Pause at each step** - Let animations complete
4. **Use dark theme** - The design is optimized for it
5. **Pre-load data** - Don't wait for processing during recording

---

## Customizing for Audience

### For AI/ML Engineers
- Emphasize vector embeddings, RAG pipeline, LLM prompting
- Show the chunking strategy (6000 chars, 600 overlap)
- Discuss embedding model choice (nomic-embed-text)

### For Full-Stack Engineers
- Emphasize clean architecture, async patterns, type safety
- Show Playwright tests, Docker setup, API design
- Discuss frontend/backend separation

### For Product/Business
- Emphasize time savings, risk reduction, scalability
- Focus on user workflow, not technical details
- Use concrete numbers (hours saved, clauses extracted)

### For Legal Tech
- Emphasize clause types, risk factors, compliance
- Show how it supports (not replaces) human review
- Discuss audit trail, explainability

---

## Quick Demo (2 minutes)

If short on time:

1. **Dashboard** (15s) - "AI contract analysis for M&A"
2. **Click document** (15s) - "Instant risk assessment"
3. **Risk panel** (30s) - "Critical clauses highlighted"
4. **Knowledge Graph** (30s) - "Entity relationships visualized"
5. **Search** (30s) - "Semantic search across all contracts"

---

*Last updated: January 2026*
