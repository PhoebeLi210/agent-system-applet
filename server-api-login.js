// 统一登录接口（支持管理员和代理商）
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    try {
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