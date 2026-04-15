import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';

const PORT = 4321;
const TARGET = { host: '127.0.0.1', port: 4322 };

const server = https.createServer(
    {
        key: fs.readFileSync('.certs/localhost+2-key.pem'),
        cert: fs.readFileSync('.certs/localhost+2.pem'),
    },
    (req, res) => {
        const proxyReq = http.request(
            {
                ...TARGET,
                method: req.method,
                path: req.url,
                headers: { ...req.headers, host: `${TARGET.host}:${TARGET.port}` },
            },
            (proxyRes) => {
                res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
                proxyRes.pipe(res);
            },
        );
        proxyReq.on('error', (err) => {
            console.error(`[https-proxy] upstream error: ${err.message}`);
            if (!res.headersSent) res.writeHead(502);
            res.end(`[https-proxy] bad gateway: ${err.message}`);
        });
        req.pipe(proxyReq);
    },
);

server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
        `[https-proxy] https://localhost:${PORT} → http://${TARGET.host}:${TARGET.port}`,
    );
});