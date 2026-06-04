Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    canvas: null,
    ctx: null,
    isDrawing: false,
    hasSignature: false
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.initCanvas();
      }
    }
  },

  methods: {
    initCanvas() {
      const query = this.createSelectorQuery();
      query.select('#signatureCanvas').fields({ node: true, size: true }).exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          this.setData({ canvas, ctx, hasSignature: false });
        }
      });
    },

    onTouchStart(e) {
      if (!this.data.ctx) return;
      
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.data.ctx.beginPath();
      this.data.ctx.moveTo(x, y);
      this.setData({ isDrawing: true });
    },

    onTouchMove(e) {
      if (!this.data.ctx || !this.data.isDrawing) return;
      
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.data.ctx.lineTo(x, y);
      this.data.ctx.stroke();
      this.setData({ hasSignature: true });
    },

    onTouchEnd() {
      this.setData({ isDrawing: false });
    },

    onClear() {
      if (!this.data.canvas || !this.data.ctx) return;
      
      const { width, height } = this.data.canvas;
      this.data.ctx.clearRect(0, 0, width, height);
      this.setData({ hasSignature: false });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      if (!this.data.hasSignature) {
        wx.showToast({
          title: '请先签名',
          icon: 'none'
        });
        return;
      }

      if (!this.data.canvas) return;

      wx.canvasToTempFilePath({
        canvas: this.data.canvas,
        success: (res) => {
          wx.getFileSystemManager().readFile({
            filePath: res.tempFilePath,
            encoding: 'base64',
            success: (fileRes) => {
              const signatureImage = `data:image/jpeg;base64,${fileRes.data}`;
              this.triggerEvent('confirm', { signatureImage });
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
      });
    }
  }
});