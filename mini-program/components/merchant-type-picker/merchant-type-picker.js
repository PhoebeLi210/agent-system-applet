const merchantTypes = require('../../data/merchant-types.js');

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
    categories: [],
    subcategories: [],
    selectedCategory: null,
    selectedSubcategory: null,
    categoryScrollIntoView: '',
    subcategoryScrollIntoView: ''
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
        categories: merchantTypes,
        subcategories: [],
        selectedCategory: null,
        selectedSubcategory: null,
        categoryScrollIntoView: '',
        subcategoryScrollIntoView: ''
      });
    },

    parseValue(value) {
      const parts = value.split(' - ');
      if (parts.length >= 2) {
        const category = merchantTypes.find(c => c.name === parts[0]);
        if (category) {
          const subcategory = category.children?.find(s => s.name === parts[1]);
          if (subcategory) {
            this.setData({
              selectedCategory: category,
              selectedSubcategory: subcategory,
              subcategories: category.children || []
            });
          }
        }
      }
    },

    selectCategory(e) {
      const category = e.currentTarget.dataset.category;
      this.setData({
        selectedCategory: category,
        selectedSubcategory: null,
        subcategories: category.children || [],
        categoryScrollIntoView: `category-${this.data.categories.indexOf(category)}`,
        subcategoryScrollIntoView: 'subcategory-0'
      });
    },

    selectSubcategory(e) {
      const subcategory = e.currentTarget.dataset.subcategory;
      this.setData({
        selectedSubcategory: subcategory
      });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const { selectedCategory, selectedSubcategory } = this.data;

      if (!selectedCategory || !selectedSubcategory) {
        wx.showToast({
          title: '请完整选择商户类型',
          icon: 'none'
        });
        return;
      }

      const value = `${selectedCategory.name} - ${selectedSubcategory.name}`;

      this.triggerEvent('confirm', {
        value,
        categoryId: selectedCategory.code,
        subcategoryId: selectedSubcategory.code,
        categoryName: selectedCategory.name,
        subcategoryName: selectedSubcategory.name
      });
    }
  }
});