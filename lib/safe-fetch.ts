import 'server-only'
import { lookup } from 'node:dns/promises'
import { isPrivateAddress, parsePublicUrl, UnsafeUrlError } from './url-guard'

const MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export interface SafeFetchOptions {
    timeoutMs?: number
    maxBytes?: number
    accept?: string
    /** Seconds to keep the response in the Next.js Data Cache. */
    revalidate?: number
}

export interface SafeFetchResult {
    url: string
    status: number
    contentType: string
    text: string
}

/** Resolve the hostname and reject it if any address is non-public. */
async function assertPublicHost(url: URL): Promise<void> {
    const host = url.hostname.replace(/^\[|\]$/g, '')
    const addresses = await lookup(host, { all: true, verbatim: true }).catch(() => {
        throw new UnsafeUrlError(`Could not resolve ${host}`)
    })
    if (addresses.length === 0 || addresses.some(a => isPrivateAddress(a.address))) {
        throw new UnsafeUrlError('URL resolves to a private or reserved address')
    }
}

async function readLimited(res: Response, maxBytes: number): Promise<string> {
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > maxBytes) throw new Error('Response too large')
    if (!res.body) return ''

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        received += value.byteLength
        if (received > maxBytes) {
            await reader.cancel()
            throw new Error('Response too large')
        }
        chunks.push(value)
    }
    return new TextDecoder().decode(Buffer.concat(chunks))
}

/**
 * fetch() for user-supplied URLs. Validates every hop (including redirects)
 * against private/reserved address ranges, enforces a timeout and a response
 * size cap, and optionally caches the result in the Next.js Data Cache.
 *
 * Known limitation: DNS is resolved once for validation and again by fetch,
 * so a DNS-rebinding attacker could race the two lookups. Pinning the
 * resolved IP would require a custom HTTP agent.
 */
export async function safeFetch(input: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        maxBytes = DEFAULT_MAX_BYTES,
        accept = '*/*',
        revalidate,
    } = options

    let url = parsePublicUrl(input)
    const signal = AbortSignal.timeout(timeoutMs)

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        await assertPublicHost(url)

        const res = await fetch(url, {
            redirect: 'manual',
            signal,
            headers: { 'User-Agent': 'Summarily/2.0 (+feed reader)', Accept: accept },
            ...(revalidate ? { next: { revalidate } } : { cache: 'no-store' as const }),
        })

        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get('location')
            if (!location) throw new Error(`Redirect without location (${res.status})`)
            url = parsePublicUrl(new URL(location, url).toString())
            continue
        }

        return {
            url: url.toString(),
            status: res.status,
            contentType: res.headers.get('content-type') ?? '',
            text: await readLimited(res, maxBytes),
        }
    }
    throw new Error('Too many redirects')
}
