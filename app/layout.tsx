import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
    title: 'Summarily — AI summaries for your RSS feeds',
    description: 'Subscribe to RSS feeds and get AI-powered summaries of your favorite blogs',
    icons: {
        icon: '/icon.svg',
        shortcut: '/icon.svg',
        apple: '/icon.svg',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                const theme = localStorage.getItem('theme') || 
                                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                                document.documentElement.classList.toggle('dark', theme === 'dark');
                            } catch (e) {}
                        `,
                    }}
                />
            </head>
            <body className={inter.className}>
                <ThemeProvider>
                    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
                        {children}
                    </div>
                </ThemeProvider>
            </body>
        </html>
    )
} 