/**
 * Models exposed in the UI. Requests are routed through Vercel AI Gateway,
 * so a single model string selects provider + model.
 *
 * This is an allowlist: API routes reject any model not listed here, which
 * keeps a public deployment from being used to call expensive models.
 *
 * All four are available on AI Gateway's free tier, so the public demo runs
 * on the monthly free credits. Teams with paid credits can add models such as
 * 'anthropic/claude-haiku-5.5' here.
 */
export const MODELS = [
    { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'mistral/mistral-small', label: 'Mistral Small' },
    { id: 'openai/gpt-oss-120b', label: 'gpt-oss-120b (open weights)' },
] as const

export type ModelId = (typeof MODELS)[number]['id']

export const DEFAULT_MODEL: ModelId = 'google/gemini-2.5-flash-lite'

export function isAllowedModel(id: unknown): id is ModelId {
    return typeof id === 'string' && MODELS.some(m => m.id === id)
}

export function modelLabel(id: string): string {
    return MODELS.find(m => m.id === id)?.label ?? id
}
