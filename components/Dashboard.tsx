'use client'

import { useCallback, useState } from 'react'
import { BlogList } from '@/components/BlogList'
import { RssFeedManager } from '@/components/RssFeedManager'

/** Client island holding the state shared by the feed manager and post list. */
export function Dashboard() {
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [newFeedUrl, setNewFeedUrl] = useState<string | null>(null)

    const handleFeedAdded = useCallback((feedUrl?: string) => {
        if (feedUrl) setNewFeedUrl(feedUrl)
        else setRefreshTrigger(n => n + 1)
    }, [])
    const handleNewFeedProcessed = useCallback(() => setNewFeedUrl(null), [])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-1">
                <RssFeedManager
                    onFeedAdded={handleFeedAdded}
                    selectedTags={selectedTags}
                    onTagFilterChange={setSelectedTags}
                />
            </div>
            <div className="lg:col-span-2">
                <BlogList
                    refreshTrigger={refreshTrigger}
                    selectedTags={selectedTags}
                    onTagFilterChange={setSelectedTags}
                    newFeedUrl={newFeedUrl}
                    onNewFeedProcessed={handleNewFeedProcessed}
                />
            </div>
        </div>
    )
}
