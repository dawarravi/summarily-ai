import type { RssFeed } from './types'

/**
 * Client-side feed persistence. The source of truth is localStorage; when the
 * optional server-side file storage is enabled (local use only), it is kept in
 * sync so the list survives clearing browser data.
 */
const STORAGE_KEY = 'rssFeeds'

/** Shown to first-time visitors so the demo has content immediately. */
export const DEFAULT_FEEDS: RssFeed[] = [
    { id: 'default-vercel', url: 'https://vercel.com/atom', title: 'Vercel News', tags: ['Tech'], dateAdded: '2026-01-01T00:00:00.000Z' },
    { id: 'default-nextjs', url: 'https://nextjs.org/feed.xml', title: 'Next.js Blog', tags: ['Tech'], dateAdded: '2026-01-01T00:00:00.000Z' },
    { id: 'default-react', url: 'https://react.dev/rss.xml', title: 'React Blog', tags: ['Tech'], dateAdded: '2026-01-01T00:00:00.000Z' },
    { id: 'default-simonw', url: 'https://simonwillison.net/atom/everything/', title: 'Simon Willison', tags: ['AI/ML'], dateAdded: '2026-01-01T00:00:00.000Z' },
]

function normalize(raw: unknown): RssFeed[] {
    if (!Array.isArray(raw)) return []
    return raw
        .filter((f): f is Partial<RssFeed> & { id: string; url: string } =>
            typeof f?.id === 'string' && typeof f?.url === 'string')
        .map(f => ({
            id: f.id,
            url: f.url,
            title: f.title ?? f.url,
            description: f.description,
            tags: Array.isArray(f.tags) ? f.tags : [],
            dateAdded: f.dateAdded ?? new Date().toISOString(),
        }))
}

function readLocal(): RssFeed[] | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved === null ? null : normalize(JSON.parse(saved))
    } catch {
        return null
    }
}

function writeLocal(feeds: RssFeed[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds))
    } catch {
        // storage full or blocked: in-memory state still works for this session
    }
}

async function readServer(): Promise<RssFeed[] | null> {
    try {
        const res = await fetch('/api/feeds')
        if (!res.ok) return null
        const data = await res.json()
        const feeds = normalize(data.feeds)
        return feeds.length > 0 ? feeds : null
    } catch {
        return null
    }
}

function writeServer(feeds: RssFeed[]) {
    fetch('/api/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds }),
    }).catch(() => {})
}

export async function loadFeeds(): Promise<RssFeed[]> {
    const server = await readServer()
    if (server) {
        writeLocal(server)
        return server
    }
    const local = readLocal()
    if (local) return local

    // First visit: seed defaults (an explicitly emptied list is respected above).
    writeLocal(DEFAULT_FEEDS)
    return DEFAULT_FEEDS
}

export function saveFeeds(feeds: RssFeed[]) {
    writeLocal(feeds)
    writeServer(feeds)
}
