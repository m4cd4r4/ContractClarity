# Sample Contract Data

This directory contains sample contracts for testing and demo purposes.

## Current Sample Data

Our demo contracts are **generic templates** sourced from Scribd, with all real company names removed. These include:

- SaaS License Agreements
- Software License Agreements
- Commercial Lease Contracts
- Business Acquisition Agreements
- NDA Templates
- Merger Agreement Templates
- Employment Contract Templates
- Construction Contracts

**Location:** `../sample-contracts/scribd-downloads/`

## Public Datasets for ML Training

### CUAD Dataset
Download from: https://github.com/TheAtticusProject/cuad

Contains 13,000+ labeled contract clauses (JSON annotations, not PDFs) from:
- Master Service Agreements
- Software Licenses
- NDAs
- Employment Agreements

**Note:** CUAD provides text and clause annotations, not original PDF files.

### SEC EDGAR
Download M&A filings from: https://www.sec.gov/cgi-bin/browse-edgar

Search for:
- Form 8-K (Current Reports)
- Form 10-K (Annual Reports)
- Merger Agreements

**Note:** SEC filings are HTML format, not PDF.

### MAUD Dataset
Download from: https://www.mauldataset.org/

Contains 152 labeled merger agreements with:
- Deal terms
- Representations & warranties
- Covenants
- Closing conditions

## Usage

1. Place PDF files in the sample-contracts directory
2. Upload via API or frontend

```bash
# Upload via API
curl -X POST http://localhost:8002/documents/upload \
  -F "file=@sample-contract.pdf"
```

## Clause Types Extracted

- Change of Control
- Termination Rights
- IP Assignment
- Indemnification
- Limitation of Liability
- Confidentiality
- Non-Compete
- Assignment
- Governing Law
- Dispute Resolution

## Data Guidelines

When adding sample contracts:
- Use only **generic templates** without real company names
- Verify no personally identifiable information (PII)
- Avoid documents with real financial figures or deal terms
- Public dataset annotations (CUAD/MAUD) are safe for training
