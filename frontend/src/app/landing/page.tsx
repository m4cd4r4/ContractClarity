'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  Shield, FileText, Search, Network, Zap, Clock,
  ChevronRight, ArrowRight, CheckCircle, AlertTriangle,
  Database, Eye, Play, Github, ExternalLink
} from 'lucide-react'

// Animated background grid
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #c9a227 1px, transparent 1px),
            linear-gradient(to bottom, #c9a227 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      {/* Accent lines */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/10 to-transparent" />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-accent/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-accent/20" />
    </div>
  )
}

// Animated risk indicator
function RiskIndicator({ level, count, delay }: { level: string; count: number; delay: number }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      viewport={{ once: true }}
      className="flex items-center gap-3"
    >
      <div className={`w-3 h-3 rounded-full ${colors[level]} shadow-lg`}
           style={{ boxShadow: `0 0 12px ${level === 'critical' ? 'rgba(239,68,68,0.5)' : level === 'high' ? 'rgba(249,115,22,0.5)' : level === 'medium' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}` }} />
      <span className="text-xs font-mono uppercase tracking-wider text-ink-400">{level}</span>
      <span className="text-sm font-mono text-ink-200">{count}</span>
    </motion.div>
  )
}

// Feature card
function FeatureCard({
  icon,
  title,
  description,
  delay
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      viewport={{ once: true }}
      className="group relative"
    >
      {/* Hover glow */}
      <div className="absolute -inset-px bg-gradient-to-b from-accent/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

      <div className="relative bg-ink-900/60 border border-ink-800/50 rounded-2xl p-8 h-full
                    hover:border-accent/30 hover:bg-ink-900/80 transition-all duration-500">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6
                      group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
          <div className="text-accent">
            {icon}
          </div>
        </div>

        {/* Content */}
        <h3 className="font-display text-xl font-semibold text-ink-50 mb-3">{title}</h3>
        <p className="text-ink-400 text-sm leading-relaxed">{description}</p>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden rounded-tr-2xl">
          <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-accent/40 to-transparent" />
          <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-accent/40 to-transparent" />
        </div>
      </div>
    </motion.div>
  )
}

// Stat display
function Stat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="font-display text-5xl md:text-6xl font-bold text-accent mb-2">{value}</div>
      <div className="text-xs font-mono uppercase tracking-widest text-ink-500">{label}</div>
    </motion.div>
  )
}

// Tech stack badge
function TechBadge({ name, delay }: { name: string; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      viewport={{ once: true }}
      className="inline-flex items-center px-4 py-2 bg-ink-900/60 border border-ink-800/50 rounded-lg
               text-xs font-mono text-ink-300 hover:border-accent/30 hover:text-accent transition-colors"
    >
      {name}
    </motion.span>
  )
}

