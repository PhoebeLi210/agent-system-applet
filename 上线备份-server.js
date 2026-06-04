const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcrypt');
const session = require('express-session');

// 数据库配置
const dbPath = path.join(__dirname, 'data', 'agent-system.db');
let SQL = null;
let db = null;

// 初始化数据库连接
async function initDatabase() {
    try {
        // 初始化 sql.js
        SQL = await initSqlJs();
        
        // 检查是否存在数据库文件
        if (fs.existsSync(dbPath)) {
            // 从文件加载数据库
            const filebuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(filebuffer);
            console.log('数据库从文件加载成功');
        } else {
            // 创建新数据库
            db = new SQL.Database();
            console.log('创建新数据库成功');
        }
        
        // 创建表结构
        createTables();
        
        // 保存数据库到文件
        saveDatabase();
        
        console.log('数据库初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

// 保存数据库到文件
function saveDatabase() {
    try {
        if (!db) {
            console.warn('数据库未初始化，跳过保存');
            return;
        }
        
        const data = db.export();
        const buffer = Buffer.from(data);
        
        // 确保 data 目录存在
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(dbPath, buffer);
    } catch (error) {
        console.error('保存数据库失败:', error);
        // 不抛出错误，避免影响正常业务流程，但确保错误被记录
    }
}

// 创建表结构
function createTables() {
    // 创建agents表
    db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_code TEXT UNIQUE NOT NULL,
            agent_name TEXT NOT NULL,
            scene_id INTEGER UNIQUE NOT NULL,
            qrcode_url TEXT,
            mini_code_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // 创建users表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            agent_id INTEGER DEFAULT 0,
            role TEXT DEFAULT 'agent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
    `);
    
    // 创建merchants表
        db.exec(`
        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER DEFAULT 0,
            merchantName TEXT,
            merchantType TEXT,
            merchantTypeText TEXT,
            businessLicenseNumber TEXT,
            businessLicenseName TEXT,
            licenseValidity TEXT,
            legalPersonName TEXT,
            legalPersonIdNumber TEXT,
            legalPersonIdStartDate TEXT,
            legalPersonIdValidity TEXT,
            contactName TEXT,
            contactPhone TEXT,
            contactEmail TEXT,
            bankAccountName TEXT,
            bankAccountNumber TEXT,
            bankName TEXT,
            bankBranch TEXT,
            province TEXT,
            city TEXT,
            district TEXT,
            address TEXT,
            detailAddress TEXT,
            rate TEXT,
            idCardFrontPhoto TEXT,
            idCardBackPhoto TEXT,
            licensePhoto TEXT,
            bankCardPhoto TEXT,
            accountMaterialPhoto TEXT,
            shopFrontPhoto TEXT,
            shopInteriorPhoto TEXT,
            cashierPhoto TEXT,
            productCodePhoto TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
    `);
    
    // 插入默认代理商（用于总管理员）
    const stmt1 = db.prepare(`INSERT OR IGNORE INTO agents (id, agent_code, agent_name, scene_id) VALUES (?, ?, ?, ?)`);
    stmt1.run([0, 'default', '默认代理商', 0]);
    stmt1.free();
    
    // 插入默认管理员用户
    const adminPassword = bcrypt.hashSync('1nNpm5q82Hsr', 10);
    const stmt2 = db.prepare(`INSERT OR IGNORE INTO users (username, password, agent_id, role) VALUES (?, ?, ?, ?)`);
    stmt2.run(['admin', adminPassword, 0, 'admin']);
    stmt2.free();
    
    // 保存数据库到文件
    saveDatabase();
}

// 数据库操作包装函数（同步操作，自动保存）
function dbRun(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
    saveDatabase();
    // 获取最后插入的ID
    const result = db.exec("SELECT last_insert_rowid()");
    const lastID = result[0]?.values[0]?.[0] || 0;
    return { changes: db.getRowsModified(), lastID: lastID };
}

function dbGet(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = stmt.step();
    let row = null;
    if (result) {
        row = stmt.getAsObject();
    }
    stmt.free();
    return row;
}

function dbAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

const app = express();
const port = 3002;

// 会话配置
app.use(session({
    secret: 'your-secret-key-change-in-productio',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// 管理员配置 - 在生产环境中应该使用环境变量或配置文件
const ADMIN_CONFIG = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '1nNpm5q82Hsr',
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
};

// 百度云OCR配置
const BAIDU_OCR_CONFIG = {
    apiKey: process.env.BAIDU_API_KEY || '10LPcwN6uX1ndr0zQDINZxbT',
    secretKey: process.env.BAIDU_SECRET_KEY || 'dzMv0W19vwup6RXHrvvmcgsQv9X4VGRZ',
    tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
    idcardUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/idcard',
    businessLicenseUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/business_license',
    bankCardUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/bankcard'
};

// 微信公众号配置
const WECHAT_CONFIG = {
    token: process.env.WECHAT_TOKEN || 'a8f3e9d2c1b5',
    appId: process.env.WECHAT_APPID || 'wxf7e1354eba5ade9f',
    appSecret: process.env.WECHAT_APPSECRET || '7c823207c9420aff3ba8d52b55b7ca9f'
};

// 小程序配置（新增）
const MINI_PROGRAM_CONFIG = {
    appId: process.env.MINIPROGRAM_APPID || 'wxde2dd2c50d89d2ef',
    appSecret: process.env.MINIPROGRAM_APPSECRET || '3a5698e586ef6db452f216681bb6b728'
};

// 小程序码保存路径（新增）
const MINI_CODE_PATH = process.env.MINI_CODE_PATH || '/www/wwwroot/agent.lakala.space/codes/';

// 缓存百度云access_token
let baiduAccessToken = null;
let baiduTokenExpireTime = 0;

// 缓存微信access_token
let wechatAccessToken = null;
let wechatTokenExpireTime = 0;

// 缓存小程序access_token（新增）
let miniProgramAccessToken = null;
let miniProgramTokenExpireTime = 0;

// 获取百度云access_token
async function getAccessToken() {
    const now = Date.now();
    if (baiduAccessToken && now < baiduTokenExpireTime) {
        return baiduAccessToken;
    }
    
    try {
        const response = await axios.post(BAIDU_OCR_CONFIG.tokenUrl, null, {
            params: {
                grant_type: 'client_credentials',
                client_id: BAIDU_OCR_CONFIG.apiKey,
                client_secret: BAIDU_OCR_CONFIG.secretKey
            }
        });
        
        baiduAccessToken = response.data.access_token;
        baiduTokenExpireTime = now + (response.data.expires_in - 60) * 1000; // 提前1分钟过期
        console.log('获取百度云access_token成功');
        return baiduAccessToken;
    } catch (error) {
        console.error('获取百度云access_token失败:', error.response?.data || error.message);
        throw new Error('获取百度云access_token失败');
    }
}

// 获取微信access_token
async function getWechatAccessToken() {
    const now = Date.now();
    if (wechatAccessToken && now < wechatTokenExpireTime) {
        console.log('使用缓存的 access_token');
        return wechatAccessToken;
    }
    
    try {
        const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
            params: {
                grant_type: 'client_credential',
                appid: WECHAT_CONFIG.appId,
                secret: WECHAT_CONFIG.appSecret
            }
        });
        
        wechatAccessToken = response.data.access_token;
        wechatTokenExpireTime = now + (response.data.expires_in - 60) * 1000; // 提前1分钟过期
        console.log('获取微信access_token成功:', wechatAccessToken.substring(0, 10) + '...');
        return wechatAccessToken;
    } catch (error) {
        console.error('获取微信access_token失败:', error.response?.data || error.message);
        throw new Error('获取微信access_token失败: ' + (error.response?.data?.errmsg || error.message));
    }
}

// 获取小程序access_token（新增）
async function getMiniProgramToken() {
    const now = Date.now();
    if (miniProgramAccessToken && now < miniProgramTokenExpireTime) {
        console.log('使用缓存的小程序 access_token');
        return miniProgramAccessToken;
    }
    
    try {
        const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
            params: {
                grant_type: 'client_credential',
                appid: MINI_PROGRAM_CONFIG.appId,
                secret: MINI_PROGRAM_CONFIG.appSecret
            }
        });
        
        miniProgramAccessToken = response.data.access_token;
        miniProgramTokenExpireTime = now + (response.data.expires_in - 60) * 1000; // 提前1分钟过期
        console.log('获取小程序access_token成功:', miniProgramAccessToken.substring(0, 10) + '...');
        return miniProgramAccessToken;
    } catch (error) {
        console.error('获取小程序access_token失败:', error.response?.data || error.message);
        throw new Error('获取小程序access_token失败: ' + (error.response?.data?.errmsg || error.message));
    }
}

// 调用百度云OCR识别身份证
async function recognizeIdCard(imagePath, idCardSide) {
    const token = await getAccessToken();
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    
    try {
        const response = await axios.post(
            BAIDU_OCR_CONFIG.idcardUrl,
            {
                image: imageBase64,
                id_card_side: idCardSide
            },
            {
                params: { access_token: token },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        if (response.data.error_code) {
            console.error('百度云OCR识别失败:', response.data);
            throw new Error(`OCR识别失败: ${response.data.error_msg}`);
        }
        
        console.log('百度云OCR完整返回结果:', response.data);
        console.log('百度云OCR识别成功:', response.data.words_result);
        return response.data.words_result;
    } catch (error) {
        console.error('调用百度云OCR失败:', error.response?.data || error.message);
        throw error;
    }
}

// 调用百度云OCR识别营业执照
async function recognizeBusinessLicense(imagePath) {
    const token = await getAccessToken();
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    
    try {
        const response = await axios.post(
            BAIDU_OCR_CONFIG.businessLicenseUrl,
            { image: imageBase64 },
            {
                params: { access_token: token },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        if (response.data.error_code) {
            console.error('百度云OCR识别营业执照失败:', response.data);
            throw new Error(`OCR识别失败: ${response.data.error_msg}`);
        }
        
        console.log('百度云OCR识别营业执照成功:', response.data.words_result);
        return response.data.words_result;
    } catch (error) {
        console.error('调用百度云OCR失败:', error.response?.data || error.message);
        throw error;
    }
}

// 调用百度云OCR识别银行卡
async function recognizeBankCard(imagePath) {
    const token = await getAccessToken();
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    
    try {
        const response = await axios.post(
            BAIDU_OCR_CONFIG.bankCardUrl,
            { image: imageBase64 },
            {
                params: { access_token: token },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        if (response.data.error_code) {
            console.error('百度云OCR识别银行卡失败:', response.data);
            throw new Error(`OCR识别失败: ${response.data.error_msg}`);
        }
        
        console.log('百度云OCR识别银行卡完整返回结果:', response.data);
        console.log('百度云OCR识别银行卡成功:', response.data.result);
        return response.data.result;
    } catch (error) {
        console.error('调用百度云OCR失败:', error.response?.data || error.message);
        throw error;
    }
}

// 启用CORS
app.use(cors());
// 解析JSON请求 - 增加请求体大小限制以支持照片上传
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// 解析Cookie
app.use(cookieParser());

// 配置存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 确保uploads目录存在
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 确保data目录存在
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// 身份验证中间件
function authenticateToken(req, res, next) {
    // 从Authorization头获取token
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    // 如果没有从header获取到，尝试从cookie获取
    if (!token && req.cookies) {
        token = req.cookies['adminToken'];
    }
    
    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }
    
    jwt.verify(token, ADMIN_CONFIG.secret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的认证令牌' });
        }
        req.user = user;
        next();
    });
}

// 上传身份证图片并识别
app.post('/upload-idcard', upload.single('idcard'), async (req, res) => {
    console.log('接收到上传请求');
    if (!req.file) {
        console.log('没有文件上传');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('文件上传成功:', req.file.filename);
    console.log('证件类型:', req.body.type);
    
    const imagePath = path.join(__dirname, 'uploads', req.file.filename);
    let ocrResult = {};
    
    try {
        if (req.body.type === 'front') {
            // 身份证人像面识别
            const baiduResult = await recognizeIdCard(imagePath, 'front');
            ocrResult = {
                name: baiduResult['姓名']?.words || '',
                idNumber: baiduResult['公民身份号码']?.words || ''
            };
        } else if (req.body.type === 'back') {
            // 身份证国徽面识别
            const baiduResult = await recognizeIdCard(imagePath, 'back');
            console.log('身份证背面识别原始结果:', baiduResult);
            
            // 获取签发日期和失效日期
            const startDate = baiduResult['签发日期']?.words || '';
            const endDate = baiduResult['失效日期']?.words || '';
            
            let validity = '';
            
            // 根据失效日期判断有效期类型
            if (endDate.includes('长期')) {
                validity = '长期有效';
            } else if (startDate && endDate) {
                // 计算有效期年数
                try {
                    // 处理YYYYMMDD格式的日期
                    let startStr = startDate;
                    let endStr = endDate;
                    
                    // 如果是YYYYMMDD格式，转换为YYYY-MM-DD
                    if (/^\d{8}$/.test(startStr)) {
                        startStr = startStr.substring(0, 4) + '-' + startStr.substring(4, 6) + '-' + startStr.substring(6, 8);
                    }
                    if (/^\d{8}$/.test(endStr)) {
                        endStr = endStr.substring(0, 4) + '-' + endStr.substring(4, 6) + '-' + endStr.substring(6, 8);
                    }
                    
                    // 处理YYYY.MM.DD格式的日期
                    startStr = startStr.replace(/\./g, '-');
                    endStr = endStr.replace(/\./g, '-');
                    
                    console.log('处理后的开始日期:', startStr);
                    console.log('处理后的结束日期:', endStr);
                    
                    const start = new Date(startStr);
                    const end = new Date(endStr);
                    
                    console.log('开始日期对象:', start);
                    console.log('结束日期对象:', end);
                    
                    const years = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 365));
                    console.log('计算的年数:', years);
                    
                    if (years === 10) {
                        validity = '10年';
                    } else if (years === 20) {
                        validity = '20年';
                    } else {
                        validity = '长期有效';
                    }
                } catch (error) {
                    console.error('日期计算错误:', error);
                    validity = '长期有效';
                }
            }
            
            ocrResult = {
                startDate: startDate,
                validity: validity
            };
        } else if (req.body.type === 'license') {
            // 营业执照识别
            const baiduResult = await recognizeBusinessLicense(imagePath);
            ocrResult = {
                licenseNumber: baiduResult['社会信用代码']?.words || baiduResult['注册号']?.words || '',
                businessLicenseName: baiduResult['单位名称']?.words || '',
                licenseValidity: baiduResult['有效期']?.words || ''
            };
        } else if (req.body.type === 'bankcard') {
            // 银行卡识别
            const baiduResult = await recognizeBankCard(imagePath);
            console.log('银行卡识别结果详细信息:', JSON.stringify(baiduResult, null, 2));
            
            // 尝试使用各种可能的字段名
            const cardNumber = baiduResult['bank_card_number'] || 
                              baiduResult['card_number'] || 
                              baiduResult['cardNum'] || 
                              baiduResult['number'] || 
                              '';
            
            const bankName = baiduResult['bank_name'] || 
                           baiduResult['bank'] || 
                           baiduResult['bankName'] || 
                           '';
            
            console.log('提取的银行卡号:', cardNumber);
            console.log('提取的银行名称:', bankName);
            
            ocrResult = {
                bankCardNumber: cardNumber,
                bankName: bankName,
                accountName: '' // 银行卡OCR通常不返回开户名
            };
        }
        
        console.log('OCR识别结果:', ocrResult);
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ code: 200, success: true, data: ocrResult, filename: req.file.filename, url: fileUrl });
    } catch (error) {
        console.error('OCR识别错误:', error);
        res.status(500).json({ code: 500, error: 'OCR识别失败' });
    }
});

// 管理员登录
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password) {
        const token = jwt.sign({ username }, ADMIN_CONFIG.secret, { expiresIn: '24h' });
        res.cookie('adminToken', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// 统一登录接口（支持管理员和代理商）
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    try {
        // 测试用账号
        if (username === 'T6FAPXF3' && password === '123456') {
            // 生成token
            const token = jwt.sign({ username, role: 'agent' }, ADMIN_CONFIG.secret, { expiresIn: '24h' });
            res.cookie('adminToken', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            
            // 设置session
            req.session.userId = 1;
            req.session.agentId = 1;
            req.session.role = 'agent';
            
            res.json({ 
                success: true, 
                token: token,
                user: {
                    id: 1,
                    username: username,
                    agentId: 1,
                    role: 'agent'
                }
            });
            return;
        }
        
        // 查找用户
        const user = dbGet('SELECT id, password, agent_id, role FROM users WHERE username = ?', [username]);
        
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 验证密码
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成token
        const token = jwt.sign({ username, role: user.role }, ADMIN_CONFIG.secret, { expiresIn: '24h' });
        res.cookie('adminToken', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        
        // 设置session
        req.session.userId = user.id;
        req.session.agentId = user.agent_id;
        req.session.role = user.role;
        
        res.json({ 
            success: true, 
            token: token,
            user: {
                id: user.id,
                username: username,
                agentId: user.agent_id,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// 通用上传接口（用于小程序）
app.post('/api/upload', upload.single('file'), (req, res) => {
    console.log('接收到小程序上传请求');
    if (!req.file) {
        console.log('没有文件上传');
        return res.status(400).json({ code: 400, message: 'No file uploaded' });
    }

    console.log('文件上传成功:', req.file.filename);
    console.log('文件类型:', req.body.type);
    console.log('代理商代码:', req.body.agentCode);
    
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({ code: 200, message: '上传成功', url: fileUrl });
});

// 通用OCR接口（用于小程序）
app.post('/api/ocr', upload.single('file'), async (req, res) => {
    console.log('接收到OCR识别请求');
    if (!req.file) {
        console.log('没有文件上传');
        return res.status(400).json({ code: 400, message: 'No file uploaded' });
    }

    console.log('文件上传成功:', req.file.filename);
    console.log('OCR类型:', req.body.type);
    
    const imagePath = path.join(__dirname, 'uploads', req.file.filename);
    let ocrResult = {};
    
    try {
        if (req.body.type === 'idCardFront') {
            // 身份证人像面识别
            const baiduResult = await recognizeIdCard(imagePath, 'front');
            ocrResult = {
                name: baiduResult['姓名']?.words || '',
                idNumber: baiduResult['公民身份号码']?.words || ''
            };
        } else if (req.body.type === 'idCardBack') {
            const baiduResult = await recognizeIdCard(imagePath, 'back');
            console.log('身份证背面识别原始结果:', baiduResult);
            
            const startDate = baiduResult['签发日期']?.words || '';
            const endDate = baiduResult['失效日期']?.words || '';
            
            let validity = '';
            if (endDate.includes('长期') || endDate === '长期') {
                validity = '长期有效';
            } else if (startDate && endDate) {
                let startStr = startDate.replace(/\./g, '-');
                let endStr = endDate.replace(/\./g, '-');
                
                if (/^\d{8}$/.test(startStr.replace(/-/g, ''))) {
                    startStr = startStr.substring(0, 4) + '-' + startStr.substring(4, 6) + '-' + startStr.substring(6, 8);
                }
                if (/^\d{8}$/.test(endStr.replace(/-/g, ''))) {
                    endStr = endStr.substring(0, 4) + '-' + endStr.substring(4, 6) + '-' + endStr.substring(6, 8);
                }
                
                try {
                    const start = new Date(startStr);
                    const end = new Date(endStr);
                    const years = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 365));
                    
                    if (endDate.includes('长期')) {
                        validity = '长期有效';
                    } else if (years >= 30) {
                        validity = '长期有效';
                    } else if (years >= 20) {
                        validity = '20年';
                    } else if (years >= 10) {
                        validity = '10年';
                    } else if (years >= 5) {
                        validity = '5年';
                    } else {
                        validity = '长期有效';
                    }
                } catch (e) {
                    console.error('日期计算错误:', e);
                    validity = '长期有效';
                }
            }
            
            ocrResult = {
                startDate: startDate,
                validity: validity
            };
        } else if (req.body.type === 'license') {
            // 营业执照识别
            // 这里可以添加营业执照识别逻辑
            ocrResult = {
                licenseNumber: '',
                licenseName: '',
                validity: ''
            };
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ code: 200, message: '识别成功', data: ocrResult, url: imageUrl });
    } catch (error) {
        console.error('OCR识别失败:', error);
        res.status(500).json({ code: 500, message: '识别失败' });
    }
});

// 管理员登录 (保持向后兼容)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password) {
        const token = jwt.sign({ username }, ADMIN_CONFIG.secret, { expiresIn: '24h' });
        res.cookie('adminToken', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        
        // 同时设置session
        const user = dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (user) {
            req.session.userId = user.id;
            req.session.agentId = 0;
            req.session.role = 'admin';
        }
        
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// 统一退出接口
app.post('/api/logout', (req, res) => {
    // 清除session
    req.session.destroy();
    // 清除cookie
    res.clearCookie('adminToken');
    res.json({ success: true });
});

// 验证会话状态
app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            success: true, 
            user: {
                id: req.session.userId,
                agentId: req.session.agentId,
                role: req.session.role
            }
        });
    } else {
        res.status(401).json({ success: false, error: '未登录' });
    }
});

// 修改密码
app.post('/api/change-password', (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        // 检查是否登录
        if (!req.session.userId) {
            return res.status(401).json({ success: false, error: '未登录' });
        }
        
        // 获取用户信息
        const user = dbGet('SELECT password FROM users WHERE id = ?', [req.session.userId]);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        
        // 验证旧密码
        const isPasswordValid = bcrypt.compareSync(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: '原密码错误' });
        }
        
        // 生成新密码哈希
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        
        // 更新密码
        dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId]);
        
        res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ error: '修改密码失败' });
    }
});

// 管理员退出
app.post('/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    req.session.destroy();
    res.json({ success: true });
});

// 管理员退出 (API版本)
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    req.session.destroy();
    res.json({ success: true });
});

// 保存商户信息
app.post('/api/save-merchant', (req, res) => {
    try {
        const merchantInfo = req.body;
        const agentCode = req.query.agent || req.body.agent || merchantInfo.agentCode || 'T6FAPXF3';
        console.log('接收到商户信息:', merchantInfo);
        console.log('代理商代码:', agentCode);
        
        // 查找代理商ID
        let agentId = 0; // 默认0表示直营
        if (agentCode) {
            const agent = dbGet('SELECT id FROM agents WHERE agent_code = ?', [agentCode]);
            if (agent) {
                agentId = agent.id;
            }
        }
        
        // 解析地区信息
        let province = '';
        let city = '';
        let district = '';
        if (merchantInfo.regionText) {
            const regions = merchantInfo.regionText.split(' ');
            if (regions.length >= 3) {
                province = regions[0];
                city = regions[1];
                district = regions[2];
            }
        }
        
        const shopFrontPhoto = merchantInfo.shopFrontPhoto || '';
        const shopInteriorPhoto = merchantInfo.shopInteriorPhoto || '';
        const cashierPhoto = merchantInfo.cashierPhoto || '';
        const productCodePhoto = merchantInfo.productCodePhoto || '';
        const accountMaterialPhoto = merchantInfo.accountMaterialPhoto || '';
        
        console.log('准备插入数据库...');
        console.log('SQL字段数: 34');
        
        const insertSql = `INSERT INTO merchants (
            agent_id, merchantName, merchantType, merchantTypeText, businessLicenseNumber, businessLicenseName,
            licenseValidity, legalPersonName, legalPersonIdNumber, legalPersonIdStartDate,
            legalPersonIdValidity, contactName, contactPhone, contactEmail, bankAccountName,
            bankAccountNumber, bankName, bankBranch, province, city, district, address, detailAddress, rate,
            idCardFrontPhoto, idCardBackPhoto, licensePhoto, bankCardPhoto, accountMaterialPhoto, status,
            shopFrontPhoto, shopInteriorPhoto, cashierPhoto, productCodePhoto, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const now = new Date();
        const localTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        
        const params = [
            agentId || 0,
            merchantInfo.merchantName || '',
            merchantInfo.merchantType || '',
            merchantInfo.merchantTypeText || '',
            merchantInfo.licenseNumber || '',
            merchantInfo.licenseName || '',
            merchantInfo.licenseValidity || '',
            merchantInfo.idCardName || '',
            merchantInfo.idCardNumber || '',
            merchantInfo.idCardStartDate || '',
            merchantInfo.idCardValidity || '',
            merchantInfo.idCardName || '',
            merchantInfo.phone || '',
            merchantInfo.email || '',
            (merchantInfo.bankAccountName || merchantInfo.accountName || ''),
            merchantInfo.bankCardNumber || '',
            merchantInfo.bankName || '',
            merchantInfo.bankBranch || '',
            province || '',
            city || '',
            district || '',
            merchantInfo.address || '',
            merchantInfo.detailedAddress || '',
            merchantInfo.rate || '',
            merchantInfo.idCardFrontPhoto || '',
            merchantInfo.idCardBackPhoto || '',
            merchantInfo.licensePhoto || '',
            merchantInfo.bankCardPhoto || '',
            accountMaterialPhoto || '',
            'pending',
            shopFrontPhoto || '',
            shopInteriorPhoto || '',
            cashierPhoto || '',
            productCodePhoto || '',
            localTime
        ];
        
        console.log('参数数量:', params.length);
        
        // 插入到数据库
        const result = dbRun(insertSql, params);
        
        console.log('商户信息保存成功，ID:', result.lastID);
        
        // 返回成功响应
        res.json({ success: true, message: '商户信息保存成功', id: result.lastID });
    } catch (error) {
        console.error('保存商户信息失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({ error: '保存商户信息失败' });
    }
});

// 处理各个页面的GET请求
const htmlFiles = [
    'login',
    'admin',
    'success',
    'account-info',
    'bank-data-manager',
    'check_localstorage',
    'merchant-info',
    'merchant-registration',
    'rate-info'
];

// 为每个HTML文件添加路由
htmlFiles.forEach(file => {
    // 处理不带.html扩展名的路径
    app.get(`/${file}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${file}.html`));
    });
    
    // 处理带.html扩展名的路径
    app.get(`/${file}.html`, (req, res) => {
        res.sendFile(path.join(__dirname, `${file}.html`));
    });
});

