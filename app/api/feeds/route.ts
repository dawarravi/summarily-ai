import { NextResponse } from 'next/server'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

/**
 * Optional file-backed feed storage for local, single-user use, so a feed list
 * survives clearing browser storage. Disabled unless FEEDS_FILE_STORAGE=true:
 * serverless filesystems are read-only/ephemeral, and this endpoint has no
 * auth, so it must never be enabled on a shared deployment.
 */
const ENABLED = process.env.FEEDS_FILE_STORAGE === 'true'
const FEEDS_FILE = path.join(process.cwd(), 'data', 'feeds.json')

const feedsSchema = z
    .array(
        z.object({
            id: z.string().max(100),
            url: z.string().max(2_000),
            title: z.string().max(500),
            description: z.string().max(5_000).optional(),
            tags: z.array(z.string().max(50)).max(20).default([]),
            dateAdded: z.string().max(50),
        }),
    )
    .max(200)

const disabled = () => NextResponse.json({ error: 'Server-side feed storage is disabled' }, { status: 404 })

export async function GET() {
    if (!ENABLED) return disabled()
    try {
        const feeds = feedsSchema.parse(JSON.parse(await readFile(FEEDS_FILE, 'utf-8')))
        return NextResponse.json({ feeds })
    } catch {
        return NextResponse.json({ feeds: [] })
    }
}

export async function PUT(request: Request) {
    if (!ENABLED) return disabled()
    const parsed = z.object({ feeds: feedsSchema }).safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid feed list' }, { status: 400 })
    }
    await mkdir(path.dirname(FEEDS_FILE), { recursive: true })
    await writeFile(FEEDS_FILE, JSON.stringify(parsed.data.feeds, null, 2), 'utf-8')
    return NextResponse.json({ feeds: parsed.data.feeds })
}
