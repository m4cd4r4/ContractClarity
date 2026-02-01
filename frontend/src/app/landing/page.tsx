'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Volume2, VolumeX, Pause, Play, SkipForward } from 'lucide-react'

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [videoEnded, setVideoEnded] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100
      setProgress(progress)
    }

    const handleEnded = () => {
      setVideoEnded(true)
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const restartVideo = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    video.play()
    setIsPlaying(true)
    setVideoEnded(false)
  }

  return (
    <div className="relative min-h-screen bg-ink-950 overflow-hidden">
      {/* Video Container - centered with proper scaling */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-32">
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black/50"
          style={{ aspectRatio: '16/9' }}
          src="/videos/demo.mp4"
          autoPlay
          muted={isMuted}
          playsInline
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        />
      </div>

      {/* Subtle gradient overlays for UI readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60 pointer-events-none" />

      {/* Top bar with logo */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-amber-700 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold text-white">
            Contract<span className="text-accent">Clarity</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/yourusername/contractclarity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-400 hover:text-white transition-colors text-sm"
          >
            GitHub
          </a>
          <Link
            href="/"
            className="px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
          >
            Skip Intro
          </Link>
        </div>
      </motion.header>

      {/* Video Controls */}
      <AnimatePresence>
        {(showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4"
          >
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-ink-900/80 backdrop-blur-sm border border-ink-700/50 text-white hover:bg-ink-800 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-3 rounded-full bg-ink-900/80 backdrop-blur-sm border border-ink-700/50 text-white hover:bg-ink-800 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {videoEnded && (
              <button
                onClick={restartVideo}
                className="p-3 rounded-full bg-ink-900/80 backdrop-blur-sm border border-ink-700/50 text-white hover:bg-ink-800 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-96 z-20">
        <div className="h-1 bg-ink-800/50 rounded-full overflow-hidden backdrop-blur-sm">
          <motion.div
            className="h-full bg-accent"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-8 flex flex-col items-center"
      >
        <p className="text-ink-400 text-sm mb-4">
          AI-Powered Contract Analysis for M&A Due Diligence
        </p>
        <Link
          href="/"
          className="group flex items-center gap-3 px-8 py-4 bg-accent text-ink-950 rounded-xl font-semibold text-lg hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/20"
        >
          Enter Dashboard
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <p className="text-ink-600 text-xs mt-4">
          Part of the Clarity Suite
        </p>
      </motion.div>

      {/* Video ended overlay */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-ink-950/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-amber-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/30">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h1 className="font-display text-4xl font-bold text-white mb-2">
                Contract<span className="text-accent">Clarity</span>
              </h1>
              <p className="text-ink-400 mb-8">
                AI-Powered Contract Analysis for M&A Due Diligence
              </p>
              <div className="flex items-center gap-4 justify-center">
                <button
                  onClick={restartVideo}
                  className="px-6 py-3 bg-ink-800 border border-ink-700 rounded-xl text-white hover:bg-ink-700 transition-colors"
                >
                  Watch Again
                </button>
                <Link
                  href="/"
                  className="group flex items-center gap-2 px-6 py-3 bg-accent text-ink-950 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
                >
                  Enter Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
