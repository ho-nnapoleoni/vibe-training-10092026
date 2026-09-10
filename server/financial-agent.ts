import { calculateFinancialImpact } from '../src/financial-impact.js'
import type { FinancialAssumptions, FinancialImpact, FinancialImpactResult, FinancialSource, ImpactAssessment, ServiceDetail } from '../src/types.js'

interface MistralConversationResponse {
  outputs?: {
    type?: string
    content?: string | { type?: string; text?: string; title?: string; url?: string }[]
  }[]
}

interface ResearchedBenchmarks {
  assumptions: Omit<FinancialAssumptions, 'currency'>
  recommendation: string
  explanation: string
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

function parseWebResearch(payload: MistralConversationResponse): ResearchedBenchmarks & { sources: FinancialSource[] } {
  const chunks = payload.outputs?.filter((output) => output.type === 'message.output').flatMap((output) => Array.isArray(output.content) ? output.content : [{ type: 'text', text: output.content }]) ?? []
  const text = chunks.filter((chunk) => chunk.type === 'text').map((chunk) => chunk.text ?? '').join('')
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) throw new Error('Mistral returned no benchmark JSON')
  const parsed = JSON.parse(json) as Partial<ResearchedBenchmarks>
  const assumptions = parsed.assumptions
  const valid = assumptions
    && Number.isFinite(assumptions.vesselDailyCost) && assumptions.vesselDailyCost >= 1_000 && assumptions.vesselDailyCost <= 100_000
    && Number.isFinite(assumptions.fuelDailyCost) && assumptions.fuelDailyCost >= 1_000 && assumptions.fuelDailyCost <= 200_000
    && Number.isFinite(assumptions.commercialDelayDailyCost) && assumptions.commercialDelayDailyCost >= 0 && assumptions.commercialDelayDailyCost <= 100_000
    && Number.isFinite(assumptions.routeFees) && assumptions.routeFees >= 0 && assumptions.routeFees <= 1_000_000
    && typeof parsed.recommendation === 'string' && typeof parsed.explanation === 'string'
  if (!valid) throw new Error('Mistral returned invalid benchmark values')
  const sources = chunks
    .filter((chunk) => chunk.type === 'tool_reference' && typeof chunk.url === 'string' && /^https?:\/\//.test(chunk.url))
    .map((chunk) => ({ title: (chunk.title || new URL(chunk.url!).hostname).slice(0, 160), url: chunk.url! }))
    .filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index)
    .slice(0, 8)
  if (sources.length === 0) throw new Error('Mistral returned no web sources')
  return {
    assumptions: assumptions as Omit<FinancialAssumptions, 'currency'>,
    recommendation: parsed.recommendation!.slice(0, 600),
    explanation: parsed.explanation!.slice(0, 1_000),
    sources,
  }
}

export async function buildFinancialImpactResult(
  detail: ServiceDetail,
  impact: ImpactAssessment,
  options: { apiKey?: string; model?: string; baseUrl?: string; timeoutMs?: number; divertedVesselCount?: number } = {},
): Promise<FinancialImpactResult> {
  const localEstimate = calculateFinancialImpact(detail, impact, options.divertedVesselCount)
  const fallback = localNarrative(detail, impact, localEstimate)
  if (!options.apiKey || impact.status !== 'AFFECTED') return { ...localEstimate, ...fallback, source: 'local', sources: [] }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000)
  try {
    const response = await fetch(`${options.baseUrl ?? 'https://api.mistral.ai/v1'}/conversations`, {
      method: 'POST',
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model ?? 'mistral-medium-latest',
        store: false,
        tools: [{ type: 'web_search' }],
        inputs: [
          {
            role: 'user',
            content: `Today is ${new Date().toISOString().slice(0, 10)}. You are a maritime financial research agent. You MUST use web_search now and consult current, credible sources for a container vessel comparable to this service. Find defensible EUR benchmarks for: daily vessel operating cost excluding fuel and charter hire; daily fuel cost based on current bunker price and plausible consumption; incremental alternative-route fees excluding fuel and vessel daily costs (use zero when no evidenced incremental fee exists); and commercial delay cost per vessel-day. Prefer official, industry, or company sources, cross-check values, convert currencies to EUR when needed, and avoid double counting. Context: ${JSON.stringify({ service: detail.code, vessels: detail.fleet.map((vessel) => ({ name: vessel.name, imo: vessel.imo })), criticality: detail.criticality, alternateRoute: impact.alternateRoute, additionalDays: impact.additionalDays })}. Return only one JSON object with this exact shape: {"assumptions":{"vesselDailyCost":number,"fuelDailyCost":number,"commercialDelayDailyCost":number,"routeFees":number},"recommendation":"string","explanation":"string"}. Explain uncertainty and state that human validation is required.`,
          },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Mistral responded ${response.status}`)
    const research = parseWebResearch(await response.json() as MistralConversationResponse)
    const estimate = calculateFinancialImpact(detail, impact, options.divertedVesselCount, research.assumptions)
    return { ...estimate, recommendation: research.recommendation, explanation: research.explanation, sources: research.sources, researchedAt: new Date().toISOString(), source: 'mistral' }
  } catch {
    return { ...localEstimate, ...fallback, source: 'local', sources: [] }
  } finally {
    clearTimeout(timer)
  }
}