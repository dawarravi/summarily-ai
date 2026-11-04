'use client'

import { useCallback, useMemo } from 'react'
import { useStoredValue } from './useStoredValue'

/** Read/unread tracking persisted in localStorage. */
export function useReadPosts() {
    const [raw, setRaw] = useStoredValue('readPosts')

    const readPosts = useMemo(() => {
        try {
            const parsed: unknown = raw ? JSON.parse(raw) : []
            return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
        } catch {
            return new Set<string>()
        }
    }, [raw])

    const toggleRead = useCallback(
        (postId: string) => {
            const next = new Set(readPosts)
            if (next.has(postId)) next.delete(postId)
            else next.add(postId)
            setRaw(JSON.stringify(Array.from(next)))
        },
        [readPosts, setRaw],
    )

    return { readPosts, toggleRead }
}
