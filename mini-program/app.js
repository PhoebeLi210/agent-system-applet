App({
  globalData: {
    userInfo: null,
    agentCode: null,
    apiBaseUrl: 'https://agent.lakala.space'
  },

  onLaunch(options) {
    console.log('小程序启动', options);
    
    // 解析 scene 参数
    if (options.query && options.query.scene) {
      const scene = decodeURIComponent(options.query.scene);
      console.log('Scene参数:', scene);
      
      // 解析 agent 参数
      const params = this.parseScene(scene);
      if (params.agent) {
        this.globalData.agentCode = params.agent;
        console.log('代理商代码:', params.agent);
      }
    }
    
    // 检查是否有直接传入的 agent 参数（开发调试使用）
    if (options.query && options.query.agent) {
      this.globalData.agentCode = options.query.agent;
      console.log('通过query获取代理商代码:', options.query.agent);
    }
  },

  // 解析 scene 字符串
  parseScene(scene) {
    const params = {};
    if (!scene) return params;
    
    const pairs = scene.split('&');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
    return params;
  },

  // 获取全局 API 基础地址
  getApiBaseUrl() {
    return this.globalData.apiBaseUrl || 'https://agent.lakala.space';
  },

  // 获取全局 agentCode
  getAgentCode() {
    return this.globalData.agentCode;
  },

  // 设置全局 agentCode
  setAgentCode(code) {
    this.globalData.agentCode = code;
  }
});
