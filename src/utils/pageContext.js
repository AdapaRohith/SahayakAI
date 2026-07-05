// ---------------------------------------------------------------------------
// Page-context collection for the AI Voice Guide.
//
// Reads the live DOM to describe what the user is currently looking at — the
// page, nav items, buttons and forms — and hands the guide a small vocabulary of
// slugs it may highlight. The SAME slug logic resolves a returned target back
// to a DOM element, so highlighting stays consistent with what the model was told.
// ---------------------------------------------------------------------------

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()

// Collect navigable anchors (top nav) with a stable slug per item.
function collectNav() {
  const anchors = Array.from(document.querySelectorAll('header a[href]'))
  const seen = new Set()
  const items = []
  for (const a of anchors) {
    const label = clean(a.textContent)
    if (!label) continue
    let path = a.getAttribute('href') || ''
    try {
      path = new URL(a.href, window.location.origin).pathname
    } catch {
      /* keep raw href */
    }
    const slug = slugify(label)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    items.push({ label, slug, path })
  }
  return items
}

// Collect visible buttons (nav + main content), de-duplicated by slug.
function collectButtons() {
  const btns = Array.from(document.querySelectorAll('header button, main button'))
  const seen = new Set()
  const items = []
  for (const b of btns) {
    const label = clean(b.textContent) || clean(b.getAttribute('aria-label'))
    if (!label) continue
    const slug = slugify(label)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    items.push({ label, slug })
    if (items.length >= 40) break
  }
  return items
}

// Describe visible forms by their field labels/placeholders.
function collectForms() {
  const forms = Array.from(document.querySelectorAll('main form'))
  return forms.slice(0, 6).map((form) => {
    const fields = Array.from(form.querySelectorAll('input, select, textarea'))
      .map((el) => clean(el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.getAttribute('name')))
      .filter(Boolean)
      .slice(0, 12)
    return { fields }
  })
}

// Heading text gives the model a human-readable sense of the current screen.
function currentHeading() {
  const h = document.querySelector('main h1, main h2')
  return clean(h?.textContent)
}

export function getPageContext() {
  return {
    page: currentHeading() || document.title || window.location.pathname,
    url: window.location.href,
    path: window.location.pathname,
    navItems: collectNav(),
    buttons: collectButtons(),
    forms: collectForms(),
  }
}

// Resolve a guide "target" slug back to a DOM element, trying the most
// specific matches first. Returns an Element or null.
export function resolveTarget(target) {
  if (!target) return null
  const want = slugify(target)
  if (!want) return null

  // 1) Explicit opt-in hook, if a screen exposes one.
  const explicit = document.querySelector(`[data-guide-target="${want}"]`)
  if (explicit) return explicit

  // 2) Nav anchor whose label slug matches (or whose path ends with the slug).
  for (const a of document.querySelectorAll('header a[href]')) {
    const label = clean(a.textContent)
    let path = ''
    try {
      path = new URL(a.href, window.location.origin).pathname
    } catch {
      /* noop */
    }
    if (slugify(label) === want || slugify(path) === want || path.replace(/^\//, '') === want) {
      return a
    }
  }

  // 3) Any button whose label slug matches.
  for (const b of document.querySelectorAll('header button, main button')) {
    const label = clean(b.textContent) || clean(b.getAttribute('aria-label'))
    if (slugify(label) === want) return b
  }

  return null
}
