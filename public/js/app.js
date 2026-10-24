// ==========================================================================
// MAIN SHOPFLOOR APPLICATION LOGIC - SHOTBLAST MES
// ==========================================================================

class ShotblastApp {
  constructor() {
    this.batches = [];
    this.currentMachine = localStorage.getItem('shotblast_machine') || 'SA01_SB01';
    this.currentShift = 1;
    this.currentChamber = 1;
    this.isOnline = false;

    // DOM Elements Cache
    this.elements = {
      // Clocks & Info
      liveDate: document.getElementById('liveDate'),
      liveTime: document.getElementById('liveTime'),
      shiftBadge: document.getElementById('currentShiftBadge'),
      syncBadge: document.getElementById('syncBadge'),

      // KPI Elements
      kpiTotalQty: document.getElementById('kpiTotalQty'),
      kpiShift1Qty: document.getElementById('kpiShift1Qty'),
      kpiShift2Qty: document.getElementById('kpiShift2Qty'),
      kpiTotalTurns: document.getElementById('kpiTotalTurns'),
      nextTurnPreview: document.getElementById('nextTurnPreview'),
      kpiProgressBar: document.getElementById('kpiProgressBar'),
      kpiMachine1Count: document.getElementById('kpiMachine1Count'),
      kpiMachine2Count: document.getElementById('kpiMachine2Count'),

      // Form Elements
      form: document.getElementById('batchForm'),
      currentTurnDisplay: document.getElementById('currentTurnDisplay'),
      machineSelector: document.getElementById('machineSelector'),
      shiftSelector: document.getElementById('shiftSelector'),
      chamberSelector: document.getElementById('chamberSelector'),
      inputMachine: document.getElementById('inputMachine'),
      inputShift: document.getElementById('inputShift'),
      inputChamber: document.getElementById('inputChamber'),
      inputProductCode: document.getElementById('inputProductCode'),
      btnClearProduct: document.getElementById('btnClearProduct'),
      productSuggestions: document.getElementById('productSuggestions'),
      metaProductName: document.getElementById('metaProductName'),
      metaSettingQty: document.getElementById('metaSettingQty'),
      quickProductChips: document.getElementById('quickProductChips'),
      inputQuantity: document.getElementById('inputQuantity'),
      touchNumpad: document.getElementById('touchNumpad'),
      btnSubmitBatch: document.getElementById('btnSubmitBatch'),

      // Table & Filters
      filterShift: document.getElementById('filterShift'),
      filterMachine: document.getElementById('filterMachine'),
      batchTableBody: document.getElementById('batchTableBody'),
      logFilterSummary: document.getElementById('logFilterSummary'),
      tableFooterTotalQty: document.getElementById('tableFooterTotalQty'),
      tableFooterSummary: document.getElementById('tableFooterSummary'),
      btnExportExcel: document.getElementById('btnExportExcel'),
      btnClearAllBatches: document.getElementById('btnClearAllBatches'),

      // Nav Controls
      btnToggleSound: document.getElementById('btnToggleSound'),
      btnToggleTheme: document.getElementById('btnToggleTheme'),
      btnFullscreen: document.getElementById('btnFullscreen'),
      btnConnectTablet: document.getElementById('btnConnectTablet'),
      btnOpenScanner: document.getElementById('btnOpenScanner'),
      btnQuickPhotoScan: document.getElementById('btnQuickPhotoScan'),
      btnOpenProductMaster: document.getElementById('btnOpenProductMaster'),

      // Modals
      scannerModal: document.getElementById('scannerModal'),
      connectModal: document.getElementById('connectModal'),
      btnCloseConnect: document.getElementById('btnCloseConnect'),
      lanAddressList: document.getElementById('lanAddressList'),
      qrCodeContainer: document.getElementById('qrCodeContainer'),

      productMasterModal: document.getElementById('productMasterModal'),
      btnCloseProductMaster: document.getElementById('btnCloseProductMaster'),
      btnSaveProduct: document.getElementById('btnSaveProduct'),
      newProdCode: document.getElementById('newProdCode'),
      newProdName: document.getElementById('newProdName'),
      newProdSettingQty: document.getElementById('newProdSettingQty'),
      dsspTableBody: document.getElementById('dsspTableBody'),
      dsspSearchInput: document.getElementById('dsspSearchInput'),
      seriesFilterTabs: document.getElementById('seriesFilterTabs'),

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

      // Touch Confirm Delete Modal
      confirmDeleteModal: document.getElementById('confirmDeleteModal'),
      deleteModalTitle: document.getElementById('deleteModalTitle'),
      deleteModalDesc: document.getElementById('deleteModalDesc'),
      deleteItemPreview: document.getElementById('deleteItemPreview'),
      btnCancelDelete: document.getElementById('btnCancelDelete'),
      btnConfirmDelete: document.getElementById('btnConfirmDelete'),
      btnCloseConfirmDelete: document.getElementById('btnCloseConfirmDelete'),

      toastContainer: document.getElementById('toastContainer')
    };

    this.focusedInput = this.elements.inputQuantity;
    this.pendingDelete = null;
  }

  async init() {
    this.initTheme();
    this.startClock();
    this.calculateAutoShift();
    
    // Init Product Manager
    await window.productManager.init();
    this.renderQuickProductChips();

    // Load initial batches
    await this.loadBatches();

    // Bind UI Events
    this.bindEvents();

    // Restore saved machine
    this.setMachine(this.currentMachine);

    // Initial table and stats render
    this.renderProductionTable();
    this.updateKPIs();
  }

