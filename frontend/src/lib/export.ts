import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { Document, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle, Packer } from 'docx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Document as ContractDocument, AnalysisSummary, Clause, Entity } from './api'

// Helper to format date
const formatDate = () => new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

// Helper to format clause type
const formatClauseType = (type: string) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// Helper to get risk color
const getRiskColor = (risk: string): [number, number, number] => {
  switch (risk?.toLowerCase()) {
    case 'critical': return [239, 68, 68]
    case 'high': return [249, 115, 22]
    case 'medium': return [245, 158, 11]
    case 'low': return [16, 185, 129]
    default: return [100, 100, 100]
  }
}

/**
 * Export to Excel (.xlsx)
 * Creates a workbook with Summary, Clauses, and Entities sheets
 */
export async function exportToExcel(
  document: ContractDocument,
  analysis: AnalysisSummary | null,
  clauses: Clause[],
  entities: Entity[]
): Promise<void> {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryData = [
    ['CONTRACT ANALYSIS REPORT'],
    [''],
    ['Document', document.filename],
    ['Export Date', formatDate()],
    ['Status', document.status],
    ['Pages', document.page_count ?? 'N/A'],
    [''],
    ['RISK SUMMARY'],
    ['Overall Risk', analysis?.overall_risk?.toUpperCase() ?? 'Not Analyzed'],
    ['Critical', analysis?.risk_summary?.critical ?? 0],
    ['High', analysis?.risk_summary?.high ?? 0],
    ['Medium', analysis?.risk_summary?.medium ?? 0],
    ['Low', analysis?.risk_summary?.low ?? 0],
    ['Total Clauses', analysis?.clauses_extracted ?? 0],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // Sheet 2: Clauses
  const clauseRows = clauses.map(c => ({
    'Clause Type': formatClauseType(c.clause_type),
    'Risk Level': c.risk_level?.toUpperCase() ?? 'N/A',
    'Summary': c.summary ?? '',
    'Content': c.content.substring(0, 500) + (c.content.length > 500 ? '...' : ''),
    'Risk Factors': c.risk_factors?.join('; ') ?? '',
    'Confidence': c.confidence ? `${Math.round(c.confidence * 100)}%` : 'N/A'
  }))
  const clausesSheet = XLSX.utils.json_to_sheet(clauseRows)
  clausesSheet['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 50 }, { wch: 80 }, { wch: 40 }, { wch: 12 }
  ]
  XLSX.utils.book_append_sheet(workbook, clausesSheet, 'Clauses')

  // Sheet 3: Entities
  const entityRows = entities.map(e => ({
    'Entity Type': formatClauseType(e.entity_type),
    'Name': e.name,
    'Normalized Name': e.normalized_name ?? '',
    'Value': e.value ?? '',
    'Context': e.context ?? ''
  }))
  const entitiesSheet = XLSX.utils.json_to_sheet(entityRows)
  entitiesSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(workbook, entitiesSheet, 'Entities')

  // Generate and save
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${document.filename.replace('.pdf', '')}_analysis.xlsx`)
}

/**
 * Export to Word (.docx)
 * Creates a formatted document with sections
 */
export async function exportToWord(
  document: ContractDocument,
  analysis: AnalysisSummary | null,
  clauses: Clause[],
  entities: Entity[]
): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [new TextRun({ text: 'CONTRACT ANALYSIS REPORT', bold: true, size: 36 })],
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 }
        }),

        // Document Info
        new Paragraph({
          children: [
            new TextRun({ text: 'Document: ', bold: true }),
            new TextRun({ text: document.filename })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Export Date: ', bold: true }),
            new TextRun({ text: formatDate() })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Overall Risk: ', bold: true }),
            new TextRun({ text: analysis?.overall_risk?.toUpperCase() ?? 'Not Analyzed' })
          ],
          spacing: { after: 400 }
        }),

        // Risk Summary Section
        new Paragraph({
          children: [new TextRun({ text: 'Risk Summary', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Risk Level', 'Count'].map(text =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                  shading: { fill: 'CCCCCC' }
                })
              )
            }),
            ...['Critical', 'High', 'Medium', 'Low'].map(level =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(level)] }),
                  new TableCell({
                    children: [new Paragraph(
                      String(analysis?.risk_summary?.[level.toLowerCase() as keyof typeof analysis.risk_summary] ?? 0)
                    )]
                  })
                ]
              })
            )
          ]
        }),

        // High Risk Highlights
        ...(analysis?.high_risk_highlights?.length ? [
          new Paragraph({
            children: [new TextRun({ text: 'High-Risk Clauses Requiring Attention', bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          ...analysis.high_risk_highlights.flatMap(h => [
            new Paragraph({
              children: [
                new TextRun({ text: `${formatClauseType(h.clause_type)} `, bold: true }),
                new TextRun({ text: `[${h.risk_level.toUpperCase()}]`, color: 'FF0000' })
              ],
              spacing: { before: 200 }
            }),
            new Paragraph({ children: [new TextRun({ text: h.summary, italics: true })] }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Risk Factors: ', bold: true }),
                new TextRun({ text: h.risk_factors.join(', ') })
              ],
              spacing: { after: 200 }
            })
          ])
        ] : []),

        // All Clauses Section
        new Paragraph({
          children: [new TextRun({ text: 'All Extracted Clauses', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Type', 'Risk', 'Summary'].map(text =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                  shading: { fill: 'CCCCCC' }
                })
              )
            }),
            ...clauses.slice(0, 50).map(c =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(formatClauseType(c.clause_type))] }),
                  new TableCell({ children: [new Paragraph(c.risk_level?.toUpperCase() ?? 'N/A')] }),
                  new TableCell({ children: [new Paragraph(c.summary ?? c.content.substring(0, 100))] })
                ]
              })
            )
          ]
        }),

        // Entities Section
        ...(entities.length ? [
          new Paragraph({
            children: [new TextRun({ text: 'Entities Identified', bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Type', 'Name', 'Value'].map(text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                    shading: { fill: 'CCCCCC' }
                  })
                )
              }),
              ...entities.slice(0, 50).map(e =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(formatClauseType(e.entity_type))] }),
                    new TableCell({ children: [new Paragraph(e.name)] }),
                    new TableCell({ children: [new Paragraph(e.value ?? '')] })
                  ]
                })
              )
            ]
          })
        ] : []),

        // Footer
        new Paragraph({
          children: [new TextRun({ text: 'Generated by ContractClarity', italics: true, size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 800 }
        })
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${document.filename.replace('.pdf', '')}_analysis.docx`)
}

