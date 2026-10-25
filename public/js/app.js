// ==========================================================================
// MAIN SHOPFLOOR APPLICATION LOGIC - SHOTBLAST MES (SMC3)
// Streamlined Worker-First Flow: Worker ID -> Large Product Name & Auto Qty -> Submit
// ==========================================================================

class ShotblastApp {
  constructor() {
    this.batches = [];
    this.workers = [];
    this.currentWorker = null;
    this.currentChamber = '';
    this.isOnline = false;
    this.activePin = '';
    this.focusedInput = null;
    this.successCountdownTimer = null;

    // Cache DOM Elements
    this.cacheElements();

    // Init App
    this.init();
  }

  cacheElements() {
    this.elements = {
      // Clocks & Header
      liveDate: document.getElementById('liveDate'),
      liveTime: document.getElementById('liveTime'),
      currentTurnBadge: document.getElementById('currentTurnBadge'),
      syncBadge: document.getElementById('syncBadge'),

      // Navigation & Views
      tabBtnWorker: document.getElementById('tabBtnWorker'),
      tabBtnManager: document.getElementById('tabBtnManager'),
      btnBackToOperator: document.getElementById('btnBackToOperator'),
      operatorView: document.getElementById('operatorView'),
      managerView: document.getElementById('managerView'),

      // Utilities Menu
      btnToggleUtilityMenu: document.getElementById('btnToggleUtilityMenu'),
      utilityMenuDropdown: document.getElementById('utilityMenuDropdown'),
      btnConnectTablet: document.getElementById('btnConnectTablet'),
      btnToggleSound: document.getElementById('btnToggleSound'),
      soundLabel: document.getElementById('soundLabel'),
      btnToggleTheme: document.getElementById('btnToggleTheme'),
      btnFullscreen: document.getElementById('btnFullscreen'),

      // Step 1: Worker
      inputWorkerId: document.getElementById('inputWorkerId'),
      btnClearWorker: document.getElementById('btnClearWorker'),
      workerErrorAlert: document.getElementById('workerErrorAlert'),
      workerVerifiedCard: document.getElementById('workerVerifiedCard'),
      workerNameDisplay: document.getElementById('workerNameDisplay'),
      workerShiftDisplay: document.getElementById('workerShiftDisplay'),
      workerMachineDisplay: document.getElementById('workerMachineDisplay'),
      btnChangeWorker: document.getElementById('btnChangeWorker'),
      inputWorkerName: document.getElementById('inputWorkerName'),
      inputShift: document.getElementById('inputShift'),
      inputMachine: document.getElementById('inputMachine'),

      // Step 2: Product
      inputProductCode: document.getElementById('inputProductCode'),
      btnClearProduct: document.getElementById('btnClearProduct'),
      productSuggestions: document.getElementById('productSuggestions'),
      metaProductName: document.getElementById('metaProductName'),
      metaProductCode: document.getElementById('metaProductCode'),
      metaSettingQty: document.getElementById('metaSettingQty'),
      quickProductChips: document.getElementById('quickProductChips'),
      btnOpenScanner: document.getElementById('btnOpenScanner'),
      btnOpenProductMaster: document.getElementById('btnOpenProductMaster'),

      // Step 3: Chamber & Qty & Numpad
      chamberSelector: document.getElementById('chamberSelector'),
      selectedChamberBadge: document.getElementById('selectedChamberBadge'),
      inputChamber: document.getElementById('inputChamber'),
      inputQuantity: document.getElementById('inputQuantity'),
      touchNumpad: document.getElementById('touchNumpad'),
      btnNumpadEnter: document.getElementById('btnNumpadEnter'),
      btnSubmitBatch: document.getElementById('btnSubmitBatch'),
      saveTurnNum: document.getElementById('saveTurnNum'),
      submitValidationHint: document.getElementById('submitValidationHint'),

      // Success Modal
      successModal: document.getElementById('successModal'),
      successTurnDisplay: document.getElementById('successTurnDisplay'),
      successProductDisplay: document.getElementById('successProductDisplay'),
      successQtyDisplay: document.getElementById('successQtyDisplay'),
      successWorkerDisplay: document.getElementById('successWorkerDisplay'),
      countdownProgress: document.getElementById('countdownProgress'),
      countdownSec: document.getElementById('countdownSec'),
      btnNextBatchNow: document.getElementById('btnNextBatchNow'),

      // Manager View: KPIs & Table
      kpiTotalQty: document.getElementById('kpiTotalQty'),
      kpiShift1Qty: document.getElementById('kpiShift1Qty'),
      kpiShift2Qty: document.getElementById('kpiShift2Qty'),
      kpiShift3Qty: document.getElementById('kpiShift3Qty'),
      kpiTotalTurns: document.getElementById('kpiTotalTurns'),
      nextTurnPreview: document.getElementById('nextTurnPreview'),
      kpiProgressBar: document.getElementById('kpiProgressBar'),
      kpiMachine1Count: document.getElementById('kpiMachine1Count'),
      kpiMachine2Count: document.getElementById('kpiMachine2Count'),
      kpiMachine3Count: document.getElementById('kpiMachine3Count'),
      kpiMachine4Count: document.getElementById('kpiMachine4Count'),
      kpiMachine5Count: document.getElementById('kpiMachine5Count'),
      batchTableBody: document.getElementById('batchTableBody'),
      filterShift: document.getElementById('filterShift'),
      filterMachine: document.getElementById('filterMachine'),
      logFilterSummary: document.getElementById('logFilterSummary'),
      tableFooterTotalQty: document.getElementById('tableFooterTotalQty'),
      tableFooterSummary: document.getElementById('tableFooterSummary'),
      btnExportExcel: document.getElementById('btnExportExcel'),
      btnOpenClearCaModal: document.getElementById('btnOpenClearCaModal'),

      // PIN Modal
      pinModal: document.getElementById('pinModal'),
      btnClosePinModal: document.getElementById('btnClosePinModal'),
      inputManagerPin: document.getElementById('inputManagerPin'),
      pinErrorAlert: document.getElementById('pinErrorAlert'),
      btnCancelPin: document.getElementById('btnCancelPin'),
      btnConfirmClearCa: document.getElementById('btnConfirmClearCa'),

      // Other Modals
      scannerModal: document.getElementById('scannerModal'),
      connectModal: document.getElementById('connectModal'),
      btnCloseConnect: document.getElementById('btnCloseConnect'),
      lanAddressList: document.getElementById('lanAddressList'),
      qrCodeContainer: document.getElementById('qrCodeContainer'),
      productMasterModal: document.getElementById('productMasterModal'),
      btnCloseProductMaster: document.getElementById('btnCloseProductMaster'),
      dsspSearchInput: document.getElementById('dsspSearchInput'),
      dsspTableBody: document.getElementById('dsspTableBody'),
      editBatchModal: document.getElementById('editBatchModal'),
      btnCloseEditBatch: document.getElementById('btnCloseEditBatch'),
      btnCancelEdit: document.getElementById('btnCancelEdit'),
      btnSaveEditBatch: document.getElementById('btnSaveEditBatch'),
      editBatchId: document.getElementById('editBatchId'),
      editTurn: document.getElementById('editTurn'),
      editMachine: document.getElementById('editMachine'),
      editShift: document.getElementById('editShift'),
      editProductCode: document.getElementById('editProductCode'),
      editQuantity: document.getElementById('editQuantity'),
      editChamber: document.getElementById('editChamber'),
      confirmDeleteModal: document.getElementById('confirmDeleteModal'),
      deleteModalTitle: document.getElementById('deleteModalTitle'),
      deleteModalDesc: document.getElementById('deleteModalDesc'),
      deleteItemPreview: document.getElementById('deleteItemPreview'),
      btnCancelDelete: document.getElementById('btnCancelDelete'),
      btnConfirmDelete: document.getElementById('btnConfirmDelete'),
      btnCloseConfirmDelete: document.getElementById('btnCloseConfirmDelete')
    };
  }