// 商户管理API
// 获取商户列表
app.get('/api/merchants', (req, res) => {
    try {
        // 从session获取当前用户的agent_id
        const userId = req.session.userId;
        let agentId = 0;
        let isAdmin = false;
        
        if (userId) {
            const user = dbGet('SELECT agent_id, role FROM users WHERE id = ?', [userId]);
            if (user) {
                agentId = user.agent_id;
                isAdmin = user.role === 'admin';
            }
        }
        
        // 构建查询语句
        let query = 'SELECT * FROM merchants';
        let params = [];
        
        if (!isAdmin) {
            query += ' WHERE agent_id = ?';
            params.push(agentId);
        }
        
        query += ' ORDER BY created_at DESC';
        
        // 执行查询
        const merchants = dbAll(query, params);
        
        res.json({ success: true, data: merchants });
    } catch (error) {
        console.error('获取商户列表失败:', error);
        res.status(500).json({ success: false, error: '获取商户列表失败' });
    }
});

// 获取单个商户详情
app.get('/api/merchants/:id', (req, res) => {
    try {
        const id = req.params.id;
        
        // 从session获取当前用户的agent_id
        const userId = req.session.userId;
        let agentId = 0;
        let isAdmin = false;
        
        if (userId) {
            const user = dbGet('SELECT agent_id, role FROM users WHERE id = ?', [userId]);
            if (user) {
                agentId = user.agent_id;
                isAdmin = user.role === 'admin';
            }
        }
        
        // 构建查询语句
        let query = 'SELECT * FROM merchants WHERE id = ?';
        let params = [id];
        
        if (!isAdmin) {
            query += ' AND agent_id = ?';
            params.push(agentId);
        }
        
        // 执行查询
        const merchant = dbGet(query, params);
        
        if (merchant) {
            res.json({ success: true, data: merchant });
        } else {
            res.status(404).json({ success: false, error: '商户不存在' });
        }
    } catch (error) {
        console.error('获取商户详情失败:', error);
        res.status(500).json({ success: false, error: '获取商户详情失败' });
    }
});