/**
 * Export to PDF
 * Creates a formatted PDF report
 */
export async function exportToPDF(
  document: ContractDocument,
  analysis: AnalysisSummary | null,
  clauses: Clause[],
  entities: Entity[]
): Promise<void> {
  const pdf = new jsPDF()
  let yPos = 20

  // Title
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CONTRACT ANALYSIS REPORT', 105, yPos, { align: 'center' })
  yPos += 15

  // Document Info
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Document: ${document.filename}`, 20, yPos)
  yPos += 7
  pdf.text(`Export Date: ${formatDate()}`, 20, yPos)
  yPos += 7

  // Overall Risk with color
  const riskText = analysis?.overall_risk?.toUpperCase() ?? 'Not Analyzed'
  const riskColor = getRiskColor(analysis?.overall_risk ?? '')
  pdf.text('Overall Risk: ', 20, yPos)
  pdf.setTextColor(...riskColor)
  pdf.setFont('helvetica', 'bold')
  pdf.text(riskText, 55, yPos)
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'normal')
  yPos += 15

  // Risk Summary Table
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Risk Summary', 20, yPos)
  yPos += 8

  autoTable(pdf, {
    startY: yPos,
    head: [['Risk Level', 'Count']],
    body: [
      ['Critical', String(analysis?.risk_summary?.critical ?? 0)],
      ['High', String(analysis?.risk_summary?.high ?? 0)],
      ['Medium', String(analysis?.risk_summary?.medium ?? 0)],
      ['Low', String(analysis?.risk_summary?.low ?? 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [201, 162, 39] }, // Accent gold
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40 } },
    margin: { left: 20 }
  })

  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

  // High Risk Highlights
  if (analysis?.high_risk_highlights?.length) {
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('High-Risk Clauses', 20, yPos)
    yPos += 8

    autoTable(pdf, {
      startY: yPos,
      head: [['Clause Type', 'Risk', 'Summary', 'Risk Factors']],
      body: analysis.high_risk_highlights.map(h => [
        formatClauseType(h.clause_type),
        h.risk_level.toUpperCase(),
        h.summary.substring(0, 80) + (h.summary.length > 80 ? '...' : ''),
        h.risk_factors.join(', ').substring(0, 60)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [201, 162, 39] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 70 },
        3: { cellWidth: 45 }
      },
      margin: { left: 20, right: 20 }
    })

    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
  }

  // All Clauses (new page if needed)
  if (yPos > 250) {
    pdf.addPage()
    yPos = 20
  }

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('All Extracted Clauses', 20, yPos)
  yPos += 8

  autoTable(pdf, {
    startY: yPos,
    head: [['Type', 'Risk', 'Summary']],
    body: clauses.slice(0, 30).map(c => [
      formatClauseType(c.clause_type),
      c.risk_level?.toUpperCase() ?? 'N/A',
      (c.summary ?? c.content).substring(0, 100) + '...'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [201, 162, 39] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20 },
      2: { cellWidth: 110 }
    },
    margin: { left: 20, right: 20 }
  })

  // Entities (new page)
  if (entities.length) {
    pdf.addPage()
    yPos = 20

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Entities Identified', 20, yPos)
    yPos += 8

    autoTable(pdf, {
      startY: yPos,
      head: [['Type', 'Name', 'Value']],
      body: entities.slice(0, 40).map(e => [
        formatClauseType(e.entity_type),
        e.name,
        e.value ?? ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: [201, 162, 39] },
      margin: { left: 20, right: 20 }
    })
  }

  // Footer on last page
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Generated by ContractClarity', 105, 285, { align: 'center' })
    pdf.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' })
  }

  pdf.save(`${document.filename.replace('.pdf', '')}_analysis.pdf`)
}

/**
 * Export to CSV
 * Simple clause export for spreadsheet import
 */
export function exportToCSV(
  document: ContractDocument,
  clauses: Clause[]
): void {
  const headers = ['Clause Type', 'Risk Level', 'Summary', 'Content', 'Risk Factors', 'Confidence']
  const rows = clauses.map(c => [
    formatClauseType(c.clause_type),
    c.risk_level ?? '',
    `"${(c.summary ?? '').replace(/"/g, '""')}"`,
    `"${c.content.replace(/"/g, '""')}"`,
    `"${(c.risk_factors ?? []).join('; ')}"`,
    c.confidence ? `${Math.round(c.confidence * 100)}%` : ''
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, `${document.filename.replace('.pdf', '')}_clauses.csv`)
}

