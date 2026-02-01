'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, FileText, AlertTriangle, CheckCircle, Shield,
  Clock, Loader2, ChevronDown, ChevronRight, Network,
  Filter, Download, Zap, RefreshCw, FileSpreadsheet, FileType, FileJson
} from 'lucide-react'
import { api, Document, Clause, AnalysisSummary, Entity } from '@/lib/api'
import { exportToExcel, exportToWord, exportToPDF, exportToCSV, exportToJSON } from '@/lib/export'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

const riskConfig: Record<RiskLevel, { color: string; bg: string; border: string; glow: string }> = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'
  },
  high: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]'
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: ''
  },
  low: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: ''
  },
}

const clauseTypeLabels: Record<string, string> = {
  termination: 'Termination',
  indemnification: 'Indemnification',
  limitation_of_liability: 'Limitation of Liability',
  confidentiality: 'Confidentiality',
  non_compete: 'Non-Compete',
  intellectual_property: 'Intellectual Property',
  change_of_control: 'Change of Control',
  assignment: 'Assignment',
  governing_law: 'Governing Law',
  dispute_resolution: 'Dispute Resolution',
  warranty: 'Warranty',
  force_majeure: 'Force Majeure',
  payment_terms: 'Payment Terms',
  insurance: 'Insurance',
  audit_rights: 'Audit Rights',
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null)
  const [clauses, setClauses] = useState<Clause[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [selectedClauseType, setSelectedClauseType] = useState<string | null>(null)
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null)
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    loadDocument()
  }, [documentId])

  const loadDocument = async () => {
    try {
      const [doc, analysisRes] = await Promise.all([
        api.documents.get(documentId),
        api.analysis.summary(documentId).catch(() => null),
      ])
      setDocument(doc)
      setAnalysis(analysisRes)

      if (analysisRes && analysisRes.clauses_extracted > 0) {
        const clausesRes = await api.analysis.clauses(documentId)
        setClauses(clausesRes)
      }
      // Load entities for export
      const entitiesRes = await api.graph.entities(documentId).catch(() => [])
      setEntities(entitiesRes)
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerExtraction = async () => {
    setExtracting(true)
    try {
      await api.analysis.extract(documentId)
      // Poll for completion
      const checkInterval = setInterval(async () => {
        const analysisRes = await api.analysis.summary(documentId).catch(() => null)
        if (analysisRes && analysisRes.status === 'completed') {
          clearInterval(checkInterval)
          setAnalysis(analysisRes)
          const clausesRes = await api.analysis.clauses(documentId)
          setClauses(clausesRes)
          setExtracting(false)
        }
      }, 3000)
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkInterval)
        setExtracting(false)
      }, 120000)
    } catch (error) {
      console.error('Extraction failed:', error)
      setExtracting(false)
    }
  }

  const filteredClauses = clauses.filter((clause) => {
    if (selectedClauseType && clause.clause_type !== selectedClauseType) return false
    if (selectedRiskLevel && clause.risk_level !== selectedRiskLevel) return false
    return true
  })

  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses)
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId)
    } else {
      newExpanded.add(clauseId)
    }
    setExpandedClauses(newExpanded)
  }

  const clauseTypeCounts = clauses.reduce((acc, clause) => {
    acc[clause.clause_type] = (acc[clause.clause_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleExport = async (format: string) => {
    if (!document) return
    setExporting(format)
    setShowExportMenu(false)
    try {
      switch (format) {
        case 'excel':
          await exportToExcel(document, analysis, clauses, entities)
          break
        case 'word':
          await exportToWord(document, analysis, clauses, entities)
          break
        case 'pdf':
          await exportToPDF(document, analysis, clauses, entities)
          break
        case 'csv':
          exportToCSV(document, clauses)
          break
        case 'json':
          exportToJSON(document, analysis, clauses, entities)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
          <p className="mt-4 text-ink-400">Loading document...</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-ink-700 mx-auto" />
          <h2 className="mt-4 text-xl font-display font-semibold">Document Not Found</h2>
          <p className="mt-2 text-ink-500">The requested document could not be found.</p>
          <Link href="/" className="mt-6 btn-primary inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink-800/50 bg-ink-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-ink-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-ink-400" />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">{document.filename}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-ink-500">
                    {document.page_count ? `${document.page_count} pages` : 'Processing...'}
                  </span>
                  <span className="text-xs text-ink-600">•</span>
                  <span className="text-xs text-ink-500">{document.chunk_count} chunks</span>
                  {analysis && (
                    <>
                      <span className="text-xs text-ink-600">•</span>
                      <span className="text-xs text-ink-500">{analysis.clauses_extracted} clauses</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/documents/${documentId}/graph`}
                className="flex items-center gap-2 px-4 py-2 bg-ink-800 text-ink-200 rounded-lg
                         hover:bg-ink-700 transition-colors"
              >
                <Network className="w-4 h-4" />
                Knowledge Graph
              </Link>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-ink-800 text-ink-200 rounded-lg
                           hover:bg-ink-700 transition-colors disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exporting ? 'Exporting...' : 'Export'}
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-ink-900 border border-ink-700 rounded-lg shadow-xl overflow-hidden z-50"
                    >
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-ink-200 hover:bg-ink-800 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-red-400" />
                        PDF Report
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-ink-200 hover:bg-ink-800 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => handleExport('word')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-ink-200 hover:bg-ink-800 transition-colors"
                      >
                        <FileType className="w-4 h-4 text-blue-400" />
                        Word (.docx)
                      </button>
                      <div className="border-t border-ink-700" />
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-ink-200 hover:bg-ink-800 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-ink-400" />
                        CSV (Clauses)
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-ink-200 hover:bg-ink-800 transition-colors"
                      >
                        <FileJson className="w-4 h-4 text-amber-400" />
                        JSON (Full Data)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Risk Summary */}
        {analysis && analysis.clauses_extracted > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-5 gap-4 mb-8"
          >
            {/* Overall Risk */}
            <div className={`card p-5 col-span-2 ${
              analysis.overall_risk === 'critical' ? 'risk-critical' :
              analysis.overall_risk === 'high' ? 'risk-high' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-400">Overall Risk Assessment</p>
                  <p className={`text-3xl font-display font-bold mt-1 capitalize
                              ${riskConfig[analysis.overall_risk as RiskLevel]?.color || 'text-ink-300'}`}>
                    {analysis.overall_risk}
                  </p>
                </div>
                <Shield className={`w-12 h-12 ${
                  riskConfig[analysis.overall_risk as RiskLevel]?.color || 'text-ink-600'
                }`} />
              </div>
            </div>

            {/* Risk Distribution */}
            {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => (
              <div
                key={level}
                className={`card p-5 cursor-pointer transition-all hover:scale-[1.02]
                          ${selectedRiskLevel === level ? 'ring-2 ring-accent' : ''}
                          ${level === 'critical' || level === 'high' ? riskConfig[level].glow : ''}`}
                onClick={() => setSelectedRiskLevel(selectedRiskLevel === level ? null : level)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium uppercase tracking-wider ${riskConfig[level].color}`}>
                    {level}
                  </span>
                  {(level === 'critical' || level === 'high') && analysis.risk_summary[level] > 0 && (
                    <AlertTriangle className={`w-4 h-4 ${riskConfig[level].color}`} />
                  )}
                </div>
                <p className="text-2xl font-mono font-bold text-ink-100">
                  {analysis.risk_summary[level] || 0}
                </p>
                <p className="text-xs text-ink-500 mt-1">clauses</p>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 mb-8 text-center"
          >
            <Zap className="w-12 h-12 text-accent/50 mx-auto" />
            <h3 className="font-display text-lg font-semibold mt-4">
              {analysis ? 'No Clauses Found' : 'Analysis Not Yet Run'}
            </h3>
            <p className="text-ink-500 mt-2">
              {analysis
                ? 'The AI extraction found no clauses in this document. Try re-running the extraction.'
                : 'Extract clauses and assess risk levels for this document.'}
            </p>
            <button
              onClick={triggerExtraction}
              disabled={extracting}
              className="mt-6 btn-primary"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {analysis ? 'Re-run Clause Extraction' : 'Run Clause Extraction'}
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Clauses Section */}
        {clauses.length > 0 && (
          <div className="grid grid-cols-4 gap-6">
            {/* Clause Type Sidebar */}
            <div className="col-span-1">
              <div className="card sticky top-24">
                <div className="px-4 py-3 border-b border-ink-800/50">
                  <h3 className="font-display font-semibold text-sm">Clause Types</h3>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => setSelectedClauseType(null)}
                    className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors
                              ${!selectedClauseType ? 'bg-accent/10 text-accent' : 'hover:bg-ink-800 text-ink-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>All Clauses</span>
                      <span className="font-mono text-xs">{clauses.length}</span>
                    </div>
                  </button>
                  {Object.entries(clauseTypeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <button
                        key={type}
                        onClick={() => setSelectedClauseType(selectedClauseType === type ? null : type)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors
                                  ${selectedClauseType === type ? 'bg-accent/10 text-accent' : 'hover:bg-ink-800 text-ink-300'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{clauseTypeLabels[type] || type.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-xs">{count}</span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Clauses List */}
            <div className="col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">
                  Extracted Clauses
                  {(selectedClauseType || selectedRiskLevel) && (
                    <span className="ml-2 text-sm font-normal text-ink-500">
                      ({filteredClauses.length} of {clauses.length})
                    </span>
                  )}
                </h3>
                {(selectedClauseType || selectedRiskLevel) && (
                  <button
                    onClick={() => {
                      setSelectedClauseType(null)
                      setSelectedRiskLevel(null)
                    }}
                    className="text-sm text-accent hover:text-accent-light"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredClauses.map((clause, index) => {
                    const risk = riskConfig[clause.risk_level as RiskLevel] || riskConfig.low
                    const isExpanded = expandedClauses.has(clause.id)

                    return (
                      <motion.div
                        key={clause.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.02 }}
                        className={`card overflow-hidden transition-all ${risk.border} border
                                  ${clause.risk_level === 'critical' ? 'risk-critical' : ''}
                                  ${clause.risk_level === 'high' ? 'risk-high' : ''}`}
                      >
                        <button
                          onClick={() => toggleClause(clause.id)}
                          className="w-full px-5 py-4 text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-ink-500 mt-1 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-ink-500 mt-1 flex-shrink-0" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-ink-100">
                                    {clauseTypeLabels[clause.clause_type] || clause.clause_type.replace(/_/g, ' ')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${risk.color} ${risk.bg}`}>
                                    {clause.risk_level}
                                  </span>
                                  {clause.confidence && (
                                    <span className="text-xs text-ink-500">
                                      {(clause.confidence * 100).toFixed(0)}% confidence
                                    </span>
                                  )}
                                </div>
                                {clause.summary && (
                                  <p className="text-sm text-ink-400 mt-1 line-clamp-1">{clause.summary}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-ink-800/50"
                            >
                              <div className="px-5 py-4 space-y-4">
                                {/* Full Summary */}
                                {clause.summary && (
                                  <div>
                                    <h4 className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-2">
                                      Summary
                                    </h4>
                                    <p className="text-sm text-ink-300">{clause.summary}</p>
                                  </div>
                                )}

                                {/* Risk Factors */}
                                {clause.risk_factors && clause.risk_factors.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-2">
                                      Risk Factors
                                    </h4>
                                    <ul className="space-y-1">
                                      {clause.risk_factors.map((factor, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-ink-400">
                                          <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${risk.color}`} />
                                          {factor}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Original Content */}
                                <div>
                                  <h4 className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-2">
                                    Original Text
                                  </h4>
                                  <div className="p-4 bg-ink-900/50 rounded-lg border border-ink-800/50">
                                    <p className="text-sm text-ink-300 font-mono whitespace-pre-wrap">
                                      {clause.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {filteredClauses.length === 0 && (
                <div className="card p-12 text-center">
                  <FileText className="w-12 h-12 text-ink-700 mx-auto" />
                  <p className="mt-4 text-ink-500">No clauses match the selected filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
