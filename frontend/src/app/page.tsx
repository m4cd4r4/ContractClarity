'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  FileText, Search, Upload, AlertTriangle, CheckCircle,
  Clock, Database, Zap, ChevronRight, X, Loader2,
  FileWarning, Shield, Network
} from 'lucide-react'
import { api, Document, AnalysisSummary } from '@/lib/api'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

const riskColors: Record<RiskLevel, string> = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-amber-500 bg-amber-500/10',
  low: 'text-emerald-500 bg-emerald-500/10',
}

const riskBorders: Record<RiskLevel, string> = {
  critical: 'border-red-500/30',
  high: 'border-orange-500/30',
  medium: 'border-amber-500/30',
  low: 'border-emerald-500/30',
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<{
    documents_indexed: number
    chunks_with_embeddings: number
    clauses_extracted: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink-800/50 bg-ink-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <Shield className="w-5 h-5 text-ink-950" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">ContractClarity</h1>
                <p className="text-xs text-ink-500">M&A Due Diligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
                  className="w-80 pl-10 pr-4 py-2 bg-ink-900/50 border border-ink-800 rounded-lg
                           text-sm text-ink-100 placeholder:text-ink-500
                           focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                )}
              </div>

              {/* Advanced Search Link */}
              <Link
                href="/search"
                className="text-sm text-ink-400 hover:text-accent transition-colors"
              >
                Advanced Search
              </Link>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-ink-950 font-medium rounded-lg
                         hover:bg-accent-light transition-colors disabled:opacity-50"
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

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value={stats?.documents_indexed ?? 0}
            label="Documents Indexed"
            delay={0}
          />
          <StatCard
            icon={<Database className="w-5 h-5" />}
            value={stats?.chunks_with_embeddings ?? 0}
            label="Text Chunks"
            delay={0.1}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            value={stats?.clauses_extracted ?? 0}
            label="Clauses Extracted"
            delay={0.2}
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            value={documents.filter(d => d.status === 'completed').length}
            label="Ready for Review"
            delay={0.3}
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
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold">Search Results</h2>
                  <button
                    type="button"
                    onClick={() => setSearchResults([])}
                    className="p-1 hover:bg-ink-800 rounded"
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
                      transition={{ delay: i * 0.05 }}
                      className="p-4 bg-ink-900/30 border border-ink-800/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-accent">{result.document_name}</span>
                        <span className="text-xs text-ink-500">
                          Score: {(result.combined_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-ink-300 line-clamp-2">{result.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Document List */}
          <div className="col-span-2">
            <div className="card">
              <div className="px-6 py-4 border-b border-ink-800/50">
                <h2 className="font-display text-lg font-semibold">Contract Portfolio</h2>
              </div>
              <div className="divide-y divide-ink-800/30">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                    <p className="mt-4 text-ink-500">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-ink-700 mx-auto" />
                    <p className="mt-4 text-ink-500">No contracts uploaded yet</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 btn-primary"
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
                      transition={{ delay: i * 0.03 }}
                      onClick={() => loadAnalysis(doc.id)}
                      className={`px-6 py-4 cursor-pointer transition-colors hover:bg-ink-900/30
                                ${selectedDoc === doc.id ? 'bg-ink-900/50 border-l-2 border-accent' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(doc.status)}
                          <div>
                            <h3 className="font-medium text-ink-100">{doc.filename}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-ink-500">
                                {doc.page_count ? `${doc.page_count} pages` : 'Processing...'}
                              </span>
                              {doc.chunk_count > 0 && (
                                <span className="text-xs text-ink-500">
                                  {doc.chunk_count} chunks
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-600" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="col-span-1">
            <AnimatePresence mode="wait">
              {selectedDoc && analysis ? (
                <motion.div
                  key={selectedDoc}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card"
                >
                  <div className="px-6 py-4 border-b border-ink-800/50">
                    <h2 className="font-display text-lg font-semibold">Risk Assessment</h2>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Overall Risk */}
                    <div className={`p-4 rounded-lg border ${riskBorders[analysis.overall_risk as RiskLevel] || 'border-ink-800'}
                                  ${analysis.overall_risk === 'critical' ? 'risk-critical' : ''}
                                  ${analysis.overall_risk === 'high' ? 'risk-high' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink-400">Overall Risk Level</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium uppercase
                                       ${riskColors[analysis.overall_risk as RiskLevel] || 'text-ink-400 bg-ink-800'}`}>
                          {analysis.overall_risk}
                        </span>
                      </div>
                    </div>

                    {/* Risk Breakdown */}
                    <div>
                      <h3 className="text-sm font-medium text-ink-400 mb-3">Risk Distribution</h3>
                      <div className="space-y-2">
                        {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => (
                          <div key={level} className="flex items-center justify-between">
                            <span className={`text-sm capitalize ${
                              level === 'critical' ? 'text-red-400' :
                              level === 'high' ? 'text-orange-400' :
                              level === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {level}
                            </span>
                            <span className="font-mono text-sm text-ink-300">
                              {analysis.risk_summary[level] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clause Count */}
                    <div className="pt-4 border-t border-ink-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink-400">Clauses Extracted</span>
                        <span className="font-mono text-lg text-ink-100">{analysis.clauses_extracted}</span>
                      </div>
                    </div>

                    {/* High Risk Highlights */}
                    {analysis.high_risk_highlights.length > 0 && (
                      <div className="pt-4 border-t border-ink-800/50">
                        <h3 className="text-sm font-medium text-ink-400 mb-3">Attention Required</h3>
                        <div className="space-y-2">
                          {analysis.high_risk_highlights.slice(0, 3).map((highlight, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border text-sm
                                        ${highlight.risk_level === 'critical' ? 'risk-critical border-red-500/20' : 'risk-high border-orange-500/20'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className={`w-3 h-3 ${
                                  highlight.risk_level === 'critical' ? 'text-red-500' : 'text-orange-500'
                                }`} />
                                <span className="font-medium text-ink-200 capitalize">
                                  {highlight.clause_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="text-ink-400 text-xs line-clamp-2">{highlight.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-ink-800/50 flex gap-2">
                      <Link
                        href={`/documents/${selectedDoc}`}
                        className="flex-1 btn-primary text-center text-sm"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/documents/${selectedDoc}/graph`}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-ink-800 text-ink-200
                                 rounded-lg hover:bg-ink-700 transition-colors"
                        aria-label="View knowledge graph"
                      >
                        <Network className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : selectedDoc ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-6"
                >
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                    <p className="mt-4 text-ink-500">Loading analysis...</p>
                    <button
                      type="button"
                      onClick={() => triggerAnalysis(selectedDoc)}
                      className="mt-4 btn-secondary text-sm"
                    >
                      Run Analysis
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card p-6"
                >
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-ink-700 mx-auto" />
                    <p className="mt-4 text-ink-500">Select a document to view risk assessment</p>
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
  delay,
}: {
  icon: React.ReactNode
  value: number
  label: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-value">{value.toLocaleString()}</p>
          <p className="stat-label">{label}</p>
        </div>
        <div className="p-2 rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