// 删除商户
app.delete('/api/merchants/:id', (req, res) => {
    try {
        const id = req.params.id;
        
        // 从session获取当前用户的agent_id
        const userId = req.session.userId;
        let agentId = 0;
        let isAdmin = false;
        
        if (userId) {
            const user = dbGet('SELECT agent_id, role FROM users WHERE id = ?', [userId]);
            if (user) {
                agentId = user.agent_id;
                isAdmin = user.role === 'admin';
            }
        } else {
            isAdmin = true;
        }
        
        // 构建删除语句
        let query = 'DELETE FROM merchants WHERE id = ?';
        let params = [id];
        
        if (!isAdmin) {
            query += ' AND agent_id = ?';
            params.push(agentId);
        }
        
        // 直接使用db.exec执行删除
        db.exec(query, params);
        const changes = db.getRowsModified();
        saveDatabase();
        
        if (changes > 0) {
            res.json({ success: true, message: '删除成功' });
        } else {
            res.status(404).json({ success: false, error: '商户不存在' });
        }
    } catch (error) {
        console.error('删除商户失败:', error);
        res.status(500).json({ success: false, error: '删除商户失败' });
    }
});

// 照片管理API
// 获取照片列表
app.get('/api/photos', (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = fs.readdirSync(uploadsDir).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });
        
        const photos = files.map(file => {
            const filepath = path.join(uploadsDir, file);
            const stats = fs.statSync(filepath);
            return {
                filename: file,
                url: `/uploads/${file}`,
                size: stats.size,
                modified: stats.mtime
            };
        });
        
        res.json({ success: true, data: photos });
    } catch (error) {
        console.error('获取照片列表失败:', error);
        res.status(500).json({ success: false, error: '获取照片列表失败' });
    }
});

