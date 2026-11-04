import { z } from 'zod'

/**
 * Shared between the /api/summarize route (structured output) and the client
 * (`useObject`), so the streamed partial object is typed end to end.
 */
export const summarySchema = z.object({
    tldr: z.string().describe('Two to three sentences: who did what, and why it matters.'),
    key_points: z
        .array(z.string())
        .describe('3 to 6 key points, each one or two full sentences with concrete detail.'),
    data_highlights: z
        .array(z.string())
        .describe('Every number, percentage, amount, or date that supports the key points. Empty if none.'),
    why_it_matters: z.string().describe('One short paragraph linking the findings to real-world impact.'),
    caveats: z
        .string()
        .nullable()
        .describe('Limitations, uncertainties, or dissenting views stated in the article; null if none.'),
    actionable_insight: z.string().nullable().describe('A concrete next step for the reader; null if none.'),
    notable_quote: z
        .object({ quote: z.string(), attribution: z.string() })
        .nullable()
        .describe('An exact quote from the article; null if there is none worth highlighting.'),
    tone: z.string().describe('A single word describing the mood of the article.'),
})

export type Summary = z.infer<typeof summarySchema>

/** Request body for /api/summarize. */
export const summarizeRequestSchema = z.object({
    title: z.string().max(500),
    content: z.string().max(200_000),
    model: z.string(),
})

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>
