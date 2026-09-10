import type { Chokepoint, ImpactAssessment, ProformaCall, ServiceSummary } from './types'
import { chokepointById } from './domain/chokepoints'

export function assessImpact(service: ServiceSummary, calls: ProformaCall[], active: Chokepoint[]): ImpactAssessment {
  if (active.length === 0) {
    return { status: 'NOT_AFFECTED', activeChokepoints: [], evidencePorts: [], alternateRoute: 'NONE', confidence: 'NONE', escalation: false, reason: 'Aucun chokepoint n’est ferme.' }
  }

  const matches = active.flatMap((chokepoint) => {
    const rule = chokepointById[chokepoint]
    if (!rule) return []
    return calls.filter((call) => rule.evidencePortCodes.includes(call.port.unLocode)).map((call) => ({ chokepoint, call }))
  })
  if (matches.length === 0) {
    const hasEnoughEvidence = calls.length >= 2 && calls.some((call) => call.port.unLocode)
    return { status: hasEnoughEvidence ? 'NOT_AFFECTED' : 'UNKNOWN', activeChokepoints: [], evidencePorts: [], alternateRoute: 'UNKNOWN', confidence: hasEnoughEvidence ? 'MEDIUM' : 'NONE', escalation: false, reason: hasEnoughEvidence ? `${service.code} ne contient pas d’escale connue dans les zones fermees.` : 'Les escales disponibles ne permettent pas de conclure.' }
  }

  const first = [...matches].sort((a, b) => (a.call.transitTime ?? Number.MAX_SAFE_INTEGER) - (b.call.transitTime ?? Number.MAX_SAFE_INTEGER))[0]
  const chokepoints = [...new Set(matches.map((match) => match.chokepoint))]
  const days = Math.max(...chokepoints.map((chokepoint) => chokepointById[chokepoint].additionalDays))
  const route = chokepoints.length > 1 ? 'Route alternative combinee' : chokepointById[first.chokepoint].alternateRoute
  return {
    status: 'AFFECTED', activeChokepoints: chokepoints, evidencePorts: matches.map((match) => match.call.port), firstAffectedPort: first.call.port,
    alternateRoute: route, additionalDays: days, confidence: 'MEDIUM', escalation: false,
    recommendation: `[PROPOSAL] Etudier un reroutage via ${route}. Validation operations requise.`,
    reason: `Escale detectee a ${first.call.port.name}.`,
  }
}

export function addEscalation(assessments: ImpactAssessment[], criticalCodes: string[]) {
  const affectedCritical = assessments.filter((assessment, index) => assessment.status === 'AFFECTED' && criticalCodes[index])
  const escalation = affectedCritical.length >= 3
  return assessments.map((assessment) => ({ ...assessment, escalation }))
}
