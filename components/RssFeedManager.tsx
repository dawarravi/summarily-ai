'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ExternalLink, Search, Globe, Tag, X, Edit3, Rss } from 'lucide-react'
import { loadFeeds, saveFeeds as persistFeeds } from '@/lib/feed-store'
import { TAG_SUGGESTIONS, getTagColor } from '@/lib/tags'
import type { DiscoveredFeed, RssFeed } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RssFeedManagerProps {
    onFeedAdded: (feedUrl?: string) => void
    selectedTags?: string[]
    onTagFilterChange?: (tags: string[]) => void
}

export function RssFeedManager({ onFeedAdded, selectedTags = [], onTagFilterChange }: RssFeedManagerProps) {
    const [feeds, setFeeds] = useState<RssFeed[]>([])
    const [newFeedUrl, setNewFeedUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchMode, setSearchMode] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showSubscribedFeeds, setShowSubscribedFeeds] = useState(false)
    const [feedSearchQuery, setFeedSearchQuery] = useState('')
    const [editingFeedId, setEditingFeedId] = useState<string | null>(null)
    const [editingTags, setEditingTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState('')
    const [showTagSuggestions, setShowTagSuggestions] = useState(false)
    
    // New feed modal state
    const [showNewFeedModal, setShowNewFeedModal] = useState(false)
    const [newlyAddedFeed, setNewlyAddedFeed] = useState<RssFeed | null>(null)
    const [modalTags, setModalTags] = useState<string[]>([])
    const [modalNewTag, setModalNewTag] = useState('')
    const [showModalTagSuggestions, setShowModalTagSuggestions] = useState(false)

    useEffect(() => {
        loadFeeds().then(setFeeds)
    }, [])

    const saveFeeds = (updatedFeeds: RssFeed[]) => {
        persistFeeds(updatedFeeds)
        setFeeds(updatedFeeds)
    }

    // Get all unique tags across feeds
    const getAllTags = () => {
        const tagSet = new Set<string>()
        feeds.forEach(feed => feed.tags.forEach(tag => tagSet.add(tag)))
        return Array.from(tagSet).sort()
    }

    // Add or remove tag from feed
    const updateFeedTags = (feedId: string, tags: string[]) => {
        const updatedFeeds = feeds.map(feed =>
            feed.id === feedId ? { ...feed, tags } : feed
        )
        saveFeeds(updatedFeeds)
        onFeedAdded() // Trigger refresh for tag changes
    }

    const startEditingTags = (feed: RssFeed) => {
        setEditingFeedId(feed.id)
        setEditingTags([...feed.tags])
        setNewTag('')
        setShowTagSuggestions(false)
    }

    const cancelEditingTags = () => {
        setEditingFeedId(null)
        setEditingTags([])
        setNewTag('')
        setShowTagSuggestions(false)
    }

    const saveEditingTags = () => {
        if (editingFeedId) {
            updateFeedTags(editingFeedId, editingTags)
            setEditingFeedId(null)
            setEditingTags([])
            setNewTag('')
            setShowTagSuggestions(false)
        }
    }

    const addTagToEditing = (tag: string) => {
        const trimmedTag = tag.trim()
        if (trimmedTag && !editingTags.includes(trimmedTag)) {
            setEditingTags([...editingTags, trimmedTag])
            setNewTag('')
            setShowTagSuggestions(false)
        }
    }

    const removeTagFromEditing = (tag: string) => {
        setEditingTags(editingTags.filter(t => t !== tag))
    }

    // Modal tag functions
    const addTagToModal = (tag: string) => {
        const trimmedTag = tag.trim()
        if (trimmedTag && !modalTags.includes(trimmedTag)) {
            setModalTags([...modalTags, trimmedTag])
            setModalNewTag('')
            setShowModalTagSuggestions(false)
        }
    }

    const removeTagFromModal = (tag: string) => {
        setModalTags(modalTags.filter(t => t !== tag))
    }

    const saveNewFeedWithTags = () => {
        if (newlyAddedFeed) {
            const updatedFeed = { ...newlyAddedFeed, tags: modalTags }
            const updatedFeeds = feeds.map(f => 
                f.id === newlyAddedFeed.id ? updatedFeed : f
            )
            saveFeeds(updatedFeeds)
            onFeedAdded(newlyAddedFeed.url)
        }
        closeNewFeedModal()
    }

    const skipTagsAndClose = () => {
        if (newlyAddedFeed) {
            onFeedAdded(newlyAddedFeed.url)
        }
        closeNewFeedModal()
    }

    const closeNewFeedModal = () => {
        setShowNewFeedModal(false)
        setNewlyAddedFeed(null)
        setModalTags([])
        setModalNewTag('')
        setShowModalTagSuggestions(false)
    }

    const addFeed = async () => {
        if (!newFeedUrl.trim()) return

        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/validate-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newFeedUrl })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to validate feed')
            }

            const newFeed: RssFeed = {
                id: crypto.randomUUID(),
                url: newFeedUrl,
                title: data.title || 'Unknown Feed',
                description: data.description,
                tags: [],
                dateAdded: new Date().toISOString()
            }

            const updatedFeeds = [...feeds, newFeed]
            saveFeeds(updatedFeeds)
            setNewFeedUrl('')
            
            // Show modal to add tags immediately
            setNewlyAddedFeed(newFeed)
            setModalTags([])
            setShowNewFeedModal(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add feed')
        } finally {
            setIsLoading(false)
        }
    }

    const removeFeed = (id: string) => {
        const updatedFeeds = feeds.filter(feed => feed.id !== id)
        saveFeeds(updatedFeeds)

        // Clear search if we're removing the last matching feed
        if (filteredFeeds.length === 1 && filteredFeeds[0].id === id) {
            setFeedSearchQuery('')
        }

        // Close dropdown if no feeds left
        if (updatedFeeds.length === 0) {
            setShowSubscribedFeeds(false)
        }

        onFeedAdded() // Full refresh needed when removing feeds
    }

    const searchForFeeds = async () => {
        if (!searchQuery.trim()) return

        setIsSearching(true)
        setError('')
        setDiscoveredFeeds([])

        try {
            const response = await fetch('/api/discover-feeds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to discover feeds')
            }

            setDiscoveredFeeds(data.feeds || [])
            if (!data.feeds?.length) {
                setError(data.error || 'No feeds found. Try the site\'s domain (e.g. overreacted.io) or a direct feed URL.')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search for feeds')
            setDiscoveredFeeds([])
        } finally {
            setIsSearching(false)
        }
    }

    // Filter subscribed feeds based on search query and selected tags
    const filteredFeeds = feeds.filter(feed => {
        const matchesSearch = feed.title.toLowerCase().includes(feedSearchQuery.toLowerCase()) ||
            feed.url.toLowerCase().includes(feedSearchQuery.toLowerCase()) ||
            feed.tags.some(tag => tag.toLowerCase().includes(feedSearchQuery.toLowerCase()))

        const matchesTags = selectedTags.length === 0 ||
            selectedTags.some(selectedTag => feed.tags.includes(selectedTag))

        return matchesSearch && matchesTags
    })

    const addDiscoveredFeed = async (discoveredFeed: DiscoveredFeed) => {
        try {
            const newFeed: RssFeed = {
                id: crypto.randomUUID(),
                url: discoveredFeed.url,
                title: discoveredFeed.title,
                description: discoveredFeed.description,
                tags: [],
                dateAdded: new Date().toISOString()
            }

            const updatedFeeds = [...feeds, newFeed]
            saveFeeds(updatedFeeds)

            // Remove from discovered feeds
            setDiscoveredFeeds(prev => prev.filter(f => f.url !== discoveredFeed.url))

            // Show modal to add tags immediately
            setNewlyAddedFeed(newFeed)
            setModalTags([])
            setShowNewFeedModal(true)
        } catch {
            setError('Failed to add feed')
        }
    }

    return (
        <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-semibold flex items-center text-card-foreground">
                <Plus className="h-5 w-5 mr-2 text-primary" />
                Manage RSS Feeds
            </h2>

            {/* Tag Filter Section */}
            {getAllTags().length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-card-foreground flex items-center">
                            <Tag className="h-4 w-4 mr-1 text-primary" />
                            Filter by Tags
                        </h3>
                        {selectedTags.length > 0 && (
                            <button
                                onClick={() => onTagFilterChange?.([])}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {getAllTags().map(tag => {
                            const isSelected = selectedTags.includes(tag)
                            const feedsWithTag = feeds.filter(feed => feed.tags.includes(tag)).length
                            return (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        if (isSelected) {
                                            onTagFilterChange?.(selectedTags.filter(t => t !== tag))
                                        } else {
                                            onTagFilterChange?.([...selectedTags, tag])
                                        }
                                    }}
                                    className={cn(
                                        "text-xs px-2 py-1 rounded-full border transition-all",
                                        isSelected
                                            ? `${getTagColor(tag)} border-transparent ring-2 ring-primary/20`
                                            : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                                    )}
                                    title={`${feedsWithTag} feed${feedsWithTag > 1 ? 's' : ''} with this tag`}
                                >
                                    {tag} ({feedsWithTag})
                                </button>
                            )
                        })}
                    </div>
                    {selectedTags.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                            Showing feeds with: {selectedTags.join(', ')}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {/* Mode Toggle */}
                <div className="flex bg-secondary rounded-lg p-1">
                    <button
                        onClick={() => {
                            setSearchMode(false)
                            setError('')
                            setDiscoveredFeeds([])
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all",
                            !searchMode
                                ? "bg-card text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Globe className="h-4 w-4 mr-2" />
                        Direct URL
                    </button>
                    <button
                        onClick={() => {
                            setSearchMode(true)
                            setError('')
                            setNewFeedUrl('')
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all",
                            searchMode
                                ? "bg-card text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Search Blogs
                    </button>
                </div>

                {/* Direct URL Input */}
                {!searchMode && (
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={newFeedUrl}
                            onChange={(e) => setNewFeedUrl(e.target.value)}
                            placeholder="Enter RSS feed URL..."
                            className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                            disabled={isLoading}
                            onKeyPress={(e) => e.key === 'Enter' && addFeed()}
                        />
                        <button
                            onClick={addFeed}
                            disabled={isLoading || !newFeedUrl.trim()}
                            className={cn(
                                "px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                                isLoading && "cursor-wait"
                            )}
                        >
                            {isLoading ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                )}

                {/* Search Input */}
                {searchMode && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Site or blog name (e.g. overreacted.io, Hacker News)"
                                className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                                disabled={isSearching}
                                onKeyPress={(e) => e.key === 'Enter' && searchForFeeds()}
                            />
                            <button
                                onClick={searchForFeeds}
                                disabled={isSearching || !searchQuery.trim()}
                                className={cn(
                                    "px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                                    isSearching && "cursor-wait"
                                )}
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {/* Discovered Feeds */}
                        {discoveredFeeds.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Found {discoveredFeeds.length} feed{discoveredFeeds.length > 1 ? 's' : ''}:
                                </h4>
                                {discoveredFeeds.map((feed, index) => (
                                    <div
                                        key={`${feed.url}-${index}`}
                                        className="flex items-center justify-between p-3 bg-accent/50 rounded-md border"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-medium truncate text-card-foreground">{feed.title}</h5>
                                            {feed.description && (
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {feed.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {feed.url}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addDiscoveredFeed(feed)}
                                            className="ml-3 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                        {error}
                    </div>
                )}

                {/* Subscribed Feeds - Compact Grid View */}
                {feeds.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                                <Rss className="h-4 w-4 text-green-600 dark:text-green-400" />
                                My Feeds
                                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                    {feeds.length}
                                </span>
                            </h3>
                            <button
                                onClick={() => setShowSubscribedFeeds(!showSubscribedFeeds)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showSubscribedFeeds ? 'Hide' : 'Show All'}
                            </button>
                        </div>

                        {showSubscribedFeeds && (
                            <div className="space-y-3">
                                {/* Search Box */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={feedSearchQuery}
                                        onChange={(e) => setFeedSearchQuery(e.target.value)}
                                        placeholder="Search feeds..."
                                        className="w-full pl-10 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-background text-foreground"
                                    />
                                </div>

                                {/* Compact Grid of Feeds */}
                                <div className="max-h-96 overflow-y-auto">
                                    {filteredFeeds.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-8">
                                            {feedSearchQuery || selectedTags.length > 0 ? 'No feeds match your filters' : 'No feeds found'}
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {filteredFeeds.map((feed) => (
                                                editingFeedId === feed.id ? (
                                                    // Editing Mode - Full Width Card
                                                    <div
                                                        key={feed.id}
                                                        className="sm:col-span-2 p-3 bg-card border-2 border-primary rounded-lg space-y-2"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 min-w-0 mr-2">
                                                                <h4 className="font-medium text-sm truncate text-card-foreground">{feed.title}</h4>
                                                                <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                                                            </div>
                                                        </div>

                                                        {/* Tags Editing */}
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap gap-1">
                                                                {editingTags.map(tag => (
                                                                    <span
                                                                        key={tag}
                                                                        className={cn("text-xs px-2 py-1 rounded-full flex items-center gap-1", getTagColor(tag))}
                                                                    >
                                                                        {tag}
                                                                        <button
                                                                            onClick={() => removeTagFromEditing(tag)}
                                                                            className="hover:bg-black/20 rounded-full p-0.5"
                                                                        >
                                                                            <X className="h-2 w-2" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={newTag}
                                                                    onChange={(e) => {
                                                                        setNewTag(e.target.value)
                                                                        setShowTagSuggestions(e.target.value.length > 0)
                                                                    }}
                                                                    placeholder="Add tag..."
                                                                    className="w-full text-xs px-2 py-1 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault()
                                                                            addTagToEditing(newTag)
                                                                        }
                                                                    }}
                                                                    onFocus={() => setShowTagSuggestions(newTag.length > 0)}
                                                                />

                                                                {showTagSuggestions && (
                                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
                                                                        {TAG_SUGGESTIONS
                                                                            .filter(suggestion =>
                                                                                suggestion.name.toLowerCase().includes(newTag.toLowerCase()) &&
                                                                                !editingTags.includes(suggestion.name)
                                                                            )
                                                                            .map(suggestion => (
                                                                                <button
                                                                                    key={suggestion.name}
                                                                                    onClick={() => addTagToEditing(suggestion.name)}
                                                                                    className="w-full text-left px-2 py-1 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                                                                                >
                                                                                    <span className={cn("px-2 py-0.5 rounded-full", suggestion.color)}>
                                                                                        {suggestion.name}
                                                                                    </span>
                                                                                </button>
                                                                            ))
                                                                        }
                                                                        {newTag.trim() && !TAG_SUGGESTIONS.some(s => s.name.toLowerCase() === newTag.toLowerCase()) && (
                                                                            <button
                                                                                onClick={() => addTagToEditing(newTag)}
                                                                                className="w-full text-left px-2 py-1 text-xs hover:bg-accent transition-colors"
                                                                            >
                                                                                Create &ldquo;{newTag}&rdquo;
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={saveEditingTags}
                                                                    className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditingTags}
                                                                    className="text-xs px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Compact Card View
                                                    <div
                                                        key={feed.id}
                                                        className="group relative p-3 bg-card border rounded-lg hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all"
                                                    >
                                                        {/* Feed Icon & Title */}
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center">
                                                                <Rss className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium text-sm truncate text-card-foreground leading-tight">
                                                                    {feed.title}
                                                                </h4>
                                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                                    {new URL(feed.url).hostname.replace('www.', '')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Tags */}
                                                        <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
                                                            {feed.tags.length > 0 ? (
                                                                feed.tags.slice(0, 3).map(tag => (
                                                                    <span
                                                                        key={tag}
                                                                        className={cn("text-xs px-1.5 py-0.5 rounded-full", getTagColor(tag))}
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground/50 italic">No tags</span>
                                                            )}
                                                            {feed.tags.length > 3 && (
                                                                <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                                                                    +{feed.tags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons - Show on Hover */}
                                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => startEditingTags(feed)}
                                                                className="p-1.5 bg-card border rounded hover:bg-accent transition-colors"
                                                                title="Edit tags"
                                                            >
                                                                <Edit3 className="h-3 w-3" />
                                                            </button>
                                                            <a
                                                                href={feed.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 bg-card border rounded hover:bg-accent transition-colors"
                                                                title="Open feed"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                            <button
                                                                onClick={() => removeFeed(feed.id)}
                                                                className="p-1.5 bg-card border rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                title="Remove"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {filteredFeeds.length > 0 && filteredFeeds.length < feeds.length && (
                                    <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                                        Showing {filteredFeeds.length} of {feeds.length} feeds
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {feeds.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">Add your first RSS feed to get started!</p>

                        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left text-xs">
                            <h4 className="font-medium text-foreground mb-2">💡 Tips for finding RSS feeds:</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>• Use &ldquo;Search&rdquo; with a site domain, e.g. overreacted.io</li>
                                <li>• Try adding &ldquo;/feed&rdquo; or &ldquo;/rss&rdquo; to any blog URL</li>
                                <li>• Look for RSS icons (📡) on websites</li>
                                <li>• Check the website footer for &ldquo;RSS&rdquo; or &ldquo;Feed&rdquo; links</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* New Feed Modal - Add Tags Immediately */}
            {showNewFeedModal && newlyAddedFeed && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                                <span className="text-2xl">🎉</span>
                                Feed Added!
                            </h3>
                            <button
                                onClick={skipTagsAndClose}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Feed Info */}
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                            <h4 className="font-medium text-green-800 dark:text-green-200 truncate">
                                {newlyAddedFeed.title}
                            </h4>
                            <p className="text-xs text-green-600 dark:text-green-400 truncate mt-1">
                                {newlyAddedFeed.url}
                            </p>
                        </div>

                        {/* Add Tags Section */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary" />
                                Add Tags (Optional)
                            </h4>
                            
                            {/* Current Tags */}
                            {modalTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {modalTags.map(tag => (
                                        <span
                                            key={tag}
                                            className={cn("text-xs px-2 py-1 rounded-full flex items-center gap-1", getTagColor(tag))}
                                        >
                                            {tag}
                                            <button
                                                onClick={() => removeTagFromModal(tag)}
                                                className="hover:bg-black/20 rounded-full p-0.5"
                                            >
                                                <X className="h-2 w-2" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Tag Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={modalNewTag}
                                    onChange={(e) => {
                                        setModalNewTag(e.target.value)
                                        setShowModalTagSuggestions(true)
                                    }}
                                    placeholder="Type to add tags..."
                                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground text-sm"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addTagToModal(modalNewTag)
                                        }
                                    }}
                                    onFocus={() => setShowModalTagSuggestions(true)}
                                    autoFocus
                                />

                                {/* Tag Suggestions Dropdown */}
                                {showModalTagSuggestions && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                        {TAG_SUGGESTIONS
                                            .filter(suggestion =>
                                                suggestion.name.toLowerCase().includes(modalNewTag.toLowerCase()) &&
                                                !modalTags.includes(suggestion.name)
                                            )
                                            .map(suggestion => (
                                                <button
                                                    key={suggestion.name}
                                                    onClick={() => addTagToModal(suggestion.name)}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                >
                                                    <span className={cn("px-2 py-0.5 rounded-full text-xs", suggestion.color)}>
                                                        {suggestion.name}
                                                    </span>
                                                </button>
                                            ))
                                        }
                                        {modalNewTag.trim() && !TAG_SUGGESTIONS.some(s => s.name.toLowerCase() === modalNewTag.toLowerCase()) && !modalTags.includes(modalNewTag.trim()) && (
                                            <button
                                                onClick={() => addTagToModal(modalNewTag)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                            >
                                                Create &ldquo;<span className="font-medium">{modalNewTag}</span>&rdquo;
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Tags help you filter and organize your feeds. Click suggestions or type your own.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={saveNewFeedWithTags}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                            >
                                {modalTags.length > 0 ? 'Save with Tags' : 'Done'}
                            </button>
                            <button
                                onClick={skipTagsAndClose}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 