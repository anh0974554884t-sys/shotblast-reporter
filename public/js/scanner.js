// ==========================================================================
// SMC INDUSTRIAL BARCODE & QR SCANNER MODULE
// Designed for Factory Shopfloor Operation (SMC3 Anodizing / Shotblast)
// Supports:
// 1. Live Camera Video Stream (1D Barcodes Code 128, Code 39 & 2D QR Code)
// 2. Photo Snapshot Capture (Works 100% on HTTP Wi-Fi Tablets without SSL)
// 3. Handheld Barcode Scanner Guns (Súng quét mã vạch USB / Bluetooth)
// 4. Manual Fallback Search & Direct Entry
// ==========================================================================

class BarcodeScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.cameras = [];
    this.selectedCameraId = null;
    this.onScanCallback = null;

    // Cache DOM Elements
    this.modalEl = document.getElementById('scannerModal');
    this.viewportEl = document.getElementById('cameraPreview');
    this.cameraSelectEl = document.getElementById('cameraSourceSelect');
    this.btnSwitchCamera = document.getElementById('btnSwitchCamera');
    this.btnCapturePhotoScan = document.getElementById('btnCapturePhotoScan');
    this.btnQuickPhotoScan = document.getElementById('btnQuickPhotoScan');
    this.barcodeFileInput = document.getElementById('barcodeFileInput');
    this.manualInputEl = document.getElementById('manualScannerInput');
    this.applyManualBtn = document.getElementById('btnApplyManualScan');
    this.closeBtn = document.getElementById('btnCloseScanner');

    this.bindEvents();
    this.initHardwareScannerListener();
  }

  // Register main onScan callback
  init(onScan) {
    this.onScanCallback = onScan;
    return this;
  }

  // Supported Barcode Formats for Industrial Kanban & Travelers
  getSupportedFormats() {
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
      return [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.ITF
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

    // Photo Capture / File Scan inside modal
    if (this.btnCapturePhotoScan && this.barcodeFileInput) {
      this.btnCapturePhotoScan.addEventListener('click', () => {
        this.barcodeFileInput.click();
      });
    }

    // 1-Click Quick Photo Scan on main form
    if (this.btnQuickPhotoScan && this.barcodeFileInput) {
      this.btnQuickPhotoScan.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playClick();
        this.barcodeFileInput.click();
      });
    }

    // File input change handler (from camera capture or gallery)
    if (this.barcodeFileInput) {
      this.barcodeFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          this.scanFromImageFile(files[0]);
          // Reset file input value so same photo or next photo can trigger change event again
          this.barcodeFileInput.value = '';
        }
      });
    }
  }

  // ==========================================
  // HARDWARE BARCODE SCANNER LISTENER (USB/BLUETOOTH GUNS)
  // Works globally across the application shopfloor UI
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

      // Hardware scanners type very rapidly (typically within 10-50ms between keys)
      // Allow up to 120ms jitter for Bluetooth wireless shopfloor scanners
      if (diff > 120) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const clean = buffer.trim();
        if (clean.length >= 3) {
          // If the worker was focused on quantity input, do not hijack quantity enter
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
  // CAMERA SCANNING ENGINE
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

    // Verify Html5Qrcode Library
    if (typeof Html5Qrcode === 'undefined') {
      this.renderUnavailableMessage('Thư viện quét mã chưa được tải. Bạn có thể dùng nút "Chụp Ảnh Tem" màu xanh hoặc gõ mã bên dưới.');
      return;
    }

    // Check MediaDevices & Secure Context support
    const hasMedia = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
    if (!hasMedia) {
      this.renderUnavailableMessage('Trình duyệt chặn Camera video trực tiếp trên mạng Wi-Fi HTTP.<br><b>Hãy dùng nút "Chụp Ảnh Tem Kanban" màu xanh bên dưới để quét cực nhanh!</b>');
      return;
    }

    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('cameraPreview', {
          formatsToSupport: this.getSupportedFormats(),
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
          // Default to back/rear camera if available for tablet scanning
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
          this.cameraSelectEl.innerHTML = '<option value="">Không tìm thấy camera</option>';
        }
      }
    } catch (e) {
      console.warn('Không thể liệt kê danh sách camera:', e);
    }
  }

  async startCameraStream() {
    if (!this.html5QrCode) return;

    const qrConfig = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.floor(Math.min(minEdge * 0.8, 280));
        return {
          width: Math.max(boxSize, 220),
          height: Math.max(boxSize, 220)
        };
      }
    };

    const cameraConfig = this.selectedCameraId ? { deviceId: { exact: this.selectedCameraId } } : { facingMode: "environment" };

    try {
      await this.html5QrCode.start(
        cameraConfig,
        qrConfig,
        (decodedText) => this.handleScannedValue(decodedText),
        (errorMessage) => { /* scanning frames */ }
      );
      this.isScanning = true;
    } catch (err) {
      console.warn('Lỗi start camera stream:', err);
      this.renderUnavailableMessage(err.message || 'Không thể mở luồng video camera.');
    }
  }

  async restartCameraStream() {
    if (this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.isScanning = false;
      } catch (e) {}
    }
    await this.startCameraStream();
  }

  async stop() {
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
  // SCAN FROM IMAGE FILE / SNAPSHOT
  // Works 100% on HTTP Wi-Fi Tablets & Phones
  // ==========================================
  async scanFromImageFile(imageFile) {
    if (!imageFile) return;

    if (!this.html5QrCode) {
      this.html5QrCode = new Html5Qrcode('cameraPreview', {
        formatsToSupport: this.getSupportedFormats(),
        verbose: false
      });
    }

    try {
      // Temporarily stop live stream if running
      if (this.isScanning) {
        await this.html5QrCode.stop();
        this.isScanning = false;
      }

      // Show processing overlay
      if (this.viewportEl) {
        this.viewportEl.innerHTML = `
          <div class="scanner-processing-overlay">
            <div class="spinner"></div>
            <p style="font-weight:700;font-size:0.95rem;">Đang phân tích & giải mã tem Kanban...</p>
          </div>
        `;
      }

      const decodedText = await this.html5QrCode.scanFile(imageFile, true);
      this.handleScannedValue(decodedText);
    } catch (err) {
      console.warn('Lỗi đọc ảnh mã vạch:', err);
      alert('Không nhận diện được mã vạch trong ảnh chụp.\n\nMẹo xưởng: Vui lòng chụp gần hơn, giữ camera không bị rung và đủ ánh sáng, hoặc gõ mã sản phẩm trực tiếp!');
      this.renderUnavailableMessage('Vui lòng chụp lại ảnh rõ nét hơn hoặc nhập mã sản phẩm bên dưới.');
    }
  }

  // ==========================================
  // RESULT DISPATCHER
  // ==========================================
  handleScannedValue(val) {
    if (!val) return;

    // Clean up industrial barcode string (strips start/stop asterisks, dollar signs, spaces, line breaks)
    let cleaned = val.trim().replace(/^[\*\$]/, '').replace(/[\*\$]$/, '').replace(/[\r\n]+/g, '').toUpperCase();

    if (window.soundManager) {
      window.soundManager.playSuccess();
    }

    this.stop();

    // 1. Invoke local modal callback if set
    if (this.onScanCallback) {
      this.onScanCallback(cleaned);
    }

    // 2. Dispatch global event so app.js always catches scans from gun/photo/camera!
    window.dispatchEvent(new CustomEvent('barcode-scanned', { detail: { code: cleaned } }));
  }

  renderUnavailableMessage(msg) {
    if (!this.viewportEl) return;
    this.viewportEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#1e293b;padding:24px 16px;text-align:center;background:#F8FAFD;border-radius:8px;">
        <div style="font-size:2.2rem;margin-bottom:8px;">📸</div>
        <p style="font-size:1.05rem;margin-bottom:6px;font-weight:800;color:#005BAC;">Camera Video Trực Tiếp Bị Khóa Trên Wi-Fi</p>
        <p style="font-size:0.82rem;color:#475569;margin-bottom:16px;line-height:1.45;max-width:440px;">
          ${msg || 'Trình duyệt chặn Camera video trên mạng Wi-Fi HTTP.'}
        </p>
        <button type="button" class="btn-capture-scan-lg" onclick="document.getElementById('barcodeFileInput').click()" style="padding:12px 24px;font-size:0.95rem;border-radius:10px;">
          📸 BẤM ĐỂ CHỤP ẢNH TEM KANBAN QUÉT NGAY
        </button>
      </div>
    `;
  }
}

// Global Singleton Instance
window.barcodeScanner = new BarcodeScanner();
