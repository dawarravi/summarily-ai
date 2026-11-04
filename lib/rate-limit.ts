import 'server-only'
import { NextResponse } from 'next/server'

/**
 * Best-effort, in-memory fixed-window rate limiter keyed by client IP.
 *
 * Each serverless instance keeps its own counters, so this bounds abuse per
 * instance rather than globally. For production, pair it with a Vercel WAF
 * rate-limit rule (or a shared store such as Redis) on /api/*.
 */
const windows = new Map<string, { count: number; resetAt: number }>()

export function clientIp(request: Request): string {
    // On Vercel, x-forwarded-for is set by the platform and not client-controlled.
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * Returns a 429 response when the caller is over the limit, otherwise null.
 */
export function rateLimit(
    request: Request,
    bucket: string,
    { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
    const key = `${bucket}:${clientIp(request)}`
    const now = Date.now()
    const entry = windows.get(key)

    if (!entry || entry.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs })
        if (windows.size > 10_000) {
            for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k)
        }
        return null
    }

    entry.count++
    if (entry.count <= limit) return null

    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
}
