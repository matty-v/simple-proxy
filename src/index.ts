import { Request, Response } from '@google-cloud/functions-framework';
import * as http from 'http';
import * as https from 'https';
import { RateLimiter } from './rate-limiter';
import { parseTargetUrl } from './url-parser';
import { isHostAllowed } from './allowlist';
import { isClientAllowed } from './client-allowlist';

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

function setCorsHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export async function proxy(req: Request, res: Response): Promise<void> {
  // Set CORS headers on all responses
  setCorsHeaders(res);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Get client IP from X-Forwarded-For (Cloud Run) or direct connection
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : req.ip || req.socket?.remoteAddress || 'unknown';

  // Client IP allowlist check
  if (!isClientAllowed(clientIp)) {
    res.status(403).json({
      error: 'Client IP not allowed'
    });
    return;
  }

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
  headers['X-Forwarded-For'] = clientIp;

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