// 删除照片
app.delete('/api/photos/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filepath = path.join(__dirname, 'uploads', filename);
        
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            res.json({ success: true, message: '删除成功' });
        } else {
            res.status(404).json({ success: false, error: '照片不存在' });
        }
    } catch (error) {
        console.error('删除照片失败:', error);
        res.status(500).json({ success: false, error: '删除照片失败' });
    }
});

// 微信回调处理
//app.get('/wechat', (req, res) => {
//    const { signature, timestamp, nonce, echostr } = req.query;
    
    // 验证签名
//    const token = WECHAT_CONFIG.token;
//    const str = [token, timestamp, nonce].sort().join('');
//    const crypto = require('crypto');
//    const hash = crypto.createHash('sha1').update(str).digest('hex');
    
//    if (hash === signature) {
//        res.send(echostr);
//    } else {
//        res.status(401).send('Invalid signature');
//    }
//});

// 临时简化版：直接返回 echostr
app.get('/wechat', (req, res) => {
    const echostr = req.query.echostr;
    if (echostr) {
        res.status(200).send(echostr);
    } else {
        res.status(200).send('ok');
    }
});

// 微信消息处理
app.post('/wechat', express.text({ type: '*/*' }), (req, res) => {
    const xml = req.body;
    console.log('接收到微信消息:', xml);
    
    // 解析XML
    const parseString = require('xml2js').parseString;
    parseString(xml, (err, result) => {
        if (err) {
            console.error('解析XML失败:', err);
            res.send('');
            return;
        }
        
        const message = result.xml;
        const msgType = message.MsgType[0];
        
        if (msgType === 'event' && message.Event[0] === 'subscribe') {
            // 处理关注事件
            const openid = message.FromUserName[0];
            let sceneId = '';
            
            // 解析场景值
            if (message.EventKey[0]) {
                // 格式为 qrscene_123
                sceneId = message.EventKey[0].replace('qrscene_', '');
            }
            
            console.log('用户关注，openid:', openid, 'sceneId:', sceneId);
            
            // 查找对应的代理商
            let agentCode = '';
            if (sceneId) {
                const agent = dbGet('SELECT agent_code FROM agents WHERE scene_id = ?', [sceneId]);
                if (agent) {
                    agentCode = agent.agent_code;
                }
            }
            
            // 构建回复消息
            const replyContent = `感谢关注！请点击链接注册商户：https://agent.lakala.space/merchant-registration${agentCode ? `?agent=${agentCode}` : ''}`;
            
            const replyXml = `<xml>
                <ToUserName><![CDATA[${openid}]]></ToUserName>
                <FromUserName><![CDATA[${message.ToUserName[0]}]]></FromUserName>
                <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
                <MsgType><![CDATA[text]]></MsgType>
                <Content><![CDATA[${replyContent}]]></Content>
            </xml>`;
            
            res.send(replyXml);
        } else {
            // 其他消息类型，回复空字符串
            res.send('');
        }
    });
});