export default function LandingPage() {
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95])

  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 overflow-x-hidden">
      <GridBackground />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-ink-950/80 backdrop-blur-xl border-b border-ink-800/30"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <Shield className="w-5 h-5 text-ink-950" />
              </div>
              <div>
                <span className="font-display text-lg font-bold tracking-tight">ContractClarity</span>
                <span className="hidden md:inline text-ink-600 text-sm ml-3 font-mono">v1.0</span>
              </div>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-ink-400 hover:text-accent transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-ink-400 hover:text-accent transition-colors">How it Works</a>
              <a href="#tech" className="text-sm text-ink-400 hover:text-accent transition-colors">Tech Stack</a>
              <a
                href="https://github.com/m4cd4r4/ContractClarity"
                target="_blank"
                className="flex items-center gap-2 text-sm text-ink-400 hover:text-accent transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>

            {/* CTA */}
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-ink-950 font-semibold rounded-lg
                       hover:bg-accent-light transition-colors text-sm"
            >
              Launch App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-24 px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-8"
              >
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono uppercase tracking-wider text-accent">AI-Powered Due Diligence</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6"
              >
                Contract Review
                <br />
                <span className="text-accent">in Minutes,</span>
                <br />
                Not Weeks
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-lg text-ink-400 leading-relaxed mb-10 max-w-lg"
              >
                AI extracts clauses, assesses risk, and maps entity relationships across your contract portfolio.
                Built for M&A due diligence at enterprise scale.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/"
                  className="group flex items-center gap-3 px-8 py-4 bg-accent text-ink-950 font-semibold rounded-xl
                           hover:bg-accent-light hover:shadow-lg hover:shadow-accent/20 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Try the Demo
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="https://github.com/m4cd4r4/ContractClarity"
                  target="_blank"
                  className="flex items-center gap-3 px-8 py-4 bg-ink-900 border border-ink-700 text-ink-200 font-semibold rounded-xl
                           hover:border-accent/30 hover:text-accent transition-all"
                >
                  <Github className="w-5 h-5" />
                  View Source
                </a>
              </motion.div>
            </div>

            {/* Right: Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isLoaded ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="relative"
            >
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-3xl" />

              {/* Mock dashboard */}
              <div className="relative bg-ink-900/80 border border-ink-800/50 rounded-2xl p-6 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-ink-800/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs font-mono text-ink-500">ContractClarity Dashboard</span>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-ink-800/40 rounded-lg p-4">
                      <div className="text-2xl font-mono font-bold text-accent">6</div>
                      <div className="text-[10px] font-mono uppercase text-ink-500">Documents</div>
                    </div>
                    <div className="bg-ink-800/40 rounded-lg p-4">
                      <div className="text-2xl font-mono font-bold text-ink-100">847</div>
                      <div className="text-[10px] font-mono uppercase text-ink-500">Chunks</div>
                    </div>
                    <div className="bg-ink-800/40 rounded-lg p-4">
                      <div className="text-2xl font-mono font-bold text-ink-100">42</div>
                      <div className="text-[10px] font-mono uppercase text-ink-500">Clauses</div>
                    </div>
                  </div>

                  {/* Risk assessment mock */}
                  <div className="bg-ink-800/40 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono uppercase text-ink-400">Risk Assessment</span>
                      <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded font-mono uppercase">High</span>
                    </div>
                    <div className="space-y-2">
                      <RiskIndicator level="critical" count={2} delay={0.8} />
                      <RiskIndicator level="high" count={8} delay={0.9} />
                      <RiskIndicator level="medium" count={15} delay={1.0} />
                      <RiskIndicator level="low" count={17} delay={1.1} />
                    </div>
                  </div>

                  {/* Document list mock */}
                  <div className="space-y-2">
                    {['SaaS-Agreement.pdf', 'Lease-Contract.pdf', 'NDA-v2.pdf'].map((doc, i) => (
                      <motion.div
                        key={doc}
                        initial={{ opacity: 0, x: -20 }}
                        animate={isLoaded ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 1.2 + i * 0.1, duration: 0.4 }}
                        className="flex items-center gap-3 p-3 bg-ink-800/30 rounded-lg"
                      >
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="text-sm text-ink-300 flex-1 truncate">{doc}</span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-accent/10 border border-accent/20 rounded-xl
                         flex items-center justify-center backdrop-blur-xl"
              >
                <AlertTriangle className="w-6 h-6 text-accent" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-4 -left-4 w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl
                         flex items-center justify-center backdrop-blur-xl"
              >
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative py-20 px-6 border-y border-ink-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value="4" label="OCR Tiers" delay={0} />
            <Stat value="20+" label="Clause Types" delay={0.1} />
            <Stat value="12" label="E2E Tests" delay={0.2} />
            <Stat value="<60s" label="Per Document" delay={0.3} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-mono uppercase tracking-widest text-accent mb-4 block">Capabilities</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Enterprise-Grade
              <br />
              <span className="text-ink-400">Contract Intelligence</span>
            </h2>
          </motion.div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="4-Tier OCR Pipeline"
              description="From native PDF text to handwritten notes. PyMuPDF, Tesseract, PaddleOCR, and Vision LLM ensure nothing gets missed."
              delay={0}
            />
            <FeatureCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Risk Assessment"
              description="AI identifies and scores 20+ clause types with 4-level risk classification. Critical issues surface immediately."
              delay={0.1}
            />
            <FeatureCard
              icon={<Network className="w-6 h-6" />}
              title="Knowledge Graph"
              description="Visualize entity relationships across contracts. Find the same party, date, or amount in multiple agreements."
              delay={0.2}
            />
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="Semantic Search"
              description="Hybrid search combines vector embeddings with keyword matching. Find clauses by meaning, not just keywords."
              delay={0.3}
            />
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="Vector Database"
              description="PostgreSQL with pgvector stores 768-dimensional embeddings. Fast similarity search at scale."
              delay={0.4}
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Async Processing"
              description="Celery workers handle document processing in the background. Upload and continue working."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-24 px-6 bg-ink-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-mono uppercase tracking-widest text-accent mb-4 block">Process</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold">
              From PDF to Insights
            </h2>
          </motion.div>

          {/* Pipeline visualization */}
          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'Upload', desc: 'PDF uploaded to MinIO storage, Celery task queued' },
                { step: '02', title: 'Extract', desc: '4-tier OCR extracts text, chunked with 600-char overlap' },
                { step: '03', title: 'Analyze', desc: 'LLM extracts clauses, entities, and risk assessments' },
                { step: '04', title: 'Explore', desc: 'Search, visualize, and navigate your contract portfolio' }
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="relative text-center"
                >
                  {/* Step number */}
                  <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-ink-950 border-2 border-accent/30
                               flex items-center justify-center">
                    <span className="font-mono text-lg text-accent">{item.step}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-ink-400">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-xs font-mono uppercase tracking-widest text-accent mb-4 block">Built With</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold">
              Production Tech Stack
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Next.js 14', 'TypeScript', 'TailwindCSS', 'FastAPI', 'PostgreSQL',
              'pgvector', 'Celery', 'Redis', 'MinIO', 'Ollama', 'llama3.2',
              'Playwright', 'Docker', 'Framer Motion'
            ].map((tech, i) => (
              <TechBadge key={tech} name={tech} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Ready to See It
              <br />
              <span className="text-accent">In Action?</span>
            </h2>
            <p className="text-lg text-ink-400 mb-10 max-w-lg mx-auto">
              Upload a contract and watch ContractClarity extract clauses, assess risk, and build a knowledge graph in real-time.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="group flex items-center gap-3 px-10 py-5 bg-accent text-ink-950 font-semibold rounded-xl
                         hover:bg-accent-light hover:shadow-xl hover:shadow-accent/20 transition-all text-lg"
              >
                <Eye className="w-5 h-5" />
                Launch Demo
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://github.com/m4cd4r4/ContractClarity"
                target="_blank"
                className="flex items-center gap-3 px-10 py-5 bg-ink-900 border border-ink-700 text-ink-200 font-semibold rounded-xl
                         hover:border-accent/30 hover:text-accent transition-all text-lg"
              >
                <Github className="w-5 h-5" />
                Star on GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-ink-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <span className="font-display font-semibold">ContractClarity</span>
              <span className="text-ink-600 text-sm">Part of the Clarity Suite</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-ink-500">
              <a href="https://github.com/m4cd4r4" target="_blank" className="hover:text-accent transition-colors">
                Built by Macdara
              </a>
              <span className="text-ink-700">|</span>
              <span>MIT License</span>
              <span className="text-ink-700">|</span>
              <span>January 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
