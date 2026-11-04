import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchFeed } from '@/lib/feeds'
import { rateLimit } from '@/lib/rate-limit'
import { safeFetch } from '@/lib/safe-fetch'
import type { DiscoveredFeed } from '@/lib/types'

export const maxDuration = 30

const MAX_RESULTS = 3

const COMMON_FEED_PATHS = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml', '/blog/feed', '/blog/rss.xml']

const KNOWN_SITES: Record<string, string> = {
    'hacker news': 'https://hnrss.org/frontpage',
    'dev.to': 'https://dev.to/feed',
    'github blog': 'https://github.blog',
    'vercel blog': 'https://vercel.com',
    'next.js': 'https://nextjs.org',
    'react blog': 'https://react.dev',
    'css-tricks': 'https://css-tricks.com',
    'smashing magazine': 'https://www.smashingmagazine.com',
}

const bodySchema = z.object({ query: z.string().trim().min(1).max(200) })

/** Turn a search term or bare domain into a candidate site URL. */
function toSiteUrl(query: string): string | null {
    if (/^https?:\/\//i.test(query)) return query
    const known = KNOWN_SITES[query.toLowerCase()]
    if (known) return known
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(query)) return `https://${query}`
    return null
}

/** Extract <link rel="alternate" type="application/(rss|atom)+xml"> hrefs. */
function feedLinksFromHtml(html: string, baseUrl: string): string[] {
    const links: string[] = []
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
        if (!/type=["']application\/(rss|atom)\+xml["']/i.test(tag)) continue
        const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
        if (!href) continue
        try {
            links.push(new URL(href, baseUrl).toString())
        } catch {
            // ignore malformed hrefs
        }
    }
    return links
}

async function tryFeed(url: string): Promise<DiscoveredFeed | null> {
    try {
        const feed = await fetchFeed(url)
        if (!feed.title && feed.items.length === 0) return null
        return {
            url,
            title: (typeof feed.title === 'string' && feed.title.trim()) || url,
            description: typeof feed.description === 'string' ? feed.description.trim() : undefined,
        }
    } catch {
        return null
    }
}

export async function POST(request: Request) {
    const limited = rateLimit(request, 'discover-feeds', { limit: 10, windowMs: 60_000 })
    if (limited) return limited

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const siteUrl = toSiteUrl(parsed.data.query)
    if (!siteUrl) {
        return NextResponse.json({ feeds: [], error: 'Enter a domain (e.g. overreacted.io) or a feed URL.' })
    }

    // 1. The URL itself may be a feed.
    const direct = await tryFeed(siteUrl)
    if (direct) return NextResponse.json({ feeds: [direct] })

    // 2. Feeds advertised in the page's <head>.
    let candidates: string[] = []
    try {
        const page = await safeFetch(siteUrl, { accept: 'text/html', maxBytes: 2 * 1024 * 1024 })
        candidates = feedLinksFromHtml(page.text, page.url)
    } catch {
        // fall through to common paths
    }

    // 3. Otherwise probe common feed paths, in parallel.
    if (candidates.length === 0) {
        candidates = COMMON_FEED_PATHS.map(p => new URL(p, siteUrl).toString())
    }

    // Skip per-post comment feeds that many CMSs advertise alongside the main feed.
    const feedUrls = Array.from(new Set(candidates)).filter(u => !/\/comments?\//i.test(u))
    const found = (await Promise.all(feedUrls.slice(0, 10).map(tryFeed))).filter(
        (f): f is DiscoveredFeed => f !== null,
    )

    // De-duplicate feeds that resolve to the same title (e.g. /feed and /feed/).
    const unique = new Map<string, DiscoveredFeed>()
    for (const feed of found) {
        const existing = unique.get(feed.title)
        if (!existing || feed.url.length < existing.url.length) unique.set(feed.title, feed)
    }

    return NextResponse.json({ feeds: Array.from(unique.values()).slice(0, MAX_RESULTS) })
}
