import { getSource } from '../data/seed.js'
import { Shield } from './ui.jsx'

// Side panel that renders the statutes/circulars an AI answer was grounded in.
export default function CitationPanel({ sourceIds = [], activeIndex, unverified }) {
  if (unverified) {
    return (
      <aside className="card p-4 border-pending/40 bg-pending-bg/50">
        <div className="flex items-center gap-2 text-pending font-bold text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          No grounded sources
        </div>
        <p className="text-xs text-ink-700 mt-2 leading-relaxed">
          This response could not be tied to a verified statute or circular in the source library,
          so it is <strong>not issued as official guidance</strong>. Refer the citizen to the
          department for an authoritative answer.
        </p>
      </aside>
    )
  }

  if (!sourceIds.length) {
    return (
      <aside className="card p-4">
        <div className="flex items-center gap-2 text-ink-500 font-semibold text-sm">
          <Shield className="h-4 w-4" /> Sources
        </div>
        <p className="text-xs text-ink-500 mt-2">Ask a question to see the cited statutes and circulars here.</p>
      </aside>
    )
  }

  return (
    <aside className="card p-4">
      <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-3">
        <Shield className="h-4 w-4 text-teal-600" /> Cited sources
        <span className="chip bg-teal-500/15 text-teal-700 ml-auto">{sourceIds.length}</span>
      </div>
      <ol className="space-y-3">
        {sourceIds.map((id, i) => {
          const s = getSource(id)
          if (!s) return null
          const active = activeIndex === i
          return (
            <li
              key={id}
              className={`rounded-lg border p-3 transition-colors ${
                active ? 'border-teal-500 bg-teal-500/5 ring-1 ring-teal-500' : 'border-ink-100'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-teal-700">{s.ref}</div>
                  <div className="text-sm font-semibold text-indigo-900 leading-snug mt-0.5">{s.title}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{s.authority} · {s.year}</div>
                  <p className="text-xs text-ink-700 mt-2 leading-relaxed border-l-2 border-ink-300 pl-2 italic">
                    “{s.excerpt}”
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
