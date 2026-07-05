import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Thin wrapper over the browser SpeechSynthesis API for the voice guide.
// Speaks a string in the selected language, picking a matching voice when one
// is installed and falling back to the default voice otherwise.
// ---------------------------------------------------------------------------

const LANG_CODES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' }

export function useSpeechSynthesis() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const supported = !!synth
  const [voices, setVoices] = useState([])
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!synth) return
    const load = () => setVoices(synth.getVoices() || [])
    load()
    synth.addEventListener?.('voiceschanged', load)
    return () => synth.removeEventListener?.('voiceschanged', load)
  }, [synth])

  const cancel = useCallback(() => {
    if (!synth) return
    try {
      synth.cancel()
    } catch {
      /* noop */
    }
    setSpeaking(false)
  }, [synth])

  const speak = useCallback(
    (text, lang, { onStart, onEnd } = {}) => {
      if (!synth || !text) {
        onEnd?.()
        return
      }
      try {
        synth.cancel()
      } catch {
        /* noop */
      }
      const code = LANG_CODES[lang] || 'en-IN'
      const base = code.split('-')[0]
      const u = new SpeechSynthesisUtterance(text)
      u.lang = code
      const match =
        voices.find((v) => v.lang === code) ||
        voices.find((v) => (v.lang || '').toLowerCase().startsWith(base))
      if (match) {
        u.voice = match
      } else if (lang === 'te') {
        // Most desktop browsers ship no Telugu voice → te-IN produces silence.
        // Fall back to a Hindi voice: shares enough phonetics to be intelligible
        // for Telugu text, rather than nothing.
        const hiVoice =
          voices.find((v) => v.lang === 'hi-IN') ||
          voices.find((v) => (v.lang || '').toLowerCase().startsWith('hi'))
        if (hiVoice) {
          u.voice = hiVoice
          u.lang = 'hi-IN'
        }
        // else: no Telugu or Hindi voice — let the system default attempt te-IN.
      }
      u.rate = 0.98
      u.onstart = () => {
        setSpeaking(true)
        onStart?.()
      }
      u.onend = () => {
        setSpeaking(false)
        onEnd?.()
      }
      u.onerror = () => {
        console.warn(
          '[TTS] Voice unavailable for',
          u.lang,
          '— installed voices:',
          voices.map((v) => v.lang),
        )
        setSpeaking(false)
        onEnd?.()
      }
      try {
        synth.speak(u)
      } catch {
        setSpeaking(false)
        onEnd?.()
      }
    },
    [synth, voices],
  )

  useEffect(() => () => cancel(), [cancel])

  return { supported, speaking, speak, cancel }
}
