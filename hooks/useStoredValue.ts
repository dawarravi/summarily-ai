'use client'

import { useCallback, useSyncExternalStore } from 'react'

const LOCAL_CHANGE_EVENT = 'summarily:storage'

function subscribe(onChange: () => void) {
    window.addEventListener('storage', onChange) // other tabs
    window.addEventListener(LOCAL_CHANGE_EVENT, onChange) // this tab
    return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener(LOCAL_CHANGE_EVENT, onChange)
    }
}

function read(key: string): string | null {
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

/**
 * A localStorage-backed string value, read via useSyncExternalStore so the
 * server render and hydration use `null` and the client value applies right
 * after, without effects or hydration mismatches. Syncs across tabs.
 */
export function useStoredValue(key: string): [string | null, (value: string) => void] {
    const value = useSyncExternalStore(
        subscribe,
        () => read(key),
        () => null,
    )
    const setValue = useCallback(
        (next: string) => {
            try {
                localStorage.setItem(key, next)
            } catch {
                // storage unavailable: value won't persist
            }
            window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT))
        },
        [key],
    )
    return [value, setValue]
}
