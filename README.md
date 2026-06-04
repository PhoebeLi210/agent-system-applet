# agent-system-applet

This repo contains the backend server and the WeChat mini-program used by the agent system.

Quick start (production):

1. Clone repository and install:
```bash
git clone https://github.com/<yourname>/<your-repo>.git
cd agent-system-applet
npm install --production
```

2. Configure environment variables (see `.env.example`)

3. Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

4. Configure reverse proxy (nginx/Caddy) to expose `https://agent.lakala.space`

See `DEPLOY.md` for full deployment instructions.
