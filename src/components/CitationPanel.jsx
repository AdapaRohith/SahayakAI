import { Shield } from './ui.jsx'
import { useT } from '../lib/i18n.js'

// Side panel that renders the policy sources a chat answer was grounded in.
// Data comes straight from the backend /api/chat response:
//   citations:   [{ source_title, source_ref }]
//   usedChunks:  [{ source_ref, content }]   (raw retrieved text for depth)
// Clicking a citation expands the matching chunk content (client-side only,
// no extra request).
export default function CitationPanel({ citations = [], usedChunks = [], activeRef, onSelect }) {
  const t = useT().citation
  if (!citations.length) {
    return (
      <aside className="card p-4">
        <div className="flex items-center gap-2 text-ink-500 font-semibold text-sm">
          <Shield className="h-4 w-4" /> {t.sources}
        </div>
        <p className="text-xs text-ink-500 mt-2">
          {t.askToSee}
        </p>
      </aside>
    )
  }

  const chunkFor = (ref) => usedChunks.find((c) => c.source_ref === ref)

  return (
    <aside className="card p-4">
      <div className="flex items-center gap-2 text-ink-950 font-bold text-sm mb-3">
        <Shield className="h-4 w-4" /> {t.citedSources}
        <span className="chip bg-ink-950 text-white ml-auto">{citations.length}</span>
      </div>
      <ol className="space-y-3">
        {citations.map((c, i) => {
          const active = activeRef === c.source_ref
          const chunk = chunkFor(c.source_ref)
          return (
            <li
              key={c.source_ref + i}
              className={`rounded-lg border p-3 transition-all duration-200 ${
                active ? 'border-accent-600 bg-accent-50 ring-1 ring-accent-600' : 'border-ink-200 hover:border-ink-400'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect?.(active ? null : c.source_ref)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent-700 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-accent-700 font-mono">{c.source_ref}</div>
                  <div className="text-sm font-semibold text-ink-950 leading-snug mt-0.5">
                    {c.source_title}
                  </div>
                  {chunk && (
                    <div className="text-[11px] text-ink-600 mt-1 font-semibold">
                      {active ? t.hideText : t.showText}
                    </div>
                  )}
                </div>
              </button>

              {active && chunk && (
                <p className="text-xs text-ink-700 mt-2 leading-relaxed border-l-2 border-accent-600 pl-2.5 animate-fadeUp">
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