// 生成代理商二维码
app.post('/api/agent/qrcode', async (req, res) => {
    try {
        const { agentId } = req.body;
        console.log('收到生成二维码请求, agentId:', agentId);
        
        // 获取代理商信息
        const agent = dbGet('SELECT scene_id FROM agents WHERE id = ?', [agentId]);
        if (!agent) {
            return res.status(404).json({ error: '代理商不存在' });
        }
        
        const sceneId = agent.scene_id;
        console.log('从数据库查询到的 scene_id:', sceneId);
        
        // 获取微信access_token
        const token = await getWechatAccessToken();
        console.log('获取到的 access_token:', token.substring(0, 10) + '...');
        
        // 调用微信创建永久二维码接口
        const response = await axios.post('https://api.weixin.qq.com/cgi-bin/qrcode/create', {
            action_name: 'QR_LIMIT_SCENE',
            action_info: {
                scene: {
                    scene_id: sceneId
                }
            }
        }, {
            params: { access_token: token }
        });
        
        console.log('调用微信接口返回的完整数据:', response.data);
        
        if (response.data.errcode) {
            console.error('创建二维码失败:', response.data);
            return res.status(500).json({ error: `创建二维码失败: ${response.data.errmsg}` });
        }
        
        const ticket = response.data.ticket;
        const qrcodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
        
        // 更新代理商的二维码URL
        dbRun('UPDATE agents SET qrcode_url = ? WHERE id = ?', [qrcodeUrl, agentId]);
        
        res.json({ 
            success: true, 
            data: {
                ticket: ticket,
                qrcodeUrl: qrcodeUrl
            }
        });
    } catch (error) {
        console.error('生成二维码失败:', error);
        res.status(500).json({ error: `生成二维码失败: ${error.message}` });
    }
});

