const bankData = require('../../data/bank-data.js');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    value: {
      type: String,
      value: ''
    }
  },

  data: {
    banks: [],
    filteredBanks: [],
    selectedBank: null,
    searchKeyword: '',
    scrollIntoView: ''
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.initPicker();
      }
    },
    'value': function(value) {
      if (value) {
        this.parseValue(value);
      }
    }
  },

  methods: {
    initPicker() {
      this.setData({
        banks: bankData,
        filteredBanks: bankData,
        searchKeyword: '',
        scrollIntoView: ''
      });
    },

    parseValue(value) {
      const bank = bankData.find(b => b.name === value);
      if (bank) {
        this.setData({ selectedBank: bank });
      }
    },

    onSearchInput(e) {
      const keyword = e.detail.value.trim();
      const filteredBanks = keyword 
        ? bankData.filter(bank => bank.name.includes(keyword))
        : bankData;

      this.setData({
        searchKeyword: keyword,
        filteredBanks,
        scrollIntoView: 'item-0'
      });
    },

    selectItem(e) {
      const item = e.currentTarget.dataset.item;
      this.setData({
        selectedBank: item
      });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      if (!this.data.selectedBank) {
        wx.showToast({
          title: '请选择银行',
          icon: 'none'
        });
        return;
      }

      this.triggerEvent('confirm', {
        value: this.data.selectedBank.name,
        code: this.data.selectedBank.code
      });
    }
  }
});