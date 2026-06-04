const app = getApp();

Page({
  data: {
    agentCode: '',
    
    // 表单数据
    form: {
      merchantType: 'micro',
      licenseNumber: '',
      licenseName: '',
      licenseValidity: '',
      idCardName: '',
      idCardNumber: '',
      idCardStartDate: '',
      idCardValidity: ''
    },

    // 上传图片
    images: {
      license: '',
      idCardFront: '',
      idCardBack: ''
    },

    // 身份证有效期选项
    idValidityOptions: ['请选择身份证有效期', '10年', '20年', '长期'],
    idValidityIndex: 0,
    
    // 日期选择器
    showDatePicker: false,
    datePickerTitle: '选择日期',
    currentPickerType: '',
    yearRange: [],
    monthRange: [],
    dayRange: [],
    datePickerValue: [50, 0, 0],
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
    selectedDay: new Date().getDate(),
    
    // 示例弹窗
    showExampleModal: false,
    exampleTitle: '',
    exampleImage: ''
  },

  onLoad(options) {
    console.log('注册页加载', options);
    
    this.initDateRanges();
    this.loadFromStorage();
    
    let agentCode = '';
    if (options.agent) {
      agentCode = options.agent;
    } else {
      agentCode = app.getAgentCode();
    }
    
    if (!agentCode) {
      wx.showToast({
        title: '缺少代理商标识，请重新扫码',
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    this.setData({ agentCode });
    console.log('代理商代码:', agentCode);
  },

  initDateRanges() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 50; i <= currentYear + 50; i++) {
      years.push(i);
    }
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(i);
    }
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    
    this.setData({
      yearRange: years,
      monthRange: months,
      dayRange: days,
      datePickerValue: [50, new Date().getMonth(), new Date().getDate() - 1]
    });
    
    console.log('日期范围初始化完成:', years.length, '年,', months.length, '月,', days.length, '日');
  },

  loadFromStorage() {
    const app = getApp();
    const apiBaseUrl = app.getApiBaseUrl();
    
    const merchantType = wx.getStorageSync('merchantType') || 'micro';
    const licenseNumber = wx.getStorageSync('licenseNumber') || '';
    const licenseName = wx.getStorageSync('licenseName') || '';
    const licenseValidity = wx.getStorageSync('licenseValidity') || '';
    const idCardName = wx.getStorageSync('idCardName') || '';
    const idCardNumber = wx.getStorageSync('idCardNumber') || '';
    const idCardStartDate = wx.getStorageSync('idCardStartDate') || '';
    const idCardValidity = wx.getStorageSync('idCardValidity') || '';
    
    const licenseImageUrl = wx.getStorageSync('licenseImageUrl') || '';
    const idCardFrontImageUrl = wx.getStorageSync('idCardFrontImageUrl') || '';
    const idCardBackImageUrl = wx.getStorageSync('idCardBackImageUrl') || '';
    
    const formatImageUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return apiBaseUrl + url;
    };

    this.setData({
      form: {
        merchantType,
        licenseNumber,
        licenseName,
        licenseValidity,
        idCardName,
        idCardNumber,
        idCardStartDate,
        idCardValidity
      },
      images: {
        license: formatImageUrl(licenseImageUrl),
        idCardFront: formatImageUrl(idCardFrontImageUrl),
        idCardBack: formatImageUrl(idCardBackImageUrl)
      }
    });

    console.log('从本地存储加载数据完成');
  },

  onMerchantTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'form.merchantType': type
    });
    wx.setStorageSync('merchantType', type);
    
    wx.setStorageSync('accountType', 'private');
    
    console.log('商户类型切换为:', type);
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
    wx.setStorageSync(field, value);
    console.log(`${field} 变更:`, value);
  },

  onLicenseValidityChange(e) {
    this.setData({
      ['form.licenseValidity']: e.detail.value
    });
  },

  onIdCardStartDateChange(e) {
    this.setData({
      ['form.idCardStartDate']: e.detail.value
    });
  },

  closeDatePicker() {
    this.setData({ showDatePicker: false });
  },

  onDateChange(e) {
    const val = e.detail.value;
    const year = this.data.yearRange[val[0]];
    const month = this.data.monthRange[val[1]];
    const day = this.data.dayRange[val[2]];
    
    this.setData({
      datePickerValue: val,
      selectedYear: year,
      selectedMonth: month,
      selectedDay: day
    });
    
    console.log('选择日期:', year, month, day);
  },

  confirmDate() {
    const { selectedYear, selectedMonth, selectedDay, currentPickerType } = this.data;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    this.setData({
      [`form.${currentPickerType}`]: dateStr,
      showDatePicker: false
    });
    wx.setStorageSync(currentPickerType, dateStr);
  },

  toggleLicenseValidity() {
    wx.showModal({
      title: '提示',
      content: '是否设置为长期有效？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'form.licenseValidity': '长期有效'
          });
          wx.setStorageSync('licenseValidity', '长期有效');
        }
      }
    });
  },

  toggleIdValidity() {
    wx.showModal({
      title: '提示',
      content: '是否设置为长期有效？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'form.idCardValidity': '长期有效',
            idValidityIndex: 3
          });
          wx.setStorageSync('idCardValidity', '长期有效');
        }
      }
    });
  },

  onIdValidityChange(e) {
    const index = e.detail.value;
    const value = this.data.idValidityOptions[index];
    this.setData({
      idValidityIndex: index,
      'form.idCardValidity': value
    });
    wx.setStorageSync('idCardValidity', value);
  },

  chooseImage(e) {
    const type = e.currentTarget.dataset.type;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          [`images.${type}`]: tempFilePaths[0]
        });

        // 上传图片到服务器并进行OCR识别
        this.uploadImage(type, tempFilePaths[0]);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  uploadImage(type, filePath) {
    wx.showLoading({ title: '上传中...' });
    const app = getApp();
    const apiBaseUrl = app.getApiBaseUrl();
    
    wx.uploadFile({
      url: apiBaseUrl + '/api/upload',
      filePath: filePath,
      name: 'file',
      timeout: 30000,
      formData: {
        type: type,
        agentCode: this.data.agentCode
      },
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            const imageUrl = apiBaseUrl + data.url;
            wx.setStorageSync(`${type}ImageUrl`, imageUrl);
            this.setData({
              [`images.${type}`]: imageUrl
            });
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
            
            // 调用OCR识别
            this.performOCR(type, filePath);
          } else {
            throw new Error(data.message || '上传失败');
          }
        } catch (e) {
          console.error('解析响应失败:', e);
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('上传失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  performOCR(type, filePath) {
    wx.showLoading({ title: '识别中...' });
    const app = getApp();
    const apiBaseUrl = app.getApiBaseUrl();
    
    wx.uploadFile({
      url: apiBaseUrl + '/api/ocr',
      filePath: filePath,
      name: 'file',
      timeout: 30000,
      formData: {
        type: type
      },
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200 && data.data) {
            this.fillFormFromOCR(type, data.data);
            wx.showToast({
              title: '识别成功',
              icon: 'success'
            });
          } else {
            console.log('OCR识别无结果或失败:', data);
          }
        } catch (e) {
          console.error('OCR响应解析失败:', e);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('OCR识别失败:', err);
      }
    });
  },

  fillFormFromOCR(type, ocrData) {
    console.log('OCR识别结果:', type, ocrData);
    
    if (type === 'idCardFront') {
      if (ocrData.name) {
        this.setData({ 'form.idCardName': ocrData.name });
        wx.setStorageSync('idCardName', ocrData.name);
      }
      if (ocrData.idNumber) {
        this.setData({ 'form.idCardNumber': ocrData.idNumber });
        wx.setStorageSync('idCardNumber', ocrData.idNumber);
      }
    } else if (type === 'idCardBack') {
      if (ocrData.startDate) {
        const startDateStr = ocrData.startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
        this.setData({ 'form.idCardStartDate': startDateStr });
        wx.setStorageSync('idCardStartDate', startDateStr);
      }
      if (ocrData.validity) {
        const validityMap = {
          '长期有效': '长期',
          '20年': '20年',
          '10年': '10年',
          '5年': '5年',
          '长期': '长期'
        };
        const validity = validityMap[ocrData.validity] || ocrData.validity;
        const index = this.data.idValidityOptions.indexOf(validity);
        console.log('身份证有效期识别结果:', ocrData.validity, '映射后:', validity, '选项索引:', index);
        if (index > -1) {
          this.setData({
            idValidityIndex: index,
            'form.idCardValidity': validity
          });
          wx.setStorageSync('idCardValidity', validity);
        }
      }
    } else if (type === 'license') {
      if (ocrData.licenseNumber) {
        this.setData({ 'form.licenseNumber': ocrData.licenseNumber });
        wx.setStorageSync('licenseNumber', ocrData.licenseNumber);
      }
      if (ocrData.licenseName) {
        this.setData({ 'form.licenseName': ocrData.licenseName });
        wx.setStorageSync('licenseName', ocrData.licenseName);
      }
      if (ocrData.validity) {
        this.setData({ 'form.licenseValidity': ocrData.validity });
        wx.setStorageSync('licenseValidity', ocrData.validity);
      }
    }
  },

  previewImage(e) {
    const type = e.currentTarget.dataset.type;
    const imageUrl = this.data.images[type];
    if (imageUrl) {
      wx.previewImage({
        current: imageUrl,
        urls: [imageUrl]
      });
    }
  },

  showExample(e) {
    const type = e.currentTarget.dataset.type;
    let title = '';
    let image = '';
    
    switch (type) {
      case 'idCardFront':
        title = '身份证正面示例';
        image = 'idcard';
        break;
      case 'idCardBack':
        title = '身份证反面示例';
        image = 'idcard';
        break;
      case 'licenseFront':
        title = '营业执照正面示例';
        image = 'license';
        break;
      default:
        return;
    }
    
    this.setData({
      showExampleModal: true,
      exampleTitle: title,
      exampleImage: image
    });
  },

  closeExampleModal() {
    this.setData({ showExampleModal: false });
  },

  showIdCardExample() {
    this.setData({
      showExampleModal: true,
      exampleTitle: '身份证示例',
      exampleImage: 'idcard'
    });
  },

  showBusinessLicenseExample() {
    this.setData({
      showExampleModal: true,
      exampleTitle: '营业执照示例',
      exampleImage: 'license'
    });
  },

  goToNext() {
    // 验证表单
    const { form } = this.data;
    
    if (!form.merchantType) {
      wx.showToast({ title: '请选择商户类型', icon: 'none' });
      return;
    }
    
    // 企业类型需要验证营业执照信息
    if (form.merchantType === 'enterprise') {
      if (!form.licenseNumber) {
        wx.showToast({ title: '请输入营业执照号', icon: 'none' });
        return;
      }
      
      if (!form.licenseName) {
        wx.showToast({ title: '请输入营业执照名称', icon: 'none' });
        return;
      }
    }
    
    // 验证身份证信息
    if (!form.idCardName) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    
    if (!form.idCardNumber) {
      wx.showToast({ title: '请输入身份证号', icon: 'none' });
      return;
    }
    
    // 验证身份证号格式（增强验证，兼容iOS）
    const idCardValue = form.idCardNumber.trim().toUpperCase();
    const idCardReg = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/;
    if (!idCardReg.test(idCardValue)) {
      wx.showToast({ title: '身份证号格式不正确', icon: 'none' });
      return;
    }
    
    // 保存当前页面数据到全局
    app.globalData.registerData = form;
    
    // 跳转到下一页
    wx.navigateTo({
      url: '/pages/merchant/merchant'
    });
  },

  onShareAppMessage() {
    return {
      title: '拉卡拉商户注册',
      path: '/pages/register/register'
    };
  }
});