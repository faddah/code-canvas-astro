/**
 * AWS Lambda Handler for Astro Application with S3 Database Persistence
 *
 * This handler:
 * 1. Downloads SQLite database from S3 to /tmp on cold start
 * 2. Starts the Astro Node.js server
 * 3. Proxies Lambda events to the Astro server
 * 4. Uploads database changes back to S3 periodically
 * 5. Returns responses in Lambda's expected format
 */

const { spawn } = require('child_process');
const http = require('http');
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const { Readable } = require('stream');

// S3 Configuration
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'code-canvas-astro-db';
const S3_KEY = process.env.S3_DB_KEY || 'database/taskManagement.db';
const DB_PATH = '/tmp/taskManagement.db';
const AWS_REGION = process.env.AWS_REGION || 'us-west-2';

// Initialize S3 client
const s3Client = new S3Client({ region: AWS_REGION });

// Server process and state
let astroServer = null;
let serverReady = false;
let dbInitialized = false;
let lastS3Sync = Date.now();
const PORT = 8080; // Lambda expects port 8080 for web adapter
const SYNC_INTERVAL_MS = 30000; // Sync to S3 every 30 seconds

/**
 * Download database from S3 to /tmp
 */
async function downloadDatabaseFromS3() {
  try {
    console.log(`Downloading database from S3: s3://${S3_BUCKET}/${S3_KEY}`);

    // Check if database exists in S3
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: S3_KEY
      }));
      console.log('✓ Database found in S3');
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log('ℹ️  Database not found in S3, will create new one');
        return false;
      }
      throw error;
    }

    // Download database
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY
    });

    const response = await s3Client.send(command);
    const stream = response.Body;

    // Write to /tmp
    const writeStream = fs.createWriteStream(DB_PATH);

    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`✓ Database downloaded to ${DB_PATH}`);
    return true;

  } catch (error) {
    console.error('Failed to download database from S3:', error);
    return false;
  }
}

/**
 * Upload database to S3
 */
async function uploadDatabaseToS3() {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      console.log('ℹ️  No database file to upload');
      return;
    }

    console.log(`Uploading database to S3: s3://${S3_BUCKET}/${S3_KEY}`);

    const fileStream = fs.createReadStream(DB_PATH);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Body: fileStream,
      ContentType: 'application/x-sqlite3',
      Metadata: {
        'last-updated': new Date().toISOString(),
        'lambda-function': process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown'
      }
    });

    await s3Client.send(command);
    lastS3Sync = Date.now();
    console.log('✓ Database uploaded to S3');

  } catch (error) {
    console.error('Failed to upload database to S3:', error);
    throw error;
  }
}

/**
 * Sync database to S3 if enough time has passed
 */
async function syncDatabaseToS3IfNeeded() {
  const timeSinceLastSync = Date.now() - lastS3Sync;

  if (timeSinceLastSync >= SYNC_INTERVAL_MS) {
    console.log(`Syncing database to S3 (${Math.round(timeSinceLastSync / 1000)}s since last sync)`);
    await uploadDatabaseToS3();
  }
}

/**
 * Initialize and start the Astro server
 */
async function startAstroServer() {
  if (astroServer) {
    return; // Server already running
  }

  console.log('Starting Astro server for Lambda...');

  // Try to download existing database from S3
  if (!dbInitialized) {
    const dbExists = await downloadDatabaseFromS3();

    if (!dbExists) {
      // Initialize database schema
      console.log('Initializing database schema...');
      const initDb = spawn('node', ['./scripts/init-db.js'], {
        env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
        cwd: process.env.LAMBDA_TASK_ROOT || '/var/task'
      });

      await new Promise((resolve, reject) => {
        initDb.on('close', (code) => {
          if (code === 0) {
            console.log('✓ Database schema initialized');
            resolve();
          } else {
            reject(new Error(`Database initialization failed with code ${code}`));
          }
        });
      });

      // Seed database with initial data
      console.log('Seeding database...');
      const seedDb = spawn('node', ['./scripts/seed-db.js'], {
        env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
        cwd: process.env.LAMBDA_TASK_ROOT || '/var/task'
      });

      await new Promise((resolve, reject) => {
        seedDb.on('close', (code) => {
          if (code === 0) {
            console.log('✓ Database seeded');
            resolve();
          } else {
            reject(new Error(`Database seeding failed with code ${code}`));
          }
        });
      });

      // Upload initial database to S3
      await uploadDatabaseToS3();
    }

    dbInitialized = true;
  }

  // Start Astro server
  console.log(`Starting Astro server on port ${PORT}...`);
  astroServer = spawn('node', ['./dist/server/entry.mjs'], {
    env: {
      ...process.env,
      HOST: '0.0.0.0',
      PORT: PORT.toString(),
      NODE_ENV: 'production',
      DATABASE_URL: `file:${DB_PATH}`
    },
    cwd: process.env.LAMBDA_TASK_ROOT || '/var/task',
    stdio: ['ignore', 'pipe', 'pipe']
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
 * Wait for server to be ready by polling
 */
function waitForServer(port, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkServer = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Server startup timeout'));
        return;
      }

      const req = http.get(`http://localhost:${port}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          setTimeout(checkServer, 100);
        }
      });

      req.on('error', () => {
        setTimeout(checkServer, 100);
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
exports.handler = async (event, context) => {
  try {
    // Start server on first invocation (cold start)
    if (!serverReady) {
      await startAstroServer();
    }

    // For Lambda Function URL, the event is already in the right format
    // We just need to proxy it to the local server

    const path = event.rawPath || event.path || '/';
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const headers = event.headers || {};
    const body = event.body || '';

    console.log(`[Lambda] ${method} ${path}`);

    // Proxy request to Astro server
    const response = await proxyToAstro(method, path, headers, body);

    // Sync database to S3 if needed (for write operations or after interval)
    if (method !== 'GET' && method !== 'HEAD') {
      // Write operation detected, sync immediately
      console.log('Write operation detected, syncing to S3...');
      await uploadDatabaseToS3();
    } else {
      // For read operations, sync only if interval has passed
      await syncDatabaseToS3IfNeeded();
    }

    return response;

  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `Internal Server Error: ${error.message}`
    };
  } finally {
    // On Lambda shutdown, try to sync one last time
    // This uses context.callbackWaitsForEmptyEventLoop
    if (context.getRemainingTimeInMillis() < 3000) {
      console.log('Lambda shutting down, final S3 sync...');
      await uploadDatabaseToS3().catch(err =>
        console.error('Final sync failed:', err)
      );
    }
  }
};

/**
 * Proxy request to the local Astro server
 */
function proxyToAstro(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        ...headers,
        'host': `localhost:${PORT}` // Override host header
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
          isBase64Encoded: false
        });
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
