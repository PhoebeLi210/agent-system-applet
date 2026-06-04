Page({
  data: {
    apiBaseUrl: '',
    
    merchantName: '',
    settlementType: 'D1',
    scanRate: '0.38',
    discountRate: '0.3',
    agreementType: 'electronic',
    agreementSigned: false,
    showAgreementModal: false,
    showSignaturePad: false,
    agreementRead: false,
    countdown: 8,
    countdownComplete: false,
    signatureImage: '',
    isSubmitting: false,
    
    licenseNumber: '',
    idCardName: '',
    idCardNumber: '',
    idCardValidity: '',
    regionText: '',
    detailAddress: '',
    bankAccountName: '',
    bankCardNumber: '',
    bankCityText: '',
    bankName: '',
    email: '',
    merchantTypeText: '',
    phoneNumber: ''
  },

  onLoad(options) {
    console.log('费率信息页加载', options);
    const app = getApp();
    this.setData({
      apiBaseUrl: app.getApiBaseUrl()
    });
    this.loadFromStorage();
  },

  loadFromStorage() {
    const merchantName = wx.getStorageSync('merchantName') || '';
    const agreementSigned = wx.getStorageSync('agreementSigned') || false;
    const signatureImage = wx.getStorageSync('signatureImage') || '';
    const settlementType = wx.getStorageSync('settlementType') || 'D1';
    const licenseNumber = wx.getStorageSync('licenseNumber') || '';
    const idCardName = wx.getStorageSync('idCardName') || '';
    const idCardNumber = wx.getStorageSync('idCardNumber') || '';
    const idCardValidity = wx.getStorageSync('idCardValidity') || '';
    const regionText = wx.getStorageSync('regionText') || '';
    const detailAddress = wx.getStorageSync('detailedAddress') || '';
    const bankAccountName = wx.getStorageSync('bankAccountName') || '';
    const bankCardNumber = wx.getStorageSync('bankCardNumber') || '';
    const bankCityText = wx.getStorageSync('bankCityText') || '';
    const bankName = wx.getStorageSync('bankName') || '';
    const email = wx.getStorageSync('email') || '';
    const merchantTypeText = wx.getStorageSync('merchantTypeText') || '';
    const phone = wx.getStorageSync('phone') || '';
    const phoneNumber = phone || wx.getStorageSync('phoneNumber') || '';

    this.setData({
      merchantName,
      agreementSigned,
      signatureImage,
      settlementType,
      licenseNumber,
      idCardName,
      idCardNumber,
      idCardValidity,
      regionText,
      detailAddress,
      bankAccountName,
      bankCardNumber,
      bankCityText,
      bankName,
      email,
      merchantTypeText,
      phoneNumber
    });

    this.updateRates();
  },

  updateRates() {
    if (this.data.settlementType === 'D0') {
      this.setData({
        scanRate: '0.48',
        discountRate: '0.4'
      });
    } else {
      this.setData({
        scanRate: '0.38',
        discountRate: '0.3'
      });
    }
  },

  onSettlementTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      settlementType: type
    });
    wx.setStorageSync('settlementType', type);
    this.updateRates();
  },

  generateAgreement() {
    const accountName = wx.getStorageSync('accountName') || '';
    this.setData({
      showAgreementModal: true,
      agreementRead: false,
      countdown: 8,
      countdownComplete: false,
      bankAccountName: accountName
    });
    this.startCountdown();
  },

  closeAgreementModal() {
    this.setData({
      showAgreementModal: false
    });
  },

  startCountdown() {
    let countdown = 8;
    this.setData({ countdown, countdownComplete: false });
    
    const timer = setInterval(() => {
      countdown--;
      this.setData({ countdown });
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({ countdownComplete: true });
      }
    }, 1000);
  },

  toggleAgreementRead() {
    this.setData({ agreementRead: !this.data.agreementRead });
  },

  openSignaturePad() {
    if (!this.data.agreementRead) {
      wx.showToast({
        title: '请勾选"已阅读"',
        icon: 'none'
      });
      return;
    }

    this.setData({ showSignaturePad: true });
    this.initCanvas();
  },

  closeSignaturePad() {
    this.setData({ showSignaturePad: false });
  },

  initCanvas() {
    setTimeout(() => {
      const ctx = wx.createCanvasContext('signatureCanvas', this);
      ctx.setStrokeStyle('#000');
      ctx.setLineWidth(2);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 600, 300);
      this.setData({ ctx, signaturePoints: [] });
    }, 100);
  },

  startSignature(e) {
    if (!this.data.ctx) return;
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;

    this.data.signaturePoints = [{ x, y }];
    this.data.isDrawing = true;

    const ctx = this.data.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.stroke();
    ctx.draw(true);
  },

  moveSignature(e) {
    if (!this.data.ctx || !this.data.isDrawing) return;
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;

    this.data.signaturePoints.push({ x, y });

    const ctx = this.data.ctx;
    ctx.beginPath();
    ctx.moveTo(this.data.signaturePoints[0].x, this.data.signaturePoints[0].y);

    for (let i = 1; i < this.data.signaturePoints.length; i++) {
      ctx.lineTo(this.data.signaturePoints[i].x, this.data.signaturePoints[i].y);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.draw(true);
  },

  endSignature(e) {
    if (!this.data.ctx || !this.data.isDrawing) return;
    this.data.isDrawing = false;
  },

  clearSignature() {
    if (!this.data.ctx) return;
    const ctx = this.data.ctx;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 600, 300);
    ctx.draw();
    this.setData({ signaturePoints: [] });
  },

  confirmSignature() {
    if (!this.data.agreementRead) {
      wx.showToast({
        title: '请先勾选"已阅读"',
        icon: 'none'
      });
      return;
    }

    if (!this.data.signaturePoints || this.data.signaturePoints.length === 0) {
      wx.showToast({
        title: '请先绘制签名',
        icon: 'none'
      });
      return;
    }

    wx.canvasToTempFilePath({
      canvasId: 'signatureCanvas',
      success: (res) => {
        wx.getFileSystemManager().readFile({
          filePath: res.tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            const signatureImage = `data:image/png;base64,${fileRes.data}`;
            this.setData({
              signatureImage,
              agreementSigned: true,
              showSignaturePad: false,
              showAgreementModal: false
            });
            wx.setStorageSync('signatureImage', signatureImage);
            wx.setStorageSync('agreementSigned', true);

            wx.showToast({
              title: '协议签署成功！',
              icon: 'success'
            });
          },
          fail: (err) => {
            wx.showToast({
              title: '签名保存失败',
              icon: 'none'
            });
            console.error('签名保存失败:', err);
          }
        });
      },
      fail: (err) => {
        wx.showToast({
          title: '签名导出失败',
          icon: 'none'
        });
        console.error('签名导出失败:', err);
      }
    }, this);
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  goToMerchant() {
    wx.navigateTo({
      url: '/pages/merchant/merchant'
    });
  },

  goToAccount() {
    wx.navigateTo({
      url: '/pages/account/account'
    });
  },

  submitForm() {
    if (this.data.isSubmitting) {
      return;
    }

    if (!this.data.agreementSigned) {
      wx.showToast({
        title: '请先签署电子协议',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSubmitting: true });

    wx.showLoading({
      title: '提交中...',
      mask: true
    });

    this.saveMerchantInfo().then(() => {
      wx.hideLoading();
      this.clearAllStorage();
      wx.navigateTo({
        url: '/pages/success/success'
      });
    }).catch((error) => {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
      console.error('提交失败:', error);
    });
  },

  clearAllStorage() {
    const keysToRemove = [
      'merchantType', 'licenseNumber', 'licenseName', 'licenseValidity',
      'idCardName', 'idCardNumber', 'idCardStartDate', 'idCardValidity',
      'merchantName', 'regionText', 'detailedAddress', 'merchantTypeText',
      'merchantTypeId', 'merchantSubtypeId', 'phone', 'email', 'productType',
      'licenseImageUrl', 'idCardFrontImageUrl', 'idCardBackImageUrl',
      'shopFrontImage', 'shopInteriorImage', 'cashierImage', 'productCodeImage',
      'accountType', 'accountMaterialImage', 'bankCardImage', 'accountName',
      'bankCardNumber', 'bankProvince', 'bankCity', 'bankCityText', 'bankName',
      'accountMaterialUploadFails', 'bankCardUploadFails',
      'licenseImage', 'idCardFrontImage', 'idCardBackImage'
    ];
    keysToRemove.forEach(key => {
      wx.removeStorageSync(key);
    });
    console.log('本地存储已清除');
  },

  saveMerchantInfo() {
    return new Promise((resolve, reject) => {
      const province = wx.getStorageSync('province') || '';
      const city = wx.getStorageSync('city') || '';
      const district = wx.getStorageSync('district') || '';
      
      const merchantInfo = {
        merchantType: wx.getStorageSync('merchantType') || '',
        merchantName: wx.getStorageSync('merchantName') || '',
        merchantTypeText: wx.getStorageSync('merchantTypeText') || '',
        licenseNumber: wx.getStorageSync('licenseNumber') || '',
        licenseName: wx.getStorageSync('licenseName') || '',
        licenseValidity: wx.getStorageSync('licenseValidity') || '',
        idCardName: wx.getStorageSync('idCardName') || '',
        idCardNumber: wx.getStorageSync('idCardNumber') || '',
        idCardStartDate: wx.getStorageSync('idCardStartDate') || '',
        idCardValidity: wx.getStorageSync('idCardValidity') || '',
        phone: wx.getStorageSync('phone') || '',
        email: wx.getStorageSync('email') || '',
        province: province,
        city: city,
        district: district,
        address: wx.getStorageSync('regionText') || '',
        detailedAddress: wx.getStorageSync('detailedAddress') || '',
        bankAccountName: wx.getStorageSync('accountName') || '',
        bankCardNumber: wx.getStorageSync('bankCardNumber') || '',
        bankName: wx.getStorageSync('bankName') || '',
        bankCity: wx.getStorageSync('bankCityText') || '',
        bankBranch: wx.getStorageSync('bankBranch') || '',
        bankProvince: wx.getStorageSync('bankProvince') || '',
        rate: this.data.settlementType || '',
        licensePhoto: wx.getStorageSync('licenseImageUrl') || '',
        idCardFrontPhoto: wx.getStorageSync('idCardFrontImageUrl') || '',
        idCardBackPhoto: wx.getStorageSync('idCardBackImageUrl') || '',
        shopFrontPhoto: wx.getStorageSync('shopFrontImage') || '',
        shopInteriorPhoto: wx.getStorageSync('shopInteriorImage') || '',
        cashierPhoto: wx.getStorageSync('cashierImage') || '',
        productCodePhoto: wx.getStorageSync('productCodeImage') || '',
        bankCardPhoto: wx.getStorageSync('bankCardImage') || '',
        accountMaterialPhoto: wx.getStorageSync('accountMaterialImage') || '',
        signatureImage: this.data.signatureImage
      };

      const agentCode = getApp().globalData.agentCode || '';

      wx.request({
        url: this.data.apiBaseUrl + '/api/save-merchant',
        method: 'POST',
        data: {
          ...merchantInfo,
          agentCode
        },
        success: (res) => {
          if (res.data.code === 200 || (res.data.message && res.data.message.includes('成功'))) {
            resolve(res.data);
          } else {
            reject(new Error(res.data.message || '提交失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
});