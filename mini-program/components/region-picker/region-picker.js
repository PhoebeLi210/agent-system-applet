const regionData = require('../../data/region-data.js');

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
    activeTab: 0,
    selectedProvince: null,
    selectedCity: null,
    selectedDistrict: null,
    currentList: [],
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
        activeTab: 0,
        currentList: regionData,
        scrollIntoView: ''
      });
    },

    parseValue(value) {
      const parts = value.split(' ');
      if (parts.length >= 3) {
        const province = regionData.find(p => p.name === parts[0]);
        if (province) {
          const city = province.children?.find(c => c.name === parts[1]);
          if (city) {
            const district = city.children?.find(d => d.name === parts[2]);
            this.setData({
              selectedProvince: province,
              selectedCity: city,
              selectedDistrict: district
            });
          }
        }
      }
    },

    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      this.setData({
        activeTab: index,
        scrollIntoView: ''
      });

      if (index === 0) {
        this.setData({ currentList: regionData });
      } else if (index === 1 && this.data.selectedProvince) {
        this.setData({ currentList: this.data.selectedProvince.children || [] });
      } else if (index === 2 && this.data.selectedCity) {
        this.setData({ currentList: this.data.selectedCity.children || [] });
      }
    },

    selectItem(e) {
      const item = e.currentTarget.dataset.item;
      const { activeTab, selectedProvince, selectedCity } = this.data;

      if (activeTab === 0) {
        this.setData({
          selectedProvince: item,
          selectedCity: null,
          selectedDistrict: null,
          activeTab: 1,
          currentList: item.children || [],
          scrollIntoView: 'item-0'
        });
      } else if (activeTab === 1) {
        this.setData({
          selectedCity: item,
          selectedDistrict: null,
          activeTab: 2,
          currentList: item.children || [],
          scrollIntoView: 'item-0'
        });
      } else if (activeTab === 2) {
        this.setData({
          selectedDistrict: item
        });
      }
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const { selectedProvince, selectedCity, selectedDistrict } = this.data;

      if (!selectedProvince || !selectedCity || !selectedDistrict) {
        wx.showToast({
          title: '请完整选择省市区',
          icon: 'none'
        });
        return;
      }

      const value = `${selectedProvince.name} ${selectedCity.name} ${selectedDistrict.name}`;
      const regionCode = `${selectedProvince.code},${selectedCity.code},${selectedDistrict.code}`;

      this.triggerEvent('confirm', {
        value,
        regionCode,
        province: selectedProvince.name,
        city: selectedCity.name,
        district: selectedDistrict.name
      });
    }
  }
});