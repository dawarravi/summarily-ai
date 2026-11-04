import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchFeed, toPosts } from '@/lib/feeds'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 30

const bodySchema = z.object({
    feeds: z
        .array(z.object({ id: z.string().max(100), url: z.string().max(2_000), title: z.string().max(500).optional() }))
        .max(50),
})

/**
 * Fetches all feeds in parallel. Each feed response is cached in the Next.js
 * Data Cache (see FEED_REVALIDATE_SECONDS), so repeat loads hit the cache
 * instead of the origin. One failing feed never fails the whole request.
 */
export async function POST(request: Request) {
    const limited = rateLimit(request, 'fetch-blogs', { limit: 30, windowMs: 60_000 })
    if (limited) return limited

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { feeds } = parsed.data

    const results = await Promise.allSettled(feeds.map(async feed => toPosts(await fetchFeed(feed.url), feed)))

    const posts = results
        .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    const failedFeeds = feeds
        .filter((_, i) => results[i].status === 'rejected')
        .map(feed => ({ id: feed.id, url: feed.url }))

    for (const [i, r] of results.entries()) {
        if (r.status === 'rejected') console.warn('feed fetch failed', { url: feeds[i].url, reason: String(r.reason) })
    }

    return NextResponse.json({ posts, failedFeeds })
}
