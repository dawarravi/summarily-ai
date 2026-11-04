'use client'

import { ChevronDown, ChevronRight, Clock, Eye, EyeOff, Grid, Minimize2, RefreshCw, Rss, Sparkles, Tag, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PostCard } from '@/components/posts/PostCard'
import { useReadPosts } from '@/hooks/useReadPosts'
import { useStoredValue } from '@/hooks/useStoredValue'
import { loadFeeds } from '@/lib/feed-store'
import { DEFAULT_MODEL, isAllowedModel, MODELS } from '@/lib/models'
import { getTagColor } from '@/lib/tags'
import type { BlogPost, RssFeed } from '@/lib/types'
import { cn } from '@/lib/utils'

const MODEL_STORAGE_KEY = 'summarily:model'

interface BlogListProps {
    refreshTrigger: number
    selectedTags?: string[]
    onTagFilterChange?: (tags: string[]) => void
    newFeedUrl?: string | null
    onNewFeedProcessed?: () => void
}

async function fetchPosts(feeds: RssFeed[]): Promise<{ posts: BlogPost[]; failedFeeds: { url: string }[] }> {
    if (feeds.length === 0) return { posts: [], failedFeeds: [] }
    const res = await fetch('/api/fetch-blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: feeds.map(({ id, url, title }) => ({ id, url, title })) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch posts')
    return data
}

function byDateDesc(a: BlogPost, b: BlogPost) {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
}