// 生成代理商小程序码（新增）
app.post('/api/agent/minicode', async (req, res) => {
    try {
        const { agentCode } = req.body;
        console.log('收到生成小程序码请求, agentCode:', agentCode);
        
        if (!agentCode) {
            return res.status(400).json({ error: '缺少代理商代码' });
        }
        
        // 获取代理商信息
        const agent = dbGet('SELECT id, agent_code FROM agents WHERE agent_code = ?', [agentCode]);
        if (!agent) {
            return res.status(404).json({ error: '代理商不存在' });
        }
        
        // 获取小程序access_token
        const token = await getMiniProgramToken();
        console.log('获取到的 小程序access_token:', token.substring(0, 10) + '...');
        
        // 确保保存目录存在
        if (!fs.existsSync(MINI_CODE_PATH)) {
            fs.mkdirSync(MINI_CODE_PATH, { recursive: true });
        }
        
        // 生成文件名
        const filename = `minicode_${agentCode}.png`;
        const filepath = path.join(MINI_CODE_PATH, filename);
        
        // 调用微信生成小程序码接口（getwxacodeunlimit）
        const response = await axios.post('https://api.weixin.qq.com/wxa/getwxacodeunlimit', {
            scene: `agent=${agentCode}`,
            page: 'pages/guide/guide',
            width: 430,
            check_path: false  // 不校验页面是否存在（未发布的小程序需要设置为false）
        }, {
            params: { access_token: token },
            responseType: 'arraybuffer'
        });
        
        // 检查返回的是否是错误信息（JSON格式）
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            const errorData = JSON.parse(response.data.toString());
            console.error('生成小程序码失败:', errorData);
            return res.status(500).json({ error: `生成小程序码失败: ${errorData.errmsg}` });
        }
        
        // 保存图片文件
        fs.writeFileSync(filepath, response.data);
        console.log('小程序码已保存到:', filepath);
        
        // 构建访问URL
        const miniCodeUrl = `https://agent.lakala.space/codes/${filename}`;
        
        // 更新数据库中的小程序码URL
        dbRun('UPDATE agents SET mini_code_url = ? WHERE id = ?', [miniCodeUrl, agent.id]);
        
        res.json({ 
            success: true, 
            data: {
                agentCode: agentCode,
                miniCodeUrl: miniCodeUrl,
                filepath: filepath
            }
        });
    } catch (error) {
        console.error('生成小程序码失败:', error);
        res.status(500).json({ error: `生成小程序码失败: ${error.message}` });
    }
});

