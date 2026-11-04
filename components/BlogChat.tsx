'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Bot, ChevronDown, ChevronRight, MessageCircle, Send, Square, User, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { friendlyError } from '@/lib/errors'
import { modelLabel } from '@/lib/models'
import { cn } from '@/lib/utils'

interface BlogChatProps {
    postId: string
    title: string
    content: string
    summary?: string
    model: string
}

export function BlogChat({ postId, title, content, summary, model }: BlogChatProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [input, setInput] = useState('')
    const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])
    const { messages, sendMessage, status, error, stop, setMessages } = useChat({ id: `chat-${postId}`, transport })

    const isBusy = status === 'submitted' || status === 'streaming'

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const text = input.trim()
        if (!text || isBusy) return
        sendMessage({ text }, { body: { model, post: { title, content, summary } } })
        setInput('')
    }

    return (
        <div className="border rounded-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <button
                type="button"
                onClick={() => setIsExpanded(v => !v)}
                aria-expanded={isExpanded}
                className="w-full p-3 hover:bg-accent/20 transition-colors border-b flex items-center justify-between text-left"
            >
                <span className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ask questions about this post</span>
                    {messages.length > 0 && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            {messages.length} message{messages.length > 1 ? 's' : ''}
                        </span>
                    )}
                </span>
                <span className="text-xs text-muted-foreground">{modelLabel(model)}</span>
            </button>

            {isExpanded && (
                <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 max-w-md mx-auto">
                                <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Ask anything about this post. Answers are grounded in the article text.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto" aria-live="polite">
                            {messages.map(message => (
                                <div
                                    key={message.id}
                                    className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                                            message.role === 'user'
                                                ? 'bg-blue-600 text-white ml-auto'
                                                : 'bg-white dark:bg-gray-800 border',
                                        )}
                                    >
                                        {message.parts.map((part, i) =>
                                            part.type !== 'text' ? null : message.role === 'assistant' ? (
                                                <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>{part.text}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p key={i}>{part.text}</p>
                                            ),
                                        )}
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                            <User className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            {friendlyError(error)}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask a question about this post…"
                            aria-label="Question about this post"
                            maxLength={1_000}
                            className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        {isBusy ? (
                            <button
                                type="button"
                                onClick={stop}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-sm"
                            >
                                <Square className="h-4 w-4" /> Stop
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-4 w-4" /> Send
                            </button>
                        )}
                    </form>

                    {messages.length > 0 && !isBusy && (
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setMessages([])}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3 w-3" /> Clear conversation
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
