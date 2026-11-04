'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="absolute -right-4 md:right-8 top-1/2 -translate-y-1/2 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors duration-200 group"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
                <Sun className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
        </button>
    )
}
