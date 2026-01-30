'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Shield, FileText, Loader2, Filter, ChevronDown,
  Zap, Database, ArrowRight, X, SlidersHorizontal, Sparkles
} from 'lucide-react'
import { api, Document, SearchResult } from '@/lib/api'

type SearchMode = 'hybrid' | 'semantic' | 'keyword'

const searchModes: Record<SearchMode, { label: string; description: string; icon: typeof Sparkles }> = {
  hybrid: {
    label: 'Hybrid',
    description: 'Combines semantic understanding with keyword matching',
    icon: Sparkles,
  },
  semantic: {
    label: 'Semantic',
    description: 'AI-powered search that understands meaning',
    icon: Zap,
  },
  keyword: {
    label: 'Keyword',
    description: 'Traditional exact match search',
    icon: Database,
  },
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid')
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [resultLimit, setResultLimit] = useState(20)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await api.documents.list({ limit: 100 })
      setDocuments(response.documents.filter(d => d.status === 'completed'))
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)
    try {
      const response = await api.search.query(query, {
        limit: resultLimit,
        mode: searchMode,
        document_id: selectedDocument || undefined,
      })
      setResults(response.results)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text
    const regex = new RegExp(`(${searchQuery.trim()})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-accent/30 text-accent-light px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const groupedResults = results.reduce((acc, result) => {
    const docName = result.document_name
    if (!acc[docName]) {
      acc[docName] = []
    }
    acc[docName].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink-800/50 bg-ink-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <Shield className="w-5 h-5 text-ink-950" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">ContractClarity</h1>
                <p className="text-xs text-ink-500">Advanced Contract Search</p>
              </div>
            </Link>

            <Link
              href="/"
              className="text-sm text-ink-400 hover:text-ink-200 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-12">
        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold tracking-tight mb-2">
              Search Your Contract Portfolio
            </h2>
            <p className="text-ink-400">
              Use natural language or keywords to find relevant clauses and provisions
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {/* Main Search Input */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for termination clauses, liability caps, change of control provisions..."
                className="w-full pl-12 pr-4 py-4 bg-ink-900/50 border border-ink-800 rounded-xl
                         text-lg text-ink-100 placeholder:text-ink-500
                         focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20
                         transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-ink-800 rounded"
                >
                  <X className="w-4 h-4 text-ink-500" />
                </button>
              )}
            </div>

            {/* Search Options Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Search Mode Buttons */}
                {(Object.keys(searchModes) as SearchMode[]).map((mode) => {
                  const config = searchModes[mode]
                  const Icon = config.icon
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSearchMode(mode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all
                                ${searchMode === mode
                                  ? 'bg-accent/20 text-accent border border-accent/30'
                                  : 'bg-ink-800/50 text-ink-400 border border-transparent hover:bg-ink-800'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                          ${showFilters ? 'bg-ink-800 text-ink-200' : 'text-ink-400 hover:text-ink-200'}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {(selectedDocument || resultLimit !== 20) && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-ink-900/30 border border-ink-800/50 rounded-lg space-y-4">
                    {/* Document Filter */}
                    <div>
                      <label className="block text-sm text-ink-400 mb-2">Limit to Document</label>
                      <select
                        value={selectedDocument || ''}
                        onChange={(e) => setSelectedDocument(e.target.value || null)}
                        className="w-full px-3 py-2 bg-ink-900 border border-ink-800 rounded-lg
                                 text-sm text-ink-200 focus:outline-none focus:border-accent/50"
                      >
                        <option value="">All Documents</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.filename}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Result Limit */}
                    <div>
                      <label className="block text-sm text-ink-400 mb-2">
                        Results Limit: {resultLimit}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={resultLimit}
                        onChange={(e) => setResultLimit(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>

                    {/* Clear Filters */}
                    {(selectedDocument || resultLimit !== 20) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocument(null)
                          setResultLimit(20)
                        }}
                        className="text-sm text-accent hover:text-accent-light"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Button */}
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="w-full py-4 bg-accent text-ink-950 font-semibold rounded-xl
                       hover:bg-accent-light transition-colors disabled:opacity-50
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search Contracts
                </>
              )}
            </button>
          </form>

          {/* Mode Description */}
          <p className="text-center text-sm text-ink-500 mt-4">
            {searchModes[searchMode].description}
          </p>
        </motion.div>

        {/* Results */}
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12"
          >
            {results.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-semibold">
                    {results.length} Results
                    <span className="text-ink-500 font-normal ml-2">
                      across {Object.keys(groupedResults).length} documents
                    </span>
                  </h3>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedResults).map(([docName, docResults], groupIndex) => (
                    <motion.div
                      key={docName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.1 }}
                      className="card overflow-hidden"
                    >
                      {/* Document Header */}
                      <div className="px-6 py-4 bg-ink-900/50 border-b border-ink-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-accent" />
                          <span className="font-medium text-ink-100">{docName}</span>
                          <span className="text-sm text-ink-500">
                            {docResults.length} match{docResults.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                        <Link
                          href={`/documents/${docResults[0].document_id}`}
                          className="text-sm text-accent hover:text-accent-light flex items-center gap-1"
                        >
                          View Document
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Results */}
                      <div className="divide-y divide-ink-800/30">
                        {docResults.map((result, i) => (
                          <motion.div
                            key={result.chunk_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: groupIndex * 0.1 + i * 0.03 }}
                            className="px-6 py-4 hover:bg-ink-900/20 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm text-ink-300 leading-relaxed">
                                  {highlightMatch(result.content, query)}
                                </p>
                                {result.page_number && (
                                  <p className="text-xs text-ink-500 mt-2">Page {result.page_number}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <div className="flex items-center gap-2 text-xs text-ink-500">
                                  <span>Combined: {(result.combined_score * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-xs text-blue-400/70">
                                    Semantic: {(result.semantic_score * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-xs text-emerald-400/70">
                                    Keyword: {(result.keyword_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search className="w-16 h-16 text-ink-700 mx-auto" />
                <h3 className="font-display text-lg font-semibold mt-4">No Results Found</h3>
                <p className="text-ink-500 mt-2 max-w-md mx-auto">
                  Try adjusting your search terms or switching search modes for different results.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Search Tips (shown before first search) */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <h3 className="text-sm font-medium text-ink-400 mb-4 text-center">Example Searches</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                'termination for convenience',
                'limitation of liability cap',
                'change of control provisions',
                'confidentiality obligations',
                'indemnification requirements',
                'governing law jurisdiction',
                'assignment restrictions',
                'material adverse change',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-4 py-3 bg-ink-900/30 border border-ink-800/50 rounded-lg
                           text-sm text-ink-400 hover:text-ink-200 hover:border-ink-700
                           transition-colors text-left"
                >
                  &ldquo;{example}&rdquo;
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
