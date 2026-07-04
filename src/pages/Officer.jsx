import { useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { TEMPLATES, getSource } from '../data/seed.js'
import { SectionTitle, StatusBadge, Shield } from '../components/ui.jsx'

// Fill {{placeholders}} in a template body from a values object.
function renderBody(body, values) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? `⟨${k}⟩`)
}

// Auto-draft plausible field values for a template, seeded from a case if picked.
function autoDraft(template, caseObj, officer) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN')
  const applicant = caseObj?.citizen || 'Applicant Name'
  const officerShort = officer.replace(/\s*\(.*\)$/, '')
  const base = {
    issueDate: dateStr,
    applicantName: applicant,
    officerName: officerShort,
    department: caseObj?.department || template.department,
    designation: 'Authorised Officer',
  }
  const rnd = Math.floor(1000 + Math.random() * 8999)
  switch (template.id) {
    case 'TPL-INC':
      return {
        ...base,
        certNo: `INC/2026/0${rnd}`,
        relation: 'S/o',
        guardianName: 'Guardian Name',
        address: 'H.No 00-00, Locality',
        district: 'Hyderabad',
        annualIncome: '1,65,000',
        annualIncomeWords: 'One Lakh Sixty-Five Thousand',
        fy: '2025-26',
        thresholdResult: 'below',
      }
    case 'TPL-GRV':
      return {
        ...base,
        grievanceRef: `GRV/2026/0${rnd}`,
        filedDate: new Date(now.getTime() - 5 * 864e5).toLocaleDateString('en-IN'),
        grievanceSubject: caseObj?.title || 'Delay in service delivery',
        actionTaken: 'The matter has been reviewed and the pending service has been sanctioned; the concerned section has been directed to complete delivery within 3 working days.',
      }
    case 'TPL-RAT':
      return {
        ...base,
        ref: `CS/RC/2026/${rnd}`,
        category: 'Priority Household (PHH)',
        entitlement: '5 kg foodgrains per person per month',
        cardNo: `TS-RC-2201-00${rnd}`,
        fpsName: `FPS #${rnd % 400}, Local Ward`,
      }
    default:
      return {
        ...base,
        noticeNo: `NOT/2026/0${rnd}`,
        address: 'H.No 00-00, Locality',
        subject: caseObj?.title || 'Official intimation',
        noticeBody: 'You are hereby informed regarding the subject matter noted above. Please treat this as an official communication from the department.',
        responseDays: '15',
      }
  }
}