// 获取代理商小程序码（新增）
app.get('/api/agent/minicode/:agentCode', async (req, res) => {
    try {
        const { agentCode } = req.params;
        
        // 获取代理商信息
        const agent = dbGet('SELECT mini_code_url FROM agents WHERE agent_code = ?', [agentCode]);
        if (!agent) {
            return res.status(404).json({ error: '代理商不存在' });
        }
        
        res.json({ 
            success: true, 
            data: {
                agentCode: agentCode,
                miniCodeUrl: agent.mini_code_url || null
            }
        });
    } catch (error) {
        console.error('获取小程序码失败:', error);
        res.status(500).json({ error: `获取小程序码失败: ${error.message}` });
    }
});

// 生成无规律的代理商代码
function generateAgentCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的字符
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 确保生成的代理商代码唯一
function generateUniqueAgentCode() {
    let code;
    let isUnique = false;
    
    while (!isUnique) {
        code = generateAgentCode();
        const existing = dbGet('SELECT id FROM agents WHERE agent_code = ?', [code]);
        if (!existing) {
            isUnique = true;
        }
    }
    
    return code;
}

// 生成唯一的场景ID
function generateUniqueSceneId() {
    // 查询当前最大的场景ID
    const result = dbGet('SELECT MAX(scene_id) as max_id FROM agents');
    const maxId = result?.max_id || 99999;
    
    // 生成新的场景ID（从100000开始递增）
    let sceneId = maxId + 1;
    
    // 确保场景ID在有效范围内（微信API限制）
    if (sceneId > 100000) {
        sceneId = 100000 + (sceneId % 900000); // 确保在100000-999999之间
    }
    
    return sceneId;
}

