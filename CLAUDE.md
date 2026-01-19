# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm test           # Run all tests
npm run dev        # Start local dev server (requires build first)
npm start          # Build and start local dev server

# Run a single test file
npm test -- src/rate-limiter.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="rate limit"
```

## Architecture

This is an HTTP proxy server deployed as a Google Cloud Function. It forwards requests to allowed upstream APIs while handling CORS and stripping browser-identifying headers.

**Request flow:**
1. CORS headers set on all responses
2. OPTIONS requests return 204 (preflight)
3. Rate limit check (global, in-memory)
4. URL parsed from path: `/<host>/<path>` → `https://<host>/<path>`
5. Host validated against allowlist
6. Browser headers stripped (Origin, Referer, Sec-*)
7. Request forwarded to upstream
8. CORS headers from upstream stripped, response returned

**Key modules:**
- `src/index.ts` - Main proxy function, CORS handling, header stripping
- `src/allowlist.ts` - Host allowlist from `ALLOWED_HOSTS` env var
- `src/rate-limiter.ts` - Fixed-window rate limiter
- `src/url-parser.ts` - Parses `/<host>/<path>` from request path

## Environment Variables

Use `|` (pipe) delimiter for lists - commas break GCF deploy parsing.

```
ALLOWED_HOSTS=api.example.com|api.other.com      # Pipe-separated (comma also supported)
CORS_ALLOWED_ORIGINS=https://myapp.com|https://localhost:3000  # Pipe-separated (comma also supported)
RATE_LIMIT=100                                   # Requests per window
RATE_WINDOW_MS=60000                             # Window in milliseconds
```

## Deployment

Deploys automatically on push to `main` via GitHub Actions. Uses Workload Identity Federation for GCP auth.

GitHub secrets required: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`
GitHub variables: `GCP_PROJECT_ID`, `GCP_REGION`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
