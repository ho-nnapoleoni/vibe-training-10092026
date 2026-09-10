import type { ApiEnvelope, FinancialImpactResult, ProformaCall, ServiceDetail, ServiceDetailResult, ServiceSummary, Vessel } from './types'
import { buildRouteStops, type RoutePaths } from './domain/routing'
import type { ImpactAssessment } from './types'

export class ApiError extends Error {
  constructor(message: string, public readonly retryable = false) { super(message) }
}

export async function request<T>(url: string, signal?: AbortSignal, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(payload?.error?.message ?? 'Service indisponible', payload?.error?.retryable ?? response.status >= 500)
  return payload as T
}

export async function loadServiceDetail(service: ServiceSummary, signal?: AbortSignal): Promise<ServiceDetailResult> {
  const [detailResult, callsResult, fleetResult] = await Promise.allSettled([
    request<Partial<ServiceDetail>>(`/api/services/${encodeURIComponent(service.code)}`, signal),
    request<ApiEnvelope<ProformaCall>>(`/api/services/${encodeURIComponent(service.code)}/proformacalls`, signal),
    request<ApiEnvelope<Vessel>>(`/api/services/${encodeURIComponent(service.code)}/fleet`, signal),
  ])
  if (detailResult.status === 'rejected') throw detailResult.reason
  const detail = detailResult.value
  return {
    detail: {
      ...service,
      ...detail,
      universalServiceReferences: detail.universalServiceReferences ?? [],
      rotationDuration: detail.rotationDuration ?? 0,
      departureDay: detail.departureDay ?? 'Unknown',
      proformaCalls: callsResult.status === 'fulfilled' ? callsResult.value.items : [],
      fleet: fleetResult.status === 'fulfilled' ? fleetResult.value.items : [],
    },
    proformaError: callsResult.status === 'rejected' ? String(callsResult.reason?.message ?? callsResult.reason) : undefined,
    fleetError: fleetResult.status === 'rejected' ? String(fleetResult.reason?.message ?? fleetResult.reason) : undefined,
  }
}

export async function loadMaritimeRoutes(calls: ProformaCall[], impact: ImpactAssessment, signal?: AbortSignal): Promise<RoutePaths> {
  const response = await request<{ paths: [RoutePaths['nominal'], RoutePaths['affected'], RoutePaths['alternate']] }>('/api/routes/maritime', signal, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: buildRouteStops(calls, impact) }),
  })
  const [nominal, affected, alternate] = response.paths
  return { nominal, affected, alternate }
}

export function loadFinancialImpact(detail: ServiceDetail, impact: ImpactAssessment, divertedVesselCount: number, signal?: AbortSignal): Promise<FinancialImpactResult> {
  return request<FinancialImpactResult>('/api/agent/rerouting-cost', signal, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ detail, impact, divertedVesselCount }),
  })
}