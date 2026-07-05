import { lazy, Suspense, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Loaded on demand so Driver.js stays out of the initial bundle.
const VoiceAssistant = lazy(() => import('./VoiceAssistant.jsx'))

// ---------------------------------------------------------------------------
// Floating "Guide Me" button — clean, government-style, blue pill. Clicking it
// opens the AI Voice Guide popup (it does NOT start the microphone directly).
// No glow / pulse / float / gradient / glass — just a solid blue pill with a
// soft shadow and a subtle hover-darken.
// ---------------------------------------------------------------------------

export default function GuideButton() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false) // load the popup lazily on first open, then keep mounted so exit can animate
  const reduce = useReducedMotion()

  function toggle() {
    setMounted(true)
    setOpen((v) => !v)
  }

  // Reduced motion → fade only, no scale/rise, no hover/tap spring.
  const btnMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, y: 24, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 },
        whileHover: { scale: 1.04 },
        whileTap: { scale: 0.96 },
      }

  return (
    <>
      <motion.button
        type="button"
        onClick={toggle}
        aria-label="Open AI Voice Guide"
        aria-expanded={open}
        {...btnMotion}
        style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
        className="fixed bottom-6 right-6 z-[97] inline-flex h-[52px] items-center gap-2 rounded-full bg-accent-700 px-5 text-[15px] font-semibold text-white hover:bg-accent-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-600"
      >
        <HeadsetIcon />
        <span>Guide Me</span>
      </motion.button>

      {mounted && (
        <Suspense fallback={null}>
          <VoiceAssistant open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 13v-1a8 8 0 0116 0v1" strokeLinecap="round" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      <path d="M20 19v.5a3.5 3.5 0 01-3.5 3.5H13" strokeLinecap="round" />
    </svg>
  )
}
