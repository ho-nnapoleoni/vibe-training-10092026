import { calculateFinancialImpact } from '../src/financial-impact.js'
import type { FinancialImpact, FinancialImpactResult, ImpactAssessment, ServiceDetail } from '../src/types.js'

interface MistralResponse {
  choices?: { message?: { content?: string } }[]
}

function localNarrative(detail: ServiceDetail, impact: ImpactAssessment, estimate: FinancialImpact): Pick<FinancialImpactResult, 'recommendation' | 'explanation'> {
  if (impact.status !== 'AFFECTED') {
    return {
      recommendation: 'No financial rerouting action is required for the current scenario.',
      explanation: 'The selected service has no confirmed exposure to an active chokepoint.',
    }
  }
  return {
    recommendation: `[PROPOSAL] Review the ${impact.alternateRoute} option with finance and operations before execution.`,
    explanation: `${detail.code} has an estimated ${impact.additionalDays ?? 0}-day delay. The estimate combines vessel, fuel, route fee and commercial delay assumptions.`,
  }
}

function parseNarrative(payload: MistralResponse) {
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('Mistral returned an empty response')
  const parsed = JSON.parse(content) as { recommendation?: unknown; explanation?: unknown }
  if (typeof parsed.recommendation !== 'string' || typeof parsed.explanation !== 'string') throw new Error('Mistral returned an invalid response')
  return { recommendation: parsed.recommendation.slice(0, 600), explanation: parsed.explanation.slice(0, 1_000) }
}

export async function buildFinancialImpactResult(
  detail: ServiceDetail,
  impact: ImpactAssessment,
  options: { apiKey?: string; model?: string; baseUrl?: string; timeoutMs?: number; divertedVesselCount?: number } = {},
): Promise<FinancialImpactResult> {
  const estimate = calculateFinancialImpact(detail, impact, options.divertedVesselCount)
  const fallback = localNarrative(detail, impact, estimate)
  if (!options.apiKey || impact.status !== 'AFFECTED') return { ...estimate, ...fallback, source: 'local' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000)
  try {
    const response = await fetch(`${options.baseUrl ?? 'https://api.mistral.ai/v1'}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model ?? 'mistral-small-latest',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a maritime financial risk assistant. Return strict JSON with recommendation and explanation strings. Never change, recalculate, or invent monetary values. Mark advice as a proposal requiring human approval.',
          },
          {
            role: 'user',
            content: JSON.stringify({ service: detail.code, criticality: detail.criticality, fleetSize: detail.fleet.length, impact, estimate }),
          },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Mistral responded ${response.status}`)
    const narrative = parseNarrative(await response.json() as MistralResponse)
    return { ...estimate, ...narrative, source: 'mistral' }
  } catch {
    return { ...estimate, ...fallback, source: 'local' }
  } finally {
    clearTimeout(timer)
  }
}