  async init() {
    this.startClock();
    this.bindEvents();
    this.initThemeAndSound();

    // Load initial workers & products
    await this.loadWorkers();
    if (window.productManager) {
      await window.productManager.init();
      this.renderQuickProductChips();
      this.renderDsspTable();
    }

    // Load batches data
    await this.loadBatches();
    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();

    // Init Scanner
    if (typeof BarcodeScanner !== 'undefined') {
      window.scanner = new BarcodeScanner();
      window.scanner.init((scannedCode) => {
        this.applyScannedProductCode(scannedCode);
      });
    }

    // Restore saved worker ID if present
    const savedWorkerId = localStorage.getItem('shotblast_last_worker_id');
    if (savedWorkerId) {
      this.elements.inputWorkerId.value = savedWorkerId;
      this.checkWorkerId(savedWorkerId, false);
    } else {
      setTimeout(() => {
        this.elements.inputWorkerId.focus();
        this.focusedInput = this.elements.inputWorkerId;
      }, 200);
    }

    this.validateForm();
  }

  // ==========================================
  // CLOCK & THEME & UTILITIES
  // ==========================================
  startClock() {
    const updateTime = () => {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      if (this.elements.liveDate) this.elements.liveDate.textContent = `${d}/${m}/${y}`;
      if (this.elements.liveTime) this.elements.liveTime.textContent = `${hh}:${mm}:${ss}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  initThemeAndSound() {
    if (localStorage.getItem('shotblast_theme') === 'dark') {
      document.body.classList.add('theme-dark');
    }
    if (window.soundManager && this.elements.soundLabel) {
      this.elements.soundLabel.textContent = window.soundManager.enabled ? 'Âm thanh: Đang bật' : 'Âm thanh: Đã tắt';
    }
  }

  toggleTheme() {
    document.body.classList.toggle('theme-dark');
    const isDark = document.body.classList.contains('theme-dark');
    localStorage.setItem('shotblast_theme', isDark ? 'dark' : 'light');
    this.showToast(isDark ? '🌙 Đã đổi sang giao diện Tối' : '☀️ Đã đổi sang giao diện Sáng');
  }

  toggleSound() {
    if (window.soundManager) {
      const state = window.soundManager.toggle();
      if (this.elements.soundLabel) {
        this.elements.soundLabel.textContent = state ? 'Âm thanh: Đang bật' : 'Âm thanh: Đã tắt';
      }
      this.showToast(state ? '🔊 Đã bật âm thanh phản hồi' : '🔇 Đã tắt âm thanh');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  // ==========================================
  // WORKER DATA & RECOGNITION
  // ==========================================
  async loadWorkers() {
    try {
      const res = await fetch('/api/workers');
      if (res.ok) {
        this.workers = await res.json();
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      this.workers = [
        { id: "101", name: "Nguyễn Văn A", shift: 1, machine: "SA01_SB01" },
        { id: "102", name: "Trần Văn Bình", shift: 1, machine: "SA01_SB02" },
        { id: "103", name: "Vũ Trung Hiếu", shift: 1, machine: "SA01_SB03" },
        { id: "104", name: "Lê Văn Cường", shift: 1, machine: "SA01_SB04" },
        { id: "105", name: "Võ Văn Kiên", shift: 1, machine: "SA01_SB05" },
        { id: "201", name: "Phạm Văn Dũng", shift: 2, machine: "SA01_SB01" },
        { id: "202", name: "Hoàng Đức Thịnh", shift: 2, machine: "SA01_SB02" },
        { id: "203", name: "Đặng Quốc Hưng", shift: 2, machine: "SA01_SB03" },
        { id: "204", name: "Bùi Văn Nam", shift: 2, machine: "SA01_SB04" },
        { id: "205", name: "Dương Văn Thắng", shift: 2, machine: "SA01_SB05" },
        { id: "301", name: "Đỗ Văn Toàn", shift: 3, machine: "SA01_SB01" },
        { id: "302", name: "Ngô Văn Tuấn", shift: 3, machine: "SA01_SB02" },
        { id: "303", name: "Trịnh Hoàng Long", shift: 3, machine: "SA01_SB03" },
        { id: "304", name: "Lý Văn Phát", shift: 3, machine: "SA01_SB04" },
        { id: "305", name: "Lâm Văn Hải", shift: 3, machine: "SA01_SB05" }
      ];
    }
  }

  checkWorkerId(id, autoFocusNext = true) {
    const cleanId = String(id || '').trim().toUpperCase();
    if (!cleanId) {
      this.clearWorker();
      return;
    }

    const worker = this.workers.find(w => String(w.id).trim().toUpperCase() === cleanId);
    if (worker) {
      this.currentWorker = worker;
      this.elements.workerErrorAlert.classList.add('hidden');
      this.elements.workerNameDisplay.textContent = worker.name;
      this.elements.workerShiftDisplay.textContent = `Ca ${worker.shift} (${this.getShiftHours(worker.shift)})`;
      this.elements.workerMachineDisplay.textContent = `Máy ${worker.machine}`;

      this.elements.inputWorkerName.value = worker.name;
      this.elements.inputShift.value = worker.shift;
      this.elements.inputMachine.value = worker.machine;

      // Show verified card
      this.elements.workerVerifiedCard.classList.remove('hidden');
      document.getElementById('workerInputGroup').classList.add('hidden');

      localStorage.setItem('shotblast_last_worker_id', cleanId);
      if (window.soundManager) window.soundManager.playClick();

      // Filter quick chips to match worker machine
      this.renderQuickProductChips();

      if (autoFocusNext) {
        setTimeout(() => {
          this.elements.inputProductCode.focus();
          this.focusedInput = this.elements.inputProductCode;
        }, 150);
      }
    } else {
      this.currentWorker = null;
      this.elements.inputWorkerName.value = '';
      this.elements.workerVerifiedCard.classList.add('hidden');
      document.getElementById('workerInputGroup').classList.remove('hidden');

      if (cleanId.length >= 2) {
        this.elements.workerErrorAlert.classList.remove('hidden');
        if (window.soundManager) window.soundManager.playError();
      }
    }
    this.validateForm();
  }

  clearWorker() {
    this.currentWorker = null;
    this.elements.inputWorkerId.value = '';
    this.elements.inputWorkerName.value = '';
    this.elements.workerErrorAlert.classList.add('hidden');
    this.elements.workerVerifiedCard.classList.add('hidden');
    document.getElementById('workerInputGroup').classList.remove('hidden');
    localStorage.removeItem('shotblast_last_worker_id');
    this.elements.inputWorkerId.focus();
    this.focusedInput = this.elements.inputWorkerId;
    this.validateForm();
  }

  getShiftHours(shift) {
    if (shift === 1) return '06:00 - 14:00';
    if (shift === 2) return '14:00 - 22:00';
    return '22:00 - 06:00';
  }

  // ==========================================
  // PRODUCT SELECTION & AUTO-FILL QUANTITY
  // ==========================================
  renderQuickProductChips() {
    if (!window.productManager) return;
    const container = this.elements.quickProductChips;
    container.innerHTML = '';

    // Preferred common products for shopfloor
    const commonCodes = [
      'P3800201C-020',
      'P3802401C-030',
      'P3800501C-040',
      'MGP20ABAC893A100',
      'MXS12-100',
      'MXQ12-30',
      'C1G20-02AAT031A',
      'C96SDB40-50'
    ];

    commonCodes.forEach(code => {
      const prod = window.productManager.findByCode(code) || {
        code: code,
        name: code.startsWith('P38') ? 'COVER P38' : 'BODY MGP',
        settingQty: 14
      };

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-item';
      btn.innerHTML = `<span>${prod.code}</span>`;
      btn.addEventListener('click', () => {
        this.selectProduct(prod);
      });
      container.appendChild(btn);
    });
  }

  selectProduct(prod) {
    if (!prod) return;
    this.elements.inputProductCode.value = prod.code;
    this.elements.metaProductName.textContent = prod.name || prod.code;
    this.elements.metaProductCode.textContent = prod.code;
    
    // User requested: do NOT auto-fill quantity, user will enter quantity manually!
    this.elements.inputQuantity.value = '';

    this.elements.productSuggestions.classList.add('hidden');
    if (window.soundManager) window.soundManager.playClick();

    // Auto focus quantity input so operator can type directly on numpad
    setTimeout(() => {
      this.elements.inputQuantity.focus();
      this.focusedInput = this.elements.inputQuantity;
    }, 100);

    this.validateForm();
  }

  applyScannedProductCode(scannedCode) {
    if (!scannedCode) return;
    let raw = String(scannedCode).trim();
    
    // Clean raw text (remove outer asterisks, dollar signs, quotes)
    let clean = raw.replace(/^[\*\$\"\']/, '').replace(/[\*\$\"\']$/, '').trim();

    // 1. Try finding direct product match
    let foundProd = null;
    if (window.productManager && window.productManager.products) {
      // 1a. Exact match
      foundProd = window.productManager.findByCode(clean);

      // 1b. Check without hyphens or spaces
      if (!foundProd) {
        const strippedClean = clean.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        foundProd = window.productManager.products.find(p => p.code.replace(/[^A-Z0-9]/gi, '').toUpperCase() === strippedClean);
      }

      // 1c. If scanned a complex Kanban QR string (e.g. delimiters like |, ;, ,, #, \n, tabs, spaces)
      // Check each token
      if (!foundProd) {
        const tokens = clean.split(/[\r\n\t\|,;#\/]+/).map(t => t.trim()).filter(Boolean);
        for (const tok of tokens) {
          // Strip prefix if any (e.g. "1P", "P/N:", "PART:", "CODE:")
          const normalizedTok = tok.replace(/^(1P|P\/N|PN|PART|CODE)[\s\:\-]?/i, '').trim();
          const p = window.productManager.findByCode(normalizedTok);
          if (p) {
            foundProd = p;
            break;
          }
          const strippedTok = normalizedTok.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          const p2 = window.productManager.products.find(x => x.code.replace(/[^A-Z0-9]/gi, '').toUpperCase() === strippedTok);
          if (p2) {
            foundProd = p2;
            break;
          }
        }
      }

      // 1d. Search if any known 861 product codes is contained inside the QR string
      if (!foundProd) {
        for (const p of window.productManager.products) {
          if (p.code && p.code.length >= 4 && clean.toUpperCase().includes(p.code.toUpperCase())) {
            foundProd = p;
            break;
          }
        }
      }
    }

    if (foundProd) {
      this.selectProduct(foundProd);
      this.showToast(`✅ Đã nhận diện mã: ${foundProd.code}`, 'success');
    } else {
      // Fallback: use cleaned string
      const displayCode = clean.toUpperCase();
      this.elements.inputProductCode.value = displayCode;
      this.elements.metaProductName.textContent = displayCode;
      this.elements.metaProductCode.textContent = displayCode;
      this.elements.inputQuantity.value = '';
      setTimeout(() => {
        this.elements.inputQuantity.focus();
        this.focusedInput = this.elements.inputQuantity;
      }, 100);
      this.showToast(`📷 Đã ghi nhận mã: ${displayCode}`, 'info');
      this.validateForm();
    }
  }

  handleProductInput(e) {
    const val = (e && e.target) ? e.target.value.trim() : (this.elements.inputProductCode.value.trim());
    if (!val) {
      this.clearProductBanner();
      this.elements.productSuggestions.classList.add('hidden');
      this.validateForm();
      return;
    }

    if (window.productManager) {
      const matches = window.productManager.search(val, 8);
      if (matches.length > 0) {
        this.elements.productSuggestions.innerHTML = '';
        matches.forEach(p => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.innerHTML = `
            <div>
              <div class="suggestion-code">${p.code}</div>
              <div class="suggestion-name">${p.name || ''}</div>
            </div>
          `;
          item.addEventListener('click', () => this.selectProduct(p));
          this.elements.productSuggestions.appendChild(item);
        });
        this.elements.productSuggestions.classList.remove('hidden');
      } else {
        this.elements.productSuggestions.classList.add('hidden');
      }

      const exact = window.productManager.findByCode(val);
      if (exact) {
        this.elements.metaProductName.textContent = exact.name || exact.code;
        this.elements.metaProductCode.textContent = exact.code;
      } else {
        this.elements.metaProductName.textContent = val;
        this.elements.metaProductCode.textContent = val;
      }
    }
    this.validateForm();
  }

  clearProductBanner() {
    this.elements.inputProductCode.value = '';
    this.elements.metaProductName.textContent = 'Chưa chọn mã';
    this.elements.metaProductCode.textContent = '---';
    if (this.elements.metaSettingQty) {
      this.elements.metaSettingQty.textContent = '--';
    }
    this.elements.inputQuantity.value = '';
  }

  // ==========================================
  // CHAMBER & QUANTITY & NUMPAD
  // ==========================================
  setChamber(chamber) {
    this.currentChamber = String(chamber);
    this.elements.inputChamber.value = this.currentChamber;

    // Update active class on chamber buttons
    const btns = this.elements.chamberSelector.querySelectorAll('.btn-chamber, .btn-chamber-sm');
    btns.forEach(b => {
      if (b.getAttribute('data-chamber') === this.currentChamber) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (this.elements.selectedChamberBadge) {
      this.elements.selectedChamberBadge.textContent = `Đã chọn: Buồng ${this.currentChamber}`;
    }

    if (window.soundManager) window.soundManager.playClick();
    this.validateForm();
  }

  highlightChamberSelector() {
    const btns = this.elements.chamberSelector.querySelectorAll('.btn-chamber, .btn-chamber-sm');
    btns.forEach(b => b.style.borderColor = 'var(--accent-amber)');
    setTimeout(() => {
      btns.forEach(b => b.style.borderColor = '');
    }, 1200);
  }

  handleNumpad(val) {
    if (window.soundManager) window.soundManager.playClick();
    const targetInput = this.focusedInput || this.elements.inputQuantity;
    let currentVal = targetInput.value || '';

    if (val === 'clear') {
      targetInput.value = '';
      if (targetInput === this.elements.inputWorkerId) {
        this.clearWorker();
      }
    } else if (val === 'backspace') {
      targetInput.value = currentVal.slice(0, -1);
      if (targetInput === this.elements.inputWorkerId) {
        this.checkWorkerId(targetInput.value, false);
      }
    } else if (val === '00') {
      if (currentVal && currentVal !== '0') {
        targetInput.value = currentVal + '00';
      }
    } else {
      if (targetInput === this.elements.inputQuantity) {
        if (currentVal === '0' || currentVal === '') {
          targetInput.value = val;
        } else {
          targetInput.value = currentVal + val;
        }
      } else {
        targetInput.value = currentVal + val;
      }

      if (targetInput === this.elements.inputWorkerId) {
        this.checkWorkerId(targetInput.value, true);
      }
    }

    this.validateForm();
  }

  quickAddQty(delta) {
    if (window.soundManager) window.soundManager.playClick();
    const current = Number(this.elements.inputQuantity.value) || 0;
    this.elements.inputQuantity.value = current + delta;
    this.validateForm();
  }

  // ==========================================
  // FORM VALIDATION & SUBMIT BATCH
  // ==========================================
  validateForm() {
    const hasWorker = Boolean(this.currentWorker && this.elements.inputWorkerName.value);
    const hasProduct = Boolean(this.elements.inputProductCode.value.trim());
    const qty = Number(this.elements.inputQuantity.value) || 0;
    const hasChamber = Boolean(this.currentChamber);

    const isValid = (hasWorker && hasProduct && qty > 0 && hasChamber);

    // Keep button active and clickable so user gets instant guiding feedback when clicking
    if (this.elements.btnSubmitBatch) {
      if (isValid) {
        this.elements.btnSubmitBatch.classList.add('ready');
      } else {
        this.elements.btnSubmitBatch.classList.remove('ready');
      }
    }

    if (this.elements.submitValidationHint) {
      if (isValid) {
        this.elements.submitValidationHint.classList.add('hidden');
      } else {
        this.elements.submitValidationHint.classList.remove('hidden');
        if (!hasWorker) {
          this.elements.submitValidationHint.textContent = 'Vui lòng nhập Mã nhân viên để bắt đầu';
        } else if (!hasProduct) {
          this.elements.submitValidationHint.textContent = 'Vui lòng quét hoặc nhập Mã sản phẩm';
        } else if (!hasChamber) {
          this.elements.submitValidationHint.textContent = 'Vui lòng chọn số buồng máy (1 - 6 buồng)';
        } else if (qty <= 0) {
          this.elements.submitValidationHint.textContent = 'Vui lòng nhập Số lượng xử lý (> 0 PCS)';
        }
      }
    }

    return isValid;
  }

  highlightField(element) {
    if (!element) return;
    element.classList.remove('shake-pulse');
    void element.offsetWidth;
    element.classList.add('shake-pulse');
    setTimeout(() => {
      element.classList.remove('shake-pulse');
    }, 800);
  }

  async submitBatch() {
    const hasWorker = Boolean(this.currentWorker && this.elements.inputWorkerName.value);
    const hasProduct = Boolean(this.elements.inputProductCode.value.trim());
    const qty = Number(this.elements.inputQuantity.value) || 0;
    const hasChamber = Boolean(this.currentChamber);

    if (!hasWorker) {
      this.showToast('⚠️ Vui lòng nhập Mã nhân viên (VD: 101, 102...) để nhận ca & máy!');
      if (window.soundManager) window.soundManager.playError();
      const workerGroup = document.getElementById('workerInputGroup');
      if (workerGroup) workerGroup.classList.remove('hidden');
      this.elements.inputWorkerId.focus();
      this.focusedInput = this.elements.inputWorkerId;
      this.highlightField(this.elements.inputWorkerId);
      return;
    }

    if (!hasProduct) {
      this.showToast('⚠️ Vui lòng quét mã QR hoặc nhập Mã sản phẩm!');
      if (window.soundManager) window.soundManager.playError();
      this.elements.inputProductCode.focus();
      this.focusedInput = this.elements.inputProductCode;
      this.highlightField(this.elements.inputProductCode);
      return;
    }

    if (!hasChamber) {
      this.showToast('⚠️ Vui lòng chọn Số buồng máy (1 - 6 buồng)!');
      if (window.soundManager) window.soundManager.playError();
      this.highlightField(this.elements.chamberSelector);
      return;
    }

    if (qty <= 0) {
      this.showToast('⚠️ Vui lòng nhập Số lượng xử lý (> 0 PCS)!');
      if (window.soundManager) window.soundManager.playError();
      this.elements.inputQuantity.focus();
      this.focusedInput = this.elements.inputQuantity;
      this.highlightField(this.elements.inputQuantity);
      return;
    }

    const nextTurn = this.getNextTurnNumber();
    const productCode = this.elements.inputProductCode.value.trim().toUpperCase();
    const productName = this.elements.metaProductName.textContent;
    const quantity = qty;
    const chamber = Number(this.currentChamber) || 1;
    const settingQty = (this.elements.metaSettingQty && this.elements.metaSettingQty.textContent && this.elements.metaSettingQty.textContent !== '--') 
      ? Number(this.elements.metaSettingQty.textContent) 
      : (this.currentProduct?.settingQty || quantity);
    const worker = this.currentWorker.name;
    const shift = Number(this.elements.inputShift.value) || 1;
    const machine = this.elements.inputMachine.value || 'SA01_SB01';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const newBatch = {
      date: todayStr,
      month: monthStr,
      shift: shift,
      machine: machine,
      line: 'SMC3',
      stage: 'Shotblast',
      turn: nextTurn,
      productCode: productCode,
      quantity: quantity,
      chamber: chamber,
      settingQty: settingQty,
      worker: worker,
      timestamp: now.toISOString()
    };

    // Save to server
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatch)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.batch) {
          this.batches.push(data.batch);
        } else {
          this.batches.push({ id: 'sb_' + Date.now(), ...newBatch });
        }
      } else {
        this.batches.push({ id: 'sb_' + Date.now(), ...newBatch });
      }
    } catch (e) {
      this.batches.push({ id: 'sb_' + Date.now(), ...newBatch });
    }

    localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));

    // Sound & Confetti
    if (window.soundManager) window.soundManager.playSuccess();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    }

    // Update Turn and Stats
    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();

    // Show Success Modal
    this.showSuccessModal({
      turn: nextTurn,
      productName: productName,
      productCode: productCode,
      quantity: quantity,
      chamber: chamber,
      worker: worker,
      machine: machine,
      shift: shift
    });
  }

  showSuccessModal(info) {
    this.elements.successTurnDisplay.textContent = `#${info.turn}`;
    this.elements.successProductDisplay.textContent = `${info.productName} (${info.productCode})`;
    this.elements.successQtyDisplay.textContent = `${info.quantity} PCS · Buồng ${info.chamber}`;
    this.elements.successWorkerDisplay.textContent = `${info.worker} · ${info.machine} (Ca ${info.shift})`;

    this.elements.successModal.classList.remove('hidden');

    // Reset countdown bar animation
    const bar = this.elements.countdownProgress;
    bar.style.transition = 'none';
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.transition = 'width 2.5s linear';
      bar.style.width = '0%';
    }, 50);

