Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    value: {
      type: String,
      value: ''
    },
    minDate: {
      type: String,
      value: ''
    },
    maxDate: {
      type: String,
      value: ''
    }
  },

  data: {
    years: [],
    months: [],
    days: [],
    pickerValue: [0, 0, 0]
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
      const now = new Date();
      const currentYear = now.getFullYear();
      
      const minYear = this.data.minDate 
        ? parseInt(this.data.minDate.split('-')[0]) 
        : currentYear - 50;
      const maxYear = this.data.maxDate 
        ? parseInt(this.data.maxDate.split('-')[0]) 
        : currentYear + 50;

      const years = [];
      for (let i = minYear; i <= maxYear; i++) {
        years.push(i);
      }

      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(i);
      }

      const days = [];
      const daysInMonth = new Date(currentYear, 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      this.setData({
        years,
        months,
        days,
        pickerValue: [years.indexOf(currentYear), 0, 0]
      });
    },

    parseValue(value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);

        const yearIndex = this.data.years.indexOf(year);
        const monthIndex = month - 1;
        const dayIndex = day - 1;

        this.setData({
          pickerValue: [yearIndex >= 0 ? yearIndex : 0, monthIndex, dayIndex]
        });
      }
    },

    onPickerChange(e) {
      const value = e.detail.value;
      const [yearIndex, monthIndex] = value;
      
      const year = this.data.years[yearIndex];
      const month = this.data.months[monthIndex];
      
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      this.setData({
        days,
        pickerValue: value
      });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const [yearIndex, monthIndex, dayIndex] = this.data.pickerValue;
      
      const year = this.data.years[yearIndex];
      const month = this.data.months[monthIndex];
      const day = this.data.days[dayIndex];

      const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      this.triggerEvent('confirm', { value });
    }
  }
});