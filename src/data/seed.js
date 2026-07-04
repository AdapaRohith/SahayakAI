// ---------------------------------------------------------------------------
// Seed data for SahayakAI. Everything lives in memory (no localStorage).
// generateSeed() is called once on load so timestamps are relative to "now"
// and the SLA board is genuinely alive (one case already breached, others
// counting down).
// ---------------------------------------------------------------------------
import { shortHash } from '../lib/utils.js'

// ---- 6 statute / circular sources used for grounded citations ----
export const SOURCES = [
  {
    id: 'SRC-01',
    ref: 'RTI Act, 2005 · §7(1)',
    title: 'Right to Information Act, 2005 — Disposal of Request',
    authority: 'Dept. of Personnel & Training, Govt. of India',
    year: 2005,
    excerpt:
      'A Public Information Officer shall, on receipt of a request, provide the information within thirty days of the receipt of the request; where it concerns the life or liberty of a person, within forty-eight hours.',
    tags: ['rti', 'timelines', 'grievance'],
  },
  {
    id: 'SRC-02',
    ref: 'TS Revenue Circular No. 14/2023 · §4',
    title: 'Issuance of Income Certificates — Standard Operating Procedure',
    authority: 'Commissioner of Revenue, Govt. of Telangana',
    year: 2023,
    excerpt:
      'Income certificates shall be issued within 7 working days of application through MeeSeva. The certifying officer must verify the annual family income against the declared threshold of ₹2,00,000 for BC/EWS category benefits.',
    tags: ['income-certificate', 'revenue', 'meeseva'],
  },
  {
    id: 'SRC-03',
    ref: 'NFSA, 2013 · §3 & Schedule I',
    title: 'National Food Security Act, 2013 — Ration Card Entitlements',
    authority: 'Dept. of Food & Public Distribution, Govt. of India',
    year: 2013,
    excerpt:
      'Priority households are entitled to 5 kg of foodgrains per person per month at subsidised prices. Antyodaya Anna Yojana households are entitled to 35 kg per household per month.',
    tags: ['ration-card', 'food-security', 'pds'],
  },
  {
    id: 'SRC-04',
    ref: 'CPGRAMS Guidelines, 2022 · Cl. 4.2',
    title: 'Grievance Redress — Timelines & Escalation Matrix',
    authority: 'Dept. of Administrative Reforms & Public Grievances',
    year: 2022,
    excerpt:
      'Every grievance shall be redressed within a maximum of 30 days. If disposal is not possible within the timeline, an interim reply with reasons shall be issued and the matter escalated to the next higher authority.',
    tags: ['grievance', 'timelines', 'escalation'],
  },
  {
    id: 'SRC-05',
    ref: 'TS ROR Act, 1971 · §5A',
    title: 'Telangana Rights in Land & Pattadar Pass Books Act — Record Correction',
    authority: 'Chief Commissioner of Land Administration, Telangana',
    year: 1971,
    excerpt:
      'Corrections to the Record of Rights on account of clerical or factual error may be carried out by the Tahsildar after due notice to interested parties, and shall be entered in the revenue record within the prescribed period.',
    tags: ['land-record', 'revenue', 'correction'],
  },
  {
    id: 'SRC-06',
    ref: 'Aadhaar (Enrolment & Update) Regulations, 2016 · Reg. 14',
    title: 'Aadhaar — Demographic Update Procedure',
    authority: 'Unique Identification Authority of India (UIDAI)',
    year: 2016,
    excerpt:
      'A resident may update demographic information (name, address, date of birth, gender) by submitting supporting documents. Address updates may be self-attested with a valid Proof of Address as listed in the supporting document schedule.',
    tags: ['aadhaar', 'update', 'identity'],
  },
]

const sourceById = Object.fromEntries(SOURCES.map((s) => [s.id, s]))
export const getSource = (id) => sourceById[id]

