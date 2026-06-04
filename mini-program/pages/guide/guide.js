const app = getApp();

Page({
  data: {
    agentCode: '',
    subscribeQrcode: '/images/subscribe_qrcode.png',
    hasCheckedSubscribe: false,
    showQrcodeModal: false
  },

  onLoad(options) {
    console.log('引导页加载', options);
    let agentCode = '';

    // 从页面参数获取
    if (options.agent) {
      agentCode = options.agent;
    }

    // 从 scene 参数解析
    if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      console.log('Scene:', scene);
      const params = this.parseScene(scene);
      if (params.agent) {
        agentCode = params.agent;
      }
    }

    // 从全局数据获取（备用）
    if (!agentCode) {
      agentCode = app.globalData.agentCode;
    }

    if (!agentCode) {
      console.warn('未获取到代理商代码');
      wx.showToast({
        title: '参数错误，请重新扫码',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    this.setData({ agentCode });
    app.globalData.agentCode = agentCode;
    console.log('代理商代码:', agentCode);
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

  // 预览订阅号二维码
  showQrcodeModal() {
    this.setData({ showQrcodeModal: true });
  },

  // 隐藏二维码模态框
  hideQrcodeModal() {
    this.setData({ showQrcodeModal: false });
  },

  // 阻止事件冒泡
  preventTap() {
    // 空函数，用于阻止事件冒泡
  },

  // 预览订阅号二维码（旧方法，保留以防万一）
  previewQrcode() {
    this.showQrcodeModal();
  },

  // 长按识别二维码
  onQrcodeLongPress() {
    wx.showToast({
      title: '请长按识别关注公众号',
      icon: 'none',
      duration: 2000
    });
  },

  // 检查是否已关注（用户点击按钮）
  checkSubscribe() {
    // 显示确认对话框
    wx.showModal({
      title: '确认已关注',
      content: '请确认您已完成关注订阅号，点击确定继续注册',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.goToRegister();
        }
      }
    });
  },

  // 跳转到注册页
  goToRegister() {
    const agentCode = this.data.agentCode;

    if (!agentCode) {
      wx.showToast({
        title: '缺少代理商标识，请重新扫码',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    // 跳转到注册页，携带 agent 参数
    wx.navigateTo({
      url: `/pages/register/register?agent=${agentCode}`,
      success: () => {
        console.log('跳转到注册页，agent:', agentCode);
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 分享功能
  onShareAppMessage() {
    const agentCode = this.data.agentCode;
    return {
      title: '商户注册',
      path: agentCode ? `/pages/guide/guide?agent=${agentCode}` : '/pages/guide/guide'
    };
  }
});