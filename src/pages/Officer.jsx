import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { useTemplates, useCases, useDraftDocument, useSaveDocument, useApproveDocument, useIssueDocument } from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, StatusBadge, Shield } from '../components/ui.jsx'

// Map backend document status -> the StatusBadge vocabulary.
const STATUS_LABEL = { draft: 'Draft', approved: 'Approved', issued: 'Issued' }

export default function Officer() {
  const { role, actor, lang } = useApp()
  const t = useT().officer
  const tRole = useT().nav.roles
  const templatesQ = useTemplates()
  const casesQ = useCases()

  const draftMut = useDraftDocument()
  const saveMut = useSaveDocument()
  const approveMut = useApproveDocument()
  const issueMut = useIssueDocument()

  const [templateId, setTemplateId] = useState(null)
  const [caseId, setCaseId] = useState('')
  const [docs, setDocs] = useState([]) // documents drafted this session
  const [selectedId, setSelectedId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [actionError, setActionError] = useState(null)

  const templates = templatesQ.data ?? []
  const cases = casesQ.data ?? []
  const selected = docs.find((d) => d.id === selectedId) || null
  const status = selected?.status ?? 'draft'

  // Default the template selection once templates load.
  useEffect(() => {
    if (templateId == null && templates.length) setTemplateId(templates[0].id)
  }, [templates, templateId])

  // Reset the editor + review gate whenever the selected document changes.
  useEffect(() => {
    setEditContent(selected?.content ?? '')
    setReviewed(false)
    setActionError(null)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  function upsertDoc(doc) {
    setDocs((prev) => {
      const exists = prev.some((d) => d.id === doc.id)
      return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...prev]
    })
  }

  async function generate() {
    if (!caseId || templateId == null) return
    setActionError(null)
    try {
      const doc = await draftMut.mutateAsync({ caseId: Number(caseId), templateId, actor, lang })
      upsertDoc(doc)
      setSelectedId(doc.id)
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function save() {
    if (!selected) return
    try {
      const doc = await saveMut.mutateAsync({ id: selected.id, content: editContent })
      upsertDoc(doc)
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function runLifecycle(mutation) {
    if (!selected) return
    setActionError(null)
    try {
      const doc = await mutation.mutateAsync({ id: selected.id, actor })
      upsertDoc(doc)
    } catch (err) {
      // R3: a 409 means the state guard rejected it — surface, don't crash.
      setActionError(
        err.status === 409
          ? t.blocked409
          : err.message,
      )
    }
  }

  const dirty = selected && editContent !== selected.content

  return (
    <div>
      <SectionTitle
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        right={
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-500">{t.signedInAs}</span>
            <span className="chip bg-ink-950 text-white">{tRole[role]} · {actor}</span>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Draft builder */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold text-ink-950 mb-3">{t.step1}</h3>
            {templatesQ.isLoading ? (
              <Skeleton rows={2} />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setTemplateId(tpl.id)}
                    className={`text-left rounded-lg border p-3 transition-all duration-200 active:scale-[0.99] ${
                      templateId === tpl.id
                        ? 'border-accent-600 bg-accent-50 ring-1 ring-accent-600'
                        : 'border-ink-300 hover:border-ink-500'
                    }`}
                  >
                    <div className="text-sm font-bold text-ink-950 leading-tight">{tpl.name}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5 line-clamp-2">{tpl.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-bold text-ink-950 mb-3">{t.step2}</h3>
            {casesQ.isLoading ? (
              <Skeleton rows={1} />
            ) : (
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 hover:border-accent-500 transition-colors"
              >
                <option value="">{t.selectCase}</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} · {c.citizen_name} · {c.title}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-ink-500 mt-2">
              {t.placeholderNote}
            </p>
          </div>

          <button
            onClick={generate}
            disabled={!caseId || templateId == null || draftMut.isPending}
            className="btn-teal w-full h-12 text-base"
          >
            <Shield className="h-5 w-5" /> {draftMut.isPending ? t.drafting : t.autoDraft}
          </button>
          <p className="text-[11px] text-ink-500 text-center px-2">
            {t.draftStatusNote(t.draftWord)}
          </p>

          {/* Session queue */}
          {docs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-ink-200">
                <h3 className="font-bold text-ink-700 text-sm">{t.sessionDrafts}</h3>
              </div>
              <div className="divide-y divide-ink-100">
                {docs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={`w-full text-left p-3 flex items-center justify-between gap-2 transition-colors ${
                      selectedId === d.id ? 'bg-ink-100' : 'hover:bg-ink-50'
                    }`}
                  >
                    <span className="text-sm font-semibold text-ink-950 truncate">
                      {t.docLabel(d.id, d.case_id)}
                    </span>
                    <StatusBadge status={STATUS_LABEL[d.status] || d.status} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor + approval bar */}
        <div className="space-y-4">
          {!selected ? (
            <div className="card p-10 text-center text-sm text-ink-500 h-full flex flex-col items-center justify-center">
              <Shield className="h-10 w-10 text-ink-400 mb-3" />
              {t.emptyEditor}
            </div>
          ) : (
            <>
              <div className="card p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-500">{t.documentNum(selected.id)}</div>
                    <h3 className="text-lg font-extrabold text-ink-950">{t.caseTemplate(selected.case_id, selected.template_id)}</h3>
                  </div>
                  <StatusPill status={selected.status} />
                </div>

                <label className="field-label">{t.contentLabel}</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  disabled={selected.status !== 'draft'}
                  rows={16}
                  className="w-full rounded-lg border border-ink-300 px-3.5 py-3 font-mono text-[13px] leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-accent-600 transition-colors disabled:bg-ink-100/60 disabled:text-ink-500"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-ink-500">
                    {selected.approved_by && <>{t.approvedBy(selected.approved_by)}</>}
                    {selected.issued_at ? t.stateIssued : selected.status === 'draft' ? t.stateEditable : t.stateLocked}
                  </span>
                  <button
                    onClick={save}
                    disabled={!dirty || selected.status !== 'draft' || saveMut.isPending}
                    className="btn-ghost"
                  >
                    {saveMut.isPending ? t.saving : t.save}
                  </button>
                </div>
              </div>

              {/* Approval bar — R3 gate */}
              <div className="card p-4">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                    disabled={selected.status !== 'draft'}
                    className="h-4 w-4 rounded border-ink-300 text-accent-700 focus:ring-accent-600"
                  />
                  <span className="text-sm font-semibold text-ink-950">{t.reviewed}</span>
                </label>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => runLifecycle(approveMut)}
                    disabled={status !== 'draft' || !reviewed || approveMut.isPending}
                    className="btn-primary flex-1"
                  >
                    {approveMut.isPending ? t.approving : t.approve}
                  </button>
                  <button
                    onClick={() => runLifecycle(issueMut)}
                    disabled={status !== 'approved' || issueMut.isPending}
                    className="btn-teal flex-1"
                  >
                    <CheckIcon /> {issueMut.isPending ? t.issuing : t.issue}
                  </button>
                </div>

                {actionError && (
                  <div className="mt-3 rounded-lg bg-breach-bg/60 border border-breach/30 px-3 py-2 text-xs text-breach">
                    {actionError}
                  </div>
                )}
                <p className="text-[11px] text-ink-500 mt-3">
                  {t.approveNote(t.approvedWord)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  return <StatusBadge status={STATUS_LABEL[status] || status} />
}

function Skeleton({ rows = 2 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 skeleton" />
      ))}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
