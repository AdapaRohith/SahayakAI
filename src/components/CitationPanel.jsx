import { Shield } from './ui.jsx'

// Side panel that renders the policy sources a chat answer was grounded in.
// Data comes straight from the backend /api/chat response:
//   citations:   [{ source_title, source_ref }]
//   usedChunks:  [{ source_ref, content }]   (raw retrieved text for depth)
// Clicking a citation expands the matching chunk content (client-side only,
// no extra request).
export default function CitationPanel({ citations = [], usedChunks = [], activeRef, onSelect }) {
  if (!citations.length) {
    return (
      <aside className="card p-4">
        <div className="flex items-center gap-2 text-ink-500 font-semibold text-sm">
          <Shield className="h-4 w-4" /> Sources
        </div>
        <p className="text-xs text-ink-500 mt-2">
          Ask a question to see the cited government sources here. Every answer is grounded in at
          least one policy source.
        </p>
      </aside>
    )
  }

  const chunkFor = (ref) => usedChunks.find((c) => c.source_ref === ref)

  return (
    <aside className="card p-4">
      <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-3">
        <Shield className="h-4 w-4 text-teal-600" /> Cited sources
        <span className="chip bg-teal-500/15 text-teal-700 ml-auto">{citations.length}</span>
      </div>
      <ol className="space-y-3">
        {citations.map((c, i) => {
          const active = activeRef === c.source_ref
          const chunk = chunkFor(c.source_ref)
          return (
            <li
              key={c.source_ref + i}
              className={`rounded-lg border p-3 transition-colors ${
                active ? 'border-teal-500 bg-teal-500/5 ring-1 ring-teal-500' : 'border-ink-100'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect?.(active ? null : c.source_ref)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-teal-700 font-mono">{c.source_ref}</div>
                  <div className="text-sm font-semibold text-indigo-900 leading-snug mt-0.5">
                    {c.source_title}
                  </div>
                  {chunk && (
                    <div className="text-[11px] text-teal-700 mt-1 font-semibold">
                      {active ? '▾ Hide source text' : '▸ Show source text'}
                    </div>
                  )}
                </div>
              </button>

              {active && chunk && (
                <p className="text-xs text-ink-700 mt-2 leading-relaxed border-l-2 border-teal-500 pl-2.5">
                  {chunk.content}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
