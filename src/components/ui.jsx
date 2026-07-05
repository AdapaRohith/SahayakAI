import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n.js'

// ---------------------------------------------------------------------------
// Small presentational primitives shared across pages. The UI is monochrome;
// the ONLY colour lives in the status trio below (green=approved, amber=pending,
// red=breach) so the compliance signal stays meaningful and uncompeted-with.
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  // green
  Issued: 'bg-approved-bg text-approved',
  Resolved: 'bg-approved-bg text-approved',
  Approved: 'bg-approved-bg text-approved',
  Verified: 'bg-approved-bg text-approved',
  // amber
  'Pending Approval': 'bg-pending-bg text-pending',
  'In Progress': 'bg-pending-bg text-pending',
  'Changes Requested': 'bg-pending-bg text-pending',
  Pending: 'bg-pending-bg text-pending',
  // red
  Breached: 'bg-breach-bg text-breach',
  Rejected: 'bg-breach-bg text-breach',
  Unverified: 'bg-breach-bg text-breach',
}

export function StatusBadge({ status, className = '' }) {
  const t = useT()
  const style = STATUS_STYLES[status] || 'bg-ink-100 text-ink-700'
  // `status` is the English key (drives styling); show its translated label.
  const label = t.common.status[status] || status
  return <span className={`chip ${style} ${className}`}>{label}</span>
}

export function PriorityDot({ priority }) {
  const color = priority === 'High' ? 'bg-breach' : priority === 'Low' ? 'bg-ink-300' : 'bg-ink-700'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {priority}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4 animate-slideIn">
      <div>
        {eyebrow && (
          <div className="text-xs font-bold uppercase tracking-widest text-accent-700 mb-1">{eyebrow}</div>
        )}
        <h1 className="text-2xl font-extrabold text-ink-950 leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-ink-950',
    good: 'text-approved',
    warn: 'text-pending',
    bad: 'text-breach',
  }
  return (
    <div className="card card-hover p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`text-3xl font-extrabold mt-1 tabular-nums ${tones[tone]}`}>
        <CountUp value={value} />
      </div>
      {sub && <div className="text-xs text-ink-500 mt-1">{sub}</div>}
    </div>
  )
}

// A small numbered source chip used inline in AI answers.
export function CiteChip({ n, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center align-super h-4 min-w-4 px-1 mx-0.5 rounded text-[10px] font-bold leading-none transition-colors ${
        active ? 'bg-accent-700 text-white' : 'bg-accent-50 text-accent-800 hover:bg-accent-100'
      }`}
      title={`Source ${n}`}
    >
      {n}
    </button>
  )
}

export function Shield({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Line-icon set — one consistent visual language (24-grid, 2px stroke, rounded
// joins) that replaces ad-hoc emoji glyphs across pages. Emoji render
// inconsistently per-OS and can't be themed; these inherit currentColor.
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />,
  tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2A2 2 0 0 1 4 12.8V6a2 2 0 0 1 2-2h6.8a2 2 0 0 1 1.4.6l6.4 6.4a2 2 0 0 1 0 2.4z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  send: <><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
  clipboard: <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="M9 14l2 2 4-4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  arrow: <><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  play: <path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />,
}

export function Icon({ name, className = 'h-4 w-4' }) {
  const path = ICON_PATHS[name] || ICON_PATHS.chat
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------

// Tracks the OS "reduce motion" setting so animated primitives can opt out.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

// Counts a numeric value up on mount. Preserves any prefix/suffix (%, d, m…)
// and snaps straight to the final value when reduced motion is requested or
// the value has no leading number.
function CountUp({ value }) {
  const reduced = useReducedMotion()
  const str = String(value)
  const parts = str.match(/^(\D*)(\d[\d,]*\.?\d*)(.*)$/s)
  const [display, setDisplay] = useState(str)

  useEffect(() => {
    if (!parts || reduced) {
      setDisplay(str)
      return
    }
    const prefix = parts[1]
    const suffix = parts[3]
    const target = parseFloat(parts[2].replace(/,/g, ''))
    const decimals = (parts[2].split('.')[1] || '').length
    let raf
    let start
    const dur = 700
    const tick = (t) => {
      start ??= t
      const p = Math.min((t - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setDisplay(str)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [str]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{display}</>
}
