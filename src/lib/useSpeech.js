import { useEffect, useRef, useState, useCallback } from 'react'

// Thin wrapper around the browser Web Speech API (SpeechRecognition).
// Gracefully reports `supported: false` on browsers without it.
const LANG_CODES = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }

export function useSpeech(lang = 'en', onResult) {
  const Recognition =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const supported = !!Recognition
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (!supported) return
    const rec = new Recognition()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = LANG_CODES[lang] || 'en-IN'
    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      onResultRef.current?.(transcript, e.results[e.results.length - 1].isFinal)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => {
      try { rec.stop() } catch { /* noop */ }
    }
  }, [lang, supported, Recognition])

  const start = useCallback(() => {
    if (!recRef.current) return
    try {
      recRef.current.start()
      setListening(true)
    } catch { /* already started */ }
  }, [])

  const stop = useCallback(() => {
    try { recRef.current?.stop() } catch { /* noop */ }
    setListening(false)
  }, [])

  return { supported, listening, start, stop }
}
