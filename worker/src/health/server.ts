import http from 'node:http';
import { config } from '../config.js';
import { browserPool } from '../browser/pool.js';
import { jobsInFlight } from '../workers/scrape-worker.js';

export function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        browsers: browserPool.stats(),
        jobsInFlight: jobsInFlight(),
      }));
      return;
    }
    res.writeHead(404); res.end();
  });
  server.listen(config.PORT);
  return server;
}
