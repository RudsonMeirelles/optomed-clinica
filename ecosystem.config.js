module.exports = {
  apps: [
    {
      name: 'optomed-server',
      cwd: 'C:/Users/Zanutto/Downloads/sist Clinica',
      script: 'npm',
      args: 'run dev --workspace=@optotipo/server',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 8765
      }
    },
    {
      name: 'optomed-tv',
      cwd: 'C:/Users/Zanutto/Downloads/sist Clinica',
      script: 'npm',
      args: 'run dev --workspace=@optotipo/offline-tv',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    },
    {
      name: 'optomed-clinical',
      cwd: 'C:/Users/Zanutto/Downloads/sist Clinica',
      script: 'npm',
      args: 'run dev --workspace=@optotipo/clinical',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    },
    {
      name: 'optomed-tunnel',
      cwd: 'C:/Users/Zanutto/Downloads/sist Clinica',
      script: 'cloudflared',
      args: 'tunnel --config C:/Users/Zanutto/.cloudflared/config.yml run',
      autorestart: true,
      max_restarts: 50,
      restart_delay: 5000
    }
  ]
};
