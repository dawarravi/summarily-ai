export interface RssFeed {
    id: string
    url: string
    title: string
    description?: string
    tags: string[]
    dateAdded: string
}

export interface BlogPost {
    id: string
    title: string
    link: string
    content: string
    contentSnippet: string
    pubDate: string
    feedTitle: string
    feedUrl: string
}

export interface DiscoveredFeed {
    url: string
    title: string
    description?: string
}