// ---- Assistant knowledge base: grounded Q&A + one deliberately UNVERIFIED ----
// Each answer's claims map to source ids. `grounded:false` triggers the refusal
// UI ("Unverified — not issued as official guidance").
export const KB = [
  {
    id: 'KB-01',
    match: ['income certificate', 'income', 'meeseva certificate'],
    grounded: true,
    q: {
      en: 'How long does an income certificate take?',
      hi: 'आय प्रमाण पत्र में कितना समय लगता है?',
      te: 'ఆదాయ ధృవీకరణ పత్రానికి ఎంత సమయం పడుతుంది?',
    },
    answer: {
      en: 'An income certificate is issued within 7 working days of application through MeeSeva.[1] The annual family income is verified against a threshold of ₹2,00,000 for BC/EWS category benefits.[1]',
      hi: 'आय प्रमाण पत्र MeeSeva के माध्यम से आवेदन के 7 कार्य दिवसों के भीतर जारी किया जाता है।[1] BC/EWS श्रेणी के लाभों के लिए वार्षिक पारिवारिक आय ₹2,00,000 की सीमा के विरुद्ध सत्यापित की जाती है।[1]',
      te: 'ఆదాయ ధృవీకరణ పత్రం MeeSeva ద్వారా దరఖాస్తు చేసిన 7 పని దినాల్లోపు జారీ చేయబడుతుంది.[1] BC/EWS వర్గ ప్రయోజనాల కోసం వార్షిక కుటుంబ ఆదాయం ₹2,00,000 పరిమితితో సరిపోల్చి ధృవీకరించబడుతుంది.[1]',
    },
    citations: ['SRC-02'],
  },
  {
    id: 'KB-02',
    match: ['ration card', 'ration', 'foodgrain', 'nfsa', 'pds'],
    grounded: true,
    q: {
      en: 'What am I entitled to under a ration card?',
      hi: 'राशन कार्ड के तहत मुझे क्या मिलता है?',
      te: 'రేషన్ కార్డు కింద నాకు ఏమి లభిస్తుంది?',
    },
    answer: {
      en: 'Priority households receive 5 kg of foodgrains per person per month at subsidised prices.[1] Antyodaya Anna Yojana households receive 35 kg per household per month.[1]',
      hi: 'प्राथमिकता वाले परिवारों को प्रति व्यक्ति प्रति माह 5 किलो अनाज सब्सिडी दरों पर मिलता है।[1] अंत्योदय अन्न योजना परिवारों को प्रति परिवार प्रति माह 35 किलो मिलता है।[1]',
      te: 'ప్రాధాన్యత కుటుంబాలకు నెలకు ఒక్కో వ్యక్తికి 5 కిలోల ఆహారధాన్యాలు రాయితీ ధరలో లభిస్తాయి.[1] అంత్యోదయ అన్న యోజన కుటుంబాలకు నెలకు కుటుంబానికి 35 కిలోలు లభిస్తాయి.[1]',
    },
    citations: ['SRC-03'],
  },
  {
    id: 'KB-03',
    match: ['rti', 'right to information', 'how long', 'reply', 'application time'],
    grounded: true,
    q: {
      en: 'How long does an RTI reply take?',
      hi: 'RTI का उत्तर आने में कितना समय लगता है?',
      te: 'RTI సమాధానం రావడానికి ఎంత సమయం పడుతుంది?',
    },
    answer: {
      en: 'The Public Information Officer must provide the information within 30 days of receiving the request.[1] Where the request concerns the life or liberty of a person, it must be provided within 48 hours.[1]',
      hi: 'लोक सूचना अधिकारी को अनुरोध प्राप्त होने के 30 दिनों के भीतर जानकारी देनी होगी।[1] यदि अनुरोध किसी व्यक्ति के जीवन या स्वतंत्रता से संबंधित है, तो इसे 48 घंटों के भीतर देना होगा।[1]',
      te: 'పబ్లిక్ ఇన్ఫర్మేషన్ ఆఫీసర్ అభ్యర్థన అందిన 30 రోజుల్లోపు సమాచారం అందించాలి.[1] అభ్యర్థన ఒక వ్యక్తి జీవితం లేదా స్వేచ్ఛకు సంబంధించినది అయితే, 48 గంటల్లోపు అందించాలి.[1]',
    },
    citations: ['SRC-01'],
  },
  {
    id: 'KB-04',
    match: ['land record', 'correction', 'pattadar', 'ror', 'record of rights'],
    grounded: true,
    q: {
      en: 'How do I correct an error in my land record?',
      hi: 'मैं अपने भूमि रिकॉर्ड में त्रुटि कैसे सुधारूं?',
      te: 'నా భూమి రికార్డులో పొరపాటును ఎలా సరిదిద్దాలి?',
    },
    answer: {
      en: 'Clerical or factual errors in the Record of Rights may be corrected by the Tahsildar after due notice to interested parties.[1] The correction is then entered into the revenue record within the prescribed period.[1]',
      hi: 'रिकॉर्ड ऑफ राइट्स में लिपिकीय या तथ्यात्मक त्रुटियों को इच्छुक पक्षों को उचित सूचना के बाद तहसीलदार द्वारा ठीक किया जा सकता है।[1] सुधार फिर निर्धारित अवधि के भीतर राजस्व रिकॉर्ड में दर्ज किया जाता है।[1]',
      te: 'రికార్డ్ ఆఫ్ రైట్స్‌లో లిపిక లేదా వాస్తవ పొరపాట్లను సంబంధిత పక్షాలకు తగిన నోటీసు తర్వాత తహసీల్దార్ సరిదిద్దవచ్చు.[1] ఆ దిద్దుబాటు నిర్దేశిత వ్యవధిలో రెవెన్యూ రికార్డులో నమోదు చేయబడుతుంది.[1]',
    },
    citations: ['SRC-05'],
  },
  {
    // UNVERIFIED — deliberately ungrounded to demonstrate the refusal behaviour.
    id: 'KB-05',
    match: ['subsidy amount', 'exact subsidy', 'how much money', 'loan waiver', 'scholarship amount'],
    grounded: false,
    q: {
      en: 'What is the exact rupee subsidy I will receive this year?',
      hi: 'इस वर्ष मुझे कितनी सटीक सब्सिडी राशि मिलेगी?',
      te: 'ఈ సంవత్సరం నాకు ఖచ్చితంగా ఎంత సబ్సిడీ మొత్తం లభిస్తుంది?',
    },
    answer: {
      en: "Unverified — I can't ground this in an official source, so I won't state it as fact. The exact rupee amount depends on scheme notifications for the current financial year that are not present in the connected source library.",
      hi: 'सटीक राशि चालू वित्तीय वर्ष की योजना अधिसूचनाओं पर निर्भर करती है जो जुड़े स्रोत पुस्तकालय में मौजूद नहीं हैं। मैं इस आंकड़े को किसी सत्यापित क़ानून या परिपत्र में आधारित नहीं कर सकता।',
      te: 'ఖచ్చితమైన మొత్తం ప్రస్తుత ఆర్థిక సంవత్సర పథక నోటిఫికేషన్లపై ఆధారపడి ఉంటుంది, అవి అనుసంధానించిన మూల గ్రంథాలయంలో లేవు. ఈ సంఖ్యను ధృవీకరించిన చట్టం లేదా సర్క్యులర్‌లో నేను ఆధారం చూపలేను.',
    },
    citations: [],
  },
]