    let secLeft = 2;
    this.elements.countdownSec.textContent = secLeft;
    clearInterval(this.successCountdownTimer);
    this.successCountdownTimer = setInterval(() => {
      secLeft -= 1;
      if (secLeft >= 0) {
        this.elements.countdownSec.textContent = secLeft;
      }
      if (secLeft <= 0) {
        clearInterval(this.successCountdownTimer);
        this.closeSuccessModalAndReset();
      }
    }, 1000);
  }

  closeSuccessModalAndReset() {
    clearInterval(this.successCountdownTimer);
    this.elements.successModal.classList.add('hidden');

    // RESET FORM FOR NEXT BATCH:
    // IMPORTANT: Retain the logged in worker! Worker shoots multiple batches consecutively!
    this.clearProductBanner();
    this.elements.productSuggestions.classList.add('hidden');

    // Keep or clear chamber? Chamber is kept for operator speed
    // Focus product code ready for scanning next Kanban tag!
    setTimeout(() => {
      this.elements.inputProductCode.focus();
      this.focusedInput = this.elements.inputProductCode;
    }, 100);

    this.validateForm();
  }

  // ==========================================
  // TURNS & STATS & TABLE
  // ==========================================
  getNextTurnNumber() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBatches = this.batches.filter(b => b.date === todayStr);
    return todayBatches.length + 1;
  }

  updateNextTurnNumber() {
    const nextTurn = this.getNextTurnNumber();
    if (this.elements.currentTurnBadge) {
      this.elements.currentTurnBadge.textContent = `#${nextTurn}`;
    }
    if (this.elements.saveTurnNum) {
      this.elements.saveTurnNum.textContent = `#${nextTurn}`;
    }
    if (this.elements.nextTurnPreview) {
      this.elements.nextTurnPreview.textContent = nextTurn;
    }
  }

  async loadBatches() {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        this.batches = await res.json();
        this.isOnline = true;
        this.setSyncStatus(true);
        localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
      } else {
        throw new Error('API offline');
      }
    } catch (e) {
      this.isOnline = false;
      this.setSyncStatus(false);
      const cached = localStorage.getItem('shotblast_batches');
      if (cached) {
        try { this.batches = JSON.parse(cached); } catch (ex) { this.batches = []; }
      }
    }
  }

  setSyncStatus(online) {
    if (this.elements.syncBadge) {
      this.elements.syncBadge.className = online ? 'sync-badge online' : 'sync-badge offline';
      const textEl = this.elements.syncBadge.querySelector('.sync-text');
      if (textEl) textEl.textContent = online ? 'LAN Máy chủ Online' : 'Ngoại tuyến (Offline)';
    }
  }

  renderProductionTable() {
    const tbody = this.elements.batchTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';

    const shiftFilter = this.elements.filterShift ? this.elements.filterShift.value : '';
    const machineFilter = this.elements.filterMachine ? this.elements.filterMachine.value : '';

    let list = [...this.batches];
    if (shiftFilter) list = list.filter(b => String(b.shift) === shiftFilter);
    if (machineFilter) list = list.filter(b => b.machine === machineFilter);

    // Sort descending by turn/time
    list.sort((a, b) => (b.turn || 0) - (a.turn || 0));

    let totalFilteredQty = 0;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 24px;">Chưa có lượt sản lượng nào được ghi nhận.</td></tr>`;
    } else {
      list.forEach(b => {
        totalFilteredQty += Number(b.quantity) || 0;
        const tr = document.createElement('tr');

        let timeStr = b.timestamp || '';
        if (timeStr.includes('T')) {
          timeStr = timeStr.split('T')[1].substring(0, 5);
        }

        tr.innerHTML = `
          <td class="font-mono text-bold text-accent">#${b.turn}</td>
          <td class="font-mono text-sm">${timeStr}</td>
          <td><span class="badge-tag tag-shift">Ca ${b.shift}</span></td>
          <td><span class="badge-tag tag-machine">${b.machine}</span></td>
          <td class="font-mono text-bold">${b.productCode}</td>
          <td class="col-yellow font-mono text-bold text-accent">${Number(b.quantity).toLocaleString()}</td>
          <td class="col-yellow">${b.chamber} Buồng</td>
          <td class="font-mono text-sm">${b.settingQty || '--'}</td>
          <td class="text-sm">${b.worker || '--'}</td>
          <td>
            <button type="button" class="btn-action-icon btn-edit" title="Chỉnh sửa">✏️</button>
            <button type="button" class="btn-action-icon btn-del" title="Xóa lượt">🗑️</button>
          </td>
        `;

        tr.querySelector('.btn-edit').addEventListener('click', () => this.openEditBatch(b));
        tr.querySelector('.btn-del').addEventListener('click', () => this.promptDeleteSingleBatch(b));
        tbody.appendChild(tr);
      });
    }

    if (this.elements.tableFooterTotalQty) {
      this.elements.tableFooterTotalQty.textContent = totalFilteredQty.toLocaleString();
    }
    if (this.elements.tableFooterSummary) {
      this.elements.tableFooterSummary.textContent = `${list.length} lượt ghi nhận`;
    }
    if (this.elements.logFilterSummary) {
      this.elements.logFilterSummary.textContent = `${list.length} lượt`;
    }
  }

  updateKPIs() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBatches = this.batches.filter(b => b.date === todayStr);

    let totalQty = 0;
    let s1 = 0, s2 = 0, s3 = 0;
    let m1Count = 0, m2Count = 0, m3Count = 0, m4Count = 0, m5Count = 0;

    todayBatches.forEach(b => {
      const q = Number(b.quantity) || 0;
      totalQty += q;
      if (b.shift === 1) s1 += q;
      else if (b.shift === 2) s2 += q;
      else if (b.shift === 3) s3 += q;

      if (b.machine === 'SA01_SB01') m1Count++;
      else if (b.machine === 'SA01_SB02') m2Count++;
      else if (b.machine === 'SA01_SB03') m3Count++;
      else if (b.machine === 'SA01_SB04') m4Count++;
      else if (b.machine === 'SA01_SB05') m5Count++;
    });

    if (this.elements.kpiTotalQty) this.elements.kpiTotalQty.textContent = totalQty.toLocaleString();
    if (this.elements.kpiShift1Qty) this.elements.kpiShift1Qty.textContent = s1.toLocaleString();
    if (this.elements.kpiShift2Qty) this.elements.kpiShift2Qty.textContent = s2.toLocaleString();
    if (this.elements.kpiShift3Qty) this.elements.kpiShift3Qty.textContent = s3.toLocaleString();
    if (this.elements.kpiTotalTurns) this.elements.kpiTotalTurns.textContent = todayBatches.length;

    if (this.elements.kpiMachine1Count) this.elements.kpiMachine1Count.textContent = `SA01_SB01: ${m1Count} lượt`;
    if (this.elements.kpiMachine2Count) this.elements.kpiMachine2Count.textContent = `SA01_SB02: ${m2Count} lượt`;
    if (this.elements.kpiMachine3Count) this.elements.kpiMachine3Count.textContent = `SA01_SB03: ${m3Count} lượt`;
    if (this.elements.kpiMachine4Count) this.elements.kpiMachine4Count.textContent = `SA01_SB04: ${m4Count} lượt`;
    if (this.elements.kpiMachine5Count) this.elements.kpiMachine5Count.textContent = `SA01_SB05: ${m5Count} lượt`;

    if (this.elements.kpiProgressBar) {
      const pct = Math.min(100, Math.round((totalQty / 10000) * 100));
      this.elements.kpiProgressBar.style.width = `${pct}%`;
    }
  }

  // ==========================================
  // PIN SECURED CLEAR SHIFT
  // ==========================================
  openClearCaModal() {
    this.activePin = '';
    this.elements.inputManagerPin.value = '';
    this.elements.pinErrorAlert.classList.add('hidden');
    this.elements.pinModal.classList.remove('hidden');
  }

  handlePinPress(pinVal) {
    if (window.soundManager) window.soundManager.playClick();
    if (pinVal === 'clear') {
      this.activePin = '';
    } else if (pinVal === 'backspace') {
      this.activePin = this.activePin.slice(0, -1);
    } else {
      if (this.activePin.length < 6) {
        this.activePin += pinVal;
      }
    }
    this.elements.inputManagerPin.value = this.activePin;
  }

  async confirmClearCaWithPin() {
    // Default PIN: 1234
    if (this.activePin !== '1234') {
      this.elements.pinErrorAlert.classList.remove('hidden');
      if (window.soundManager) window.soundManager.playError();
      return;
    }

    try {
      await fetch('/api/batches', { method: 'DELETE' });
    } catch (e) {}

    this.batches = [];
    localStorage.setItem('shotblast_batches', JSON.stringify([]));
    this.elements.pinModal.classList.add('hidden');

    if (window.soundManager) window.soundManager.playSuccess();
    this.showToast('🗑️ Đã xóa toàn bộ dữ liệu ca thành công!', 'warn');

    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();
  }

  // ==========================================
  // SINGLE BATCH EDIT & DELETE
  // ==========================================
  openEditBatch(b) {
    this.elements.editBatchId.value = b.id;
    this.elements.editTurn.value = b.turn;
    this.elements.editMachine.value = b.machine;
    this.elements.editShift.value = b.shift;
    this.elements.editProductCode.value = b.productCode;
    this.elements.editQuantity.value = b.quantity;
    this.elements.editChamber.value = b.chamber;
    this.elements.editBatchModal.classList.remove('hidden');
  }

  async saveEditBatch() {
    const id = this.elements.editBatchId.value;
    const payload = {
      machine: this.elements.editMachine.value,
      shift: Number(this.elements.editShift.value),
      productCode: this.elements.editProductCode.value.trim().toUpperCase(),
      quantity: Number(this.elements.editQuantity.value),
      chamber: Number(this.elements.editChamber.value)
    };

    try {
      await fetch(`/api/batches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}

    const idx = this.batches.findIndex(b => b.id === id);
    if (idx >= 0) {
      this.batches[idx] = { ...this.batches[idx], ...payload };
      localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
    }

    this.elements.editBatchModal.classList.add('hidden');
    this.showToast('✅ Đã cập nhật lượt thành công!');
    this.renderProductionTable();
    this.updateKPIs();
  }

  promptDeleteSingleBatch(b) {
    this.pendingDeleteId = b.id;
    this.elements.deleteModalTitle.textContent = `Xóa Lượt #${b.turn}`;
    this.elements.deleteItemPreview.innerHTML = `
      <div style="padding: 10px; background: #F8FAFC; border-radius: 8px; text-align: left;">
        <div><b>Lượt số:</b> #${b.turn}</div>
        <div><b>Sản phẩm:</b> ${b.productCode} (${b.quantity} PCS)</div>
        <div><b>Máy & Ca:</b> ${b.machine} · Ca ${b.shift}</div>
      </div>
    `;
    this.elements.confirmDeleteModal.classList.remove('hidden');
  }

  async executeDeleteBatch() {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    try {
      await fetch(`/api/batches/${id}`, { method: 'DELETE' });
    } catch (e) {}

    this.batches = this.batches.filter(b => b.id !== id);
    localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
    this.elements.confirmDeleteModal.classList.add('hidden');
    this.showToast('🗑️ Đã xóa lượt thành công!');
    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();
  }

  // ==========================================
  // DSSP CATALOG & EXCEL & CONNECT MODALS
  // ==========================================
  renderDsspTable(query = '') {
    if (!window.productManager) return;
    const tbody = this.elements.dsspTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = window.productManager.search(query, 50);
    list.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td class="font-mono text-bold text-accent">${p.code}</td>
        <td>${p.name || ''}</td>
        <td class="font-mono text-bold">${p.settingQty || 14}</td>
        <td><button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem;">Chọn mã</button></td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        this.selectProduct(p);
        this.elements.productMasterModal.classList.add('hidden');
      });
      tbody.appendChild(tr);
    });
  }

  async openConnectModal() {
    this.elements.connectModal.classList.remove('hidden');
    this.elements.lanAddressList.innerHTML = '<p class="text-muted">Đang quét địa chỉ mạng Wi-Fi xưởng...</p>';
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const info = await res.json();
        this.elements.lanAddressList.innerHTML = '';
        const ip = (info.addresses && info.addresses.length > 0) ? info.addresses[0].ip : window.location.hostname;
        const port = info.port || 3000;
        const targetUrl = info.tunnelUrl || `http://${ip}:${port}`;

        const pill = document.createElement('div');
        pill.className = 'lan-address-item';
        pill.textContent = targetUrl;
        this.elements.lanAddressList.appendChild(pill);

        // QR Code
        if (typeof QRCode !== 'undefined' && this.elements.qrCodeContainer) {
          this.elements.qrCodeContainer.innerHTML = '';
          new QRCode(this.elements.qrCodeContainer, {
            text: targetUrl,
            width: 180,
            height: 180,
            colorDark: "#005BAC",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.M
          });
        }
      }
    } catch (e) {
      this.elements.lanAddressList.innerHTML = `<div class="lan-address-item">${window.location.origin}</div>`;
    }
  }

  exportExcel() {
    if (typeof exportProductionToExcel === 'function') {
      const meta = {
        date: new Date().toISOString().split('T')[0],
        worker: this.currentWorker ? this.currentWorker.name : 'Quản lý',
        line: 'SMC3',
        stage: 'Shotblast'
      };
      exportProductionToExcel(this.batches, window.productManager ? window.productManager.getAll() : [], meta);
    } else {
      alert('Thư viện Excel đang tải, vui lòng thử lại sau.');
    }
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    // Top Tabs
    this.elements.tabBtnWorker.addEventListener('click', () => {
      this.elements.tabBtnWorker.classList.add('active');
      this.elements.tabBtnManager.classList.remove('active');
      this.elements.operatorView.classList.remove('hidden');
      this.elements.managerView.classList.add('hidden');
    });

    this.elements.tabBtnManager.addEventListener('click', () => {
      this.elements.tabBtnManager.classList.add('active');
      this.elements.tabBtnWorker.classList.remove('active');
      this.elements.managerView.classList.remove('hidden');
      this.elements.operatorView.classList.add('hidden');
      this.renderProductionTable();
      this.updateKPIs();
    });

    if (this.elements.btnBackToOperator) {
      this.elements.btnBackToOperator.addEventListener('click', () => {
        this.elements.tabBtnWorker.click();
      });
    }

    // Utilities Dropdown
    this.elements.btnToggleUtilityMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.utilityMenuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!this.elements.utilityMenuDropdown.contains(e.target) && e.target !== this.elements.btnToggleUtilityMenu) {
        this.elements.utilityMenuDropdown.classList.add('hidden');
      }
    });

    this.elements.btnConnectTablet.addEventListener('click', () => {
      this.elements.utilityMenuDropdown.classList.add('hidden');
      this.openConnectModal();
    });

    this.elements.btnToggleSound.addEventListener('click', () => this.toggleSound());
    this.elements.btnToggleTheme.addEventListener('click', () => this.toggleTheme());
    this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Worker Events
    this.elements.inputWorkerId.addEventListener('input', (e) => {
      this.checkWorkerId(e.target.value, true);
    });

    this.elements.inputWorkerId.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputWorkerId;
    });

    this.elements.btnClearWorker.addEventListener('click', () => this.clearWorker());
    this.elements.btnChangeWorker.addEventListener('click', () => this.clearWorker());

    // Product Events
    this.elements.inputProductCode.addEventListener('input', (e) => this.handleProductInput(e));
    this.elements.inputProductCode.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputProductCode;
    });

    this.elements.btnClearProduct.addEventListener('click', () => {
      this.clearProductBanner();
      this.elements.inputProductCode.focus();
      this.focusedInput = this.elements.inputProductCode;
      this.validateForm();
    });

    this.elements.btnOpenScanner.addEventListener('click', () => {
      const scannerInst = window.scanner || window.barcodeScanner;
      if (scannerInst) {
        scannerInst.start((scannedCode) => {
          this.applyScannedProductCode(scannedCode);
        });
      }
    });

    // Global listener for hardware scanner guns and photo scans
    window.addEventListener('barcode-scanned', (e) => {
      if (e.detail && e.detail.code) {
        this.applyScannedProductCode(e.detail.code);
      }
    });

    this.elements.btnOpenProductMaster.addEventListener('click', () => {
      this.elements.productMasterModal.classList.remove('hidden');
    });

    if (this.elements.dsspSearchInput) {
      this.elements.dsspSearchInput.addEventListener('input', (e) => {
        this.renderDsspTable(e.target.value);
      });
    }

    // Chamber selection (Supports 1 - 6 chambers)
    const chamberBtns = this.elements.chamberSelector.querySelectorAll('.btn-chamber, .btn-chamber-sm');
    chamberBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setChamber(btn.getAttribute('data-chamber'));
      });
    });

    // Quantity Input & Quick Adds
    this.elements.inputQuantity.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputQuantity;
    });
    this.elements.inputQuantity.addEventListener('input', () => this.validateForm());

    const quickAddBtns = document.querySelectorAll('.btn-quick-add');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const add = Number(btn.getAttribute('data-add')) || 10;
        this.quickAddQty(add);
      });
    });

    // Balanced Touch Numpad
    const padBtns = this.elements.touchNumpad.querySelectorAll('.btn-pad');
    padBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (val) this.handleNumpad(val);
      });
    });

    if (this.elements.btnNumpadEnter) {
      this.elements.btnNumpadEnter.addEventListener('click', () => {
        if (this.validateForm()) {
          this.submitBatch();
        } else if (this.focusedInput === this.elements.inputWorkerId) {
          this.elements.inputProductCode.focus();
        } else if (this.focusedInput === this.elements.inputProductCode) {
          this.elements.inputQuantity.focus();
        }
      });
    }

    // Submit Batch Button
    this.elements.btnSubmitBatch.addEventListener('click', () => this.submitBatch());

    // Enter Key on physical keyboard / barcode gun
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!this.elements.successModal.classList.contains('hidden')) {
          this.closeSuccessModalAndReset();
        } else if (!this.elements.pinModal.classList.contains('hidden')) {
          this.confirmClearCaWithPin();
        } else if (this.validateForm()) {
          this.submitBatch();
        }
      }
    });

    // Success Modal Next Batch Button
    this.elements.btnNextBatchNow.addEventListener('click', () => this.closeSuccessModalAndReset());

    // PIN Modal Events
    this.elements.btnOpenClearCaModal.addEventListener('click', () => this.openClearCaModal());
    this.elements.btnClosePinModal.addEventListener('click', () => this.elements.pinModal.classList.add('hidden'));
    this.elements.btnCancelPin.addEventListener('click', () => this.elements.pinModal.classList.add('hidden'));
    this.elements.btnConfirmClearCa.addEventListener('click', () => this.confirmClearCaWithPin());

    const pinBtns = document.querySelectorAll('.btn-pin');
    pinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const pin = btn.getAttribute('data-pin');
        if (pin) this.handlePinPress(pin);
      });
    });

    // Table Filters
    if (this.elements.filterShift) {
      this.elements.filterShift.addEventListener('change', () => this.renderProductionTable());
    }
    if (this.elements.filterMachine) {
      this.elements.filterMachine.addEventListener('change', () => this.renderProductionTable());
    }

    // Excel Export
    if (this.elements.btnExportExcel) {
      this.elements.btnExportExcel.addEventListener('click', () => this.exportExcel());
    }

    // Edit Batch Modal
    if (this.elements.btnCloseEditBatch) {
      this.elements.btnCloseEditBatch.addEventListener('click', () => this.elements.editBatchModal.classList.add('hidden'));
    }
    if (this.elements.btnCancelEdit) {
      this.elements.btnCancelEdit.addEventListener('click', () => this.elements.editBatchModal.classList.add('hidden'));
    }
    if (this.elements.btnSaveEditBatch) {
      this.elements.btnSaveEditBatch.addEventListener('click', () => this.saveEditBatch());
    }

    // Delete Batch Modal
    if (this.elements.btnCloseConfirmDelete) {
      this.elements.btnCloseConfirmDelete.addEventListener('click', () => this.elements.confirmDeleteModal.classList.add('hidden'));
    }
    if (this.elements.btnCancelDelete) {
      this.elements.btnCancelDelete.addEventListener('click', () => this.elements.confirmDeleteModal.classList.add('hidden'));
    }
    if (this.elements.btnConfirmDelete) {
      this.elements.btnConfirmDelete.addEventListener('click', () => this.executeDeleteBatch());
    }

    // Other Modals Close
    if (this.elements.btnCloseConnect) {
      this.elements.btnCloseConnect.addEventListener('click', () => this.elements.connectModal.classList.add('hidden'));
    }
    if (this.elements.btnCloseProductMaster) {
      this.elements.btnCloseProductMaster.addEventListener('click', () => this.elements.productMasterModal.classList.add('hidden'));
    }
  }

  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Global App Instance
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ShotblastApp();
});
