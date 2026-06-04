module.exports = {
  apps: [
    {
      name: 'agent-system',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3002,
        DEFAULT_AGENT_PASSWORD: process.env.DEFAULT_AGENT_PASSWORD || '',
        ADMIN_SECRET: process.env.ADMIN_SECRET || ''
      }
    }
  ]
};
