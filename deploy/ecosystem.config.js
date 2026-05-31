/**
 * PM2 ecosystem | LeadsThru API
 *
 * Cluster mode + graceful reload = zero-downtime deploys.
 * `pm2 reload` restarts workers one-by-one; each new worker must call
 * `process.send('ready')` (wait_ready=true) before PM2 kills the old one.
 *
 * Health probe: GET /health (used by Nginx upstream + GitHub Actions smoke tests).
 */
module.exports = {
  apps: [
    {
      name: "leadsthru-api",
      script: "backend/server.js",
      cwd: "/var/www/leadsthru/current",
      instances: "max",            // one worker per CPU core
      exec_mode: "cluster",
      wait_ready: true,            // worker must signal ready before PM2 swaps it in
      listen_timeout: 10000,       // 10s for app to bind + warm caches
      kill_timeout: 8000,          // 8s for in-flight requests to drain
      shutdown_with_message: true,
      max_memory_restart: "1G",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 2000,
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 4000,
      },
      // Log rotation handled by pm2-logrotate module:
      //   pm2 install pm2-logrotate
      //   pm2 set pm2-logrotate:max_size 100M
      //   pm2 set pm2-logrotate:retain 14
      error_file: "/var/log/leadsthru/api.error.log",
      out_file: "/var/log/leadsthru/api.out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "leadsthru-worker",
      script: "backend/worker.js",
      cwd: "/var/www/leadsthru/current",
      instances: 2,
      exec_mode: "cluster",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 30000,         // background jobs need longer to drain
      max_memory_restart: "1G",
      env_production: { NODE_ENV: "production" },
      env_staging:    { NODE_ENV: "staging" },
      error_file: "/var/log/leadsthru/worker.error.log",
      out_file: "/var/log/leadsthru/worker.out.log",
    },
  ],
};
