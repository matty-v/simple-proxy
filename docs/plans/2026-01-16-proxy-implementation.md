# Simple Proxy Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Google Cloud Function that proxies HTTP requests to allowlisted hosts with global rate limiting.

**Architecture:** Single TypeScript file handles all logic - rate limiting (in-memory counter), URL parsing, allowlist checking, and request forwarding. Uses @google-cloud/functions-framework for local dev and deployment.

**Tech Stack:** Node.js 20, TypeScript, @google-cloud/functions-framework, node-fetch

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gcloudignore`
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "simple-proxy",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "npx @google-cloud/functions-framework --target=proxy --source=dist/",
    "start": "npm run build && npm run dev",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
  },
  "dependencies": {
    "@google-cloud/functions-framework": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gcloudignore**

```
node_modules/
src/
tsconfig.json
*.md
.git/
.gitignore
jest.config.js
**/*.test.ts
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.env
```

**Step 5: Create jest.config.js**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
};
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: node_modules created, package-lock.json generated

**Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gcloudignore .gitignore jest.config.js
git commit -m "chore: initialize project with TypeScript and Cloud Functions setup"
```

---

### Task 2: Rate Limiter

**Files:**
- Create: `src/rate-limiter.ts`
- Create: `src/rate-limiter.test.ts`

**Step 1: Write failing test for rate limiter**

Create `src/rate-limiter.test.ts`:

```typescript
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      expect(limiter.tryRequest()).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      limiter.tryRequest();
    }

    expect(limiter.tryRequest()).toBe(false);
  });

  it('resets after the time window', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      limiter.tryRequest();
    }

    expect(limiter.tryRequest()).toBe(false);

    jest.advanceTimersByTime(60001);

    expect(limiter.tryRequest()).toBe(true);
  });

  it('returns milliseconds until reset', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      limiter.tryRequest();
    }

    const msUntilReset = limiter.getMsUntilReset();
    expect(msUntilReset).toBeGreaterThan(0);
    expect(msUntilReset).toBeLessThanOrEqual(60000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/rate-limiter.test.ts`
Expected: FAIL with "Cannot find module './rate-limiter'"

**Step 3: Write minimal implementation**

Create `src/rate-limiter.ts`:

```typescript
export class RateLimiter {
  private count: number = 0;
  private resetTime: number;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {
    this.resetTime = Date.now() + windowMs;
  }

  tryRequest(): boolean {
    const now = Date.now();

    if (now > this.resetTime) {
      this.count = 0;
      this.resetTime = now + this.windowMs;
    }

    if (this.count >= this.limit) {
      return false;
    }

    this.count++;
    return true;
  }

  getMsUntilReset(): number {
    return Math.max(0, this.resetTime - Date.now());
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/rate-limiter.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/rate-limiter.ts src/rate-limiter.test.ts
git commit -m "feat: add rate limiter with sliding window"
```

---

### Task 3: URL Parser

**Files:**
- Create: `src/url-parser.ts`
- Create: `src/url-parser.test.ts`

**Step 1: Write failing test for URL parser**

Create `src/url-parser.test.ts`:

```typescript
import { parseTargetUrl } from './url-parser';

describe('parseTargetUrl', () => {
  it('parses host and path from request path', () => {
    const result = parseTargetUrl('/api.example.com/users/123');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/users/123'
    });
  });

  it('handles root path', () => {
    const result = parseTargetUrl('/api.example.com');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/'
    });
  });

  it('handles root path with trailing slash', () => {
    const result = parseTargetUrl('/api.example.com/');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/'
    });
  });

  it('preserves query string', () => {
    const result = parseTargetUrl('/api.example.com/search?q=test&page=1');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/search?q=test&page=1'
    });
  });

  it('returns null for empty path', () => {
    expect(parseTargetUrl('')).toBeNull();
    expect(parseTargetUrl('/')).toBeNull();
  });

  it('returns null for invalid host', () => {
    expect(parseTargetUrl('/not-a-valid-host')).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/url-parser.test.ts`
Expected: FAIL with "Cannot find module './url-parser'"

**Step 3: Write minimal implementation**

Create `src/url-parser.ts`:

```typescript
export interface ParsedTarget {
  host: string;
  targetUrl: string;
}

export function parseTargetUrl(path: string): ParsedTarget | null {
  if (!path || path === '/') {
    return null;
  }

  // Remove leading slash
  const withoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;

  // Split into host and rest
  const slashIndex = withoutLeadingSlash.indexOf('/');
  const host = slashIndex === -1
    ? withoutLeadingSlash
    : withoutLeadingSlash.slice(0, slashIndex);
  const rest = slashIndex === -1
    ? '/'
    : withoutLeadingSlash.slice(slashIndex);

  // Validate host (must contain a dot for domain)
  if (!host || !host.includes('.')) {
    return null;
  }

  return {
    host,
    targetUrl: `https://${host}${rest}`
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/url-parser.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/url-parser.ts src/url-parser.test.ts
git commit -m "feat: add URL parser for extracting target host and path"
```

---

### Task 4: Allowlist Checker

**Files:**
- Create: `src/allowlist.ts`
- Create: `src/allowlist.test.ts`

**Step 1: Write failing test for allowlist**

Create `src/allowlist.test.ts`:

```typescript
import { isHostAllowed, getAllowedHosts } from './allowlist';

describe('allowlist', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getAllowedHosts', () => {
    it('parses comma-separated hosts from env', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com,api.other.com';

      expect(getAllowedHosts()).toEqual(['api.example.com', 'api.other.com']);
    });

    it('trims whitespace', () => {
      process.env.ALLOWED_HOSTS = ' api.example.com , api.other.com ';

      expect(getAllowedHosts()).toEqual(['api.example.com', 'api.other.com']);
    });

    it('returns empty array when not set', () => {
      delete process.env.ALLOWED_HOSTS;

      expect(getAllowedHosts()).toEqual([]);
    });
  });

  describe('isHostAllowed', () => {
    it('returns true for allowed host', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com,api.other.com';

      expect(isHostAllowed('api.example.com')).toBe(true);
    });

    it('returns false for disallowed host', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com';

      expect(isHostAllowed('api.evil.com')).toBe(false);
    });

    it('returns false when no hosts configured', () => {
      delete process.env.ALLOWED_HOSTS;

      expect(isHostAllowed('api.example.com')).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/allowlist.test.ts`
Expected: FAIL with "Cannot find module './allowlist'"

**Step 3: Write minimal implementation**

Create `src/allowlist.ts`:

```typescript
export function getAllowedHosts(): string[] {
  const hostsEnv = process.env.ALLOWED_HOSTS;

  if (!hostsEnv) {
    return [];
  }

  return hostsEnv
    .split(',')
    .map(host => host.trim())
    .filter(host => host.length > 0);
}

export function isHostAllowed(host: string): boolean {
  const allowedHosts = getAllowedHosts();
  return allowedHosts.includes(host);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/allowlist.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/allowlist.ts src/allowlist.test.ts
git commit -m "feat: add allowlist checker for validating target hosts"
```

---

### Task 5: Main Proxy Function

**Files:**
- Create: `src/index.ts`

**Step 1: Write the main proxy function**

Create `src/index.ts`:

```typescript
import { Request, Response } from '@google-cloud/functions-framework';
import * as http from 'http';
import * as https from 'https';
import { RateLimiter } from './rate-limiter';
import { parseTargetUrl } from './url-parser';
import { isHostAllowed } from './allowlist';

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100', 10);
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || '60000', 10);

const rateLimiter = new RateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

const STRIPPED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding'
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'connection'
]);

export async function proxy(req: Request, res: Response): Promise<void> {
  // Rate limit check
  if (!rateLimiter.tryRequest()) {
    const retryAfter = Math.ceil(rateLimiter.getMsUntilReset() / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter
    });
    return;
  }

  // Parse target URL
  const parsed = parseTargetUrl(req.path);
  if (!parsed) {
    res.status(400).json({
      error: 'Invalid request path. Expected: /<host>/<path>'
    });
    return;
  }

  // Allowlist check
  if (!isHostAllowed(parsed.host)) {
    res.status(403).json({
      error: `Host not allowed: ${parsed.host}`
    });
    return;
  }

  // Build target URL with query string
  const targetUrl = req.query && Object.keys(req.query).length > 0
    ? `${parsed.targetUrl}${parsed.targetUrl.includes('?') ? '&' : '?'}${new URLSearchParams(req.query as Record<string, string>).toString()}`
    : parsed.targetUrl;

  // Forward headers
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase()) && typeof value === 'string') {
      headers[key] = value;
    }
  }

  // Add X-Forwarded-For
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  headers['X-Forwarded-For'] = headers['X-Forwarded-For']
    ? `${headers['X-Forwarded-For']}, ${clientIp}`
    : clientIp;

  try {
    const response = await forwardRequest(targetUrl, req.method, headers, req.body);

    // Set response headers
    for (const [key, value] of Object.entries(response.headers)) {
      if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase()) && value) {
        res.setHeader(key, value);
      }
    }

    res.status(response.statusCode).send(response.body);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({
      error: 'Failed to reach target server'
    });
  }
}

interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

function forwardRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown
): Promise<ProxyResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers
    };

    const proxyReq = httpModule.request(options, (proxyRes) => {
      const chunks: Buffer[] = [];

      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode || 500,
          headers: proxyRes.headers as Record<string, string | string[] | undefined>,
          body: Buffer.concat(chunks)
        });
      });
    });

    proxyReq.on('error', reject);

    if (body && method !== 'GET' && method !== 'HEAD') {
      const bodyData = typeof body === 'string' ? body : JSON.stringify(body);
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  });
}
```

**Step 2: Build and verify no TypeScript errors**

Run: `npm run build`
Expected: Compiles successfully, creates dist/ folder

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add main proxy function with request forwarding"
```

---

### Task 6: Local Testing

**Step 1: Create a test environment file**

Create `.env.example`:

```
ALLOWED_HOSTS=httpbin.org,api.github.com
RATE_LIMIT=100
RATE_WINDOW_MS=60000
```

**Step 2: Test locally**

Run: `ALLOWED_HOSTS=httpbin.org npm start`
Expected: Server starts on port 8080

**Step 3: Test with curl in another terminal**

Run: `curl http://localhost:8080/httpbin.org/get`
Expected: JSON response from httpbin.org with request details

Run: `curl http://localhost:8080/evil.com/test`
Expected: 403 with "Host not allowed: evil.com"

Run: `curl http://localhost:8080/`
Expected: 400 with "Invalid request path"

**Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: add example environment file"
```

---

### Task 7: Run All Tests

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (16 tests across 3 files)

**Step 2: Final commit if any cleanup needed**

```bash
git status
# If clean, no action needed
```

---

## Deployment (Manual Step)

When ready to deploy:

```bash
gcloud functions deploy proxy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point proxy \
  --set-env-vars "ALLOWED_HOSTS=api.example.com,api.other.com" \
  --region us-central1
```