// 代理商管理API
// 添加代理商
app.post('/api/agents', (req, res) => {
    try {
        const { agentName, sceneId } = req.body;
        
        // 自动生成代理商代码
        const agentCode = generateUniqueAgentCode();
        
        // 自动生成场景ID（如果未提供）
        const finalSceneId = sceneId || generateUniqueSceneId();
        
        // 插入代理商
        const result = dbRun(`
        INSERT INTO agents (agent_code, agent_name, scene_id)
        VALUES (?, ?, ?)
        `, [agentCode, agentName, finalSceneId]);
        
        // 为代理商创建用户
        const password = bcrypt.hashSync('123456', 10);
        dbRun(`
        INSERT INTO users (username, password, agent_id, role)
        VALUES (?, ?, ?, ?)
        `, [agentCode, password, result.lastID, 'agent']);
        
        res.json({ success: true, data: { id: result.lastID, agentCode, agentName, sceneId: finalSceneId } });
    } catch (error) {
        console.error('添加代理商失败:', error);
        res.status(500).json({ error: '添加代理商失败' });
    }
});

// 获取代理商列表
app.get('/api/agents', (req, res) => {
    try {
        const agents = dbAll('SELECT * FROM agents ORDER BY created_at DESC');
        res.json({ success: true, data: agents });
    } catch (error) {
        console.error('获取代理商列表失败:', error);
        res.status(500).json({ success: false, error: '获取代理商列表失败' });
    }
});

// 获取单个代理商详情
app.get('/api/agents/:id', (req, res) => {
    try {
        const id = req.params.id;
        const agent = dbGet('SELECT * FROM agents WHERE id = ?', [id]);
        
        if (agent) {
            res.json({ success: true, data: agent });
        } else {
            res.status(404).json({ success: false, error: '代理商不存在' });
        }
    } catch (error) {
        console.error('获取代理商详情失败:', error);
        res.status(500).json({ success: false, error: '获取代理商详情失败' });
    }
});

// 更新代理商信息
app.put('/api/agents/:id', (req, res) => {
    try {
        const id = req.params.id;
        const { agentName, sceneId } = req.body;
        
        const result = dbRun(`
        UPDATE agents SET agent_name = ?, scene_id = ? WHERE id = ?
        `, [agentName, sceneId, id]);
        
        if (result.changes > 0) {
            res.json({ success: true, message: '更新成功' });
        } else {
            res.status(404).json({ success: false, error: '代理商不存在' });
        }
    } catch (error) {
        console.error('更新代理商失败:', error);
        res.status(500).json({ error: '更新代理商失败' });
    }
});

// 删除代理商
app.delete('/api/agents/:id', (req, res) => {
    try {
        const id = req.params.id;
        
        // 删除代理商
        const result = dbRun('DELETE FROM agents WHERE id = ?', [id]);
        
        if (result.changes > 0) {
            res.json({ success: true, message: '删除成功' });
        } else {
            res.status(404).json({ success: false, error: '代理商不存在' });
        }
    } catch (error) {
        console.error('删除代理商失败:', error);
        res.status(500).json({ error: '删除代理商失败' });
    }
});

// 重置代理商密码
app.post('/api/agents/:id/reset-password', (req, res) => {
    try {
        const id = req.params.id;
        
        // 获取代理商信息
        const agent = dbGet('SELECT agent_code FROM agents WHERE id = ?', [id]);
        if (!agent) {
            return res.status(404).json({ success: false, error: '代理商不存在' });
        }
        
        // 生成新密码哈希
        const newPassword = '123456';
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        
        // 查找或创建用户
        const existingUser = dbGet('SELECT id FROM users WHERE username = ?', [agent.agent_code]);
        
        if (existingUser) {
            // 更新密码
            dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, existingUser.id]);
        } else {
            // 创建新用户
            dbRun('INSERT INTO users (username, password, agent_id, role) VALUES (?, ?, ?, ?)',
                [agent.agent_code, hashedPassword, id, 'agent']);
        }
        
        res.json({ success: true, message: '密码重置成功' });
    } catch (error) {
        console.error('重置密码失败:', error);
        res.status(500).json({ error: '重置密码失败' });
    }
});

// favicon处理
app.get('/favicon.ico', (req, res) => res.status(204));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('.'));

// 启动服务器
async function startServer() {
    try {
        // 初始化数据库连接
        await initDatabase();
        
        // 启动服务器
        app.listen(port, () => {
            console.log(`服务器运行在 http://localhost:${port}`);
        });
        
        // 添加进程退出事件监听器，确保在进程退出前保存数据库
        process.on('exit', () => {
            console.log('正在保存数据库...');
            saveDatabase();
            console.log('数据库保存完成');
        });
        
        // 捕获 SIGINT 信号（Ctrl+C）
        process.on('SIGINT', () => {
            console.log('收到 SIGINT 信号，正在保存数据库...');
            saveDatabase();
            console.log('数据库保存完成，正在退出...');
            process.exit(0);
        });
        
        // 捕获 SIGTERM 信号
        process.on('SIGTERM', () => {
            console.log('收到 SIGTERM 信号，正在保存数据库...');
            saveDatabase();
            console.log('数据库保存完成，正在退出...');
            process.exit(0);
        });
    } catch (error) {
        console.error('服务器启动失败:', error);
        // 确保在启动失败时也保存数据库
        saveDatabase();
        process.exit(1);
    }
}

// 启动服务器
startServer();