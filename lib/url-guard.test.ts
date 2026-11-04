import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPrivateAddress, parsePublicUrl, UnsafeUrlError } from './url-guard.ts'

describe('isPrivateAddress', () => {
    const blocked = [
        '127.0.0.1',
        '10.1.2.3',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.1.1',
        '169.254.169.254', // cloud metadata
        '100.64.0.1',
        '0.0.0.0',
        '224.0.0.1',
        '::',
        '::1',
        'fc00::1',
        'fd12:3456::1',
        'fe80::1',
        '::ffff:127.0.0.1', // IPv4-mapped loopback
        '::ffff:7f00:1', // same, hex form
        '64:ff9b::a9fe:a9fe', // NAT64 of 169.254.169.254
        'not-an-ip',
    ]
    const allowed = ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '76.76.21.21', '2606:4700:4700::1111', '::ffff:8.8.8.8']

    for (const ip of blocked) it(`blocks ${ip}`, () => assert.equal(isPrivateAddress(ip), true))
    for (const ip of allowed) it(`allows ${ip}`, () => assert.equal(isPrivateAddress(ip), false))
})

describe('parsePublicUrl', () => {
    it('accepts public http(s) URLs', () => {
        assert.equal(parsePublicUrl('https://vercel.com/atom').hostname, 'vercel.com')
        assert.equal(parsePublicUrl('http://example.com:80/feed').hostname, 'example.com')
    })

    const rejected = [
        'not a url',
        'file:///etc/passwd',
        'ftp://example.com/feed',
        'gopher://example.com',
        'http://localhost/feed',
        'http://api.localhost/feed',
        'http://printer.local/feed',
        'http://127.0.0.1/feed',
        'http://[::1]/feed',
        'http://169.254.169.254/latest/meta-data',
        'https://example.com:8443/feed',
        'https://user:pass@example.com/feed',
    ]
    for (const url of rejected) {
        it(`rejects ${url}`, () => assert.throws(() => parsePublicUrl(url), UnsafeUrlError))
    }
})
