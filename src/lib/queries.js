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
  routes: ['routes'],
  deptQueue: (id) => ['deptQueue', id],
}

// ---- Queries ----
export const useCases = () => useQuery({ queryKey: keys.cases, queryFn: api.getCases })
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.getTemplates })
export const useWorkflows = () => useQuery({ queryKey: keys.workflows, queryFn: api.getWorkflows })
export const useAudit = () => useQuery({ queryKey: keys.audit, queryFn: api.getAudit })
export const useAnalytics = () => useQuery({ queryKey: keys.analytics, queryFn: api.getAnalytics })
export const useSchemes = () => useQuery({ queryKey: keys.schemes, queryFn: api.getSchemes })

// Multi-department workflow reads. Queues poll so pending/overdue counts stay fresh.
export const useDepartments = () => useQuery({ queryKey: keys.departments, queryFn: api.getDepartments })
export const useRoutes = () => useQuery({ queryKey: keys.routes, queryFn: api.getRoutes })
export const useDeptQueue = (id, enabled = true) =>
  useQuery({
    queryKey: keys.deptQueue(id),
    queryFn: () => api.getDepartmentQueue(id),
    enabled: enabled && id != null,
    refetchInterval: 15_000,
  })

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

// ---- Multi-department routing mutations ----
// A completed queue item auto-advances its case, so these refresh cases,
// every department queue (prefix key ['deptQueue']), audit and analytics.
const ROUTING_KEYS = [keys.cases, keys.departments, ['deptQueue'], keys.audit, keys.analytics]

export function useStartQueueItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ deptId, queueId }) => api.startQueueItem(deptId, queueId),
    onSuccess: () => invalidate(...ROUTING_KEYS),
  })
}

export function useCompleteQueueItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ deptId, queueId }) => api.completeQueueItem(deptId, queueId),
    onSuccess: () => invalidate(...ROUTING_KEYS),
  })
}

export function useAssignRoute() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, routeId, actor }) => api.assignRoute(id, routeId, actor),
    onSuccess: () => invalidate(...ROUTING_KEYS),
  })
}

export function useRouteNext() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id }) => api.routeNextCase(id),
    onSuccess: () => invalidate(...ROUTING_KEYS),
  })
}

export function useCreateRoutedCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body) => api.createRoutedCase(body),
    onSuccess: () => invalidate(...ROUTING_KEYS),
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