export function BlogList({ refreshTrigger, selectedTags = [], onTagFilterChange, newFeedUrl, onNewFeedProcessed }: BlogListProps) {
    const [feeds, setFeeds] = useState<RssFeed[]>([])
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [failedCount, setFailedCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [storedModel, setStoredModel] = useStoredValue(MODEL_STORAGE_KEY)
    const model = isAllowedModel(storedModel) ? storedModel : DEFAULT_MODEL
    const [viewMode, setViewMode] = useState<'chronological' | 'grouped'>('chronological')
    const [showRead, setShowRead] = useState(false)
    const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
    const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set())
    const [reloadKey, setReloadKey] = useState(0)
    const { readPosts, toggleRead } = useReadPosts()

    const reload = () => {
        setIsLoading(true)
        setError('')
        setReloadKey(k => k + 1)
    }

    // Load feeds + posts on mount, on manual refresh, and when feeds change.
    // Existing posts stay visible while a background refresh is in flight.
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const currentFeeds = await loadFeeds()
                const { posts, failedFeeds } = await fetchPosts(currentFeeds)
                if (cancelled) return
                setFeeds(currentFeeds)
                setPosts(posts)
                setFailedCount(failedFeeds.length)
                setError('')
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load posts')
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [refreshTrigger, reloadKey])

    // A feed was just added: fetch only that feed and merge its posts in.
    useEffect(() => {
        if (!newFeedUrl) return
        let cancelled = false
        ;(async () => {
            try {
                const currentFeeds = await loadFeeds()
                if (cancelled) return
                setFeeds(currentFeeds)
                const added = currentFeeds.find(f => f.url === newFeedUrl)
                if (added) {
                    const { posts: newPosts } = await fetchPosts([added])
                    if (!cancelled) {
                        setPosts(prev => {
                            const ids = new Set(prev.map(p => p.id))
                            return [...prev, ...newPosts.filter(p => !ids.has(p.id))].sort(byDateDesc)
                        })
                    }
                }
            } catch (err) {
                console.error('Failed to load new feed', err)
            } finally {
                if (!cancelled) onNewFeedProcessed?.()
            }
        })()
        return () => {
            cancelled = true
        }
    }, [newFeedUrl, onNewFeedProcessed])

    const tagsByFeedUrl = useMemo(() => new Map(feeds.map(f => [f.url, f.tags])), [feeds])

    const availableTags = useMemo(() => {
        const feedUrlsWithPosts = new Set(posts.map(p => p.feedUrl))
        const tags = new Set<string>()
        for (const feed of feeds) if (feedUrlsWithPosts.has(feed.url)) feed.tags.forEach(t => tags.add(t))
        return Array.from(tags).sort()
    }, [feeds, posts])

    const visiblePosts = useMemo(
        () =>
            posts.filter(post => {
                if (!showRead && readPosts.has(post.id)) return false
                if (selectedTags.length === 0) return true
                const tags = tagsByFeedUrl.get(post.feedUrl) ?? []
                return selectedTags.some(t => tags.includes(t))
            }),
        [posts, showRead, readPosts, selectedTags, tagsByFeedUrl],
    )

    const groupedPosts = useMemo(() => {
        const groups = new Map<string, BlogPost[]>()
        for (const post of visiblePosts) {
            groups.set(post.feedTitle, [...(groups.get(post.feedTitle) ?? []), post])
        }
        return Array.from(groups.entries())
    }, [visiblePosts])

    const toggle = (set: Set<string>, id: string) => {
        const next = new Set(set)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    }

    const anythingExpanded = expandedPosts.size > 0 || expandedFeeds.size > 0
    const collapseAll = () => {
        setExpandedPosts(new Set())
        setExpandedFeeds(new Set())
    }
    const expandAll = () => {
        setExpandedPosts(new Set(visiblePosts.map(p => p.id)))
        setExpandedFeeds(new Set(visiblePosts.map(p => p.feedTitle)))
    }

    const renderPost = (post: BlogPost, showFeedTitle: boolean) => (
        <PostCard
            key={post.id}
            post={post}
            model={model}
            showFeedTitle={showFeedTitle}
            expanded={expandedPosts.has(post.id)}
            onToggleExpanded={() => setExpandedPosts(prev => toggle(prev, post.id))}
            isRead={readPosts.has(post.id)}
            onToggleRead={() => toggleRead(post.id)}
        />
    )

    if (isLoading) {
        return (
            <div className="bg-card rounded-lg shadow-sm border p-6 space-y-4" aria-busy="true">
                <div className="flex items-center gap-3 text-card-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    Loading posts…
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-card rounded-lg shadow-sm border p-6 text-center py-12">
                <h3 className="text-lg font-medium text-destructive mb-2">Error loading posts</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                    type="button"
                    onClick={reload}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="bg-card rounded-lg shadow-sm border">
            <div className="p-6 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-card-foreground">Latest posts</h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={anythingExpanded ? collapseAll : expandAll}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                        >
                            {anythingExpanded ? <Minimize2 className="h-3 w-3" /> : <Grid className="h-3 w-3" />}
                            {anythingExpanded ? 'Collapse all' : 'Expand all'}
                        </button>
                        <button
                            type="button"
                            onClick={reload}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Refresh posts"
                            title="Refresh posts"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {failedCount > 0 && (
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                        {failedCount} feed{failedCount > 1 ? 's' : ''} could not be loaded and {failedCount > 1 ? 'were' : 'was'} skipped.
                    </p>
                )}

                {availableTags.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-card-foreground flex items-center">
                                <Tag className="h-4 w-4 mr-1 text-primary" />
                                Filter by tags
                            </h3>
                            {selectedTags.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onTagFilterChange?.([])}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => {
                                const isSelected = selectedTags.includes(tag)
                                return (
                                    <button
                                        type="button"
                                        key={tag}
                                        aria-pressed={isSelected}
                                        onClick={() =>
                                            onTagFilterChange?.(
                                                isSelected ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag],
                                            )
                                        }
                                        className={cn(
                                            'text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1',
                                            isSelected
                                                ? `${getTagColor(tag)} border-transparent ring-2 ring-primary/20`
                                                : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80',
                                        )}
                                    >
                                        {tag}
                                        {isSelected && <X className="h-3 w-3 ml-1" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowRead(v => !v)}
                            aria-pressed={showRead}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                showRead
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                            )}
                        >
                            {showRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {showRead ? 'Hide read' : 'Show read'}
                        </button>
                        {readPosts.size > 0 && (
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                                {readPosts.size} read
                            </span>
                        )}
                        <label className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="sr-only">AI model</span>
                            <select
                                value={model}
                                onChange={e => setStoredModel(e.target.value)}
                                className="text-xs px-2 py-1 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
                            >
                                {MODELS.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="flex bg-secondary rounded-lg p-1" role="group" aria-label="View mode">
                        {(['chronological', 'grouped'] as const).map(mode => (
                            <button
                                type="button"
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                aria-pressed={viewMode === mode}
                                className={cn(
                                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all',
                                    viewMode === mode ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {mode === 'chronological' ? <Clock className="h-4 w-4 mr-2" /> : <Grid className="h-4 w-4 mr-2" />}
                                {mode === 'chronological' ? 'Chronological' : 'By feed'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6">
                {visiblePosts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {selectedTags.length > 0 ? (
                            <>
                                <h3 className="text-lg font-medium mb-2">No posts for the selected tags</h3>
                                <p className="text-sm">Remove a tag filter or tag more feeds.</p>
                            </>
                        ) : posts.length === 0 ? (
                            <>
                                <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                                <p>Add an RSS feed to start reading.</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-medium mb-2">You&apos;re all caught up</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowRead(true)}
                                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                >
                                    Show read posts
                                </button>
                            </>
                        )}
                    </div>
                ) : viewMode === 'chronological' ? (
                    <div className="space-y-4">{visiblePosts.map(post => renderPost(post, true))}</div>
                ) : (
                    <div className="space-y-6">
                        {groupedPosts.map(([feedTitle, feedPosts]) => {
                            const isOpen = expandedFeeds.has(feedTitle)
                            return (
                                <section key={feedTitle} className="border rounded-lg bg-card">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedFeeds(prev => toggle(prev, feedTitle))}
                                        aria-expanded={isOpen}
                                        className="w-full p-4 border-b hover:bg-accent/30 transition-colors flex items-center gap-3 text-left"
                                    >
                                        {isOpen ? (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <Rss className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold text-lg text-card-foreground">{feedTitle}</h3>
                                        <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                                            {feedPosts.length} post{feedPosts.length > 1 ? 's' : ''}
                                        </span>
                                    </button>
                                    {isOpen && <div className="p-4 space-y-4">{feedPosts.map(post => renderPost(post, false))}</div>}
                                </section>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
