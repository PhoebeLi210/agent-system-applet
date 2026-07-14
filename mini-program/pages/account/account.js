Page({
  data: {
    apiBaseUrl: '',
    
    accountType: 'private',
    accountMaterialImage: '',
    bankCardImage: '',
    bankCardUploadFails: 0,
    accountMaterialUploadFails: 0,
    accountName: '',
    bankCardNumber: '',
    bankProvince: '',
    bankCity: '',
    bankCityText: '',
    bankName: '',
    
    showRegionPicker: false,
    showBankPicker: false,
    showCustomBankInput: false,
    showAccountExampleModal: false,
    
    regionTab: 'province',
    selectedProvince: '',
    selectedCity: '',
    provinces: [],
    cities: [],
    
    bankSearch: '',
    customBankName: '',
    banks: [],
    filteredBanks: [],
    bankLoading: false
  },

  onLoad(options) {
    console.log('账户信息页加载', options);
    const app = getApp();
    this.setData({
      apiBaseUrl: app.getApiBaseUrl()
    });
    this.loadFromStorage();
    this.loadRegionData();
    this.loadBankData();
    // 客户端预取：已选城市则提前拉支行，打开弹窗零等待
    this._branchCache = {};
    this.prefetchBranches();
  },

  prefetchBranches() {
    const city = this.data.selectedCity;
    if (!city) return;
    this.fetchBranches(city, '', true);
  },

  loadFromStorage() {
    const app = getApp();
    const apiBaseUrl = app.getApiBaseUrl();
    const accountType = wx.getStorageSync('accountType') || 'private';
    const accountMaterialImage = wx.getStorageSync('accountMaterialImage') || '';
    const bankCardImage = wx.getStorageSync('bankCardImage') || '';
    let accountName = wx.getStorageSync('accountName') || '';
    const bankCardNumber = wx.getStorageSync('bankCardNumber') || '';
    const bankProvince = wx.getStorageSync('bankProvince') || '';
    const bankCity = wx.getStorageSync('bankCity') || '';
    const bankCityText = wx.getStorageSync('bankCityText') || '';
    const bankName = wx.getStorageSync('bankName') || '';
    
    const formatImageUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return apiBaseUrl + url;
    };

    if (!accountName) {
      if (accountType === 'private') {
        accountName = wx.getStorageSync('idCardName') || '';
      } else {
        accountName = wx.getStorageSync('licenseName') || '';
      }
    }

    this.setData({
      accountType,
      accountMaterialImage: formatImageUrl(accountMaterialImage),
      bankCardImage: formatImageUrl(bankCardImage),
      accountName,
      bankCardNumber,
      bankProvince,
      bankCity,
      bankCityText,
      bankName,
      selectedCity: bankCity
    });
  },

  loadRegionData() {
    try {
      const regionData = require('../../data/region-data.js');
      this.setData({
        provinces: regionData
      });
    } catch (error) {
      console.error('加载地区数据失败:', error);
      this.setData({
        provinces: []
      });
    }
  },

  loadBankData() {
    try {
      const bankData = require('../../data/bank-data.js');
      this.setData({
        banks: bankData,
        filteredBanks: bankData
      });
    } catch (error) {
      console.error('加载银行数据失败:', error);
      this.setData({
        banks: [],
        filteredBanks: []
      });
    }
  },

  onAccountTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      accountType: type
    });
    wx.setStorageSync('accountType', type);

    if (type === 'private') {
      const idCardName = wx.getStorageSync('idCardName') || '';
      this.setData({ accountName: idCardName });
      wx.setStorageSync('accountName', idCardName);
    } else {
      const licenseName = wx.getStorageSync('licenseName') || '';
      this.setData({ accountName: licenseName });
      wx.setStorageSync('accountName', licenseName);
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [field]: value
    });
    
    wx.setStorageSync(field, value);
  },

  chooseImage(e) {
    const type = e.currentTarget.dataset.type;
    const self = this;

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        
        wx.showLoading({
          title: '上传中...',
          mask: true
        });

        wx.uploadFile({
          url: self.data.apiBaseUrl + '/upload-idcard',
          filePath: tempFilePath,
          name: 'idcard',
          formData: {
            type: type
          },
          success(uploadRes) {
            wx.hideLoading();
            try {
              const data = JSON.parse(uploadRes.data);
              if (data.code === 200 || data.success) {
                let imageUrl = '';
                if (data.url) {
                  imageUrl = data.url.startsWith('http') ? data.url : self.data.apiBaseUrl + data.url;
                } else if (data.data && data.data.url) {
                  imageUrl = data.data.url.startsWith('http') ? data.data.url : self.data.apiBaseUrl + data.data.url;
                } else if (data.filename) {
                  imageUrl = self.data.apiBaseUrl + '/uploads/' + data.filename;
                }
                
                if (type === 'accountMaterial') {
                  self.setData({
                    accountMaterialImage: imageUrl
                  });
                  wx.setStorageSync('accountMaterialImage', imageUrl);
                } else if (type === 'bankCard') {
                  self.setData({
                    bankCardImage: imageUrl
                  });
                  wx.setStorageSync('bankCardImage', imageUrl);
                  
                  self.performBankCardOCR(tempFilePath);
                }
                
                wx.showToast({
                  title: '上传成功',
                  icon: 'success'
                });
              } else {
                const fails = type === 'accountMaterial' ? 'accountMaterialUploadFails' : 'bankCardUploadFails';
                self.setData({ [fails]: self.data[fails] + 1 });
                wx.showToast({
                  title: data.message || data.error || '上传失败',
                  icon: 'none'
                });
              }
            } catch (e) {
              const fails = type === 'accountMaterial' ? 'accountMaterialUploadFails' : 'bankCardUploadFails';
              self.setData({ [fails]: self.data[fails] + 1 });
              console.error('解析响应失败:', e, uploadRes.data);
              wx.showToast({
                title: '上传失败，请检查网络',
                icon: 'none'
              });
            }
          },
          fail(err) {
            wx.hideLoading();
            const fails = type === 'accountMaterial' ? 'accountMaterialUploadFails' : 'bankCardUploadFails';
            self.setData({ [fails]: self.data[fails] + 1 });
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
            console.error('上传失败:', err);
          }
        });
      }
    });
  },

  // 调用银行卡OCR识别
  performBankCardOCR(filePath) {
    wx.showLoading({ title: '识别中...' });
    
    wx.uploadFile({
      url: this.data.apiBaseUrl + '/upload-idcard',
      filePath: filePath,
      name: 'idcard',
      formData: { type: 'bankcard' },
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200 && data.data) {
            this.fillFormFromBankCardOCR(data.data);
            wx.showToast({
              title: '银行卡信息已识别',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: data.message || '识别失败',
              icon: 'none'
            });
          }
        } catch (e) {
          console.error('解析OCR响应失败:', e, res.data);
          wx.showToast({
            title: '识别失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '识别失败',
          icon: 'none'
        });
        console.error('OCR识别失败:', err);
      }
    });
  },

  // 填充表单数据从银行卡OCR结果
  fillFormFromBankCardOCR(ocrData) {
    const updates = {};
    
    // 填充开户名
    if (ocrData.accountName) {
      updates.accountName = ocrData.accountName;
      wx.setStorageSync('accountName', ocrData.accountName);
    }
    
    // 填充银行卡号
    if (ocrData.bankCardNumber) {
      updates.bankCardNumber = ocrData.bankCardNumber;
      wx.setStorageSync('bankCardNumber', ocrData.bankCardNumber);
    }
    
    // 填充银行名称
    if (ocrData.bankName) {
      updates.bankName = ocrData.bankName;
      wx.setStorageSync('bankName', ocrData.bankName);
    }
    
    // 填充开户城市（如果OCR提供了城市信息）
    if (ocrData.bankCity) {
      updates.bankCityText = ocrData.bankCity;
      wx.setStorageSync('bankCityText', ocrData.bankCity);
    }
    
    if (Object.keys(updates).length > 0) {
      this.setData(updates);
    }
  },

  openRegionPicker() {
    this.setData({
      showRegionPicker: true,
      regionTab: 'province'
    });
  },

  closeRegionPicker() {
    this.setData({
      showRegionPicker: false
    });
  },

  switchRegionTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      regionTab: tab
    });
  },

  selectProvince(e) {
    const province = e.currentTarget.dataset.province;
    const index = e.currentTarget.dataset.index;
    const provinceData = this.data.provinces[index];
    const cities = provinceData.children ? provinceData.children.map(city => city.name) : [];

    this.setData({
      selectedProvince: province,
      bankProvince: province,
      cities: cities,
      regionTab: 'city'
    });
  },

  selectCity(e) {
    const city = e.currentTarget.dataset.city;
    const cityText = this.data.selectedProvince + ' ' + city;
    
    this.setData({
      selectedCity: city,
      bankCity: city,
      bankCityText: cityText,
      showRegionPicker: false
    });
    
    wx.setStorageSync('bankProvince', this.data.bankProvince);
    wx.setStorageSync('bankCity', city);
    wx.setStorageSync('bankCityText', cityText);
    // 选完城市立即静默预取支行，减少后续打开弹窗的等待
    if (!this._branchCache) this._branchCache = {};
    this.fetchBranches(city, '', true);
  },

  openBankPicker() {
    if (this.data.selectedCity) {
      this.fetchBranches(this.data.selectedCity, '');
    } else {
      this.setData({
        showBankPicker: true,
        filteredBanks: this.data.banks,
        bankSearch: ''
      });
      wx.showToast({ title: '建议先选择开户城市', icon: 'none' });
    }
  },

  fetchBranches(city, keyword, silent) {
    silent = silent === true;
    const cacheKey = city + '|' + (keyword || '');
    if (this._branchCache && this._branchCache[cacheKey]) {
      this.setData({ filteredBanks: this._branchCache[cacheKey], showBankPicker: !silent, bankLoading: false });
      return;
    }
    if (!silent) this.setData({ showBankPicker: true, bankLoading: true });
    this.setData({ bankSearch: keyword });
    const cityText = city.replace(/市|省|自治区|壮族|回族|维吾尔|特别行政区/g, '');
    let url = this.data.apiBaseUrl + '/api/bank-branches?city=' + encodeURIComponent(cityText);
    if (keyword) url += '&keyword=' + encodeURIComponent(keyword);
    const self = this;
    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          if (self._branchCache) self._branchCache[cacheKey] = res.data.data;
          self.setData({ filteredBanks: res.data.data, bankLoading: false, showBankPicker: !silent });
        } else {
          if (!silent) self.fallbackFilter(cityText, keyword);
        }
      },
      fail: () => {
        if (!silent) self.fallbackFilter(cityText, keyword);
      }
    });
  },

  fallbackFilter(cityText, keyword) {
    let list = this.data.banks;
    if (cityText) list = list.filter(b => b.name.indexOf(cityText) !== -1);
    if (keyword) list = list.filter(b => b.name.indexOf(keyword) !== -1);
    this.setData({ filteredBanks: list, bankLoading: false });
  },

  closeBankPicker() {
    this.setData({
      showBankPicker: false,
      bankSearch: ''
    });
  },

  onBankSearchChange(e) {
    const search = e.detail.value;
    this.setData({ bankSearch: search });
    if (this.data.selectedCity) {
      if (this._searchTimer) clearTimeout(this._searchTimer);
      const self = this;
      this._searchTimer = setTimeout(() => {
        self.fetchBranches(self.data.selectedCity, search);
      }, 300);
    } else {
      const filteredBanks = this.data.banks.filter(bank =>
        bank.name.includes(search)
      );
      this.setData({ filteredBanks: filteredBanks });
    }
  },

  selectBank(e) {
    const item = e.currentTarget.dataset.bank;
    const bankName = item.name || '';
    const bankBranch = item.code || '';

    this.setData({
      bankName: bankName,
      bankBranch: bankBranch,
      showBankPicker: false,
      bankSearch: ''
    });

    wx.setStorageSync('bankName', bankName);
    wx.setStorageSync('bankBranch', bankBranch);
  },

  clearBankName() {
    this.setData({
      bankName: ''
    });
    wx.setStorageSync('bankName', '');
  },

  openCustomBankInput() {
    this.setData({
      showBankPicker: false,
      showCustomBankInput: true,
      customBankName: ''
    });
  },

  closeCustomBankInput() {
    this.setData({
      showCustomBankInput: false,
      customBankName: ''
    });
  },

  onCustomBankChange(e) {
    this.setData({
      customBankName: e.detail.value
    });
  },

  confirmCustomBank() {
    if (!this.data.customBankName.trim()) {
      wx.showToast({
        title: '请输入开户行名称',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      bankName: this.data.customBankName,
      showCustomBankInput: false,
      customBankName: ''
    });
    
    wx.setStorageSync('bankName', this.data.customBankName);
  },

  showAccountExample() {
    this.setData({
      showAccountExampleModal: true
    });
  },

  closeAccountExample() {
    this.setData({
      showAccountExampleModal: false
    });
  },

  goToMerchant() {
    wx.navigateBack();
  },

  goToNext() {
    const { accountType, accountMaterialImage, bankCardImage, accountMaterialUploadFails, bankCardUploadFails, accountName, bankCardNumber, bankCityText, bankName } = this.data;
    
    if (accountType === 'public' && !accountMaterialImage && accountMaterialUploadFails < 3) {
      wx.showToast({
        title: '请上传账户材料照片',
        icon: 'none'
      });
      return;
    }
    
    if (accountType === 'private' && !bankCardImage && bankCardUploadFails < 3) {
      wx.showToast({
        title: '请上传银行卡照片',
        icon: 'none'
      });
      return;
    }
    
    if (!accountName.trim()) {
      wx.showToast({
        title: '请输入开户名',
        icon: 'none'
      });
      return;
    }
    
    if (!bankCardNumber.trim()) {
      wx.showToast({
        title: '请输入银行卡号',
        icon: 'none'
      });
      return;
    }
    
    if (!bankCityText) {
      wx.showToast({
        title: '请选择开户城市',
        icon: 'none'
      });
      return;
    }
    
    if (!bankName) {
      wx.showToast({
        title: '请选择开户行',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/rate/rate'
    });
  }
});