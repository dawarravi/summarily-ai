import type { DeepPartial } from 'ai'
import type { Summary } from '@/lib/summary-schema'

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
    return (
        <div>
            <h5 className={className ?? 'text-sm font-semibold text-primary mb-1'}>{title}</h5>
            {children}
        </div>
    )
}

/**
 * Renders a (possibly partial, still-streaming) structured summary. Every
 * field may be undefined while the object streams in.
 */
export function RichSummary({ summary }: { summary: DeepPartial<Summary> }) {
    const keyPoints = summary.key_points?.filter(Boolean) ?? []
    const data = summary.data_highlights?.filter(Boolean) ?? []

    return (
        <div className="space-y-4">
            {summary.tldr && (
                <Section title="TL;DR">
                    <p className="text-sm font-medium">{summary.tldr}</p>
                </Section>
            )}

            {keyPoints.length > 0 && (
                <Section title="Key points" className="text-sm font-semibold text-primary mb-2">
                    <ul className="space-y-1">
                        {keyPoints.map((point, i) => (
                            <li key={i} className="text-sm flex items-start">
                                <span className="text-primary mr-2 mt-0.5">•</span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {data.length > 0 && (
                <Section title="Key data" className="text-sm font-semibold text-primary mb-2">
                    <ul className="flex flex-wrap gap-2">
                        {data.map((item, i) => (
                            <li
                                key={i}
                                className="font-mono text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded text-xs"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {summary.why_it_matters && (
                <Section title="Why it matters">
                    <p className="text-sm">{summary.why_it_matters}</p>
                </Section>
            )}

            {summary.caveats && (
                <Section title="Caveats" className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                    <p className="text-sm bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-md p-2 text-orange-800 dark:text-orange-200">
                        {summary.caveats}
                    </p>
                </Section>
            )}

            {summary.notable_quote?.quote && (
                <Section title="Notable quote">
                    <blockquote className="text-sm italic border-l-2 border-primary/30 pl-3">
                        “{summary.notable_quote.quote}”
                        {summary.notable_quote.attribution && (
                            <footer className="not-italic text-xs text-muted-foreground mt-1">
                                — {summary.notable_quote.attribution}
                            </footer>
                        )}
                    </blockquote>
                </Section>
            )}

            {summary.actionable_insight && (
                <Section title="Try this">
                    <p className="text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-md p-2">
                        {summary.actionable_insight}
                    </p>
                </Section>
            )}

            {summary.tone && <p className="text-xs text-muted-foreground">Tone: <span className="italic">{summary.tone}</span></p>}
        </div>
    )
}

/** Plain-text rendering used as chat context. */
export function summaryToText(summary: DeepPartial<Summary> | undefined): string | undefined {
    if (!summary?.tldr) return undefined
    const points = (summary.key_points ?? []).filter(Boolean).map(p => `- ${p}`).join('\n')
    return [summary.tldr, points, summary.why_it_matters].filter(Boolean).join('\n\n')
}
