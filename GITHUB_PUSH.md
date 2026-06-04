# 将本地代码推送到 GitHub 的安全操作说明

1) 在 GitHub 上创建仓库
- 登录 https://github.com/ 并新建仓库（例如 `agent-system-applet`）。不要勾选初始化 README。

2) 本地添加远程并推送
```bash
cd D:/lakala-app/tkfront/agent-system/agent-system-applet
git init
git add .
git commit -m "Prepare deployment files and docs"
git branch -M main
git remote add origin https://github.com/<yourname>/<your-repo>.git
git push -u origin main
```

3) 使用个人访问令牌（PAT）或 `gh` CLI
- 推荐使用 `gh auth login` 来登录并推送，不要在命令行或聊天中明文粘贴 PAT。

4) 为 GitHub Actions 设置 secrets（如果要启用自动部署）
- 在仓库页面：Settings → Secrets and variables → Actions → New repository secret，添加以下 secrets：
  - `SERVER_HOST`：服务器 IP 或域名
  - `SERVER_PORT`：SSH 端口（默认 22）
  - `SERVER_USER`：SSH 用户（例如 `root` 或 `deploy`）
  - `SERVER_SSH_KEY`：SSH 私钥（private key, 连同 /without passphrase 均可）
  - 可选 `SERVER_PATH`：部署目录（默认 `/www/wwwroot/agent-system`）

5) 手动在服务器上准备（仅一次）
- 在服务器上安装 Git、Node.js、npm、pm2：
  ```bash
  # Debian/Ubuntu 示例
  apt update && apt install -y git curl
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  npm i -g pm2
  ```

6) 触发部署
- 将代码 push 到 `main` 分支，GitHub Actions 会通过设置的 SSH Key 连接服务器并运行 `deploy.sh`。
