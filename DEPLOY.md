# 部署到生产 — 指南（宝塔 / Alibaba Cloud）

此文档说明把当前项目部署到宝塔（Alibaba Cloud）Linux 服务器的步骤，包含环境变量、PM2、反向代理与小程序发布要点。

重要：不要在公开仓库或聊天中粘贴任何 `personal access token`、SSH 私钥或明文密码。以下命令示例要求在你本地或服务器上执行。

1) 在服务器上准备

- 安装 Node.js（建议 v16+）
- 安装 `pm2`：`npm i -g pm2` 或使用宝塔面板的 Node 管理器
- 确保端口 80/443 可访问，若使用宝塔面板可在网站设置中申请或绑定域名

2) 上传代码到服务器

- 推荐用 Git 克隆你的仓库到服务器：
  ```bash
  git clone https://github.com/<yourname>/<your-repo>.git /www/wwwroot/agent-system
  cd /www/wwwroot/agent-system
  npm install --production
  ```

3) 环境变量

- 在宝塔面板「计划任务」或在 `ecosystem.config.js` 中配置环境变量：
  - `NODE_ENV=production`
  - `PORT=3002`
  - `DEFAULT_AGENT_PASSWORD`（可留空或设置临时强密码）
  - `ADMIN_SECRET`（用于 JWT）

4) 使用 PM2 启动

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

5) 反向代理与 TLS

- 推荐使用 nginx 或 Caddy（Caddy 自动签发 Let’s Encrypt 证书）将 `https://agent.lakala.space` 代理到 `http://127.0.0.1:3002`。

6) 数据库与备份

- 备份 `data/agent-system.db`，并定期保存异地备份。

7) 小程序发布要点

- 确保小程序后台配置了 `agent.lakala.space` 为合法域名
- 在微信开发者工具中打开 `mini-program` 文件夹，切换至线上配置，执行上传并提交审核

8) 回滚

- 在出现问题时停止 pm2、还原代码与数据库备份、重启服务：
  ```bash
  pm2 stop agent-system
  # 恢复备份的代码/数据库
  pm2 start agent-system
  ```

更多细节见 `README.md` 和项目根目录的示例配置文件。
