Page({
  data: {
    apiBaseUrl: '',
    
    form: {
      merchantName: '',
      regionText: '',
      detailedAddress: '',
      merchantTypeText: '',
      merchantTypeId: '',
      merchantSubtypeId: '',
      phone: '',
      email: '',
      productType: 'qrCode',
      shopFrontImage: '',
      shopInteriorImage: '',
      cashierImage: '',
      productCodeImage: ''
    },
    
    errors: {
      detailedAddress: false,
      shopFrontImage: false,
      shopInteriorImage: false,
      cashierImage: false,
      productCodeImage: false
    },
    
    showRegionPicker: false,
    showMerchantTypeModal: false,
    showShopExampleModal: false,
    
    regionValue: [0, 0, 0],
    provinces: [],
    cities: [],
    districts: [],

    merchantTypes: [],
    filteredMerchantTypes: [],
    subCategories: [],
    filteredSubCategories: [],
    selectedCategory: null,
    selectedSubcategory: null,
    merchantTypeSearchValue: ''
  },

  onLoad(options) {
    console.log('商户信息页加载', options);
    const app = getApp();
    this.setData({
      apiBaseUrl: app.getApiBaseUrl()
    });
    this.loadFromStorage();
    this.loadRegionData();
    this.loadMerchantTypes();
  },

  loadFromStorage() {
    const app = getApp();
    const apiBaseUrl = app.getApiBaseUrl();
    
    const merchantName = wx.getStorageSync('merchantName') || '';
    const regionText = wx.getStorageSync('regionText') || '';
    const detailedAddress = wx.getStorageSync('detailedAddress') || '';
    const merchantTypeText = wx.getStorageSync('merchantTypeText') || '';
    const merchantTypeId = wx.getStorageSync('merchantTypeId') || '';
    const merchantSubtypeId = wx.getStorageSync('merchantSubtypeId') || '';
    const phone = wx.getStorageSync('phone') || '';
    const email = wx.getStorageSync('email') || '';
    const productType = wx.getStorageSync('productType') || 'qrCode';
    const shopFrontImage = wx.getStorageSync('shopFrontImage') || '';
    const shopInteriorImage = wx.getStorageSync('shopInteriorImage') || '';
    const cashierImage = wx.getStorageSync('cashierImage') || '';
    const productCodeImage = wx.getStorageSync('productCodeImage') || '';
    
    const formatImageUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return apiBaseUrl + url;
    };

    this.setData({
      'form.merchantName': merchantName,
      'form.regionText': regionText,
      'form.detailedAddress': detailedAddress,
      'form.merchantTypeText': merchantTypeText,
      'form.merchantTypeId': merchantTypeId,
      'form.merchantSubtypeId': merchantSubtypeId,
      'form.phone': phone,
      'form.email': email,
      'form.productType': productType,
      'form.shopFrontImage': formatImageUrl(shopFrontImage),
      'form.shopInteriorImage': formatImageUrl(shopInteriorImage),
      'form.cashierImage': formatImageUrl(cashierImage),
      'form.productCodeImage': formatImageUrl(productCodeImage)
    });
  },

  loadRegionData() {
    try {
      const regionData = require('../../data/region-data.js');
      const provinces = regionData.map(province => ({
        name: province.name,
        cities: province.children.map(city => ({
          name: city.name,
          districts: city.children.map(d => ({ name: d.name }))
        }))
      }));
      
      let cities = [];
      let districts = [];
      
      if (provinces.length > 0) {
        cities = provinces[0].cities;
        if (cities.length > 0) {
          districts = cities[0].districts.map(d => ({ name: d }));
        }
      }
      
      this.setData({
        provinces,
        cities,
        districts
      });
    } catch (error) {
      console.error('加载地区数据失败:', error);
      wx.showToast({
        title: '加载地区数据失败',
        icon: 'none'
      });
    }
  },

  loadMerchantTypes() {
    try {
      const merchantTypesData = require('../../data/merchant-types.js');
      this.setData({
        merchantTypes: merchantTypesData,
        filteredMerchantTypes: merchantTypesData
      });
      if (merchantTypesData.length > 0) {
        this.setData({
          selectedCategory: merchantTypesData[0],
          subCategories: merchantTypesData[0].subcategories || [],
          filteredSubCategories: merchantTypesData[0].subcategories || []
        });
      }
    } catch (error) {
      console.error('加载商户类型数据失败:', error);
      wx.showToast({
        title: '加载商户类型数据失败',
        icon: 'none'
      });
    }
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    const searchTerm = this.data.merchantTypeSearchValue;
    let filteredSubCategories = category.subcategories || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredSubCategories = filteredSubCategories.filter(sub =>
        sub.name.toLowerCase().includes(term) || sub.mcc.toLowerCase().includes(term)
      );
    }

    this.setData({
      selectedCategory: category,
      subCategories: category.subcategories || [],
      filteredSubCategories: filteredSubCategories,
      selectedSubcategory: null
    });
  },

  onMerchantTypeSearch(e) {
    const searchTerm = e.detail.value;
    const { merchantTypes, selectedCategory } = this.data;

    this.setData({ merchantTypeSearchValue: searchTerm });

    if (!searchTerm) {
      this.setData({
        filteredMerchantTypes: merchantTypes,
        filteredSubCategories: selectedCategory ? selectedCategory.subcategories || [] : []
      });
      return;
    }

    const term = searchTerm.toLowerCase();
    const filteredMerchants = merchantTypes.filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.subcategories && m.subcategories.some(s =>
        s.name.toLowerCase().includes(term) || s.mcc.toLowerCase().includes(term)
      ))
    );

    let filteredSubCategories = [];
    if (filteredMerchants.length === 1) {
      filteredSubCategories = filteredMerchants[0].subcategories.filter(sub =>
        sub.name.toLowerCase().includes(term) || sub.mcc.toLowerCase().includes(term)
      );
    } else {
      merchantTypes.forEach(m => {
        m.subcategories.forEach(s => {
          if (s.name.toLowerCase().includes(term) || s.mcc.toLowerCase().includes(term)) {
            if (!filteredSubCategories.find(x => x.mcc === s.mcc)) {
              filteredSubCategories.push(s);
            }
          }
        });
      });
    }

    this.setData({
      filteredMerchantTypes: filteredMerchants,
      filteredSubCategories: filteredSubCategories
    });
  },

  selectSubcategory(e) {
    const sub = e.currentTarget.dataset.subcategory;
    this.setData({
      selectedSubcategory: sub,
      'form.merchantTypeText': sub.name,
      'form.merchantTypeId': sub.mcc,
      'form.merchantSubtypeId': sub.mcc,
      showMerchantTypeSelector: false
    });
    wx.setStorageSync('merchantTypeText', sub.name);
    wx.setStorageSync('merchantTypeId', sub.mcc);
    wx.setStorageSync('merchantSubtypeId', sub.mcc);
  },

  openMerchantTypeSelector() {
    this.setData({ showMerchantTypeSelector: true });
  },

  closeMerchantTypeSelector() {
    this.setData({
      showMerchantTypeSelector: false,
      merchantTypeSearchValue: '',
      filteredMerchantTypes: this.data.merchantTypes,
      filteredSubCategories: this.data.selectedCategory ? this.data.selectedCategory.subcategories || [] : []
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`form.${field}`]: value
    });
    
    wx.setStorageSync(field, value);
    
    if (field === 'detailedAddress') {
      this.setData({
        [`errors.${field}`]: !value.trim()
      });
    }
  },

  goToRegister() {
    wx.navigateBack();
  },

  openRegionPicker() {
    this.setData({ showRegionPicker: true });
  },

  openRegionSelector() {
    this.setData({ showRegionSelector: true });
  },

  closeRegionSelector() {
    this.setData({ showRegionSelector: false });
  },

  closeRegionPicker() {
    this.setData({ showRegionPicker: false });
  },

  onRegionChange(e) {
    const { value, code } = e.detail;
    const regionText = value.join(' ');
    const [province, city, district] = value;
    const [provinceCode, cityCode, districtCode] = code;

    this.setData({
      'form.regionText': regionText,
      'form.province': province,
      'form.city': city,
      'form.district': district,
      'form.provinceCode': provinceCode,
      'form.cityCode': cityCode,
      'form.districtCode': districtCode
    });

    wx.setStorageSync('regionText', regionText);
    wx.setStorageSync('province', province);
    wx.setStorageSync('city', city);
    wx.setStorageSync('district', district);
  },

  onRegionCancel() {
  },

  openMerchantTypeModal() {
    this.setData({ showMerchantTypeModal: true });
  },

  openMerchantTypeSelector() {
    this.setData({ showMerchantTypeSelector: true });
  },

  closeMerchantTypeSelector() {
    this.setData({ showMerchantTypeSelector: false });
  },

  closeMerchantTypeModal() {
    this.setData({ showMerchantTypeModal: false });
  },

  selectMerchantType(e) {
    const { type, subtype, name, mcc } = e.currentTarget.dataset;
    const merchantTypeText = `${name} (${mcc})`;
    
    this.setData({
      'form.merchantTypeText': merchantTypeText,
      'form.merchantTypeId': type,
      'form.merchantSubtypeId': subtype,
      showMerchantTypeModal: false
    });
    
    wx.setStorageSync('merchantTypeText', merchantTypeText);
    wx.setStorageSync('merchantTypeId', type);
    wx.setStorageSync('merchantSubtypeId', subtype);
  },

  selectProductType(e) {
    const { type } = e.currentTarget.dataset;
    
    this.setData({
      'form.productType': type
    });
    
    wx.setStorageSync('productType', type);
    
    if (type === 'other') {
      this.setData({
        'form.productCodeImage': ''
      });
      wx.removeStorageSync('productCodeImage');
    }
  },

  chooseImage(e) {
    const { type } = e.currentTarget.dataset;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.uploadImage(type, tempFilePaths[0]);
      }
    });
  },

  uploadImage(type, filePath) {
    wx.showLoading({
      title: '上传中...',
      mask: true
    });
    
    const app = getApp();
    const apiBaseUrl = app.getApiBaseUrl();
    
    wx.uploadFile({
      url: apiBaseUrl + '/api/upload',
      filePath: filePath,
      name: 'file',
      timeout: 30000,
      formData: {
        type: type,
        agentCode: app.getAgentCode ? app.getAgentCode() : ''
      },
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            const imageUrl = apiBaseUrl + data.url;
            this.setData({
              [`form.${type}Image`]: imageUrl,
              [`errors.${type}Image`]: false
            });
            
            wx.setStorageSync(`${type}Image`, imageUrl);
            
            wx.showToast({
              title: '上传成功',
              icon: 'success',
              duration: 1500
            });
          } else {
            wx.showToast({
              title: data.message || '上传失败',
              icon: 'none'
            });
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

  showShopExample() {
    this.setData({ showShopExampleModal: true });
  },

  closeShopExample() {
    this.setData({ showShopExampleModal: false });
  },

  stopPropagation() {
  },

  goToNext() {
    const { form } = this.data;
    
    if (!form.merchantName) {
      wx.showToast({
        title: '请填写商户名称',
        icon: 'none'
      });
      return;
    }
    
    if (!form.regionText) {
      wx.showToast({
        title: '请选择地区',
        icon: 'none'
      });
      return;
    }
    
    if (!form.detailedAddress) {
      this.setData({
        'errors.detailedAddress': true
      });
      wx.showToast({
        title: '请填写详细地址',
        icon: 'none'
      });
      return;
    }
    
    if (!form.merchantTypeText) {
      wx.showToast({
        title: '请选择商户类型',
        icon: 'none'
      });
      return;
    }
    
    if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone.replace(/\s/g, '').replace(/-/g, ''))) {
      wx.showToast({
        title: '请填写有效的手机号码',
        icon: 'none'
      });
      return;
    }
    
    if (form.productType !== 'other' && !form.productCodeImage) {
      this.setData({
        'errors.productCodeImage': true
      });
      wx.showToast({
        title: form.productType === 'qrCode' ? '请上传二维码照片' : '请上传TUSN码照片',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/account/account'
    });
  }
});