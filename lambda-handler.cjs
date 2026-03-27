/**
 * AWS Lambda Handler for Astro Application with Turso Database
 *
 * This handler:
 * 1. Starts the Astro Node.js server on cold start
 * 2. Proxies Lambda events to the Astro server
 * 3. Returns responses in Lambda's expected format
 *
 * Database is handled by Turso (remote libSQL) — no local file management needed.
 */

const { spawn } = require('child_process');
const http = require('http');
const { URL } = require('url');

// Server process and state
let astroServer = null;
let serverReady = false;
const PORT = 8080; // Lambda expects port 8080 for web adapter

/**
 * Initialize and start the Astro server
 */
async function startAstroServer() {
  if (astroServer) {
    return; // Server already running
  }

  console.log('Starting Astro server for Lambda...');

  // Start Astro server — Turso connection is handled via env vars
  // (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in Lambda config)
  console.log(`Starting Astro server on port ${PORT}...`);
  astroServer = spawn('node', ['./dist/server/entry.mjs'], {
    env: {
      ...process.env,
      HOST: '0.0.0.0',
      PORT: PORT.toString(),
      NODE_ENV: 'production',
    },
    cwd: process.env.LAMBDA_TASK_ROOT || '/var/task',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  astroServer.stdout.on('data', (data) => {
    console.log(`[Astro] ${data.toString().trim()}`);
  });

  astroServer.stderr.on('data', (data) => {
    console.error(`[Astro Error] ${data.toString().trim()}`);
  });

  astroServer.on('close', (code) => {
    console.log(`Astro server exited with code ${code}`);
    astroServer = null;
    serverReady = false;
  });

  // Wait for server to be ready
  await waitForServer(PORT, 30000); // 30 second timeout
  serverReady = true;
  console.log('✓ Astro server ready');
}


/**
 * Wait for server to be ready by polling the /api/health endpoint.
 * This ensures the full Astro middleware stack (Clerk, routing) is
 * initialized before we proxy real traffic — not just that the HTTP
 * server is listening.
 */
function waitForServer(port, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const FALLBACK_MS = 25000; // after 25s, accept any non-503 response
    let fallbackWarned = false;

    console.log('Waiting for Astro server readiness (deep check: /api/health)...');

    const checkServer = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        reject(new Error('Server startup timeout'));
        return;
      }

      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        // Consume the response body to prevent socket hang-up
        res.resume();

        if (res.statusCode === 200) {
          resolve();
        } else if (elapsed > FALLBACK_MS && res.statusCode !== 503) {
          // After 25s, accept any non-503 response so we don't block
          // forever if the DB is unreachable but routes are loaded
          if (!fallbackWarned) {
            console.warn(
              `[waitForServer] /api/health returned ${res.statusCode} after ${elapsed}ms — ` +
              'accepting as ready (fallback mode)'
            );
            fallbackWarned = true;
          }
          resolve();
        } else {
          setTimeout(checkServer, 200);
        }
      });

      req.on('error', () => {
        setTimeout(checkServer, 200);
      });

      req.end();
    };

    checkServer();
  });
}

/**
 * Lambda handler function
 * This is called for each Lambda invocation
 */
exports.handler = async (event, _context) => {
  try {
    // Start server on first invocation (cold start)
    if (!serverReady) {
      await startAstroServer();
    }

    // For Lambda Function URL, the event is already in the right format
    // We just need to proxy it to the local server

    let path = event.rawPath || event.path || '/';
    const queryString = event.rawQueryString || '';
    if (queryString) {
      path = `${path}?${queryString}`;
    }
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const headers = event.headers || {};

    // API Gateway HTTP API (v2, payload format 2.0) extracts cookies from
    // the Cookie header and places them in event.cookies[].  Reconstruct
    // the Cookie header so the Astro server (and Clerk middleware) can
    // read session tokens.
    if (event.cookies && Array.isArray(event.cookies) && event.cookies.length > 0) {
      headers['cookie'] = event.cookies.join('; ');
    }

    // API Gateway v2 may base64-encode the request body
    let body = event.body || '';
    if (body && event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }

    // Log request details (include cookie presence for auth debugging)
    const hasCookies = !!headers['cookie'];
    const cookieNames = hasCookies
      ? headers['cookie'].split(';').map(c => c.trim().split('=')[0]).join(', ')
      : '(none)';
    console.log(`[Lambda] ${method} ${path} | cookies: ${cookieNames}`);

    // Proxy request to Astro server
    const response = await proxyToAstro(method, path, headers, body);

    // Log response status for API calls (auth debugging)
    if (path.startsWith('/api/')) {
      console.log(`[Lambda] ${method} ${path} → ${response.statusCode}`);
    }

    return response;

  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `Internal Server Error: ${error.message}`,
    };
  }
};

/**
 * Proxy request to the local Astro server
 */
function proxyToAstro(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    // Resolve the public-facing host so Clerk (and Astro) build correct
    // redirect URLs.  Priority: x-forwarded-host → origin header → PUBLIC_HOST
    // env var → fall back to the upstream host from API Gateway.
    const publicHost =
      headers['x-forwarded-host'] ||
      (headers['origin'] ? new URL(headers['origin']).host : null) ||
      process.env.PUBLIC_HOST ||
      headers['host'];

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        ...headers,
        'host': publicHost,                // public domain, NOT localhost
        'x-forwarded-host': publicHost,
        'x-forwarded-proto': 'https',
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        // Lambda Function URL / API Gateway v2 requires headers to be
        // {string: string} — no arrays allowed. Node.js res.headers
        // returns set-cookie (and potentially others) as arrays, which
        // causes API Gateway to return {"message":"Internal Server Error"}.
        const flatHeaders = {};
        const cookies = [];

        for (const [key, value] of Object.entries(res.headers)) {
          // Skip headers that are invalid for API Gateway v2 responses
          if (key === 'transfer-encoding' || key === 'content-length') {
            continue;
          }
          if (key === 'set-cookie') {
            // set-cookie must go in the separate 'cookies' array
            if (Array.isArray(value)) {
              cookies.push(...value);
            } else {
              cookies.push(value);
            }
          } else if (Array.isArray(value)) {
            // Join other multi-value headers with comma (RFC 7230)
            flatHeaders[key] = value.join(', ');
          } else {
            flatHeaders[key] = value;
          }
        }

        // Set correct content-length from the actual response body
        flatHeaders['content-length'] = Buffer.byteLength(responseBody).toString();

        // Don't let browsers cache error responses with immutable headers.
        // If the upstream returned a 4xx/5xx, override cache-control so
        // browsers will retry on next navigation instead of serving a
        // cached error for a year.
        if (res.statusCode >= 400) {
          flatHeaders['cache-control'] = 'no-store';
        }

        const response = {
          statusCode: res.statusCode,
          headers: flatHeaders,
          body: responseBody,
          isBase64Encoded: false,
        };

        // Only include cookies array if there are cookies to set
        if (cookies.length > 0) {
          response.cookies = cookies;
        }

        resolve(response);
      });
    });

    req.on('error', (error) => {
      console.error('Proxy error:', error);
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}
