'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  FileText, Search, Upload, AlertTriangle, CheckCircle,
  Clock, Database, Zap, ChevronRight, X, Loader2,
  FileWarning, Shield, Network, TrendingUp, BarChart3,
  ExternalLink, Eye, PlayCircle
} from 'lucide-react'
import { api, Document, AnalysisSummary } from '@/lib/api'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

const riskColors: Record<RiskLevel, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

const riskGlow: Record<RiskLevel, string> = {
  critical: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  high: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
  medium: 'shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  low: 'shadow-none',
}

export default function Dashboard() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<{
    documents_indexed: number
    chunks_with_embeddings: number
    clauses_extracted: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    chunk_id: string
    document_name: string
    content: string
    combined_score: number
  }>>([])
  const [searching, setSearching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [docsResponse, statsResponse] = await Promise.all([
        api.documents.list({ limit: 50 }),
        api.search.stats(),
      ])
      setDocuments(docsResponse.documents)
      setStats(statsResponse)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await api.documents.upload(file)
      await loadData()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const response = await api.search.query(searchQuery, { limit: 10 })
      setSearchResults(response.results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const loadAnalysis = async (docId: string) => {
    setSelectedDoc(docId)
    try {
      const response = await api.analysis.summary(docId)
      setAnalysis(response)
    } catch (error) {
      console.error('Failed to load analysis:', error)
      setAnalysis(null)
    }
  }

  const triggerAnalysis = async (docId: string) => {
    try {
      await api.analysis.extract(docId)
      setTimeout(() => loadAnalysis(docId), 2000)
    } catch (error) {
      console.error('Failed to trigger analysis:', error)
    }
  }

  const navigateToDocument = (docId: string) => {
    router.push(`/documents/${docId}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
      case 'failed':
        return <FileWarning className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-ink-500" />
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Header */}
      <header className="border-b border-ink-800/50 bg-ink-950/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent via-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/20">
                <Shield className="w-6 h-6 text-ink-950" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink-50">ContractClarity</h1>
                <p className="text-[11px] text-ink-500 tracking-wide uppercase font-mono">M&A Due Diligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              {/* Search */}
              <div className="relative">
                <label htmlFor="search-input" className="sr-only">Search contracts</label>
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search contracts..."
                  className="w-96 pl-11 pr-4 py-2.5 bg-ink-900/60 border border-ink-700/50 rounded-xl
                           text-sm text-ink-100 placeholder:text-ink-500
                           focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10
                           transition-all duration-200"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
                {searching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                )}
              </div>

              {/* Advanced Search Link */}
              <button
                type="button"
                onClick={() => router.push('/search')}
                className="text-sm text-ink-400 hover:text-accent transition-colors font-medium"
              >
                Advanced Search
              </button>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-accent text-ink-950 font-semibold rounded-xl
                         hover:bg-accent-light hover:shadow-lg hover:shadow-accent/20
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Contract
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-8 py-8">
        {/* Stats Row - Data Dense */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-5 mb-8"
        >
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value={stats?.documents_indexed ?? 0}
            label="Documents Indexed"
            sublabel="Ready for analysis"
            delay={0}
            onClick={() => router.push('/search')}
          />
          <StatCard
            icon={<Database className="w-5 h-5" />}
            value={stats?.chunks_with_embeddings ?? 0}
            label="Text Chunks"
            sublabel="Vector embeddings"
            delay={0.05}
            onClick={() => router.push('/search')}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            value={stats?.clauses_extracted ?? 0}
            label="Clauses Extracted"
            sublabel="AI-powered analysis"
            delay={0.1}
            onClick={() => {
              // Navigate to first completed document with clauses
              const docWithClauses = documents.find(d => d.status === 'completed')
              if (docWithClauses) {
                router.push(`/documents/${docWithClauses.id}`)
              } else {
                router.push('/search')
              }
            }}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            value={documents.filter(d => d.status === 'completed').length}
            label="Ready for Review"
            sublabel="Completed processing"
            delay={0.15}
            onClick={() => {
              // Select first completed document
              const completed = documents.find(d => d.status === 'completed')
              if (completed) {
                loadAnalysis(completed.id)
              }
            }}
          />
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="card p-6 border-accent/20">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink-50">Search Results</h2>
                    <p className="text-xs text-ink-500 mt-0.5 font-mono">{searchResults.length} matches found</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchResults([])}
                    className="p-2 hover:bg-ink-800 rounded-lg transition-colors"
                    aria-label="Clear search results"
                  >
                    <X className="w-4 h-4 text-ink-400" />
                  </button>
                </div>
                <div className="space-y-3">
                  {searchResults.map((result, i) => (
                    <motion.div
                      key={result.chunk_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 bg-ink-900/40 border border-ink-800/50 rounded-lg hover:border-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-accent">{result.document_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-ink-500 font-mono uppercase">Relevance</span>
                          <span className="text-xs text-ink-300 font-mono bg-ink-800/50 px-2 py-0.5 rounded">
                            {(result.combined_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-ink-300 leading-relaxed line-clamp-2">{result.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Document List - Enhanced */}
          <div className="col-span-2">
            <div className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-ink-800/50 bg-ink-925">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink-50">Contract Portfolio</h2>
                    <p className="text-[11px] text-ink-500 mt-1 font-mono">
                      {documents.length} documents · Click to analyze
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/search')}
                    className="text-xs text-ink-400 hover:text-accent transition-colors flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Advanced View
                  </button>
                </div>
              </div>
              <div className="divide-y divide-ink-800/30 max-h-[calc(100vh-320px)] overflow-y-auto">
                {loading ? (
                  <div className="p-16 text-center">
                    <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
                    <p className="mt-5 text-ink-500 text-sm">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-16 text-center">
                    <FileText className="w-14 h-14 text-ink-700 mx-auto" />
                    <p className="mt-5 text-ink-500 text-sm font-medium">No contracts uploaded yet</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 btn-primary"
                    >
                      Upload Your First Contract
                    </button>
                  </div>
                ) : (
                  documents.map((doc, i) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onMouseEnter={() => setHoveredDoc(doc.id)}
                      onMouseLeave={() => setHoveredDoc(null)}
                      onClick={() => loadAnalysis(doc.id)}
                      className={`px-6 py-5 cursor-pointer transition-all duration-200 relative group
                                ${selectedDoc === doc.id
                                  ? 'bg-ink-900/60 border-l-2 border-accent'
                                  : 'hover:bg-ink-900/30 border-l-2 border-transparent'
                                }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="mt-0.5">
                            {getStatusIcon(doc.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-ink-100 text-[15px] leading-snug truncate">
                              {doc.filename}
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-[11px] text-ink-500 font-mono uppercase tracking-wide">
                                {doc.status === 'completed'
                                  ? doc.page_count ? `${doc.page_count} pages` : 'Unknown pages'
                                  : 'Processing...'
                                }
                              </span>
                              {doc.chunk_count > 0 && (
                                <>
                                  <span className="text-ink-700">·</span>
                                  <span className="text-[11px] text-ink-500 font-mono uppercase tracking-wide">
                                    {doc.chunk_count} chunks
                                  </span>
                                </>
                              )}
                              {doc.status === 'completed' && (
                                <>
                                  <span className="text-ink-700">·</span>
                                  <span className="text-[11px] text-emerald-500 font-mono uppercase tracking-wide">
                                    Ready
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons - Show on hover */}
                        <div className={`flex items-center gap-2 transition-opacity duration-200 ${
                          hoveredDoc === doc.id || selectedDoc === doc.id ? 'opacity-100' : 'opacity-0'
                        }`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToDocument(doc.id)
                            }}
                            className="p-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg transition-colors"
                            aria-label="View document details"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-ink-600 group-hover:text-accent transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Risk Analysis Panel - Enhanced & Data Dense */}
          <div className="col-span-1">
            <AnimatePresence mode="wait">
              {selectedDoc && analysis ? (
                <motion.div
                  key={selectedDoc}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="card overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-ink-800/50 bg-ink-925">
                    <h2 className="font-display text-xl font-semibold text-ink-50">Risk Assessment</h2>
                    <p className="text-[11px] text-ink-500 mt-1 font-mono uppercase tracking-wide">
                      AI-Powered Analysis
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Overall Risk - Prominent */}
                    <div className={`p-5 rounded-xl border-2 ${riskGlow[analysis.overall_risk as RiskLevel]}
                                  ${riskColors[analysis.overall_risk as RiskLevel]}`}>
                      <div className="text-center">
                        <div className="text-[11px] text-ink-400 font-mono uppercase tracking-wide mb-2">
                          Overall Risk Level
                        </div>
                        <div className={`text-3xl font-bold uppercase tracking-tight ${
                          analysis.overall_risk === 'critical' ? 'text-red-400' :
                          analysis.overall_risk === 'high' ? 'text-orange-400' :
                          analysis.overall_risk === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {analysis.overall_risk}
                        </div>
                        <div className="mt-3 pt-3 border-t border-current/20">
                          <div className="text-[10px] text-ink-500 font-mono uppercase">
                            {analysis.clauses_extracted} Clauses Analyzed
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Distribution - Data Dense Grid */}
                    <div>
                      <h3 className="text-[11px] font-mono uppercase tracking-wide text-ink-400 mb-3">
                        Risk Distribution
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
                          const count = analysis.risk_summary[level] || 0
                          return (
                            <div
                              key={level}
                              className={`p-4 rounded-lg border ${riskColors[level]} text-center`}
                            >
                              <div className={`text-2xl font-bold font-mono ${
                                level === 'critical' ? 'text-red-400' :
                                level === 'high' ? 'text-orange-400' :
                                level === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {count}
                              </div>
                              <div className="text-[10px] uppercase font-mono tracking-wide text-ink-500 mt-1">
                                {level}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* High Risk Highlights */}
                    {analysis.high_risk_highlights.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-mono uppercase tracking-wide text-ink-400 mb-3">
                          Attention Required
                        </h3>
                        <div className="space-y-3">
                          {analysis.high_risk_highlights.slice(0, 3).map((highlight, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`p-4 rounded-lg border text-sm ${
                                highlight.risk_level === 'critical'
                                  ? 'border-red-500/30 bg-red-500/5'
                                  : 'border-orange-500/30 bg-orange-500/5'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className={`w-4 h-4 ${
                                  highlight.risk_level === 'critical' ? 'text-red-400' : 'text-orange-400'
                                }`} />
                                <span className="font-semibold text-ink-100 text-xs uppercase tracking-wide">
                                  {highlight.clause_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="text-ink-400 text-xs leading-relaxed line-clamp-3">
                                {highlight.summary}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions - Prominent CTAs */}
                    <div className="pt-4 border-t border-ink-800/50 space-y-3">
                      <button
                        type="button"
                        onClick={() => navigateToDocument(selectedDoc)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-ink-950
                                 font-semibold rounded-xl hover:bg-accent-light hover:shadow-lg hover:shadow-accent/20
                                 transition-all duration-200"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Analysis
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/documents/${selectedDoc}/graph`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink-800 text-ink-200
                                 font-medium rounded-xl hover:bg-ink-700 transition-colors"
                      >
                        <Network className="w-4 h-4" />
                        Knowledge Graph
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : selectedDoc ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-8"
                >
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
                    <p className="mt-5 text-ink-500 text-sm">Loading analysis...</p>
                    <button
                      type="button"
                      onClick={() => triggerAnalysis(selectedDoc)}
                      className="mt-6 px-5 py-2.5 bg-ink-800 text-ink-200 rounded-xl hover:bg-ink-700
                               transition-colors font-medium text-sm flex items-center gap-2 mx-auto"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Run Analysis
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-8"
                >
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-ink-700 mx-auto" />
                    <p className="mt-6 text-ink-500 text-sm">
                      Select a document to view risk assessment
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  sublabel,
  delay,
  onClick,
}: {
  icon: React.ReactNode
  value: number
  label: string
  sublabel: string
  delay: number
  onClick?: () => void
}) {
  const Wrapper = onClick ? motion.button : motion.div
  return (
    <Wrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={onClick}
      className={`card p-6 hover:border-accent/20 transition-all duration-300 group text-left
                ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
          {icon}
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-ink-600 group-hover:text-accent transition-colors" />
        )}
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold font-mono text-ink-50 tracking-tight">
          {value.toLocaleString()}
        </p>
        <p className="text-sm font-semibold text-ink-300 mt-1">{label}</p>
        <p className="text-[10px] text-ink-500 mt-1 font-mono uppercase tracking-wide">{sublabel}</p>
      </div>
    </Wrapper>
  )
}
