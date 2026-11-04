# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Commands

```bash
npm run dev        # Dev server at localhost:3000
npm run build      # Production build
npm run lint       # ESLint (flat config, eslint-config-next)
npm run typecheck  # tsc --noEmit
npm test           # Unit tests via node --test (lib/**/*.test.ts)
```

## Environment

LLM calls go through Vercel AI Gateway via the AI SDK (`model: 'provider/model'` strings). On Vercel, auth is automatic (OIDC). Locally, run `vercel env pull` to get a `VERCEL_OIDC_TOKEN` in `.env.local`, or set `AI_GATEWAY_API_KEY`. See `.env.example`.

## Architecture

Next.js 16 App Router, React 19, TypeScript, Tailwind 3. No database: feeds, read state, theme, and model choice live in localStorage.

- `app/page.tsx` is a Server Component shell. `components/Dashboard.tsx` is the client island holding state shared by `RssFeedManager` (left) and `BlogList` (right).
- `components/posts/PostCard.tsx` streams a structured summary with `useObject`. `components/BlogChat.tsx` streams chat with `useChat`.

### API routes (`app/api/`)

- `summarize`: `streamText` + `Output.object(summarySchema)`, streamed as text. Waits for the first chunk so provider failures return 502 instead of an empty 200.
- `chat`: `streamText` → UI message stream. Post content goes in `instructions`, wrapped in tags and marked untrusted.
- `fetch-blogs`: fetches all feeds in parallel (`Promise.allSettled`); each feed is cached in the Next.js Data Cache for 15 minutes.
- `validate-feed`, `discover-feeds`: feed validation and discovery (direct URL → `<link rel=alternate>` → common paths).
- `feeds`: optional file storage, off unless `FEEDS_FILE_STORAGE=true`. Local use only.

### Invariants

- Every outbound fetch of a user-supplied URL goes through `lib/safe-fetch.ts` (SSRF guard: protocol/port allowlist, DNS check against private ranges, per-hop redirect validation, size and time limits). Don't call `fetch` or `rss-parser.parseURL` on user URLs directly.
- Models must be in the `lib/models.ts` allowlist; routes reject anything else.
- Request bodies are validated with zod; every public route calls `rateLimit()` from `lib/rate-limit.ts`.
- `lib/summary-schema.ts` is shared by server and client. Change both sides together.

### Path alias

`@/*` maps to the project root.
