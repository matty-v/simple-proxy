# Simple Proxy Server Design

## Overview

A Google Cloud Function that proxies HTTP requests to allowlisted hosts with global rate limiting.

## Request Flow

```
Client → Rate Limit Check → Parse Target → Allowlist Check → Forward → Return Response
```

1. Check global rate limit (100 req/min, in-memory)
2. Parse target host and path from URL: `/api.example.com/users` → `https://api.example.com/users`
3. Verify host is in allowlist
4. Forward request with same method, headers, query params, body
5. Return response to client

## Project Structure

```
simple-proxy/
├── src/
│   └── index.ts          # Main function + all logic
├── package.json
├── tsconfig.json
└── .gcloudignore
```

## Configuration

**Environment Variables:**
- `ALLOWED_HOSTS` - Comma-separated list: `api.example.com,api.other.com`
- `RATE_LIMIT` - Optional, defaults to 100
- `RATE_WINDOW_MS` - Optional, defaults to 60000 (1 min)

## URL Format

```
https://<function-url>/proxy/<target-host>/<path>?<query>
```

Example:
```
https://us-central1-myproject.cloudfunctions.net/proxy/api.example.com/users?id=123
```

## Rate Limiting

- Global counter (all requests combined)
- 100 requests per minute
- In-memory storage (resets on cold starts)
- Returns 429 with `Retry-After` header when exceeded

## Header Handling

**Forwarded to target:**
- Most client headers (Content-Type, Authorization, etc.)
- Added: `X-Forwarded-For` with client IP

**Stripped:**
- `host`, `connection`, `content-length` (recomputed)

## Error Responses

| Code | Condition |
|------|-----------|
| 400 | Missing or invalid target host in path |
| 403 | Host not in allowlist |
| 429 | Rate limit exceeded |
| 502 | Target server error or unreachable |

## Deployment

```bash
gcloud functions deploy proxy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point proxy \
  --set-env-vars "ALLOWED_HOSTS=api.example.com,api.other.com"
```

## Local Development

```bash
npm run dev  # Runs on localhost:8080
```
