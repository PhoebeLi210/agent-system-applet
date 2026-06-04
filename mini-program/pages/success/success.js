Page({
  data: {},

  onLoad(options) {
    console.log('成功页加载', options);
  },

  closePage() {
    this.clearStorage();
    wx.reLaunch({
      url: '/pages/register/register'
    });
  },

  clearStorageAndClose() {
    this.clearStorage();
    wx.reLaunch({
      url: '/pages/register/register'
    });
  },

  clearStorage() {
    const keys = [
      'merchantType',
      'licenseNumber',
      'businessLicenseName',
      'licenseValidityStart',
      'licenseValidityEnd',
      'idCardName',
      'idCardNumber',
      'idCardValidityStart',
      'idCardValidityType',
      'licenseImage',
      'idCardFrontImage',
      'idCardBackImage',
      'merchantName',
      'province',
      'city',
      'district',
      'regionText',
      'detailedAddress',
      'merchantTypeId',
      'merchantSubtypeId',
      'merchantTypeText',
      'phone',
      'email',
      'shopFrontImage',
      'shopInteriorImage',
      'cashierImage',
      'productType',
      'productCodeImage',
      'accountType',
      'accountMaterialImage',
      'bankCardImage',
      'accountName',
      'bankCardNumber',
      'bankProvince',
      'bankCity',
      'bankCityText',
      'bankName',
      'signatureImage',
      'agreementSigned',
      'settlementType'
    ];

    keys.forEach(key => {
      wx.removeStorageSync(key);
    });
  }
});