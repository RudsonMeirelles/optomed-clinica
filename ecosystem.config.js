module.exports = {
  apps: [
    {
      // Servidor principal: Express + API de dados + WebSocket + serve SPA compilado
      name: 'optomed-server',
      cwd: 'C:/Users/Zanutto/Downloads/sist Clinica/packages/server',
      script: 'node',
      args: 'dist/index.js',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 8765
      },
      error_file: 'C:/Users/Zanutto/Downloads/sist Clinica/logs/server-error.log',
      out_file: 'C:/Users/Zanutto/Downloads/sist Clinica/logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      // Tunel Cloudflare: expoe porta 8765 para optomed.app.br / app.optomed.app.br
      name: 'optomed-tunnel',
      cwd: 'C:/Users/Zanutto/Downloads/sist Clinica',
      script: 'cloudflared',
      args: 'tunnel --config C:/Users/Zanutto/.cloudflared/config.yml run',
      autorestart: true,
      watch: false,
      max_restarts: 50,
      restart_delay: 5000,
      error_file: 'C:/Users/Zanutto/Downloads/sist Clinica/logs/tunnel-error.log',
      out_file: 'C:/Users/Zanutto/Downloads/sist Clinica/logs/tunnel-out.log'
    }
  ]
};
