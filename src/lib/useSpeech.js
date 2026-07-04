import { useRef, useState, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Web Speech API (SpeechRecognition) wrapper, tuned for the flaky reality of
// the browser engine:
//
//  - `continuous = true` + a longer window so short pauses don't kill the
//    session (the old default fired `no-speech` almost immediately).
//  - `no-speech` / `aborted` are treated as BENIGN — no scary error, we just
//    stop quietly (this is the "Didn't catch that" spam the user hit).
//  - `network` (Chrome's speech backend unreachable) is often transient, so we
//    auto-retry a couple of times before surfacing anything.
//  - A fresh instance per start() (Chrome wedges a reused instance).
//  - Requires a secure context (HTTPS or localhost) + mic permission.
// ---------------------------------------------------------------------------

const LANG_CODES = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }
const MAX_NETWORK_RETRIES = 2

const HARD_ERRORS = {
  'not-allowed': 'Microphone access is blocked. Allow it in the browser address bar, then try again.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in the browser address bar, then try again.',
  'audio-capture': 'No microphone was found. Check that one is connected and enabled.',
  network: 'Speech service is unreachable. This browser/network may be blocking it — type your question instead, or try Google Chrome.',
}

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeech(lang = 'en', onResult) {
  const Ctor = getRecognitionCtor()
  const supported = !!Ctor

  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)

  const recRef = useRef(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const langRef = useRef(lang)
  langRef.current = lang

  const beginRef = useRef(null) // internal (re)starter, so onerror can retry
  const netRetriesRef = useRef(0)
  const gotResultRef = useRef(false)
  const manualStopRef = useRef(false)

  const cleanup = () => {
    const rec = recRef.current
    if (rec) {
      rec.onresult = rec.onerror = rec.onend = rec.onstart = null
      try { rec.abort() } catch { /* noop */ }
    }
    recRef.current = null
  }

  const stop = useCallback(() => {
    manualStopRef.current = true
    const rec = recRef.current
    if (rec) { try { rec.stop() } catch { /* noop */ } }
    setListening(false)
  }, [])

  // Build + start a fresh recognition session.
  const begin = useCallback(() => {
    cleanup()
    let rec
    try {
      rec = new Ctor()
    } catch {
      setError('Could not start voice input.')
      return
    }

    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang = LANG_CODES[langRef.current] || 'en-IN'

    rec.onstart = () => setListening(true)

    rec.onresult = (e) => {
      let transcript = ''
      let isFinal = false
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
        if (e.results[i].isFinal) isFinal = true
      }
      gotResultRef.current = true
      netRetriesRef.current = 0
      onResultRef.current?.(transcript.trim(), isFinal)
      if (isFinal) {
        // We have a complete phrase — end the session cleanly.
        manualStopRef.current = true
        try { rec.stop() } catch { /* noop */ }
      }
    }

    rec.onerror = (e) => {
      const code = e?.error
      // Transient backend failure — silently retry a couple of times.
      if (code === 'network' && netRetriesRef.current < MAX_NETWORK_RETRIES) {
        netRetriesRef.current += 1
        setTimeout(() => beginRef.current?.(), 400)
        return
      }
      // Benign: no speech detected or user/programmatic stop — no error UI.
      if (code === 'no-speech' || code === 'aborted') {
        setListening(false)
        return
      }
      setError(HARD_ERRORS[code] ?? `Voice input error: ${code || 'unknown'}.`)
      setListening(false)
    }

    rec.onend = () => setListening(false)

    recRef.current = rec
    try {
      rec.start()
    } catch {
      // A prior session may still be tearing down — one delayed retry.
      setTimeout(() => {
        try { rec.start() } catch { setError('Voice input is busy — try again in a moment.') }
      }, 250)
    }
  }, [Ctor])
  beginRef.current = begin

  const start = useCallback(() => {
    if (!supported) {
      setError('Voice input is not supported in this browser. Use Google Chrome or Edge.')
      return
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Voice input needs a secure (https) connection or localhost.')
      return
    }
    setError(null)
    netRetriesRef.current = 0
    gotResultRef.current = false
    manualStopRef.current = false
    begin()
  }, [supported, begin])

  useEffect(() => () => cleanup(), [])

  return { supported, listening, error, start, stop }
}
