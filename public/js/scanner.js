// ==========================================================================
// SMC INDUSTRIAL BARCODE & QR SCANNER MODULE (ENHANCED MULTI-ENGINE)
// Designed for Factory Shopfloor Operation (SMC3 Anodizing / Shotblast)
// Supports:
// 1. Live Camera Stream with Native BarcodeDetector + jsQR + ZXing Fallback
// 2. Optical/Digital Zoom (1x, 1.5x, 2x, 2.5x) & Flash Torch for low-light shopfloor
// 3. Multi-Pass Photo Snapshot & Gallery Upload with Quiet-Zone Padding & Contrast Boost
// 4. Handheld Hardware Scanners (USB / Bluetooth Guns with debounce & jitter tolerance)
// 5. Direct Manual Search & Selection Fallback
// ==========================================================================

class BarcodeScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.cameras = [];
    this.selectedCameraId = null;
    this.onScanCallback = null;
    this.activeTrack = null;
    this.torchActive = false;
    this.currentZoom = 1.0;
    this.frameTimer = null;
    this.isBusyProcessing = false;

    // Cache DOM Elements
    this.modalEl = document.getElementById('scannerModal');
    this.viewportEl = document.getElementById('cameraPreview');
    this.cameraSelectEl = document.getElementById('cameraSourceSelect');
    this.btnSwitchCamera = document.getElementById('btnSwitchCamera');
    this.btnToggleTorch = document.getElementById('btnToggleTorch');
    this.scannerZoomRow = document.getElementById('scannerZoomRow');
    this.btnCapturePhotoScan = document.getElementById('btnCapturePhotoScan');
    this.btnPickGalleryScan = document.getElementById('btnPickGalleryScan');
    this.barcodeFileInput = document.getElementById('barcodeFileInput');
    this.barcodeGalleryInput = document.getElementById('barcodeGalleryInput');
    this.manualInputEl = document.getElementById('manualScannerInput');
    this.applyManualBtn = document.getElementById('btnApplyManualScan');
    this.closeBtn = document.getElementById('btnCloseScanner');
    this.overlayProcessing = document.getElementById('scannerOverlayProcessing');
    this.processText = document.getElementById('scannerProcessText');

    this.bindEvents();
    this.initHardwareScannerListener();
  }

  // Register main onScan callback
  init(onScan) {
    this.onScanCallback = onScan;
    return this;
  }

  // Industrial Formats (Optimized for speed and accuracy in factory)
  getSupportedFormats() {
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
      return [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ];
    }
    return undefined;
  }

  bindEvents() {
    // Close modal
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.stop());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.stop();
      });
    }

    // Manual input button inside scanner modal
    if (this.applyManualBtn && this.manualInputEl) {
      this.applyManualBtn.addEventListener('click', () => {
        const val = this.manualInputEl.value.trim();
        if (val) this.handleScannedValue(val);
      });

      this.manualInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = this.manualInputEl.value.trim();
          if (val) this.handleScannedValue(val);
        }
      });
    }

    // Camera Switch / Select
    if (this.cameraSelectEl) {
      this.cameraSelectEl.addEventListener('change', (e) => {
        const newCameraId = e.target.value;
        if (newCameraId && newCameraId !== this.selectedCameraId) {
          this.selectedCameraId = newCameraId;
          this.restartCameraStream();
        }
      });
    }

    if (this.btnSwitchCamera) {
      this.btnSwitchCamera.addEventListener('click', () => {
        if (this.cameras.length > 1) {
          const currentIdx = this.cameras.findIndex(c => c.id === this.selectedCameraId);
          const nextIdx = (currentIdx + 1) % this.cameras.length;
          this.selectedCameraId = this.cameras[nextIdx].id;
          if (this.cameraSelectEl) this.cameraSelectEl.value = this.selectedCameraId;
          this.restartCameraStream();
        }
      });
    }

    // Torch / Flash toggle
    if (this.btnToggleTorch) {
      this.btnToggleTorch.addEventListener('click', () => this.toggleTorch());
    }

    // Zoom Buttons
    if (this.scannerZoomRow) {
      const zoomBtns = this.scannerZoomRow.querySelectorAll('.btn-zoom-pill');
      zoomBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          zoomBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const z = parseFloat(btn.getAttribute('data-zoom')) || 1.0;
          this.applyZoom(z);
        });
      });
    }

    // Photo Snapshot Trigger (Camera app on phone)
    if (this.btnCapturePhotoScan && this.barcodeFileInput) {
      this.btnCapturePhotoScan.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playClick();
        this.barcodeFileInput.click();
      });
    }

    // Gallery Picker Trigger (Select existing photo from device/Zalo)
    if (this.btnPickGalleryScan && this.barcodeGalleryInput) {
      this.btnPickGalleryScan.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playClick();
        this.barcodeGalleryInput.click();
      });
    }

    // File Input change handlers
    const handleFile = (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        this.scanFromImageFile(files[0]);
        e.target.value = '';
      }
    };

    if (this.barcodeFileInput) {
      this.barcodeFileInput.addEventListener('change', handleFile);
    }
    if (this.barcodeGalleryInput) {
      this.barcodeGalleryInput.addEventListener('change', handleFile);
    }
  }

  // ==========================================
  // HARDWARE BARCODE SCANNER LISTENER (USB/BLUETOOTH GUNS)
  // ==========================================
  initHardwareScannerListener() {
    let buffer = '';
    let lastTime = 0;

    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      const now = Date.now();
      const diff = now - lastTime;
      lastTime = now;

      // Hardware scanners type very rapidly (within 10-120ms between keys)
      if (diff > 120) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const clean = buffer.trim();
        if (clean.length >= 3) {
          if (isInput && activeEl.id === 'inputQuantity') {
            // allow quantity submit
          } else {
            e.preventDefault();
            console.log('⚡ Súng quét mã vạch (USB/Bluetooth) đã quét:', clean);
            this.handleScannedValue(clean);
          }
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    });
  }

  // ==========================================
  // LIVE CAMERA SCANNING ENGINE
  // ==========================================
  async start(onScan) {
    if (typeof onScan === 'function') {
      this.onScanCallback = onScan;
    }
    this.modalEl.classList.remove('hidden');

    if (this.manualInputEl) {
      this.manualInputEl.value = '';
      setTimeout(() => this.manualInputEl.focus(), 300);
    }

    // Verify Libraries
    if (typeof Html5Qrcode === 'undefined') {
      this.renderUnavailableMessage('Thư viện quét mã chưa được tải. Hãy dùng nút chụp ảnh hoặc gõ mã bên dưới.');
      return;
    }

    // Check MediaDevices & Secure Context support
    const hasMedia = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
    if (!hasMedia) {
      this.renderUnavailableMessage('Trình duyệt chặn Camera video trực tiếp trên Wi-Fi HTTP.<br><b>Hãy dùng nút "Chụp ảnh tem mới" hoặc "Chọn ảnh" bên dưới để quét cực nhanh!</b>');
      return;
    }

    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('cameraPreview', {
          formatsToSupport: this.getSupportedFormats(),
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          verbose: false
        });
      }

      // Discover camera devices
      await this.discoverCameras();
      await this.startCameraStream();
    } catch (err) {
      console.warn('Lỗi mở luồng Camera:', err);
      this.renderUnavailableMessage(err.message || 'Chưa cấp quyền truy cập camera.');
    }
  }

  async discoverCameras() {
    try {
      if (typeof Html5Qrcode.getCameras !== 'function') return;
      this.cameras = await Html5Qrcode.getCameras();
      if (this.cameraSelectEl) {
        this.cameraSelectEl.innerHTML = '';
        if (this.cameras && this.cameras.length > 0) {
          // Default to back/rear camera if available
          let backCamera = this.cameras.find(c => {
            const lbl = (c.label || '').toLowerCase();
            return lbl.includes('back') || lbl.includes('sau') || lbl.includes('rear') || lbl.includes('environment');
          });
          this.selectedCameraId = backCamera ? backCamera.id : this.cameras[0].id;

          this.cameras.forEach((cam, idx) => {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.textContent = cam.label || `Camera ${idx + 1}`;
            if (cam.id === this.selectedCameraId) opt.selected = true;
            this.cameraSelectEl.appendChild(opt);
          });
        } else {
          this.cameraSelectEl.innerHTML = '<option value="">Camera mặc định</option>';
        }
      }
    } catch (e) {
      console.warn('Không thể liệt kê danh sách camera:', e);
    }
  }

  async startCameraStream() {
    if (!this.html5QrCode) return;

    // Dynamic QR Box sizing: wide scanning area (up to 85% of viewfinder)
    const qrConfig = {
      fps: 20,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.floor(Math.min(minEdge * 0.85, 340));
        return {
          width: Math.max(boxSize, 220),
          height: Math.max(boxSize, 220)
        };
      },
      aspectRatio: 1.0
    };

    const cameraConfig = this.selectedCameraId 
      ? { deviceId: { exact: this.selectedCameraId } } 
      : { facingMode: { ideal: "environment" } };

    try {
      await this.html5QrCode.start(
        cameraConfig,
        qrConfig,
        (decodedText) => this.handleScannedValue(decodedText),
        (errorMessage) => { /* scanning frames */ }
      );
      this.isScanning = true;

      // Inspect active video track for Torch & Zoom capabilities
      setTimeout(() => this.inspectCameraCapabilities(), 500);

      // Start parallel fast-frame analysis with jsQR
      this.startParallelFrameScanner();
    } catch (err) {
      console.warn('Lỗi start camera stream với deviceId, thử lại với facingMode:', err);
      // Fallback: Try with simple facingMode or first camera
      try {
        await this.html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          (decodedText) => this.handleScannedValue(decodedText),
          () => {}
        );
        this.isScanning = true;
        setTimeout(() => this.inspectCameraCapabilities(), 500);
        this.startParallelFrameScanner();
      } catch (err2) {
        console.warn('Thử camera mặc định thất bại:', err2);
        this.renderUnavailableMessage('Không thể mở video camera. Hãy bấm "Chụp ảnh tem mới" bên dưới.');
      }
    }
  }

  inspectCameraCapabilities() {
    try {
      const videoEl = this.viewportEl.querySelector('video');
      if (videoEl && videoEl.srcObject) {
        const tracks = videoEl.srcObject.getVideoTracks();
        if (tracks && tracks.length > 0) {
          this.activeTrack = tracks[0];
          const caps = (typeof this.activeTrack.getCapabilities === 'function') 
            ? this.activeTrack.getCapabilities() 
            : {};

          // Check Torch
          if (caps.torch && this.btnToggleTorch) {
            this.btnToggleTorch.classList.remove('hidden');
          } else if (this.btnToggleTorch) {
            this.btnToggleTorch.classList.add('hidden');
          }

          // Check Zoom
          if (caps.zoom && this.scannerZoomRow) {
            this.scannerZoomRow.classList.remove('hidden');
          } else if (this.scannerZoomRow) {
            this.scannerZoomRow.classList.add('hidden');
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra capabilities camera:', e);
    }
  }

  async applyZoom(zoomLevel) {
    if (this.activeTrack && typeof this.activeTrack.applyConstraints === 'function') {
      try {
        await this.activeTrack.applyConstraints({
          advanced: [{ zoom: zoomLevel }]
        });
        this.currentZoom = zoomLevel;
      } catch (e) {
        console.warn('Lỗi thay đổi zoom:', e);
      }
    }
  }

  async toggleTorch() {
    if (this.activeTrack && typeof this.activeTrack.applyConstraints === 'function') {
      try {
        this.torchActive = !this.torchActive;
        await this.activeTrack.applyConstraints({
          advanced: [{ torch: this.torchActive }]
        });
        if (this.btnToggleTorch) {
          this.btnToggleTorch.classList.toggle('active', this.torchActive);
          this.btnToggleTorch.textContent = this.torchActive ? '⚡ Tắt Flash' : '💡 Flash';
        }
      } catch (e) {
        console.warn('Lỗi bật/tắt flash:', e);
      }
    }
  }

  // Parallel frame scanner using jsQR for tricky QR codes (like table border touching finder pattern)
  startParallelFrameScanner() {
    this.stopParallelFrameScanner();
    if (typeof window.jsQR !== 'function') return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    this.frameTimer = setInterval(() => {
      if (!this.isScanning || this.isBusyProcessing) return;
      const video = this.viewportEl.querySelector('video');
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      ctx.drawImage(video, 0, 0, vw, vh);
      const imgData = ctx.getImageData(0, 0, vw, vh);
      const code = window.jsQR(imgData.data, vw, vh, { inversionAttempts: 'dontInvert' });
      if (code && code.data && code.data.trim()) {
        console.log('⚡ jsQR Parallel decoded successfully:', code.data);
        this.handleScannedValue(code.data);
      }
    }, 200);
  }

  stopParallelFrameScanner() {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
  }

  async restartCameraStream() {
    if (this.isScanning) {
      try {
        this.stopParallelFrameScanner();
        await this.html5QrCode.stop();
        this.isScanning = false;
      } catch (e) {}
    }
    await this.startCameraStream();
  }

  async stop() {
    this.stopParallelFrameScanner();
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (e) {}
      this.isScanning = false;
    }
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }

  // ==========================================
  // MULTI-ENGINE PHOTO & IMAGE ANALYZER
  // Works 100% on ANY Device (iPhone, Android, Tablet, PC)
  // ==========================================
  async scanFromImageFile(imageFile) {
    if (!imageFile) return;

    this.showProcessingOverlay('Đang phân tích hình ảnh tem Kanban...');
    this.isBusyProcessing = true;

    try {
      // Pause camera stream if active
      if (this.isScanning && this.html5QrCode) {
        this.stopParallelFrameScanner();
        try {
          await this.html5QrCode.stop();
          this.isScanning = false;
        } catch (e) {}
      }

      // Execute Multi-Pass Decoder
      const decodedValue = await this.decodeImageWithAllEngines(imageFile);

      this.hideProcessingOverlay();
      this.isBusyProcessing = false;

      if (decodedValue) {
        this.handleScannedValue(decodedValue);
      } else {
        alert(
          'Chưa nhận diện được mã trong ảnh.\n\n' +
          'Mẹo cho xưởng:\n' +
          '1. Giữ điện thoại/tablet thẳng, cách tem 15-20cm, đủ ánh sáng.\n' +
          '2. Không để bóng tay che khuất mã.\n' +
          '3. Hoặc gõ mã sản phẩm vào ô nhập bên dưới!'
        );
      }
    } catch (err) {
      console.warn('Lỗi phân tích ảnh tem:', err);
      this.hideProcessingOverlay();
      this.isBusyProcessing = false;
      alert('Lỗi xử lý file ảnh: ' + (err.message || err));
    }
  }

  // Multi-Pass Pipeline:
  // 1. Native BarcodeDetector (Hardware Accelerated, <10ms)
  // 2. jsQR Normal Pass (Scaled to max 1280px)
  // 3. jsQR Quiet-Zone Padded Pass (Solves QR touching table border/line!)
  // 4. jsQR High Contrast / Binarization (Solves metal glare/uneven light)
  // 5. jsQR Center Crop Pass (Solves photos taken from a distance)
  // 6. Html5Qrcode.scanFile fallback
  async decodeImageWithAllEngines(imageFile) {
    // 1. Load File into HTMLImageElement
    const img = await this.loadImageElement(imageFile);
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    // Scale to max 1280px to prevent mobile browser OOM and ensure blazing speed
    const maxDim = 1280;
    let targetW = origW;
    let targetH = origH;
    if (origW > maxDim || origH > maxDim) {
      const scale = maxDim / Math.max(origW, origH);
      targetW = Math.round(origW * scale);
      targetH = Math.round(origH * scale);
    }

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = targetW;
    baseCanvas.height = targetH;
    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    baseCtx.drawImage(img, 0, 0, targetW, targetH);

    // ==========================================
    // ENGINE 1: NATIVE BROWSER BARCODEDETECTOR
    // ==========================================
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector({ 
          formats: ['qr_code', 'code_128', 'code_39', 'data_matrix'] 
        });
        const detected = await detector.detect(baseCanvas);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          console.log('⚡ [Engine 1: Native BarcodeDetector] Decoded:', detected[0].rawValue);
          return detected[0].rawValue;
        }
      } catch (e) {
        console.warn('Native BarcodeDetector pass failed:', e);
      }
    }

    // ==========================================
    // ENGINE 2: jsQR MULTI-PASS PREPROCESSING
    // ==========================================
    if (typeof window.jsQR === 'function') {
      // Helper for jsQR on any canvas
      const testCanvasWithJsQR = (cvs) => {
        const c = cvs.getContext('2d', { willReadFrequently: true });
        const idata = c.getImageData(0, 0, cvs.width, cvs.height);
        let res = window.jsQR(idata.data, cvs.width, cvs.height, { inversionAttempts: 'dontInvert' });
        if (res && res.data) return res.data;
        res = window.jsQR(idata.data, cvs.width, cvs.height, { inversionAttempts: 'attemptBoth' });
        if (res && res.data) return res.data;
        return null;
      };

      // Pass 2A: Direct on normalized base canvas
      let code = testCanvasWithJsQR(baseCanvas);
      if (code) {
        console.log('⚡ [Engine 2A: jsQR Direct] Decoded:', code);
        return code;
      }

      // Pass 2B: White Quiet-Zone Padding (Crucial for QR Xi Mạ with black border touching finder pattern)
      const pad = 40;
      const paddedCanvas = document.createElement('canvas');
      paddedCanvas.width = targetW + pad * 2;
      paddedCanvas.height = targetH + pad * 2;
      const pctx = paddedCanvas.getContext('2d', { willReadFrequently: true });
      pctx.fillStyle = '#FFFFFF';
      pctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
      pctx.drawImage(baseCanvas, pad, pad);

      code = testCanvasWithJsQR(paddedCanvas);
      if (code) {
        console.log('⚡ [Engine 2B: jsQR Quiet-Zone Padded] Decoded:', code);
        return code;
      }

      // Pass 2C: Adaptive Contrast Binarization (Eliminates glare / reflections)
      const binarizedCanvas = document.createElement('canvas');
      binarizedCanvas.width = paddedCanvas.width;
      binarizedCanvas.height = paddedCanvas.height;
      const bctx = binarizedCanvas.getContext('2d', { willReadFrequently: true });
      bctx.drawImage(paddedCanvas, 0, 0);
      const imgData = bctx.getImageData(0, 0, binarizedCanvas.width, binarizedCanvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
        const val = lum > 125 ? 255 : 0;
        d[i] = val;
        d[i+1] = val;
        d[i+2] = val;
      }
      bctx.putImageData(imgData, 0, 0);

      code = testCanvasWithJsQR(binarizedCanvas);
      if (code) {
        console.log('⚡ [Engine 2C: jsQR Contrast Binarized] Decoded:', code);
        return code;
      }

      // Pass 2D: Center Crop 65% (In case photo was taken from distance)
      const cropW = Math.round(origW * 0.65);
      const cropH = Math.round(origH * 0.65);
      const startX = Math.round(origW * 0.175);
      const startY = Math.round(origH * 0.175);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.min(cropW, 900);
      cropCanvas.height = Math.min(cropH, 900);
      const crCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
      crCtx.fillStyle = '#FFFFFF';
      crCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
      crCtx.drawImage(img, startX, startY, cropW, cropH, 20, 20, cropCanvas.width - 40, cropCanvas.height - 40);

      code = testCanvasWithJsQR(cropCanvas);
      if (code) {
        console.log('⚡ [Engine 2D: jsQR Center Crop] Decoded:', code);
        return code;
      }
    }

    // ==========================================
    // ENGINE 3: Html5Qrcode.scanFile FALLBACK
    // ==========================================
    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('cameraPreview', {
          formatsToSupport: this.getSupportedFormats(),
          verbose: false
        });
      }
      // Pass false for showImage so it does not destroy internal DOM
      const html5Result = await this.html5QrCode.scanFile(imageFile, false);
      if (html5Result) {
        console.log('⚡ [Engine 3: Html5Qrcode] Decoded:', html5Result);
        return html5Result;
      }
    } catch (e) {
      console.warn('Html5Qrcode scanFile fallback failed:', e);
    }

    return null;
  }

  loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(objUrl);
        reject(new Error('Không thể tải file ảnh'));
      };
      img.src = objUrl;
    });
  }

  showProcessingOverlay(text) {
    if (this.overlayProcessing) {
      this.overlayProcessing.classList.remove('hidden');
    }
    if (this.processText && text) {
      this.processText.textContent = text;
    }
  }

  hideProcessingOverlay() {
    if (this.overlayProcessing) {
      this.overlayProcessing.classList.add('hidden');
    }
  }

  // ==========================================
  // RESULT DISPATCHER
  // ==========================================
  handleScannedValue(val) {
    if (!val) return;

    // Clean up industrial barcode string
    let cleaned = String(val).trim().replace(/^[\*\$\"\']/, '').replace(/[\*\$\"\']$/, '').replace(/[\r\n]+/g, '').toUpperCase();

    // Feedback: Audio + Mobile Haptic Vibration
    if (window.soundManager) {
      window.soundManager.playSuccess();
    }
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    this.stop();

    // 1. Invoke local modal callback if set
    if (this.onScanCallback) {
      this.onScanCallback(cleaned);
    }

    // 2. Dispatch global event so app.js always catches scans from any source!
    window.dispatchEvent(new CustomEvent('barcode-scanned', { detail: { code: cleaned } }));
  }

  renderUnavailableMessage(msg) {
    if (!this.viewportEl) return;
    this.viewportEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#1e293b;padding:24px 16px;text-align:center;background:#F8FAFD;border-radius:8px;">
        <div style="font-size:2.2rem;margin-bottom:8px;">📸</div>
        <p style="font-size:1.05rem;margin-bottom:6px;font-weight:800;color:#005BAC;">Camera Video Bị Chặn Trên Trình Duyệt</p>
        <p style="font-size:0.84rem;color:#475569;margin-bottom:16px;line-height:1.45;max-width:440px;">
          ${msg || 'Trình duyệt chặn Camera video trên mạng Wi-Fi HTTP.'}
        </p>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-capture-scan-lg" onclick="document.getElementById('barcodeFileInput').click()" style="padding:10px 18px;font-size:0.9rem;border-radius:8px;">
            📸 Chụp ảnh tem mới
          </button>
          <button type="button" class="btn-capture-sub" onclick="document.getElementById('barcodeGalleryInput').click()" style="padding:10px 18px;font-size:0.9rem;border-radius:8px;">
            🖼️ Chọn ảnh có sẵn
          </button>
        </div>
      </div>
    `;
  }
}

// Global Singleton Instance
window.barcodeScanner = new BarcodeScanner();
