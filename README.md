# simple-proxy

A lightweight HTTP proxy deployed as a Google Cloud Function. Proxies requests to allowed upstream APIs while handling CORS and stripping browser-identifying headers.

## Usage

Make requests to the proxy with the target host and path:

```
https://<proxy-url>/<target-host>/<path>
```

**Example:**
```bash
curl https://your-proxy.cloudfunctions.net/api.github.com/users/octocat
```

This proxies to `https://api.github.com/users/octocat`.

## Features

- **Host allowlist** - Only configured hosts can be proxied
- **CORS handling** - Configurable allowed origins, handles preflight requests
- **Browser header stripping** - Removes Origin, Referer, Sec-* headers so upstream APIs don't detect browser requests
- **Rate limiting** - Global rate limit with configurable window
- **All HTTP methods** - GET, POST, PUT, DELETE, PATCH supported

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_HOSTS` | Pipe-separated list of allowed target hosts | (required) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins (empty = allow all) | `*` |
| `RATE_LIMIT` | Max requests per window | `100` |
| `RATE_WINDOW_MS` | Rate limit window in milliseconds | `60000` |

**Example:**
```
ALLOWED_HOSTS=api.github.com|api.anthropic.com
CORS_ALLOWED_ORIGINS=https://myapp.com,https://localhost:3000
RATE_LIMIT=100
RATE_WINDOW_MS=60000
```

> **Note:** Use `|` (pipe) as the delimiter for `ALLOWED_HOSTS`. Commas don't work with the GCF deploy action.

## Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Build and run locally
npm start

# Run tests
npm test
```

The local server runs at `http://localhost:8080`.

## Deployment

The proxy deploys automatically to Google Cloud Functions on push to `main`.

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `WIF_PROVIDER` | Workload Identity Federation provider |
| `WIF_SERVICE_ACCOUNT` | GCP service account email |

### GitHub Variables Required

| Variable | Description |
|----------|-------------|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_REGION` | Deployment region (default: `us-central1`) |
| `ALLOWED_HOSTS` | Pipe-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |

## Error Responses

| Status | Error |
|--------|-------|
| `400` | Invalid request path |
| `403` | Host not allowed |
| `429` | Rate limit exceeded (includes `Retry-After` header) |
| `502` | Failed to reach target server |