export default function Officer() {
  const { documents, currentOfficer, addDocument, approveDocument, rejectDocument, cases, makeUid } = useApp()
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [caseId, setCaseId] = useState('')
  const [reviewing, setReviewing] = useState(null) // document being reviewed
  const [changeNote, setChangeNote] = useState('')
  const [justDrafted, setJustDrafted] = useState(null)

  const template = TEMPLATES.find((t) => t.id === templateId)
  const openCases = cases.filter((c) => c.status !== 'Resolved')

  const pending = documents.filter((d) => d.status === 'Pending Approval')
  const issued = documents.filter((d) => d.status === 'Issued')
  const changes = documents.filter((d) => d.status === 'Changes Requested')

  function generate() {
    const caseObj = cases.find((c) => c.id === caseId)
    const values = autoDraft(template, caseObj, currentOfficer)
    const doc = {
      id: makeUid('DOC'),
      templateId: template.id,
      templateName: template.name,
      caseId: caseObj?.id || null,
      title: `${template.name} — ${values.applicantName}`,
      status: 'Pending Approval',
      department: template.department,
      createdBy: currentOfficer,
      createdAt: new Date().toISOString(),
      sources: template.sources,
      explain: `Auto-drafted from the “${template.name}” template${caseObj ? ` using data from ${caseObj.id}` : ''}. Placeholders filled per ${template.sources.map((s) => getSource(s)?.ref).join(' & ')}. Requires officer approval before issuance.`,
      values,
    }
    addDocument(doc)
    setJustDrafted(doc.id)
    setReviewing(doc)
  }

  function onApprove() {
    approveDocument(reviewing.id, currentOfficer)
    setReviewing(null)
  }
  function onRequestChanges() {
    rejectDocument(reviewing.id, currentOfficer, changeNote.trim())
    setReviewing(null)
    setChangeNote('')
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Officer Copilot"
        title="Draft compliant documents — approve before anything is issued"
        subtitle="The copilot fills the template from case data and explains which rules it applied. Nothing reaches a citizen until a human reviews and approves it."
        right={
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-500">Signed in as</span>
            <span className="chip bg-indigo-800 text-white">{currentOfficer}</span>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Draft builder */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold text-indigo-900 mb-3">1 · Pick a document type</h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    templateId === t.id
                      ? 'border-indigo-600 bg-indigo-800/5 ring-1 ring-indigo-600'
                      : 'border-ink-300 hover:border-indigo-600/50'
                  }`}
                >
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="text-sm font-bold text-indigo-900 leading-tight">{t.name}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{t.department}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-bold text-indigo-900 mb-3">2 · Attach a case (optional)</h3>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">— No case (blank placeholders) —</option>
              {openCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.citizen} · {c.title}
                </option>
              ))}
            </select>

            {/* Rules that will be applied — explainability up front */}
            <div className="mt-3 rounded-lg bg-teal-500/5 border border-teal-500/20 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-teal-700 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Rules this draft will cite
              </div>
              <ul className="mt-2 space-y-1.5">
                {template.sources.map((s) => (
                  <li key={s} className="text-xs text-ink-700">
                    <span className="font-bold text-teal-700">{getSource(s)?.ref}</span> — {getSource(s)?.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button onClick={generate} className="btn-teal w-full h-12 text-base">
            <Shield className="h-5 w-5" /> Auto-draft with copilot
          </button>
          <p className="text-[11px] text-ink-500 text-center px-2">
            The draft is created in “Pending Approval”. It is <strong>not issued</strong> until you approve it below.
          </p>
        </div>

        {/* Approval queues */}
        <div className="space-y-5">
          {/* Pending approval — the gate */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-pending-bg/60 border-b border-pending/20">
              <h3 className="font-bold text-pending flex items-center gap-2">
                <ClockIcon /> Pending approval — human gate
              </h3>
              <span className="chip bg-pending text-white">{pending.length}</span>
            </div>
            <div className="divide-y divide-ink-100">
              {pending.length === 0 && (
                <div className="p-6 text-center text-sm text-ink-500">
                  No drafts awaiting approval. Generate one on the left.
                </div>
              )}
              {pending.map((d) => (
                <DocRow key={d.id} doc={d} highlight={d.id === justDrafted} onReview={() => setReviewing(d)} />
              ))}
            </div>
          </div>

          {/* Changes requested */}
          {changes.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-100">
                <h3 className="font-bold text-ink-700 flex items-center gap-2">Changes requested <span className="chip bg-pending-bg text-pending">{changes.length}</span></h3>
              </div>
              <div className="divide-y divide-ink-100">
                {changes.map((d) => (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-indigo-900 text-sm">{d.title}</div>
                      <StatusBadge status="Changes Requested" />
                    </div>
                    {d.reviewNote && <p className="text-xs text-ink-500 mt-1">Note: “{d.reviewNote}”</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issued */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-approved-bg/50 border-b border-approved/20">
              <h3 className="font-bold text-approved flex items-center gap-2">
                <CheckIcon /> Issued documents
              </h3>
              <span className="chip bg-approved text-white">{issued.length}</span>
            </div>
            <div className="divide-y divide-ink-100">
              {issued.map((d) => (
                <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-indigo-900 text-sm truncate">{d.title}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      Approved by {d.approvedBy || d.createdBy} · {d.templateName}
                    </div>
                  </div>
                  <StatusBadge status="Issued" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Review drawer */}
      {reviewing && (
        <ReviewDrawer
          doc={reviewing}
          template={TEMPLATES.find((t) => t.id === reviewing.templateId)}
          changeNote={changeNote}
          setChangeNote={setChangeNote}
          onClose={() => setReviewing(null)}
          onApprove={onApprove}
          onRequestChanges={onRequestChanges}
          canAct={reviewing.status === 'Pending Approval'}
        />
      )}
    </div>
  )
}

function DocRow({ doc, onReview, highlight }) {
  return (
    <div className={`p-4 flex items-center justify-between gap-3 ${highlight ? 'bg-teal-500/5 animate-slideIn' : ''}`}>
      <div className="min-w-0">
        <div className="font-semibold text-indigo-900 text-sm truncate">{doc.title}</div>
        <div className="text-[11px] text-ink-500 mt-0.5">
          {doc.templateName} · drafted by {doc.createdBy}
        </div>
      </div>
      <button onClick={onReview} className="btn-primary shrink-0">
        Review →
      </button>
    </div>
  )
}

function ReviewDrawer({ doc, template, onClose, onApprove, onRequestChanges, changeNote, setChangeNote, canAct }) {
  const body = renderBody(template.body, doc.values)
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-panel flex flex-col animate-slideIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-teal-600">Review draft</div>
            <h3 className="text-lg font-extrabold text-indigo-900">{doc.title}</h3>
          </div>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0 rounded-full">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-slim p-5 space-y-4">
          {/* Explainability */}
          <div className="rounded-lg bg-indigo-800/5 border border-indigo-600/20 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> What the copilot generated & why
            </div>
            <p className="text-sm text-ink-700 mt-2 leading-relaxed">{doc.explain}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {doc.sources.map((s) => (
                <span key={s} className="chip bg-teal-500/15 text-teal-700">{getSource(s)?.ref}</span>
              ))}
            </div>
          </div>

          {/* Rendered document */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-2">Generated document</div>
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-ink-900 bg-ink-100/60 border border-ink-300 rounded-lg p-4">
{body}
            </pre>
          </div>

          {canAct && (
            <div>
              <label className="field-label">Note (required only if requesting changes)</label>
              <textarea
                rows={2}
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="e.g. Correct the guardian name and re-verify income slab."
                className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          )}
        </div>

        {/* Action bar — the gate */}
        <div className="border-t border-ink-100 p-4">
          {canAct ? (
            <div className="flex items-center gap-3">
              <button onClick={onRequestChanges} className="btn-ghost flex-1">Request changes</button>
              <button onClick={onApprove} className="btn-teal flex-1">
                <CheckIcon /> Approve & issue
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-ink-500">This document has already been actioned.</div>
          )}
          <p className="text-[11px] text-ink-500 text-center mt-2">
            Approving writes an immutable audit entry citing {doc.sources.map((s) => getSource(s)?.ref).join(', ')}.
          </p>
        </div>
      </div>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
