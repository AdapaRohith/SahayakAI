// ---------------------------------------------------------------------------
// Small deterministic helpers shared across the app.
// No external crypto — a stable string hash is enough to *signal* tamper-evidence
// in the audit trail (each entry's hash chains off the previous entry's hash).
// ---------------------------------------------------------------------------

// FNV-1a 32-bit hash -> 8-char hex. Deterministic and dependency-free.
export function shortHash(input) {
  let h = 0x811c9dc5
  const str = String(input)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // to unsigned, then hex, padded
  return (h >>> 0).toString(16).padStart(8, '0')
}

let _seq = 0
export function uid(prefix = 'id') {
  _seq += 1
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`
}

// Human timestamp: "03 Jul 2026, 14:32:07"
export function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Returns { text, breached, urgent, ms } describing time left until deadline.
export function slaCountdown(deadlineIso, nowMs = Date.now()) {
  const deadline = new Date(deadlineIso).getTime()
  const diff = deadline - nowMs
  const breached = diff <= 0
  const abs = Math.abs(diff)
  const h = Math.floor(abs / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const s = Math.floor((abs % 60_000) / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const text = `${pad(h)}:${pad(m)}:${pad(s)}`
  return {
    text: breached ? `+${text}` : text,
    breached,
    urgent: !breached && diff < 4 * 3_600_000, // < 4h left
    ms: diff,
  }
}

export function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}