  // ==========================================
  // THEME & DISPLAY
  // ==========================================
  initTheme() {
    document.body.classList.remove('theme-dark');
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-smc');
  }

  toggleTheme() {
    this.showToast('ℹ️ Giao diện chuẩn màu xanh & trắng SMC', 'info');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // ==========================================
  // REAL-TIME CLOCK & AUTO-SHIFT
  // ==========================================
  startClock() {
    const updateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      if (this.elements.liveDate) {
        this.elements.liveDate.textContent = `${day}/${month}/${year}`;
      }
      if (this.elements.liveTime) {
        this.elements.liveTime.textContent = `${hours}:${minutes}:${seconds}`;
      }

      // Check shift change periodically
      this.calculateAutoShift(now);
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  calculateAutoShift(now = new Date()) {
    const hour = now.getHours();
    let shift = 1;
    let badgeClass = 'ca-1';
    let shiftText = 'CA 1 ĐANG CHẠY';

    if (hour >= 6 && hour < 14) {
      shift = 1;
      badgeClass = 'ca-1';
      shiftText = 'CA 1 ĐANG CHẠY';
    } else if (hour >= 14 && hour < 22) {
      shift = 2;
      badgeClass = 'ca-2';
      shiftText = 'CA 2 ĐANG CHẠY';
    } else {
      shift = 3;
      badgeClass = 'ca-3';
      shiftText = 'CA 3 / ĐÊM';
    }

    if (this.elements.shiftBadge) {
      this.elements.shiftBadge.className = `shift-indicator ${badgeClass}`;
      this.elements.shiftBadge.textContent = shiftText;
    }

    // Set initial shift if not touched yet
    if (!this.shiftManuallySelected) {
      this.setShift(shift, false);
    }
  }

  // ==========================================
  // DATA ACCESS & SYNC
  // ==========================================
  async loadBatches() {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        this.batches = await res.json();
        this.isOnline = true;
        this.setSyncStatus(true);
        // Cache locally for offline safety
        localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
      } else {
        throw new Error('API server unavailable');
      }
    } catch (err) {
      console.warn('API error, using local storage cache:', err.message);
      this.isOnline = false;
      this.setSyncStatus(false);
      const cached = localStorage.getItem('shotblast_batches');
      if (cached) {
        try {
          this.batches = JSON.parse(cached);
        } catch (e) {
          this.batches = [];
        }
      } else {
        this.batches = [];
      }
    }
    this.updateNextTurnNumber();
  }

  setSyncStatus(online) {
    if (!this.elements.syncBadge) return;
    if (online) {
      this.elements.syncBadge.className = 'sync-badge online';
      this.elements.syncBadge.innerHTML = '<span class="sync-dot"></span><span class="sync-text">LAN Online</span>';
    } else {
      this.elements.syncBadge.className = 'sync-badge offline';
      this.elements.syncBadge.innerHTML = '<span class="sync-dot"></span><span class="sync-text">Lưu Nội Bộ</span>';
    }
  }

