# Sample Contract Data

This directory contains sample contracts for testing and demo purposes.

## Public Data Sources

### CUAD Dataset
Download from: https://github.com/TheAtticusProject/cuad

Contains 13,000+ labeled contract clauses from:
- Master Service Agreements
- Software Licenses
- NDAs
- Employment Agreements

### SEC EDGAR
Download M&A filings from: https://www.sec.gov/cgi-bin/browse-edgar

Search for:
- Form 8-K (Current Reports)
- Form 10-K (Annual Reports)
- Merger Agreements

### MAUD Dataset
Download from: https://www.mauldataset.org/

Contains 152 labeled merger agreements with:
- Deal terms
- Representations & warranties
- Covenants
- Closing conditions

## Usage

1. Download sample contracts from above sources
2. Place PDF files in this directory
3. Upload via API or frontend

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
