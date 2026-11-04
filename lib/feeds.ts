import 'server-only'
import Parser from 'rss-parser'
import { safeFetch } from './safe-fetch'
import type { BlogPost } from './types'

/** How long fetched feeds stay in the Next.js Data Cache (seconds). */
export const FEED_REVALIDATE_SECONDS = 15 * 60
export const POSTS_PER_FEED = 3

type FeedItem = Record<string, unknown> & {
    title?: string
    link?: string
    guid?: string
    pubDate?: string
    isoDate?: string
    content?: string
    contentSnippet?: string
    summary?: string
    description?: string
    'content:encoded'?: string
}

const strictParser: Parser<Record<string, unknown>, FeedItem> = new Parser()

// Lenient parser for feeds with sloppy XML (common with Substack / Medium).
const lenientParser: Parser<Record<string, unknown>, FeedItem> = new Parser({
    xml2js: { strict: false, normalize: true, trim: true, explicitArray: false, mergeAttrs: true },
    customFields: {
        feed: ['subtitle', 'updated', 'author'],
        item: ['summary', 'content:encoded', 'description'],
    },
})

export type ParsedFeed = Awaited<ReturnType<typeof strictParser.parseString>>

export async function parseFeedXml(xml: string): Promise<ParsedFeed> {
    try {
        return await strictParser.parseString(xml)
    } catch {
        return await lenientParser.parseString(xml)
    }
}

/** Fetch (SSRF-safe, cached) and parse a feed URL. */
export async function fetchFeed(url: string): Promise<ParsedFeed> {
    const res = await safeFetch(url, {
        revalidate: FEED_REVALIDATE_SECONDS,
        accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
    })
    if (res.status >= 400) throw new FeedError(`Feed returned HTTP ${res.status}`)
    try {
        return await parseFeedXml(res.text)
    } catch {
        throw new FeedError('URL does not contain a valid RSS or Atom feed')
    }
}

export class FeedError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'FeedError'
    }
}

const ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
}

export function htmlToText(html: string): string {
    return html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, m => ENTITIES[m] ?? m)
        .replace(/\s+/g, ' ')
        .trim()
}

function str(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

/** Normalize the latest items of a parsed feed into BlogPosts. */
export function toPosts(feed: ParsedFeed, source: { id: string; url: string; title?: string }): BlogPost[] {
    const feedTitle = source.title || str(feed.title) || 'Untitled feed'
    return feed.items.slice(0, POSTS_PER_FEED).map(item => {
        const raw =
            str(item['content:encoded']) || str(item.content) || str(item.description) || str(item.summary)
        const content = htmlToText(raw)
        const snippet = htmlToText(str(item.contentSnippet) || str(item.summary) || str(item.description)) ||
            content.slice(0, 500)
        const key = str(item.guid) || str(item.link) || str(item.title)
        return {
            id: `${source.id}-${key}`,
            title: str(item.title) || 'Untitled',
            link: str(item.link),
            content,
            contentSnippet: snippet,
            pubDate: str(item.isoDate) || str(item.pubDate) || new Date(0).toISOString(),
            feedTitle,
            feedUrl: source.url,
        }
    })
}
