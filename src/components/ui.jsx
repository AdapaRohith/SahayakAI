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
