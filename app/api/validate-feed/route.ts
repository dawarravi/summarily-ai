import { NextResponse } from 'next/server'
import { z } from 'zod'
import { FeedError, fetchFeed } from '@/lib/feeds'
import { rateLimit } from '@/lib/rate-limit'
import { UnsafeUrlError } from '@/lib/url-guard'

const bodySchema = z.object({ url: z.string().max(2_000) })

export async function POST(request: Request) {
    const limited = rateLimit(request, 'validate-feed', { limit: 20, windowMs: 60_000 })
    if (limited) return limited

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try {
        const feed = await fetchFeed(parsed.data.url)
        return NextResponse.json({
            success: true,
            title: (typeof feed.title === 'string' && feed.title.trim()) || 'Untitled feed',
            description: typeof feed.description === 'string' ? feed.description : '',
            itemCount: feed.items.length,
        })
    } catch (error) {
        // Only surface messages we wrote ourselves; everything else is generic.
        const message =
            error instanceof UnsafeUrlError || error instanceof FeedError
                ? error.message
                : 'Could not reach that URL or it is not a valid RSS/Atom feed'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
