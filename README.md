# agent-system-applet

This repo contains the backend server and the WeChat mini-program used by the agent system.

Quick start (production):

1. Clone repository and install:
```bash
git clone https://github.com/<yourname>/<your-repo>.git
cd agent-system-applet
npm install --production
```

2. Configure environment variables (see `.env.example`).
   - `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_PASSWORD` should be set.
   - `BAIDU_API_KEY`, `BAIDU_SECRET_KEY`, `WECHAT_APPID`, `WECHAT_APPSECRET`, `MINIPROGRAM_APPID`, and `MINIPROGRAM_APPSECRET` must be configured for OCR and WeChat functionality.

3. Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

4. Configure reverse proxy (nginx/Caddy) to expose `https://agent.lakala.space`

See `DEPLOY.md` for full deployment instructions.
