'use client'

import { useObject } from '@ai-sdk/react'
import { AlertTriangle, Calendar, Check, ChevronDown, ChevronRight, ExternalLink, RefreshCw, Sparkles, Square } from 'lucide-react'
import { useState } from 'react'
import { BlogChat } from '@/components/BlogChat'
import { friendlyError } from '@/lib/errors'
import { modelLabel } from '@/lib/models'
import { summarySchema } from '@/lib/summary-schema'
import type { BlogPost } from '@/lib/types'
import { cn, formatDate, truncateText } from '@/lib/utils'
import { RichSummary, summaryToText } from './RichSummary'

const SNIPPET_WORD_THRESHOLD = 50

function wordCount(text: string): number {
    return text.split(/\s+/).filter(Boolean).length
}

interface PostCardProps {
    post: BlogPost
    model: string
    showFeedTitle: boolean
    expanded: boolean
    onToggleExpanded: () => void
    isRead: boolean
    onToggleRead: () => void
}

export function PostCard({ post, model, showFeedTitle, expanded, onToggleExpanded, isRead, onToggleRead }: PostCardProps) {
    // Keyed by post id, so the streamed summary survives collapse/expand.
    const [summaryModel, setSummaryModel] = useState<string | null>(null)
    const [incomplete, setIncomplete] = useState(false)
    const { object: summary, submit, isLoading, error, stop } = useObject({
        id: `summary-${post.id}`,
        api: '/api/summarize',
        schema: summarySchema,
        // A schema error here means the stream was cut short mid-object.
        onFinish: ({ error }) => setIncomplete(Boolean(error)),
    })

    const body = post.content || post.contentSnippet
    const isSnippetOnly = wordCount(body) < SNIPPET_WORD_THRESHOLD

    const generate = () => {
        setSummaryModel(model)
        setIncomplete(false)
        submit({ title: post.title, content: body, model })
    }

    return (
        <article className={cn('border rounded-lg bg-card hover:bg-accent/30 transition-colors', isRead && 'opacity-70')}>
            <div className="p-4 flex items-start justify-between gap-3">
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    aria-expanded={expanded}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                >
                    <span className="flex-shrink-0 mt-1">
                        {expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                    </span>
                    <span className="flex-1 min-w-0">
                        <h3 className="font-semibold leading-tight text-card-foreground mb-2">{post.title}</h3>
                        <span className="flex items-center text-sm text-muted-foreground flex-wrap gap-2">
                            {showFeedTitle && (
                                <span className="font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                                    {post.feedTitle}
                                </span>
                            )}
                            {isSnippetOnly && (
                                <span
                                    className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium"
                                    title="This feed only provides snippets. Open the article for full content."
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    Snippet only
                                </span>
                            )}
                            <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <time dateTime={post.pubDate}>{formatDate(post.pubDate)}</time>
                            </span>
                        </span>
                        {!expanded && (
                            <span className="block text-sm text-muted-foreground mt-2 line-clamp-2">
                                {truncateText(post.contentSnippet, 160)}
                            </span>
                        )}
                    </span>
                </button>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onToggleRead}
                        className={cn(
                            'p-1 rounded transition-colors',
                            isRead
                                ? 'text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/30'
                                : 'text-muted-foreground hover:text-primary',
                        )}
                        aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
                        title={isRead ? 'Mark as unread' : 'Mark as read'}
                    >
                        <Check className="h-4 w-4" />
                    </button>
                    {post.link && (
                        <a
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Open article"
                            title="Open article"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 space-y-4">
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3">
                        {truncateText(post.contentSnippet, 280)}
                    </p>

                    {isSnippetOnly ? (
                        <p className="text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md p-3">
                            This feed only publishes a short snippet, so there is not enough text to summarize. Open the article to read it in full.
                        </p>
                    ) : summary || isLoading || error ? (
                        <section className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4" aria-live="polite">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold text-primary">AI summary</span>
                                    {summaryModel && (
                                        <span className="text-xs text-muted-foreground">· {modelLabel(summaryModel)}</span>
                                    )}
                                </div>
                                {isLoading ? (
                                    <button
                                        type="button"
                                        onClick={stop}
                                        className="flex items-center gap-1 px-2 py-1 bg-secondary hover:bg-secondary/80 rounded text-xs"
                                    >
                                        <Square className="h-3 w-3" /> Stop
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={generate}
                                        className="flex items-center gap-1 px-2 py-1 bg-secondary hover:bg-secondary/80 rounded text-xs"
                                        title={`Regenerate with ${modelLabel(model)}`}
                                    >
                                        <RefreshCw className="h-3 w-3" /> Regenerate
                                    </button>
                                )}
                            </div>
                            {error && <p className="text-sm text-destructive">{friendlyError(error)}</p>}
                            {summary && <RichSummary summary={summary} />}
                            {incomplete && !isLoading && (
                                <p className="text-xs text-muted-foreground mt-3">
                                    The summary was cut short. Regenerate to try again.
                                </p>
                            )}
                            {isLoading && !summary && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <RefreshCw className="h-3 w-3 animate-spin" /> Reading the article…
                                </p>
                            )}
                        </section>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={generate}
                                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                            >
                                <Sparkles className="h-4 w-4" />
                                Generate summary
                            </button>
                            <span className="text-xs text-muted-foreground">using {modelLabel(model)}</span>
                        </div>
                    )}

                    <BlogChat
                        postId={post.id}
                        title={post.title}
                        content={body}
                        summary={isLoading ? undefined : summaryToText(summary)}
                        model={model}
                    />
                </div>
            )}
        </article>
    )
}