// ---- 4 document templates for the Officer Copilot ----
export const TEMPLATES = [
  {
    id: 'TPL-INC',
    name: 'Income Certificate',
    department: 'Revenue',
    icon: '₹',
    sources: ['SRC-02'],
    summary:
      'Certifies annual family income for BC/EWS benefits. Auto-fills applicant, income and threshold check per Revenue Circular 14/2023.',
    body: `INCOME CERTIFICATE
Government of Telangana · Revenue Department (MeeSeva)

Certificate No: {{certNo}}
Date of Issue: {{issueDate}}

This is to certify that {{applicantName}}, {{relation}} of {{guardianName}},
resident of {{address}}, District {{district}}, has a declared total annual
family income of ₹{{annualIncome}} (Rupees {{annualIncomeWords}} only) for the
financial year {{fy}}.

The applicant's income is {{thresholdResult}} the prescribed threshold of
₹2,00,000 for BC/EWS category benefits, as verified under TS Revenue
Circular No. 14/2023.

Issued after due verification of records.

Certifying Officer: {{officerName}}
Designation: Tahsildar
Seal & Signature`,
    fields: ['certNo', 'issueDate', 'applicantName', 'relation', 'guardianName', 'address', 'district', 'annualIncome', 'fy'],
  },
  {
    id: 'TPL-GRV',
    name: 'Grievance Response',
    department: 'Public Grievances',
    icon: '✉',
    sources: ['SRC-04', 'SRC-01'],
    summary:
      'Formal reply to a citizen grievance with redress action and statutory timeline reference per CPGRAMS Cl. 4.2.',
    body: `GRIEVANCE REDRESSAL — OFFICIAL RESPONSE
Government of Telangana · {{department}}

Grievance Ref: {{grievanceRef}}
Date: {{issueDate}}

Dear {{applicantName}},

With reference to your grievance dated {{filedDate}} regarding
"{{grievanceSubject}}", we have examined the matter.

Action taken: {{actionTaken}}

This grievance has been redressed within the 30-day timeline mandated under
CPGRAMS Guidelines 2022, Clause 4.2. Should you remain dissatisfied, you may
escalate to the next higher authority.

Redressal Officer: {{officerName}}
Designation: Grievance Redressal Officer`,
    fields: ['grievanceRef', 'issueDate', 'applicantName', 'filedDate', 'grievanceSubject', 'actionTaken', 'department'],
  },
  {
    id: 'TPL-RAT',
    name: 'Ration Card Eligibility Notice',
    department: 'Civil Supplies',
    icon: '🌾',
    sources: ['SRC-03'],
    summary:
      'Notice confirming ration card category and monthly foodgrain entitlement per NFSA 2013, Schedule I.',
    body: `RATION CARD ELIGIBILITY NOTICE
Government of Telangana · Civil Supplies Department

Ref: {{ref}}
Date: {{issueDate}}

Dear {{applicantName}},

Based on the verification of your application, your household has been
classified as: {{category}}.

Monthly entitlement: {{entitlement}}, at subsidised prices under the National
Food Security Act, 2013 (Schedule I).

Card No: {{cardNo}}. Please collect your ration from the designated Fair Price
Shop: {{fpsName}}.

Issuing Officer: {{officerName}}
Designation: Deputy Tahsildar (Civil Supplies)`,
    fields: ['ref', 'issueDate', 'applicantName', 'category', 'entitlement', 'cardNo', 'fpsName'],
  },
  {
    id: 'TPL-NOT',
    name: 'General Notice',
    department: 'Administration',
    icon: '📄',
    sources: ['SRC-01'],
    summary:
      'A general-purpose official notice/intimation to a citizen with a statutory response window.',
    body: `OFFICIAL NOTICE
Government of Telangana · {{department}}

Notice No: {{noticeNo}}
Date: {{issueDate}}

To: {{applicantName}}, {{address}}

Subject: {{subject}}

{{noticeBody}}

You are requested to respond within {{responseDays}} days of receipt of this
notice. Failure to respond may result in the matter being decided ex-parte.

Issuing Authority: {{officerName}}
Designation: {{designation}}`,
    fields: ['noticeNo', 'issueDate', 'applicantName', 'address', 'subject', 'noticeBody', 'responseDays', 'department'],
  },
]

