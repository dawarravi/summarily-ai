import { Rss, Sparkles } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
    return (
        <header className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3 relative">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Rss className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Summarily
                </h1>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <ThemeToggle />
            </div>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Subscribe to RSS feeds and get streaming, structured AI summaries of the latest posts. Ask follow-up
                questions about any article.
            </p>
        </header>
    )
}
