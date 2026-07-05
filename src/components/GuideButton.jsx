import { lazy, Suspense, useState } from 'react'

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI Voice Guide"
        aria-expanded={open}
        style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
        className="fixed bottom-6 right-6 z-[97] inline-flex h-[52px] items-center gap-2 rounded-full bg-accent-700 px-5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-accent-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-600"
      >
        <HeadsetIcon />
        <span>Guide Me</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <VoiceAssistant onClose={() => setOpen(false)} />
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
