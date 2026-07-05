import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api.js'

// ---------------------------------------------------------------------------
// Centralised TanStack Query hooks. Query keys live here so mutations can
// invalidate the right caches (e.g. issuing a document refetches cases + audit).
// ---------------------------------------------------------------------------

export const keys = {
  cases: ['cases'],
  templates: ['templates'],
  workflows: ['workflows'],
  audit: ['audit'],
  analytics: ['analytics'],
  schemes: ['schemes'],
  departments: ['departments'],
  deptQueue: (id) => ['departments', String(id), 'queue'],
  routes: ['routes'],
}

// ---- Queries ----
export const useCases = () => useQuery({ queryKey: keys.cases, queryFn: api.getCases })
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.getTemplates })
export const useWorkflows = () => useQuery({ queryKey: keys.workflows, queryFn: api.getWorkflows })
export const useAudit = () => useQuery({ queryKey: keys.audit, queryFn: api.getAudit })
export const useAnalytics = () => useQuery({ queryKey: keys.analytics, queryFn: api.getAnalytics })
export const useSchemes = () => useQuery({ queryKey: keys.schemes, queryFn: api.getSchemes })

// ---- Multi-department workflow ----
export const useDepartments = () => useQuery({ queryKey: keys.departments, queryFn: api.getDepartments })
export const useDepartmentQueue = (id) =>
  useQuery({ queryKey: keys.deptQueue(id), queryFn: () => api.getDepartmentQueue(id), enabled: id != null })
export const useRoutes = () => useQuery({ queryKey: keys.routes, queryFn: api.getRoutes })

export function useStartQueueItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ deptId, queueId }) => api.startQueueItem(deptId, queueId),
    onSuccess: (_data, { deptId }) => invalidate(keys.deptQueue(deptId), keys.departments, keys.cases, keys.audit),
  })
}

export function useCompleteQueueItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ deptId, queueId }) => api.completeQueueItem(deptId, queueId),
    // Completing auto-advances the case to the next department, so refresh
    // every department queue plus cases + audit.
    onSuccess: () => invalidate(keys.departments, keys.cases, keys.audit),
  })
}

// ---- Mutations ----
function useInvalidate() {
  const qc = useQueryClient()
  return (...ks) => ks.forEach((k) => qc.invalidateQueries({ queryKey: k }))
}

export function useChat() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ query, actor, lang }) => api.chat(query, actor, lang),
    onSuccess: () => invalidate(keys.audit),
  })
}

export function useTranslate() {
  return useMutation({ mutationFn: ({ text, target }) => api.translate(text, target) })
}

export function useExtract() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ docType, file }) => api.extract(docType, file),
    onSuccess: () => invalidate(keys.audit),
  })
}

export function useCreateCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body) => api.createCase(body),
    onSuccess: () => invalidate(keys.cases, keys.audit, keys.analytics),
  })
}

export function useAdvanceCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, actor }) => api.advanceCase(id, actor),
    onSuccess: () => invalidate(keys.cases, keys.audit, keys.analytics),
  })
}

export function useEscalateCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, actor, reason }) => api.escalateCase(id, actor, reason),
    onSuccess: () => invalidate(keys.cases, keys.audit, keys.analytics),
  })
}

export function useDraftDocument() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ caseId, templateId, actor, lang }) => api.draftDocument(caseId, templateId, actor, lang),
    onSuccess: () => invalidate(keys.audit, keys.analytics),
  })
}

export function useSaveDocument() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, content }) => api.saveDocument(id, content),
    onSuccess: () => invalidate(keys.audit),
  })
}

export function useApproveDocument() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, actor }) => api.approveDocument(id, actor),
    onSuccess: () => invalidate(keys.audit, keys.analytics),
  })
}

export function useIssueDocument() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, actor }) => api.issueDocument(id, actor),
    onSuccess: () => invalidate(keys.cases, keys.audit, keys.analytics),
  })
}
