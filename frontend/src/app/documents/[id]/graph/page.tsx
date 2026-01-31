'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Network, Loader2, ZoomIn, ZoomOut, Maximize2,
  Filter, RefreshCw, Building2, User, Calendar, DollarSign,
  MapPin, Clock, Percent, FileText
} from 'lucide-react'
import { api, Document, GraphData, Entity } from '@/lib/api'

const entityTypeConfig: Record<string, { icon: typeof Building2; color: string; bg: string }> = {
  party: { icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500' },
  person: { icon: User, color: 'text-purple-400', bg: 'bg-purple-500' },
  date: { icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500' },
  amount: { icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500' },
  location: { icon: MapPin, color: 'text-red-400', bg: 'bg-red-500' },
  term: { icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500' },
  percentage: { icon: Percent, color: 'text-pink-400', bg: 'bg-pink-500' },
}

interface Node {
  id: string
  label: string
  type: string
  value: string | null
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
}

interface Edge {
  id: string
  source: string
  target: string
  type: string
  label: string
}

export default function GraphPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])

  const [document, setDocument] = useState<Document | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<Node | null>(null)

  useEffect(() => {
    loadData()
  }, [documentId])

  const loadData = async () => {
    try {
      const [doc, graph] = await Promise.all([
        api.documents.get(documentId),
        api.graph.get(documentId).catch(() => null),
      ])
      setDocument(doc)

      if (graph && graph.nodes.length > 0) {
        setGraphData(graph)
        // initializeGraph will be called by effect when graphData changes
      }
    } catch (error) {
      console.error('Failed to load graph:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerExtraction = async () => {
    setExtracting(true)
    try {
      await api.graph.extract(documentId)
      // Poll for completion
      const checkInterval = setInterval(async () => {
        const graph = await api.graph.get(documentId).catch(() => null)
        if (graph && graph.nodes.length > 0) {
          clearInterval(checkInterval)
          setGraphData(graph)
          // initializeGraph will be called by effect when graphData changes
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

  const initializeGraph = (data: GraphData) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get logical dimensions from container
    const container = canvas.parentElement
    if (!container) return
    const rect = container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Initialize nodes with wide spread + randomization
    nodesRef.current = data.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / data.nodes.length
      // Wide initial radius filling more of the canvas
      const baseRadius = Math.min(width, height) * 0.35
      const radius = baseRadius * (0.5 + Math.random() * 0.5)
      // Random offset to break symmetry
      const jitterX = (Math.random() - 0.5) * 80
      const jitterY = (Math.random() - 0.5) * 80
      return {
        ...node,
        x: width / 2 + radius * Math.cos(angle) + jitterX,
        y: height / 2 + radius * Math.sin(angle) + jitterY,
        vx: 0,
        vy: 0,
      }
    })

    edgesRef.current = data.edges

    // Start simulation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    runSimulation()
  }

  const runSimulation = useCallback(() => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use logical dimensions stored in data attributes
    const width = Number(canvas.dataset.logicalWidth) || canvas.width
    const height = Number(canvas.dataset.logicalHeight) || canvas.height

    // Force simulation parameters - tuned for spread and stability
    const repulsion = 5000      // Very strong push apart
    const attraction = 0.002    // Weak pull together
    const damping = 0.9         // Higher friction to settle faster
    const centerForce = 0.002   // Light centering to keep graph visible
    const maxVelocity = 5       // Slower movement for stability
    const minDistance = 80      // Larger minimum separation between nodes

    // Apply forces
    nodes.forEach((node) => {
      if (node.fx !== undefined && node.fx !== null) {
        node.x = node.fx
        node.vx = 0
      }
      if (node.fy !== undefined && node.fy !== null) {
        node.y = node.fy
        node.vy = 0
      }

      // Repulsion from other nodes with minimum distance enforcement
      nodes.forEach((other) => {
        if (node.id === other.id) return
        const dx = node.x - other.x
        const dy = node.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Enforce minimum distance - strong push if too close
        if (dist < minDistance && dist > 0) {
          const pushStrength = (minDistance - dist) * 0.5
          node.vx += (dx / dist) * pushStrength
          node.vy += (dy / dist) * pushStrength
        }

        // Normal repulsion force
        const safeDist = Math.max(dist, 10)
        const force = repulsion / (safeDist * safeDist)
        node.vx += (dx / safeDist) * force
        node.vy += (dy / safeDist) * force
      })

      // Center force
      node.vx += (width / 2 - node.x) * centerForce
      node.vy += (height / 2 - node.y) * centerForce
    })

    // Apply edge attraction
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source)
      const target = nodes.find((n) => n.id === edge.target)
      if (!source || !target) return

      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      source.vx += dx * attraction
      source.vy += dy * attraction
      target.vx -= dx * attraction
      target.vy -= dy * attraction
    })

    // Update positions with velocity clamping
    nodes.forEach((node) => {
      if (node.fx === undefined || node.fx === null) {
        node.vx *= damping
        // Clamp velocity
        node.vx = Math.max(-maxVelocity, Math.min(maxVelocity, node.vx))
        node.x += node.vx
      }
      if (node.fy === undefined || node.fy === null) {
        node.vy *= damping
        // Clamp velocity
        node.vy = Math.max(-maxVelocity, Math.min(maxVelocity, node.vy))
        node.y += node.vy
      }

      // Keep in bounds with minimal padding (allow spread)
      node.x = Math.max(40, Math.min(width - 40, node.x))
      node.y = Math.max(40, Math.min(height - 40, node.y))
    })

    // Draw
    drawGraph(ctx, nodes, edges, width, height)

    animationRef.current = requestAnimationFrame(runSimulation)
  }, [selectedNode, hoveredNode, zoom, pan])

  const drawGraph = (
    ctx: CanvasRenderingContext2D,
    nodes: Node[],
    edges: Edge[],
    width: number,
    height: number
  ) => {
    const dpr = window.devicePixelRatio || 1

    // Clear canvas (full physical size)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width * dpr, height * dpr)

    // Apply DPR scaling first, then zoom and pan
    // This ensures crisp rendering on high-DPI displays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Filter nodes by selected types
    const visibleNodes = selectedTypes.size === 0
      ? nodes
      : nodes.filter((n) => selectedTypes.has(n.type))
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))

    // Draw edges - thin lines only, no labels (reduces clutter)
    edges.forEach((edge) => {
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return

      const source = nodes.find((n) => n.id === edge.source)
      const target = nodes.find((n) => n.id === edge.target)
      if (!source || !target) return

      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.strokeStyle = 'rgba(99, 102, 106, 0.25)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    })

    // Draw nodes - tiny dots for clean visualization
    const colors: Record<string, string> = {
      party: '#3b82f6',
      person: '#a855f7',
      date: '#10b981',
      amount: '#f59e0b',
      location: '#ef4444',
      term: '#06b6d4',
      percentage: '#ec4899',
    }

    visibleNodes.forEach((node) => {
      const isSelected = selectedNode?.id === node.id

      // Node circle - small and crisp
      const radius = isSelected ? 6 : 4
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = colors[node.type] || '#6b7280'
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#c9a227'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Show truncated label below each node
      const label = node.label.length > 14 ? node.label.slice(0, 12) + '..' : node.label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(label, node.x, node.y + radius + 3)
    })

    // Show full label for hovered/selected node with background
    const labelNode = selectedNode || hoveredNode
    if (labelNode) {
      const node = visibleNodes.find(n => n.id === labelNode.id)
      if (node) {
        const labelText = node.label
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
        const textWidth = ctx.measureText(labelText).width

        // Draw background
        ctx.fillStyle = 'rgba(10, 10, 11, 0.85)'
        ctx.fillRect(node.x - textWidth/2 - 4, node.y - 20, textWidth + 8, 16)

        // Draw label text above node
        ctx.fillStyle = '#f1f5f9'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(labelText, node.x, node.y - 12)
      }
    }
  }

  // Canvas event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Check if clicking on a node (generous hitbox for tiny nodes)
    const clickedNode = nodesRef.current.find((node) => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) < 20
    })

    if (clickedNode) {
      setDraggedNode(clickedNode)
      clickedNode.fx = clickedNode.x
      clickedNode.fy = clickedNode.y
      setSelectedNode(clickedNode)
    } else {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    if (draggedNode) {
      draggedNode.fx = x
      draggedNode.fy = y
    } else if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    } else {
      // Check for hover on nodes
      const hovered = nodesRef.current.find((node) => {
        const dx = node.x - x
        const dy = node.y - y
        return Math.sqrt(dx * dx + dy * dy) < 20
      })
      setHoveredNode(hovered || null)
    }
  }

  const handleCanvasMouseUp = () => {
    if (draggedNode) {
      draggedNode.fx = null
      draggedNode.fy = null
      setDraggedNode(null)
    }
    setIsDragging(false)
  }

  const handleCanvasMouseLeave = () => {
    handleCanvasMouseUp()
    setHoveredNode(null)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.max(0.3, Math.min(3, z * delta)))
  }

  const resetView = () => {
    setZoom(0.8)
    setPan({ x: 0, y: 0 })
    setSelectedNode(null)
    setSelectedTypes(new Set())
  }

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  // Set canvas size and initialize graph when data is ready
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      // Store logical size as data attributes for reference
      canvas.dataset.logicalWidth = String(rect.width)
      canvas.dataset.logicalHeight = String(rect.height)

      // Set physical canvas size (multiplied by DPR for crisp pixels)
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)

      // Set CSS size to match container
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    // Size canvas first, then initialize graph
    resizeCanvas()
    initializeGraph(graphData)

    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [graphData])

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
          <p className="mt-4 text-ink-400">Loading knowledge graph...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-800/50 bg-ink-950/80 backdrop-blur-sm z-50">
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
                <h1 className="font-display text-xl font-bold tracking-tight">
                  Knowledge Graph
                </h1>
                <p className="text-xs text-ink-500">{document?.filename}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {graphData && (
                <div className="flex items-center gap-4 mr-4 text-sm text-ink-400">
                  <span>{graphData.stats.total_entities} entities</span>
                  <span className="text-ink-600">|</span>
                  <span>{graphData.stats.total_relationships} relationships</span>
                </div>
              )}
              <button
                onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
                className="p-2 hover:bg-ink-800 rounded-lg transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-ink-400" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
                className="p-2 hover:bg-ink-800 rounded-lg transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-ink-400" />
              </button>
              <button
                onClick={resetView}
                className="p-2 hover:bg-ink-800 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-ink-400" />
              </button>
              <Link
                href={`/documents/${documentId}`}
                className="flex items-center gap-2 px-4 py-2 bg-ink-800 text-ink-200 rounded-lg
                         hover:bg-ink-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Clauses
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Entity Type Filter */}
        <aside className="w-64 border-r border-ink-800/50 p-4">
          <h3 className="text-sm font-medium text-ink-400 mb-4">Entity Types</h3>
          <div className="space-y-2">
            {Object.entries(entityTypeConfig).map(([type, config]) => {
              const Icon = config.icon
              const count = graphData?.stats.entity_types[type] || 0
              if (count === 0) return null

              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors
                            ${selectedTypes.has(type) || selectedTypes.size === 0
                              ? 'bg-ink-800/50'
                              : 'opacity-40 hover:opacity-70'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.bg}`} />
                    <span className="text-sm capitalize">{type}</span>
                  </div>
                  <span className="text-xs font-mono text-ink-500">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Selected Node Details */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 pt-6 border-t border-ink-800/50"
              >
                <h3 className="text-sm font-medium text-ink-400 mb-3">Selected Entity</h3>
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${entityTypeConfig[selectedNode.type]?.bg || 'bg-gray-500'}`} />
                    <span className="text-xs uppercase tracking-wider text-ink-500">{selectedNode.type}</span>
                  </div>
                  <p className="font-medium text-ink-100">{selectedNode.label}</p>
                  {selectedNode.value && (
                    <p className="text-sm text-ink-400 mt-2">{selectedNode.value}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-ink-950">
          {graphData && graphData.nodes.length > 0 ? (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              onWheel={handleWheel}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Network className="w-16 h-16 text-ink-700 mx-auto" />
                <h3 className="font-display text-lg font-semibold mt-4">No Entities Extracted</h3>
                <p className="text-ink-500 mt-2 max-w-md">
                  Extract entities and relationships from this document to visualize
                  the knowledge graph.
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
                      <Network className="w-4 h-4 mr-2" />
                      Extract Entities
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-ink-900/80 rounded-lg text-xs text-ink-400">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
    </div>
  )
}