/**
 * Export to JSON
 * Full analysis data for integration
 */
export function exportToJSON(
  document: ContractDocument,
  analysis: AnalysisSummary | null,
  clauses: Clause[],
  entities: Entity[]
): void {
  const data = {
    exportDate: new Date().toISOString(),
    document: {
      id: document.id,
      filename: document.filename,
      fileSize: document.file_size,
      pageCount: document.page_count,
      status: document.status
    },
    analysis: analysis ? {
      overallRisk: analysis.overall_risk,
      riskSummary: analysis.risk_summary,
      clausesExtracted: analysis.clauses_extracted,
      clauseBreakdown: analysis.clause_breakdown,
      highRiskHighlights: analysis.high_risk_highlights
    } : null,
    clauses: clauses.map(c => ({
      id: c.id,
      clauseType: c.clause_type,
      riskLevel: c.risk_level,
      summary: c.summary,
      content: c.content,
      riskFactors: c.risk_factors,
      confidence: c.confidence
    })),
    entities: entities.map(e => ({
      id: e.id,
      entityType: e.entity_type,
      name: e.name,
      normalizedName: e.normalized_name,
      value: e.value,
      context: e.context
    }))
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  saveAs(blob, `${document.filename.replace('.pdf', '')}_analysis.json`)
}
