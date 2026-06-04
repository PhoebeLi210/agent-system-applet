const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 配置
const CONFIG = {
  // 数据库路径
  DB_PATH: './agent.db',
  // 小程序配置
  MINI_PROGRAM: {
    APP_ID: 'YOUR_APP_ID',
    APP_SECRET: 'YOUR_APP_SECRET'
  },
  // 小程序码保存路径
  MINI_CODE_PATH: '/www/wwwroot/agent.lakala.space/codes/',
  // 后端 API 地址
  API_BASE_URL: 'https://agent.lakala.space'
};

// 确保保存目录存在
if (!fs.existsSync(CONFIG.MINI_CODE_PATH)) {
  fs.mkdirSync(CONFIG.MINI_CODE_PATH, { recursive: true });
}

// 数据库连接
const db = new sqlite3.Database(CONFIG.DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('数据库连接成功');
  generateMiniCodes();
});

// 获取小程序 access_token
async function getMiniProgramToken() {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.MINI_PROGRAM.APP_ID}&secret=${CONFIG.MINI_PROGRAM.APP_SECRET}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            reject(new Error('获取 access_token 失败: ' + result.errmsg));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 生成小程序码
async function generateMiniCode(agentCode, accessToken) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;
    const data = JSON.stringify({
      scene: `agent=${agentCode}`,
      page: 'pages/guide/guide',
      width: 280,
      auto_color: false,
      line_color: {
        r: 59,
        g: 130,
        b: 246
      },
      is_hyaline: false
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // 检查是否是图片（微信返回的错误是 JSON）
        if (res.headers['content-type'] === 'image/jpeg') {
          const filePath = path.join(CONFIG.MINI_CODE_PATH, `${agentCode}.jpg`);
          fs.writeFileSync(filePath, buffer);
          const imageUrl = `/codes/${agentCode}.jpg`;
          resolve(imageUrl);
        } else {
          try {
            const error = JSON.parse(buffer.toString());
            reject(new Error(`生成小程序码失败: ${error.errmsg}`));
          } catch (e) {
            reject(new Error('生成小程序码失败: 未知错误'));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// 更新数据库
function updateMiniCodeUrl(agentCode, miniCodeUrl) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE agents SET mini_code_url = ? WHERE agent_code = ?',
      [miniCodeUrl, agentCode],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// 批量生成小程序码
async function generateMiniCodes() {
  try {
    // 获取所有代理商
    const agents = await new Promise((resolve, reject) => {
      db.all('SELECT agent_code FROM agents', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    console.log(`找到 ${agents.length} 个代理商`);

    // 获取 access_token
    const accessToken = await getMiniProgramToken();
    console.log('获取 access_token 成功');

    // 为每个代理商生成小程序码
    for (const agent of agents) {
      const agentCode = agent.agent_code;
      try {
        console.log(`正在为代理商 ${agentCode} 生成小程序码...`);
        const miniCodeUrl = await generateMiniCode(agentCode, accessToken);
        await updateMiniCodeUrl(agentCode, miniCodeUrl);
        console.log(`代理商 ${agentCode} 小程序码生成成功: ${miniCodeUrl}`);
      } catch (error) {
        console.error(`代理商 ${agentCode} 小程序码生成失败:`, error.message);
      }
      // 避免触发微信 API 频率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('批量生成小程序码完成');
  } catch (error) {
    console.error('批量生成小程序码失败:', error.message);
  } finally {
    db.close();
  }
}