  // ==========================================
  // SELECTION CONTROLS
  // ==========================================
  setMachine(machine) {
    this.currentMachine = machine;
    this.elements.inputMachine.value = machine;
    localStorage.setItem('shotblast_machine', machine);

    const buttons = this.elements.machineSelector.querySelectorAll('.btn-touch-select');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-machine') === machine) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setShift(shift, isManual = true) {
    this.currentShift = Number(shift);
    this.elements.inputShift.value = shift;
    if (isManual) {
      this.shiftManuallySelected = true;
    }

    const buttons = this.elements.shiftSelector.querySelectorAll('.btn-shift-select');
    buttons.forEach(btn => {
      if (Number(btn.getAttribute('data-shift')) === Number(shift)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setChamber(chamber) {
    this.currentChamber = Number(chamber);
    this.elements.inputChamber.value = chamber;

    const buttons = this.elements.chamberSelector.querySelectorAll('.btn-chamber-select');
    buttons.forEach(btn => {
      if (Number(btn.getAttribute('data-chamber')) === Number(chamber)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // ==========================================
  // PRODUCT SELECTION & AUTOCOMPLETE
  // ==========================================
  renderQuickProductChips() {
    window.productManager.renderQuickChips(this.elements.quickProductChips, (product) => {
      this.selectProduct(product);
    });
  }

  selectProduct(product) {
    this.elements.inputProductCode.value = product.code;
    const catPrefix = product.series || product.category ? `[${product.series || product.category}] ` : '';
    this.elements.metaProductName.textContent = `${catPrefix}${product.name || product.code}`;
    this.elements.metaSettingQty.textContent = product.settingQty || '10';
    this.elements.productSuggestions.classList.add('hidden');

    // Auto focus quantity input
    setTimeout(() => {
      this.elements.inputQuantity.focus();
    }, 100);
  }

  applyScannedProductCode(scannedCode) {
    if (!scannedCode) return;
    const cleanCode = scannedCode.trim().replace(/^[\*\$]/, '').replace(/[\*\$]$/, '').toUpperCase();
    this.elements.inputProductCode.value = cleanCode;

    // 1. Direct search in 861 SMC catalog products
    let prod = window.productManager.findByCode(cleanCode);

    // 2. Try normalized search (without hyphens or prefix)
    if (!prod) {
      const stripped = cleanCode.replace(/[^A-Z0-9]/g, '');
      prod = window.productManager.products.find(p => p.code.replace(/[^A-Z0-9]/g, '') === stripped);
    }

    // 3. Try prefix search in catalog
    if (!prod) {
      const matches = window.productManager.search(cleanCode, 1);
      if (matches.length > 0) prod = matches[0];
    }

    if (prod) {
      this.selectProduct(prod);
      this.showToast(`✅ Đã nhận diện mã: ${prod.code}`, 'success');
    } else {
      this.elements.metaProductName.textContent = `Mã mới: ${cleanCode}`;
      this.elements.metaSettingQty.textContent = '10';
      this.elements.productSuggestions.classList.add('hidden');
      this.showToast(`📷 Đã ghi nhận mã: ${cleanCode}`, 'info');
      setTimeout(() => {
        this.elements.inputQuantity.focus();
      }, 100);
    }
  }

  clearProduct() {
    this.elements.inputProductCode.value = '';
    this.elements.metaProductName.textContent = 'Chưa chọn mã';
    this.elements.metaSettingQty.textContent = '--';
    this.elements.productSuggestions.classList.add('hidden');
    this.elements.inputProductCode.focus();
  }

  handleProductInput(e) {
    const val = (e && e.target) ? e.target.value.trim() : (this.elements.inputProductCode.value.trim());
    if (!val) {
      this.elements.metaProductName.textContent = 'Chưa chọn mã';
      this.elements.metaSettingQty.textContent = '--';
      this.elements.productSuggestions.classList.add('hidden');
      return;
    }

    const matches = window.productManager.search(val, 12);
    if (matches.length > 0) {
      this.elements.productSuggestions.innerHTML = '';
      matches.forEach(p => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
          <div>
            <div class="suggestion-code">${p.code} ${p.series ? `<span class="badge-series">${p.series}</span>` : ''}</div>
            <div class="suggestion-name">${p.name || ''} ${p.category ? `<small class="text-muted">(${p.category})</small>` : ''}</div>
          </div>
          <div class="suggestion-setting">${p.settingQty || 10} cái/mẻ</div>
        `;
        item.addEventListener('click', () => {
          window.soundManager.playClick();
          this.selectProduct(p);
        });
        this.elements.productSuggestions.appendChild(item);
      });
      this.elements.productSuggestions.classList.remove('hidden');
    } else {
      this.elements.productSuggestions.classList.add('hidden');
    }

    // Auto-match exact code
    const exact = window.productManager.findByCode(val);
    if (exact) {
      const catPrefix = exact.series || exact.category ? `[${exact.series || exact.category}] ` : '';
      this.elements.metaProductName.textContent = `${catPrefix}${exact.name || exact.code}`;
      this.elements.metaSettingQty.textContent = exact.settingQty || '10';
    } else {
      this.elements.metaProductName.textContent = 'Mã mới (Chưa có trong DSSP)';
      this.elements.metaSettingQty.textContent = '10';
    }
  }

  // ==========================================
  // ON-SCREEN TOUCH NUMPAD FOR TABLETS
  // ==========================================
  handleNumpadPress(val) {
    window.soundManager.playClick();
    const isProduct = (this.focusedInput === this.elements.inputProductCode);
    const targetInput = isProduct ? this.elements.inputProductCode : this.elements.inputQuantity;
    let currentVal = targetInput.value || '';

    if (val === 'clear') {
      if (isProduct) {
        this.clearProduct();
      } else {
        targetInput.value = '';
      }
    } else if (val === 'backspace') {
      targetInput.value = currentVal.slice(0, -1);
      if (isProduct) {
        this.handleProductInput({ target: targetInput });
      }
    } else if (val === '00') {
      if (!isProduct && currentVal && currentVal !== '0') {
        targetInput.value = currentVal + '00';
      }
    } else {
      if (!isProduct) {
        if (currentVal === '0') {
          targetInput.value = val;
        } else {
          targetInput.value = currentVal + val;
        }
      } else {
        targetInput.value = currentVal + val;
        this.handleProductInput({ target: targetInput });
      }
    }
  }

  handleQuickAdd(addAmount) {
    window.soundManager.playClick();
    const input = this.elements.inputQuantity;
    const current = Number(input.value) || 0;
    input.value = current + Number(addAmount);
  }

  // ==========================================
  // BATCH SUBMISSION (THE CORE TOUCH ACTION)
  // ==========================================
  async submitBatch() {
    const productCode = this.elements.inputProductCode.value.trim().toUpperCase();
    const quantity = Number(this.elements.inputQuantity.value);
    const machine = this.elements.inputMachine.value;
    const shift = Number(this.elements.inputShift.value) || 1;
    const chamber = Number(this.elements.inputChamber.value) || 1;

    // Validation
    if (!productCode) {
      window.soundManager.playError();
      this.showToast('Vui lòng nhập hoặc quét Mã Sản Phẩm!', 'error');
      this.elements.inputProductCode.focus();
      return;
    }

    if (!quantity || quantity <= 0) {
      window.soundManager.playError();
      this.showToast('Vui lòng nhập Số Lượng Xử Lý hợp lệ!', 'error');
      this.elements.inputQuantity.focus();
      return;
    }

    // Determine setting Qty from DSSP
    const product = window.productManager.findByCode(productCode);
    const settingQty = product ? product.settingQty : 10;

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);
    const nextTurn = this.getNextTurnNumber();

    const payload = {
      date: todayStr,
      month: monthStr,
      shift,
      line: 'SMC3',
      stage: 'Shotblast',
      machine,
      turn: nextTurn,
      productCode,
      quantity,
      chamber,
      settingQty,
      timestamp: new Date().toISOString(),
      worker: 'V.T.Hiếu'
    };

    // Play feedback sound immediately for snappy touch feel
    window.soundManager.playSuccess();

    // Visual button bounce
    this.elements.btnSubmitBatch.style.transform = 'scale(0.97)';
    setTimeout(() => {
      this.elements.btnSubmitBatch.style.transform = '';
    }, 150);

    // Try posting to backend
    let savedBatch = null;
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        savedBatch = data.batch;
        this.batches.push(savedBatch);
        this.setSyncStatus(true);
      } else {
        throw new Error('API save failed');
      }
    } catch (e) {
      // Local save fallback
      savedBatch = {
        id: 'sb_' + Date.now(),
        ...payload
      };
      this.batches.push(savedBatch);
      localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
      this.setSyncStatus(false);
    }

    // Toast notification
    this.showToast(`✅ Đã lưu LƯỢT ${nextTurn}: ${productCode} (${quantity} cái)`, 'success');

    // Check celebration milestone
    const totalToday = this.getTotalQuantityToday();
    if (totalToday >= 5000 && typeof confetti === 'function') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    }

    // Reset Form for next entry (keep machine, shift, chamber)
    this.elements.inputQuantity.value = '';
    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();

    // Focus back on product or quantity
    this.elements.inputQuantity.focus();
  }

  getNextTurnNumber() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBatches = this.batches.filter(b => b.date === todayStr);
    return todayBatches.length + 1;
  }

  updateNextTurnNumber() {
    const nextTurn = this.getNextTurnNumber();
    if (this.elements.currentTurnDisplay) {
      this.elements.currentTurnDisplay.textContent = nextTurn;
    }
    if (this.elements.nextTurnPreview) {
      this.elements.nextTurnPreview.textContent = nextTurn;
    }
  }

  getTotalQuantityToday() {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.batches
      .filter(b => b.date === todayStr)
      .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  }

  // ==========================================
  // TABLE RENDERING (IDENTICAL TO EXCEL SHEET)
  // ==========================================
  renderProductionTable() {
    const tbody = this.elements.batchTableBody;
    if (!tbody) return;

    const filterShiftVal = this.elements.filterShift.value;
    const filterMachineVal = this.elements.filterMachine.value;

    let displayBatches = [...this.batches];

    if (filterShiftVal) {
      displayBatches = displayBatches.filter(b => String(b.shift) === String(filterShiftVal));
    }
    if (filterMachineVal) {
      displayBatches = displayBatches.filter(b => b.machine === filterMachineVal);
    }

    tbody.innerHTML = '';

    if (displayBatches.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">
            Chưa có lượt ghi nhận nào phù hợp bộ lọc. Hãy nhập mẻ đầu tiên bên trái!
          </td>
        </tr>
      `;
      this.elements.tableFooterTotalQty.textContent = '0';
      this.elements.tableFooterSummary.textContent = '0 lượt ghi nhận';
      this.elements.logFilterSummary.textContent = '0 mẻ';
      return;
    }

    let subtotalQty = 0;

    displayBatches.forEach((b, idx) => {
      subtotalQty += Number(b.quantity) || 0;

      // Extract time
      let timeText = '--';
      if (b.timestamp) {
        const timePart = b.timestamp.includes('T') ? b.timestamp.split('T')[1] : b.timestamp;
        timeText = timePart.substring(0, 5);
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-mono">
          <span class="turn-tag">${b.turn || (idx + 1)}</span>
        </td>
        <td class="font-mono text-muted text-sm">${timeText}</td>
        <td class="text-center">
          <span class="shift-badge-sm s${b.shift}">Ca ${b.shift}</span>
        </td>
        <td class="font-mono text-bold">${b.machine}</td>
        <td>
          <span class="product-code-tag">${b.productCode}</span>
        </td>
        <td class="col-yellow text-center font-mono text-bold text-lg">${Number(b.quantity).toLocaleString()}</td>
        <td class="col-yellow text-center font-mono text-bold">${b.chamber || 1}</td>
        <td class="text-center font-mono text-muted">${b.settingQty || '--'}</td>
        <td class="text-center">
          <button type="button" class="btn-action-icon btn-action-edit" title="Chỉnh sửa lượt này">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button type="button" class="btn-action-icon btn-action-delete" title="Xóa lượt này">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;

      // Edit event
      tr.querySelector('.btn-action-edit').addEventListener('click', () => {
        window.soundManager.playClick();
        this.openEditBatchModal(b);
      });

      // Delete event
      tr.querySelector('.btn-action-delete').addEventListener('click', () => {
        window.soundManager.playClick();
        this.promptDeleteBatch(b);
      });

      tbody.appendChild(tr);
    });

    // Update Footers
    this.elements.tableFooterTotalQty.textContent = subtotalQty.toLocaleString();
    this.elements.tableFooterSummary.textContent = `${displayBatches.length} lượt ghi nhận`;
    this.elements.logFilterSummary.textContent = `${displayBatches.length} mẻ đã ghi`;
  }

  // ==========================================
  // KPI STATS CALCULATION
  // ==========================================
  updateKPIs() {
    const totalToday = this.getTotalQuantityToday();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBatches = this.batches.filter(b => b.date === todayStr);

    // Shift quantities
    const shift1Qty = todayBatches
      .filter(b => Number(b.shift) === 1)
      .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    const shift2Qty = todayBatches
      .filter(b => Number(b.shift) === 2)
      .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    // Machine counts
    const sb01Count = todayBatches.filter(b => b.machine === 'SA01_SB01').length;
    const sb02Count = todayBatches.filter(b => b.machine === 'SA01_SB02').length;

    // Target calculation (e.g. 10,000 target per day)
    const target = 10000;
    const progressPct = Math.min(100, Math.round((totalToday / target) * 100 * 10) / 10);

    if (this.elements.kpiTotalQty) {
      this.elements.kpiTotalQty.textContent = totalToday.toLocaleString();
    }
    if (this.elements.kpiShift1Qty) {
      this.elements.kpiShift1Qty.textContent = shift1Qty.toLocaleString();
    }
    if (this.elements.kpiShift2Qty) {
      this.elements.kpiShift2Qty.textContent = shift2Qty.toLocaleString();
    }
    if (this.elements.kpiTotalTurns) {
      this.elements.kpiTotalTurns.textContent = todayBatches.length;
    }
    if (this.elements.kpiProgressBar) {
      this.elements.kpiProgressBar.style.width = `${progressPct}%`;
    }
    if (this.elements.kpiMachine1Count) {
      this.elements.kpiMachine1Count.textContent = `SA01_SB01: ${sb01Count} mẻ`;
    }
    if (this.elements.kpiMachine2Count) {
      this.elements.kpiMachine2Count.textContent = `SA01_SB02: ${sb02Count} mẻ`;
    }
  }

  // ==========================================
  // EDIT & DELETE ACTIONS
  // ==========================================
  openEditBatchModal(batch) {
    this.elements.editBatchId.value = batch.id;
    this.elements.editTurn.value = batch.turn || 1;
    this.elements.editMachine.value = batch.machine || 'SA01_SB01';
    this.elements.editShift.value = batch.shift || 1;
    this.elements.editProductCode.value = batch.productCode || '';
    this.elements.editQuantity.value = batch.quantity || 0;
    this.elements.editChamber.value = batch.chamber || 1;

    this.elements.editBatchModal.classList.remove('hidden');
  }

  async saveEditBatch() {
    const id = this.elements.editBatchId.value;
    const productCode = this.elements.editProductCode.value.trim().toUpperCase();
    const quantity = Number(this.elements.editQuantity.value);
    const machine = this.elements.editMachine.value;
    const shift = Number(this.elements.editShift.value);
    const chamber = Number(this.elements.editChamber.value);

    if (!productCode || !quantity || quantity <= 0) {
      this.showToast('Vui lòng kiểm tra lại thông tin nhập!', 'error');
      return;
    }

    const product = window.productManager.findByCode(productCode);
    const settingQty = product ? product.settingQty : 10;

    const payload = {
      productCode,
      quantity,
      machine,
      shift,
      chamber,
      settingQty
    };

    try {
      const res = await fetch(`/api/batches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const idx = this.batches.findIndex(b => b.id === id);
        if (idx >= 0) this.batches[idx] = data.batch;
      } else {
        throw new Error('Save error');
      }
    } catch (e) {
      const idx = this.batches.findIndex(b => b.id === id);
      if (idx >= 0) {
        this.batches[idx] = { ...this.batches[idx], ...payload };
        localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
      }
    }

    this.elements.editBatchModal.classList.add('hidden');
    this.showToast('✅ Đã cập nhật lượt sản lượng!', 'success');
    this.renderProductionTable();
    this.updateKPIs();
  }

  promptDeleteBatch(b) {
    this.pendingDelete = { type: 'single', id: b.id, turn: b.turn };
    this.elements.deleteModalTitle.textContent = `XÁC NHẬN XÓA LƯỢT ${b.turn}`;
    this.elements.deleteModalDesc.textContent = `Bạn có chắc chắn muốn xóa lượt sản lượng này khỏi hệ thống?`;
    this.elements.deleteItemPreview.innerHTML = `
      <div class="preview-row"><span class="preview-label">Số lượt:</span> <span class="preview-value text-bold">Lượt ${b.turn}</span></div>
      <div class="preview-row"><span class="preview-label">Mã thiết bị:</span> <span class="preview-value font-mono">${b.machine}</span></div>
      <div class="preview-row"><span class="preview-label">Ca:</span> <span class="preview-value">Ca ${b.shift}</span></div>
      <div class="preview-row"><span class="preview-label">Mã sản phẩm:</span> <span class="preview-value font-mono">${b.productCode}</span></div>
      <div class="preview-row"><span class="preview-label">Số lượng xử lý:</span> <span class="preview-value text-accent font-mono text-bold">${Number(b.quantity).toLocaleString()} cái</span></div>
    `;
    this.elements.confirmDeleteModal.classList.remove('hidden');
  }

  promptClearAllBatches() {
    if (this.batches.length === 0) {
      this.showToast('Không có dữ liệu mẻ nào để xóa!', 'info');
      return;
    }
    this.pendingDelete = { type: 'all' };
    this.elements.deleteModalTitle.textContent = `XÁC NHẬN XÓA TOÀN BỘ CA`;
    this.elements.deleteModalDesc.textContent = `Hành động này sẽ xóa toàn bộ các lượt mẻ đã ghi nhận để bắt đầu ca mới!`;
    this.elements.deleteItemPreview.innerHTML = `
      <div class="preview-row"><span class="preview-label">Tổng số mẻ:</span> <span class="preview-value text-bold">${this.batches.length} lượt</span></div>
      <div class="preview-row"><span class="preview-label">Tổng sản lượng:</span> <span class="preview-value text-accent font-mono text-bold">${this.getTotalQuantityToday().toLocaleString()} cái</span></div>
    `;
    this.elements.confirmDeleteModal.classList.remove('hidden');
  }

  async executeConfirmDelete() {
    if (!this.pendingDelete) return;
    const { type, id, turn } = this.pendingDelete;
    this.elements.confirmDeleteModal.classList.add('hidden');

    if (type === 'single') {
      try {
        const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
        if (res.ok) {
          this.batches = this.batches.filter(b => b.id !== id);
        } else {
          this.batches = this.batches.filter(b => b.id !== id);
        }
      } catch (e) {
        this.batches = this.batches.filter(b => b.id !== id);
      }
      localStorage.setItem('shotblast_batches', JSON.stringify(this.batches));
      window.soundManager.playClick();
      this.showToast(`🗑️ Đã xóa thành công Lượt ${turn}!`, 'warn');
    } else if (type === 'all') {
      try {
        await fetch('/api/batches', { method: 'DELETE' });
      } catch (e) {}
      this.batches = [];
      localStorage.setItem('shotblast_batches', JSON.stringify([]));
      window.soundManager.playClick();
      this.showToast(`🗑️ Đã xóa toàn bộ dữ liệu ca!`, 'warn');
    }

    this.pendingDelete = null;
    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();
  }

  // ==========================================
  // TABLET CONNECT (QR CODE & LAN IP)
  // ==========================================
  async openConnectModal() {
    this.elements.connectModal.classList.remove('hidden');
    this.elements.lanAddressList.innerHTML = '<p class="text-muted">Đang quét địa chỉ mạng Wi-Fi xưởng...</p>';

    // Check if user is opening directly via file:///
    if (window.location.protocol === 'file:') {
      this.elements.lanAddressList.innerHTML = `
        <div style="background: #FFF8E6; border: 1px solid #FFE08A; border-radius: 8px; padding: 14px; text-align: left; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #945B00; font-size: 0.95rem; margin-bottom: 6px;">
            ⚠️ BẠN ĐANG MỞ TRỰC TIẾP FILE HTML (file:///)
          </div>
          <p style="font-size: 0.85rem; color: #555; margin-bottom: 10px; line-height: 1.5;">
            Đường dẫn <code>file:///C:/Users/...</code> chỉ nằm trên ổ cứng máy này, điện thoại/tablet xưởng <b>không thể truy cập được</b>.
          </p>
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; font-size: 0.84rem; line-height: 1.6;">
            <b>👉 CÁCH KHỞI ĐỘNG KẾT NỐI WI-FI CHO TABLET:</b><br>
            1. Đóng tab trình duyệt này.<br>
            2. Vào thư mục phần mềm: <b><code>Nhap bao cao Shotblast</code></b><br>
            3. Nhấp đúp chuột vào file <b><code>start.bat</code></b><br>
            4. Trình duyệt sẽ tự động mở <b><code>http://localhost:3000</code></b> và tạo mã QR Wi-Fi thật cho Tablet!
          </div>
        </div>
      `;
      if (this.elements.qrCodeContainer) {
        this.elements.qrCodeContainer.innerHTML = `
          <div style="width: 180px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 8px; color: #64748B; font-size: 0.8rem; padding: 12px; text-align: center; gap: 6px;">
            <span style="font-size: 2rem;">⚡</span>
            <span>Chạy <b>start.bat</b> để kích hoạt mã QR Wi-Fi</span>
          </div>
        `;
      }
      return;
    }

    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const info = await res.json();
        this.elements.lanAddressList.innerHTML = '';

        // Check if user is visiting via public domain or if a 4G/5G tunnel is active
        const isPublicDomain = window.location.hostname !== 'localhost' && 
                               window.location.hostname !== '127.0.0.1' && 
                               !window.location.hostname.startsWith('192.168.') &&
                               !window.location.hostname.startsWith('10.');

        let activeTargetUrl = '';

        if (isPublicDomain) {
          activeTargetUrl = window.location.origin;
          const publicPill = document.createElement('div');
          publicPill.className = 'lan-pill active-pill';
          publicPill.style.background = '#F0FDF4';
          publicPill.style.borderColor = '#86EFAC';
          publicPill.innerHTML = `
            <span style="font-weight:700;color:#166534;">${window.location.origin}</span>
            <small style="background:#DCFCE7;color:#15803D;padding:2px 8px;border-radius:4px;font-weight:700;">🌐 Trực tuyến 4G/5G</small>
          `;
          this.elements.lanAddressList.appendChild(publicPill);
        } else if (info.tunnelUrl) {
          activeTargetUrl = info.tunnelUrl;
          const tunnelPill = document.createElement('div');
          tunnelPill.className = 'lan-pill';
          tunnelPill.style.background = '#F0F9FF';
          tunnelPill.style.borderColor = '#7DD3FC';
          tunnelPill.style.cursor = 'pointer';
          tunnelPill.title = 'Bấm để hiển thị mã QR đường dẫn 4G/5G';
          tunnelPill.innerHTML = `
            <span style="font-weight:700;color:#0369A1;">${info.tunnelUrl}</span>
            <small style="background:#E0F2FE;color:#0284C7;padding:2px 8px;border-radius:4px;font-weight:700;">🌐 Dành cho 4G/5G Từ Xa</small>
          `;
          tunnelPill.addEventListener('click', () => {
            this.renderQrCode(info.tunnelUrl);
            this.showToast('📱 Đã đổi mã QR sang link 4G/5G Online');
          });
          this.elements.lanAddressList.appendChild(tunnelPill);
        }

        const primaryIp = (info.addresses && info.addresses.length > 0) ? info.addresses[0].ip : 'localhost';
        const wifiUrl = `http://${primaryIp}:${info.port || 3000}`;
        if (!activeTargetUrl) activeTargetUrl = wifiUrl;

        info.addresses.forEach(net => {
          const pill = document.createElement('div');
          pill.className = 'lan-pill';
          pill.style.cursor = 'pointer';
          pill.title = 'Bấm để đổi mã QR sang Wi-Fi nội bộ này';
          pill.innerHTML = `
            <span>http://${net.ip}:${info.port}</span>
            <small class="text-muted font-normal">${net.name} (Nội bộ)</small>
          `;
          pill.addEventListener('click', () => {
            this.renderQrCode(`http://${net.ip}:${info.port}`);
            this.showToast(`📶 Đã đổi mã QR sang Wi-Fi: ${net.ip}`);
          });
          this.elements.lanAddressList.appendChild(pill);
        });

        // Generate QR Code using QuickChart QR or SVG
        this.renderQrCode(activeTargetUrl);
      } else {
        throw new Error('Info API unreachable');
      }
    } catch (e) {
      this.elements.lanAddressList.innerHTML = `
        <div style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; text-align: left;">
          <div style="font-weight: 700; color: #991B1B; font-size: 0.9rem; margin-bottom: 4px;">
            ⚠️ Chưa phát hiện Server Node.js đang chạy
          </div>
          <p style="font-size: 0.83rem; color: #7F1D1D; margin: 0;">
            Hãy nhấp đúp file <b>start.bat</b> để khởi động máy chủ Wi-Fi xưởng.
          </p>
        </div>
      `;
      if (this.elements.qrCodeContainer) {
        this.elements.qrCodeContainer.innerHTML = `
          <div style="width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 8px; color: #64748B; font-size: 0.8rem; padding: 12px; text-align: center;">
            Chờ kết nối Server...
          </div>
        `;
      }
    }
  }

  renderQrCode(text) {
    const container = this.elements.qrCodeContainer;
    if (!container) return;
    // Generate clean Google Chart or QR API image
    const encoded = encodeURIComponent(text);
    container.innerHTML = `
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}" alt="QR Code" style="width:180px;height:180px;border-radius:8px;" onerror="this.onerror=null;this.src='https://chart.googleapis.com/chart?cht=qr&chs=180x180&chl=${encoded}';">
    `;
  }

  // ==========================================
  // DSSP PRODUCT MASTER MODAL
  // ==========================================
  openProductMasterModal() {
    this.elements.productMasterModal.classList.remove('hidden');
    if (this.elements.dsspSearchInput) {
      this.elements.dsspSearchInput.value = '';
    }
    this.renderDSSPTable('');
  }

  renderDSSPTable(query = '') {
    const tbody = this.elements.dsspTableBody;
    const products = window.productManager.search(query, 120);
    tbody.innerHTML = '';

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">Không tìm thấy sản phẩm nào khớp với từ khóa "${query}"</td></tr>`;
      return;
    }

    products.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-mono">${p.stt || (idx + 1)}</td>
        <td>
          <span class="product-code-tag">${p.code}</span>
          ${p.series ? `<span class="badge-series">${p.series}</span>` : ''}
        </td>
        <td>
          <div style="font-weight:700;">${p.name || '--'}</div>
          ${p.category ? `<small class="text-muted">${p.category}</small>` : ''}
        </td>
        <td class="text-center font-mono text-bold text-accent">${p.settingQty || 10}</td>
        <td class="text-center">
          <button type="button" class="btn-tool-pill btn-select-dssp">Chọn mã này</button>
        </td>
      `;

      tr.querySelector('.btn-select-dssp').addEventListener('click', () => {
        window.soundManager.playClick();
        this.selectProduct(p);
        this.elements.productMasterModal.classList.add('hidden');
      });

      tbody.appendChild(tr);
    });
  }

  async handleSaveNewProduct() {
    const code = this.elements.newProdCode.value.trim().toUpperCase();
    const name = this.elements.newProdName.value.trim();
    const settingQty = Number(this.elements.newProdSettingQty.value) || 10;

    if (!code) {
      this.showToast('Vui lòng nhập Mã Sản Phẩm!', 'error');
      return;
    }

    try {
      await window.productManager.save({ code, name, settingQty });
      this.showToast(`✅ Đã thêm sản phẩm ${code} vào DSSP!`, 'success');
      this.elements.newProdCode.value = '';
      this.elements.newProdName.value = '';
      this.renderDSSPTable();
      this.renderQuickProductChips();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    // Machine buttons
    this.elements.machineSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-touch-select');
      if (btn) {
        window.soundManager.playClick();
        const machine = btn.getAttribute('data-machine');
        this.setMachine(machine);
      }
    });

    // Shift buttons
    this.elements.shiftSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-shift-select');
      if (btn) {
        window.soundManager.playClick();
        const shift = btn.getAttribute('data-shift');
        this.setShift(shift, true);
      }
    });

    // Chamber buttons
    this.elements.chamberSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-chamber-select');
      if (btn) {
        window.soundManager.playClick();
        const chamber = btn.getAttribute('data-chamber');
        this.setChamber(chamber);
      }
    });

    // Product code typing & search
    this.elements.inputProductCode.addEventListener('input', (e) => this.handleProductInput(e));
    this.elements.inputProductCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = this.elements.inputProductCode.value.trim();
        if (val) {
          this.applyScannedProductCode(val);
        }
      }
    });
    this.elements.btnClearProduct.addEventListener('click', () => {
      window.soundManager.playClick();
      this.clearProduct();
    });

    // Global Barcode Scan Event (Dispatched by hardware gun, camera, or photo file scan)
    window.addEventListener('barcode-scanned', (e) => {
      if (e.detail && e.detail.code) {
        this.applyScannedProductCode(e.detail.code);
      }
    });

    // Close suggestion dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.product-input-wrapper')) {
        this.elements.productSuggestions.classList.add('hidden');
      }
    });

    // Touch Numpad buttons
    this.elements.touchNumpad.addEventListener('click', (e) => {
      const numBtn = e.target.closest('.btn-numpad');
      if (numBtn) {
        const val = numBtn.getAttribute('data-val');
        this.handleNumpadPress(val);
      }

      const quickBtn = e.target.closest('.btn-quick-add');
      if (quickBtn) {
        const addAmount = quickBtn.getAttribute('data-add');
        this.handleQuickAdd(addAmount);
      }
    });

    // Submit batch button
    this.elements.btnSubmitBatch.addEventListener('click', () => this.submitBatch());

    // Enter key submits batch
    document.addEventListener('keydown', (e) => {
      const isScannerOpen = this.elements.scannerModal && !this.elements.scannerModal.classList.contains('hidden');
      if (e.key === 'Enter' && !isScannerOpen) {
        if (document.activeElement === this.elements.inputQuantity) {
          e.preventDefault();
          this.submitBatch();
        }
      }
    });

    // Table Filters
    this.elements.filterShift.addEventListener('change', () => this.renderProductionTable());
    this.elements.filterMachine.addEventListener('change', () => this.renderProductionTable());

    // Export Excel Button
    this.elements.btnExportExcel.addEventListener('click', () => {
      window.soundManager.playClick();
      const filename = window.exportProductionToExcel(
        this.batches,
        window.productManager.getAll(),
        {
          date: new Date().toISOString().split('T')[0],
          month: new Date().toISOString().substring(0, 7),
          line: 'SMC3',
          stage: 'Shotblast',
          worker: 'V.T.Hiếu'
        }
      );
      this.showToast(`📊 Đã xuất file: ${filename}`, 'success');
    });

    // Scanner Modal
    this.elements.btnOpenScanner.addEventListener('click', () => {
      window.soundManager.playClick();
      window.barcodeScanner.start((scannedCode) => {
        this.applyScannedProductCode(scannedCode);
      });
    });

    // Tablet Connect Modal
    this.elements.btnConnectTablet.addEventListener('click', () => {
      window.soundManager.playClick();
      this.openConnectModal();
    });
    this.elements.btnCloseConnect.addEventListener('click', () => {
      this.elements.connectModal.classList.add('hidden');
    });

    // Product Master Modal
    this.elements.btnOpenProductMaster.addEventListener('click', () => {
      window.soundManager.playClick();
      this.openProductMasterModal();
    });
    this.elements.btnCloseProductMaster.addEventListener('click', () => {
      this.elements.productMasterModal.classList.add('hidden');
    });
    this.elements.btnSaveProduct.addEventListener('click', () => this.handleSaveNewProduct());

    // Edit Batch Modal
    this.elements.btnCloseEditBatch.addEventListener('click', () => {
      this.elements.editBatchModal.classList.add('hidden');
    });
    this.elements.btnCancelEdit.addEventListener('click', () => {
      this.elements.editBatchModal.classList.add('hidden');
    });
    this.elements.btnSaveEditBatch.addEventListener('click', () => this.saveEditBatch());

    // Nav Action Controls
    this.elements.btnToggleSound.addEventListener('click', () => {
      const enabled = window.soundManager.toggle();
      this.elements.btnToggleSound.classList.toggle('active', enabled);
      this.showToast(enabled ? '🔊 Đã bật âm thanh' : '🔇 Đã tắt âm thanh');
    });

    this.elements.btnToggleTheme.addEventListener('click', () => this.toggleTheme());
    this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Focus Tracking for Virtual Numpad
    this.elements.inputProductCode.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputProductCode;
    });
    this.elements.inputQuantity.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputQuantity;
    });

    // Clear All Batches (Shift Reset)
    if (this.elements.btnClearAllBatches) {
      this.elements.btnClearAllBatches.addEventListener('click', () => {
        window.soundManager.playClick();
        this.promptClearAllBatches();
      });
    }

    // Touch Delete Confirmation Modal Actions
    if (this.elements.btnConfirmDelete) {
      this.elements.btnConfirmDelete.addEventListener('click', () => this.executeConfirmDelete());
    }
    if (this.elements.btnCancelDelete) {
      this.elements.btnCancelDelete.addEventListener('click', () => {
        window.soundManager.playClick();
        this.elements.confirmDeleteModal.classList.add('hidden');
        this.pendingDelete = null;
      });
    }
    if (this.elements.btnCloseConfirmDelete) {
      this.elements.btnCloseConfirmDelete.addEventListener('click', () => {
        window.soundManager.playClick();
        this.elements.confirmDeleteModal.classList.add('hidden');
        this.pendingDelete = null;
      });
    }

    // Series Filter Tabs (MGP, MXS, MXQ, C1G, C96, NCA, CUJ)
    if (this.elements.seriesFilterTabs) {
      this.elements.seriesFilterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.series-tab');
        if (tab) {
          window.soundManager.playClick();
          this.elements.seriesFilterTabs.querySelectorAll('.series-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const cat = tab.getAttribute('data-cat');
          window.productManager.setCategoryFilter(cat);
          this.handleProductInput({ target: this.elements.inputProductCode });
        }
      });
    }

    // Real-Time Search in 861 DSSP Products Modal
    if (this.elements.dsspSearchInput) {
      this.elements.dsspSearchInput.addEventListener('input', (e) => {
        this.renderDSSPTable(e.target.value);
      });
    }
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.shotblastApp = new ShotblastApp();
  window.shotblastApp.init();
});
