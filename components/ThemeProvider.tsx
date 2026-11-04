'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { useStoredValue } from '@/hooks/useStoredValue'

type Theme = 'light' | 'dark'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} })

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystemTheme(onChange: () => void) {
    const media = window.matchMedia(DARK_QUERY)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
}

/**
 * The initial `dark` class is set by an inline script in <head> before first
 * paint (see app/layout.tsx), so children render immediately with no flash
 * and no hidden-until-hydrated wrapper.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [stored, setStored] = useStoredValue('theme')
    const systemDark = useSyncExternalStore(
        subscribeToSystemTheme,
        () => window.matchMedia(DARK_QUERY).matches,
        () => false,
    )
    const theme: Theme = stored === 'dark' || stored === 'light' ? stored : systemDark ? 'dark' : 'light'

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
    }, [theme])

    const toggleTheme = () => setStored(theme === 'light' ? 'dark' : 'light')

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    return useContext(ThemeContext)
}
