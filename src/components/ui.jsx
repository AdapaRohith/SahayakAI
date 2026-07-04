// ---------------------------------------------------------------------------
// Small presentational primitives shared across pages. Keeping status colors
// centralised guarantees consistency: green=approved, amber=pending, red=breach.
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
  const style = STATUS_STYLES[status] || 'bg-ink-100 text-ink-700'
  return <span className={`chip ${style} ${className}`}>{status}</span>
}

export function PriorityDot({ priority }) {
  const color = priority === 'High' ? 'bg-breach' : priority === 'Low' ? 'bg-ink-300' : 'bg-teal-500'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {priority}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        {eyebrow && (
          <div className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-1">{eyebrow}</div>
        )}
        <h1 className="text-2xl font-extrabold text-indigo-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-indigo-900',
    good: 'text-approved',
    warn: 'text-pending',
    bad: 'text-breach',
  }
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`text-3xl font-extrabold mt-1 ${tones[tone]}`}>{value}</div>
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
        active ? 'bg-teal-600 text-white' : 'bg-teal-500/15 text-teal-700 hover:bg-teal-500/30'
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
