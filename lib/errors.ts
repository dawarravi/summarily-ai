/**
 * AI SDK hooks surface non-2xx responses as an Error whose message is the
 * response body. Our routes return `{ error: string }`, so unwrap that and
 * fall back to a generic message rather than showing raw server output.
 */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (!(error instanceof Error)) return fallback
    try {
        const parsed = JSON.parse(error.message)
        if (typeof parsed?.error === 'string') return parsed.error
    } catch {
        // not JSON
    }
    return fallback
}
