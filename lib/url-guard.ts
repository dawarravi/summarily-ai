import { isIP } from 'node:net'

/**
 * Pure helpers for SSRF protection. Kept free of Next.js imports so they can
 * be unit-tested with `node --test`.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const ALLOWED_PORTS = new Set(['', '80', '443'])
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa']

export class UnsafeUrlError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'UnsafeUrlError'
    }
}

/** Parse and validate the shape of a URL before any network access. */
export function parsePublicUrl(input: string): URL {
    let url: URL
    try {
        url = new URL(input)
    } catch {
        throw new UnsafeUrlError('Invalid URL')
    }
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
        throw new UnsafeUrlError('Only http and https URLs are allowed')
    }
    if (!ALLOWED_PORTS.has(url.port)) {
        throw new UnsafeUrlError('Only default ports are allowed')
    }
    if (url.username || url.password) {
        throw new UnsafeUrlError('URLs with credentials are not allowed')
    }
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some(s => host.endsWith(s))) {
        throw new UnsafeUrlError('Internal hostnames are not allowed')
    }
    if (isIP(host) && isPrivateAddress(host)) {
        throw new UnsafeUrlError('Private or reserved IP addresses are not allowed')
    }
    return url
}

function ipv4ToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

const IPV4_BLOCKED_CIDRS: Array<[string, number]> = [
    ['0.0.0.0', 8], // "this" network
    ['10.0.0.0', 8], // private
    ['100.64.0.0', 10], // carrier-grade NAT
    ['127.0.0.0', 8], // loopback
    ['169.254.0.0', 16], // link-local, cloud metadata endpoints
    ['172.16.0.0', 12], // private
    ['192.0.0.0', 24], // IETF protocol assignments
    ['192.0.2.0', 24], // TEST-NET-1
    ['192.168.0.0', 16], // private
    ['198.18.0.0', 15], // benchmarking
    ['198.51.100.0', 24], // TEST-NET-2
    ['203.0.113.0', 24], // TEST-NET-3
    ['224.0.0.0', 4], // multicast
    ['240.0.0.0', 4], // reserved + broadcast
]

function isPrivateIPv4(ip: string): boolean {
    const addr = ipv4ToInt(ip)
    return IPV4_BLOCKED_CIDRS.some(([base, bits]) => {
        const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
        return (addr & mask) === (ipv4ToInt(base) & mask)
    })
}

/** Expand an IPv6 address to 8 groups of 16-bit numbers. */
function expandIPv6(ip: string): number[] {
    let addr = ip.toLowerCase().split('%')[0]
    // Convert a trailing dotted IPv4 (e.g. ::ffff:1.2.3.4) into two hex groups.
    const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/)
    if (v4) {
        const n = ipv4ToInt(v4[1])
        addr = addr.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`
    }
    const [head, tail] = addr.split('::')
    const headParts = head ? head.split(':') : []
    const tailParts = tail !== undefined && tail !== '' ? tail.split(':') : []
    const fill = addr.includes('::') ? 8 - headParts.length - tailParts.length : 0
    return [...headParts, ...Array(fill).fill('0'), ...tailParts].map(g => parseInt(g, 16))
}

function isPrivateIPv6(ip: string): boolean {
    const g = expandIPv6(ip)
    if (g.length !== 8 || g.some(Number.isNaN)) return true // unparseable: fail closed
    const allZeroPrefix = (n: number) => g.slice(0, n).every(x => x === 0)

    if (allZeroPrefix(8)) return true // ::
    if (allZeroPrefix(7) && g[7] === 1) return true // ::1
    // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d): check embedded IPv4
    const isMapped = allZeroPrefix(5) && g[5] === 0xffff
    const isNat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(x => x === 0)
    if (isMapped || isNat64) {
        const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`
        return isPrivateIPv4(v4)
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
    if ((g[0] & 0xff00) === 0xff00) return true // ff00::/8 multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
    return false
}

/** True for loopback, private, link-local, and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
    const version = isIP(ip)
    if (version === 4) return isPrivateIPv4(ip)
    if (version === 6) return isPrivateIPv6(ip)
    return true // not an IP: fail closed
}
