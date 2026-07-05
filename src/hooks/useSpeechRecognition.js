import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Thin wrapper over the browser Web Speech API (SpeechRecognition) for the
// voice guide. Single-utterance capture: start(lang) listens once and reports
// the final transcript, or an error category the UI can turn into a friendly
// message ('permission' | 'no-speech' | 'error' | 'unsupported').
// ---------------------------------------------------------------------------

const LANG_CODES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' }

function getCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeechRecognition() {
  const Ctor = getCtor()
  const supported = !!Ctor
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const cbRef = useRef({})

  const cleanup = useCallback(() => {
    const rec = recRef.current
    if (rec) {
      rec.onresult = rec.onerror = rec.onend = rec.onstart = null
      try {
        rec.abort()
      } catch {
        /* noop */
      }
    }
    recRef.current = null
  }, [])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (rec) {
      try {
        rec.stop()
      } catch {
        /* noop */
      }
    }
    setListening(false)
  }, [])

  // start(lang, { onResult, onError }). lang is the app code (en|te|hi).
  const start = useCallback(
    (lang, { onResult, onError } = {}) => {
      cbRef.current = { onResult, onError }
      if (!supported) {
        onError?.('unsupported')
        return
      }
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        onError?.('error')
        return
      }
      cleanup()
      let rec
      try {
        rec = new Ctor()
      } catch {
        onError?.('error')
        return
      }
      recRef.current = rec
      rec.lang = LANG_CODES[lang] || 'en-IN'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.continuous = false

      let got = false
      rec.onstart = () => setListening(true)
      rec.onresult = (e) => {
        let transcript = ''
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
        transcript = transcript.trim()
        got = true
        setListening(false)
        if (transcript) cbRef.current.onResult?.(transcript)
        else cbRef.current.onError?.('no-speech')
      }
      rec.onerror = (e) => {
        setListening(false)
        const code = e?.error
        if (code === 'not-allowed' || code === 'service-not-allowed') cbRef.current.onError?.('permission')
        else if (code === 'no-speech' || code === 'aborted') cbRef.current.onError?.('no-speech')
        else cbRef.current.onError?.('error')
      }
      rec.onend = () => {
        setListening(false)
        if (!got) cbRef.current.onError?.('no-speech')
      }
      try {
        rec.start()
      } catch {
        onError?.('error')
      }
    },
    [Ctor, supported, cleanup],
  )

  useEffect(() => () => cleanup(), [cleanup])

  return { supported, listening, start, stop }
}