export const DEPARTMENTS = [
  'Revenue',
  'Civil Supplies',
  'Social Welfare',
  'Public Grievances',
  'Municipal Administration',
  'Panchayat Raj',
]

// Routing rules: keyword -> department. Used by the workflow board.
export const ROUTING_RULES = [
  { keywords: ['income', 'land', 'pattadar', 'ror', 'certificate', 'caste'], department: 'Revenue' },
  { keywords: ['ration', 'foodgrain', 'pds', 'fair price'], department: 'Civil Supplies' },
  { keywords: ['pension', 'scholarship', 'disability', 'welfare'], department: 'Social Welfare' },
  { keywords: ['grievance', 'complaint', 'delay', 'corruption'], department: 'Public Grievances' },
  { keywords: ['water', 'drainage', 'road', 'property tax', 'trade licence'], department: 'Municipal Administration' },
  { keywords: ['panchayat', 'village', 'rural', 'nrega'], department: 'Panchayat Raj' },
]

export function routeDepartment(text) {
  const t = text.toLowerCase()
  for (const rule of ROUTING_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.department
  }
  return 'Public Grievances'
}

export const OFFICERS = [
  'K. Ramesh (Tahsildar)',
  'S. Lakshmi (Dy. Tahsildar)',
  'A. Prasad (GRO)',
  'M. Fatima (Welfare Officer)',
]

