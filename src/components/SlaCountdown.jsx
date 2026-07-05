import { useState, useEffect } from 'react'

/* ---------------------------------------------------------------------------
 * Live SLA Countdown — ticks every second from a backend-fetched base time.
 * Transitions amber → red when past deadline. Used on Workflow & Requests cards.
 * ------------------------------------------------------------------------- */

const SLA_COLORS = { green: 'text-approved', amber: 'text-pending', red: 'text-breach', done: 'text-ink-500' }

function fmtDuration(ms) {
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const s = Math.floor((abs % 60_000) / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * @param {object} props
 * @param {number} props.slaRemainingHours - hours remaining at fetch time
 * @param {'green'|'amber'|'red'|'done'} props.slaStatus - status from backend
 * @param {number} props.fetchedAt - timestamp (ms) when data was fetched
 * @param {'sm'|'md'|'lg'} [props.size='md'] - display size
 */
export default function SlaCountdown({ slaRemainingHours, slaStatus, fetchedAt, size = 'md' }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (slaRemainingHours == null || slaStatus === 'done') return null

  const deadlineMs = fetchedAt + slaRemainingHours * 3_600_000
  const remaining = deadlineMs - now
  const overdue = remaining <= 0
  const color = overdue ? 'red' : slaStatus || 'green'
  const textColor = SLA_COLORS[color] || 'text-approved'

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg font-bold',
  }

  return (
    <span className={`font-mono tabular-nums ${textColor} ${sizeClasses[size] || 'text-sm'}`}>
      {overdue ? (
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-breach animate-pulse" />
          +{fmtDuration(remaining)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${color === 'amber' ? 'bg-pending animate-pulse' : 'bg-approved'}`} />
          {fmtDuration(remaining)}
        </span>
      )}
    </span>
  )
}

export { SLA_COLORS, fmtDuration }