// ---------------------------------------------------------------------------
// generateSeed() — produces the initial in-memory store.
// Timestamps are relative to load time so the board is live immediately.
// ---------------------------------------------------------------------------
export function generateSeed() {
  const now = Date.now()
  const h = (n) => new Date(now + n * 3_600_000).toISOString() // hours from now
  const ago = (n) => new Date(now - n * 3_600_000).toISOString()

  // ---- 8 citizen cases, mixed statuses, one already SLA-breached ----
  const rawCases = [
    {
      title: 'Income certificate for college scholarship',
      citizen: 'Anitha Reddy',
      summary: 'Applicant requests income certificate to claim EWS scholarship.',
      status: 'In Progress',
      priority: 'Normal',
      slaHours: 168, // 7 working days
      createdOffset: -20,
      routeText: 'income certificate scholarship',
    },
    {
      title: 'Ration card not showing foodgrain entitlement',
      citizen: 'Mohd. Imran',
      summary: 'Priority household ration card active but PDS entitlement missing.',
      status: 'In Progress',
      priority: 'High',
      slaHours: 72,
      createdOffset: -66, // breached (66h elapsed of 72? -> still 6h left). make it breach:
      routeText: 'ration card foodgrain pds',
    },
    {
      title: 'Correction of father name in land record (ROR)',
      citizen: 'V. Nageswara Rao',
      summary: 'Clerical error in pattadar pass book; requests ROR correction.',
      status: 'Breached',
      priority: 'High',
      slaHours: 96,
      createdOffset: -120, // definitively breached
      routeText: 'land record pattadar ror correction',
    },
    {
      title: 'Grievance: delayed water connection sanction',
      citizen: 'Sunita Devi',
      summary: 'Complaint about 3-month delay in new water connection approval.',
      status: 'In Progress',
      priority: 'Normal',
      slaHours: 720, // 30 days
      createdOffset: -48,
      routeText: 'grievance water connection delay',
    },
    {
      title: 'Disability pension application review',
      citizen: 'G. Srinivasulu',
      summary: 'Fresh application for monthly disability pension under welfare scheme.',
      status: 'Pending Approval',
      priority: 'Normal',
      slaHours: 240,
      createdOffset: -30,
      routeText: 'pension disability welfare',
    },
    {
      title: 'Property tax reassessment request',
      citizen: 'Ramesh Kumar',
      summary: 'Owner disputes reassessed property tax for FY 2026-27.',
      status: 'Resolved',
      priority: 'Low',
      slaHours: 336,
      createdOffset: -300,
      routeText: 'property tax municipal reassessment',
    },
    {
      title: 'Caste certificate for BC-B category',
      citizen: 'P. Yadamma',
      summary: 'Requests caste certificate to avail reservation benefits.',
      status: 'Resolved',
      priority: 'Normal',
      slaHours: 168,
      createdOffset: -260,
      routeText: 'caste certificate revenue',
    },
    {
      title: 'NREGA wage payment delay complaint',
      citizen: 'L. Bhoomaiah',
      summary: 'Rural worker reports 40-day delay in NREGA wage credit.',
      status: 'In Progress',
      priority: 'High',
      slaHours: 120,
      createdOffset: -12,
      routeText: 'panchayat nrega rural wage delay',
    },
  ]

  const cases = rawCases.map((c, i) => {
    const createdAt = ago(-c.createdOffset) // createdOffset is negative hours-ago
    const created = new Date(now + c.createdOffset * 3_600_000).toISOString()
    const deadline = new Date(new Date(created).getTime() + c.slaHours * 3_600_000).toISOString()
    const breachedByTime = new Date(deadline).getTime() <= now
    // Reconcile declared status with time: a timed-out open case is Breached.
    let status = c.status
    if (breachedByTime && ['In Progress', 'Pending Approval'].includes(status)) {
      status = 'Breached'
    }
    return {
      id: `CASE-${String(i + 1).padStart(3, '0')}`,
      title: c.title,
      citizen: c.citizen,
      summary: c.summary,
      status,
      priority: c.priority,
      department: routeDepartment(c.routeText),
      createdAt: created,
      slaHours: c.slaHours,
      slaDeadline: deadline,
      escalated: status === 'Breached',
      escalationTier: status === 'Breached' ? 'Supervisor' : null,
      routeText: c.routeText,
    }
  })

  // ---- 12 audit-log entries (append-only), hash-chained ----
  const auditSpecs = [
    { at: ago(300), actor: 'AI · SahayakAI', action: 'query_answered', summary: 'Answered citizen query on caste certificate procedure', sources: ['SRC-05'], meta: { verified: true } },
    { at: ago(262), actor: 'K. Ramesh (Tahsildar)', action: 'doc_approved', summary: 'Approved & issued Caste Certificate for P. Yadamma', sources: ['SRC-05'], meta: { doc: 'Caste Certificate' } },
    { at: ago(305), actor: 'AI · SahayakAI', action: 'case_routed', summary: 'Auto-routed "Property tax reassessment" → Municipal Administration', sources: [], meta: {} },
    { at: ago(120), actor: 'AI · SahayakAI', action: 'sla_escalated', summary: 'SLA breached on CASE-003 (ROR correction) — escalated to Supervisor', sources: ['SRC-05'], meta: { case: 'CASE-003' } },
    { at: ago(66), actor: 'AI · SahayakAI', action: 'query_answered', summary: 'Answered citizen query on ration card entitlements', sources: ['SRC-03'], meta: { verified: true } },
    { at: ago(48), actor: 'AI · SahayakAI', action: 'query_flagged', summary: 'Flagged UNVERIFIED: exact rupee subsidy amount — not grounded in any source', sources: [], meta: { verified: false } },
    { at: ago(46), actor: 'S. Lakshmi (Dy. Tahsildar)', action: 'doc_drafted', summary: 'AI drafted Income Certificate for Anitha Reddy (pending review)', sources: ['SRC-02'], meta: { doc: 'Income Certificate' } },
    { at: ago(30), actor: 'AI · SahayakAI', action: 'case_routed', summary: 'Auto-routed "Disability pension application" → Social Welfare', sources: [], meta: {} },
    { at: ago(28), actor: 'AI · SahayakAI', action: 'query_answered', summary: 'Answered citizen query on RTI reply timelines', sources: ['SRC-01'], meta: { verified: true } },
    { at: ago(20), actor: 'A. Prasad (GRO)', action: 'doc_requested_changes', summary: 'Requested changes on draft Grievance Response (tone & action detail)', sources: ['SRC-04'], meta: { doc: 'Grievance Response' } },
    { at: ago(12), actor: 'AI · SahayakAI', action: 'case_routed', summary: 'Auto-routed "NREGA wage payment delay" → Panchayat Raj', sources: [], meta: {} },
    { at: ago(2), actor: 'AI · SahayakAI', action: 'query_answered', summary: 'Answered citizen query on land record correction', sources: ['SRC-05'], meta: { verified: true } },
  ]

  let prevHash = 'GENESIS0'
  const audit = auditSpecs.map((s, i) => {
    const id = `AUD-${String(i + 1).padStart(4, '0')}`
    const payload = `${id}|${s.at}|${s.actor}|${s.action}|${s.summary}|${s.sources.join(',')}|${prevHash}`
    const hash = shortHash(payload)
    const entry = { id, timestamp: s.at, actor: s.actor, action: s.action, summary: s.summary, sources: s.sources, meta: s.meta, prevHash, hash }
    prevHash = hash
    return entry
  })

  // ---- one already-issued document + one pending draft ----
  const documents = [
    {
      id: 'DOC-0001',
      templateId: 'TPL-INC',
      templateName: 'Income Certificate',
      caseId: 'CASE-001',
      title: 'Income Certificate — Anitha Reddy',
      status: 'Pending Approval',
      department: 'Revenue',
      createdBy: 'S. Lakshmi (Dy. Tahsildar)',
      createdAt: ago(46),
      sources: ['SRC-02'],
      explain: 'Drafted from the Income Certificate template using CASE-001 data. Income ₹1,80,000 checked against the ₹2,00,000 BC/EWS threshold (Circular 14/2023) → below threshold, eligible.',
      values: {
        certNo: 'INC/2026/00842',
        issueDate: new Date(now - 46 * 3_600_000).toLocaleDateString('en-IN'),
        applicantName: 'Anitha Reddy',
        relation: 'D/o',
        guardianName: 'A. Venkat Reddy',
        address: 'H.No 4-21, Kukatpally',
        district: 'Medchal-Malkajgiri',
        annualIncome: '1,80,000',
        fy: '2025-26',
        annualIncomeWords: 'One Lakh Eighty Thousand',
        thresholdResult: 'below',
        officerName: 'K. Ramesh',
      },
    },
    {
      id: 'DOC-0002',
      templateId: 'TPL-RAT',
      templateName: 'Ration Card Eligibility Notice',
      caseId: 'CASE-002',
      title: 'Ration Card Eligibility — Mohd. Imran',
      status: 'Issued',
      department: 'Civil Supplies',
      createdBy: 'M. Fatima (Welfare Officer)',
      createdAt: ago(60),
      issuedAt: ago(58),
      sources: ['SRC-03'],
      explain: 'Drafted from the Ration Card template using CASE-002 data. Classified Priority Household → 5 kg/person/month per NFSA Schedule I. Approved and issued.',
      values: {
        ref: 'CS/RC/2026/1199',
        issueDate: new Date(now - 58 * 3_600_000).toLocaleDateString('en-IN'),
        applicantName: 'Mohd. Imran',
        category: 'Priority Household (PHH)',
        entitlement: '5 kg foodgrains per person per month',
        cardNo: 'TS-RC-2201-004521',
        fpsName: 'FPS #221, Charminar',
        officerName: 'M. Fatima',
      },
    },
  ]

  return { cases, audit, documents, prevHash }
}
