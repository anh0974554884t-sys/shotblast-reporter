console.info('SHOTBLAST_APP_VERSION: 2026-10-30-shift-time-v6');
// ==========================================================================
// MAIN SHOPFLOOR APPLICATION LOGIC - SHOTBLAST MES (SMC3)
// 5-Step Ergonomic Workflow:
// Step 1: Chọn máy (SA01_SB01... cấu hình trong Cài đặt)
// Step 2: Người thao tác (Tên - MSNV, ưu tiên theo máy, quét thẻ/gõ)
// Step 3: Chọn ca (Ca 1, Ca 2, Ca 3 tự động nhận theo giờ, đổi tay)
// Step 4: Thời gian bắn (Bắt đầu & Dừng, nút "Bây giờ", validate Ca 3 qua 00:00)
// Step 5: Mã sản phẩm (quét/gõ/chips) & Buồng (1-6 compact) + Số lượng (Numpad + Lưu)
// ==========================================================================

class ShotblastApp {
  constructor() {
    this.batches = [];
    this.workers = [];
    this.machines = [
      'SA01_SB01',
      'SA01_SB02',
      'SA01_SB03',
      'SA01_SB04',
      'SA01_SB05',
      'LA02_SB01'
    ];
    this.currentMachine = 'SA01_SB01';
    this.currentWorker = null;
    this.currentShift = 1;
    this.currentChamber = '';
    this.isOnline = false;
    this.activePin = '';
    this.focusedInput = null;
    this.successCountdownTimer = null;
    this.editingWorkerId = null;

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
      btnOpenSettingsFromMenu: document.getElementById('btnOpenSettingsFromMenu'),
      btnToggleSound: document.getElementById('btnToggleSound'),
      soundLabel: document.getElementById('soundLabel'),
      btnToggleTheme: document.getElementById('btnToggleTheme'),
      btnFullscreen: document.getElementById('btnFullscreen'),

      // Step 1: Chọn máy
      machineSelector: document.getElementById('machineSelector'),
      inputMachine: document.getElementById('inputMachine'),
      btnOpenMachineSettings: document.getElementById('btnOpenMachineSettings'),

      // Step 2: Người thao tác
      btnOpenWorkerSettings: document.getElementById('btnOpenWorkerSettings'),
      operatorMachineHint: document.getElementById('operatorMachineHint'),
      operatorSearchGroup: document.getElementById('operatorSearchGroup'),
      inputOperatorSearch: document.getElementById('inputOperatorSearch'),
      btnClearOperator: document.getElementById('btnClearOperator'),
      operatorDropdownList: document.getElementById('operatorDropdownList'),
      operatorErrorAlert: document.getElementById('operatorErrorAlert'),
      workerVerifiedCard: document.getElementById('workerVerifiedCard'),
      workerNameDisplay: document.getElementById('workerNameDisplay'),
      workerIdDisplay: document.getElementById('workerIdDisplay'),
      workerMachineTag: document.getElementById('workerMachineTag'),
      btnChangeWorker: document.getElementById('btnChangeWorker'),
      inputWorkerName: document.getElementById('inputWorkerName'),
      inputWorkerId: document.getElementById('inputWorkerId'),

      // Step 3: Chọn ca
      shiftSelector: document.getElementById('shiftSelector'),
      inputShift: document.getElementById('inputShift'),
      shiftAutoBadge: document.getElementById('shiftAutoBadge'),

      // Step 4: Thời gian bắn
      inputStartTime: document.getElementById('inputStartTime'),
      btnStartTimeNow: document.getElementById('btnStartTimeNow'),
      inputEndTime: document.getElementById('inputEndTime'),
      btnEndTimeNow: document.getElementById('btnEndTimeNow'),
      shotDurationBadge: document.getElementById('shotDurationBadge'),
      timeValidationAlert: document.getElementById('timeValidationAlert'),

      // Step 5: Mã sản phẩm
      inputProductCode: document.getElementById('inputProductCode'),
      btnClearProduct: document.getElementById('btnClearProduct'),
      productSuggestions: document.getElementById('productSuggestions'),
      metaProductName: document.getElementById('metaProductName'),
      metaProductCode: document.getElementById('metaProductCode'),
      metaSettingQty: document.getElementById('metaSettingQty'),
      quickProductChips: document.getElementById('quickProductChips'),
      btnOpenScanner: document.getElementById('btnOpenScanner'),
      btnOpenProductMaster: document.getElementById('btnOpenProductMaster'),

      // Step 5 (tiếp theo): Buồng & Số lượng & Bàn phím số
      chamberSelector: document.getElementById('chamberSelector'),
      selectedChamberBadge: document.getElementById('selectedChamberBadge'),
      inputChamber: document.getElementById('inputChamber'),
      inputQuantity: document.getElementById('inputQuantity'),
      touchNumpad: document.getElementById('touchNumpad'),
      btnNumpadEnter: document.getElementById('btnNumpadEnter'),
      btnSubmitBatch: document.getElementById('btnSubmitBatch'),
      submitValidationHint: document.getElementById('submitValidationHint'),

      // Success Modal
      successModal: document.getElementById('successModal'),
      successTurnDisplay: document.getElementById('successTurnDisplay'),
      successProductDisplay: document.getElementById('successProductDisplay'),
      successQtyDisplay: document.getElementById('successQtyDisplay'),
      successTimeDisplay: document.getElementById('successTimeDisplay'),
      successWorkerDisplay: document.getElementById('successWorkerDisplay'),
      countdownProgress: document.getElementById('countdownProgress'),
      countdownSec: document.getElementById('countdownSec'),
      btnNextBatchNow: document.getElementById('btnNextBatchNow'),

      // Manager View: KPIs & Table
      btnOpenSettingsManager: document.getElementById('btnOpenSettingsManager'),
      kpiTotalQty: document.getElementById('kpiTotalQty'),
      kpiShift1Qty: document.getElementById('kpiShift1Qty'),
      kpiShift2Qty: document.getElementById('kpiShift2Qty'),
      kpiShift3Qty: document.getElementById('kpiShift3Qty'),
      kpiTotalTurns: document.getElementById('kpiTotalTurns'),
      nextTurnPreview: document.getElementById('nextTurnPreview'),
      kpiProgressBar: document.getElementById('kpiProgressBar'),
      kpiMachinesList: document.getElementById('kpiMachinesList'),
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

      // Edit Batch Modal
      editBatchModal: document.getElementById('editBatchModal'),
      btnCloseEditBatch: document.getElementById('btnCloseEditBatch'),
      btnCancelEdit: document.getElementById('btnCancelEdit'),
      btnSaveEditBatch: document.getElementById('btnSaveEditBatch'),
      editBatchId: document.getElementById('editBatchId'),
      editTurn: document.getElementById('editTurn'),
      editStartTime: document.getElementById('editStartTime'),
      editEndTime: document.getElementById('editEndTime'),
      editWorker: document.getElementById('editWorker'),
      editMachine: document.getElementById('editMachine'),
      editShift: document.getElementById('editShift'),
      editProductCode: document.getElementById('editProductCode'),
      editQuantity: document.getElementById('editQuantity'),
      editChamber: document.getElementById('editChamber'),

      // Settings Modal
      settingsModal: document.getElementById('settingsModal'),
      btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
      tabSettingsMachines: document.getElementById('tabSettingsMachines'),
      tabSettingsWorkers: document.getElementById('tabSettingsWorkers'),
      settingsContentMachines: document.getElementById('settingsContentMachines'),
      inputNewMachineCode: document.getElementById('inputNewMachineCode'),
      btnAddMachine: document.getElementById('btnAddMachine'),
      machinesTableBody: document.getElementById('machinesTableBody'),
      btnResetDefaultMachines: document.getElementById('btnResetDefaultMachines'),
      settingsContentWorkers: document.getElementById('settingsContentWorkers'),
      workerEditorTitle: document.getElementById('workerEditorTitle'),
      inputEditWorkerName: document.getElementById('inputEditWorkerName'),
      inputEditWorkerId: document.getElementById('inputEditWorkerId'),
      inputEditWorkerMachine: document.getElementById('inputEditWorkerMachine'),
      inputEditWorkerRole: document.getElementById('inputEditWorkerRole'),
      btnSaveWorker: document.getElementById('btnSaveWorker'),
      btnCancelEditWorker: document.getElementById('btnCancelEditWorker'),
      workersTableBody: document.getElementById('workersTableBody'),
      btnResetDefaultWorkers: document.getElementById('btnResetDefaultWorkers'),

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

    // 1. Load Machines
    await this.loadMachines();

    // 2. Load Workers
    await this.loadWorkers();

    // 3. Detect and set shift automatically according to current hour
    this.detectAndSetCurrentShift(false);

    // 4. Products (DSSP)
    if (window.productManager) {
      await window.productManager.init();
      this.renderQuickProductChips();
      this.renderDsspTable();
    }

    // 5. Batches data
    await this.loadBatches();
    this.updateNextTurnNumber();
    this.renderProductionTable();
    this.updateKPIs();

    // 6. Init Scanner
    if (typeof BarcodeScanner !== 'undefined') {
      window.scanner = new BarcodeScanner();
      window.scanner.init((scannedCode) => {
        this.applyScannedCode(scannedCode);
      });
    }

    // 7. Restore saved machine & operator
    const savedMachine = localStorage.getItem('shotblast_last_machine');
    if (savedMachine && this.machines.includes(savedMachine)) {
      this.selectMachine(savedMachine, false);
    } else if (this.machines.length > 0) {
      this.selectMachine(this.machines[0], false);
    }

    const savedWorkerId = localStorage.getItem('shotblast_last_operator_id');
    if (savedWorkerId) {
      const found = this.workers.find(w => String(w.id).trim().toUpperCase() === String(savedWorkerId).trim().toUpperCase());
      if (found) {
        this.selectOperator(found, false);
      }
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
  // STEP 1: MACHINES MANAGEMENT
  // ==========================================
  async loadMachines() {
    try {
      const res = await fetch('/api/machines');
      if (res.ok) {
        this.machines = await res.json();
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      const cached = localStorage.getItem('shotblast_machines');
      if (cached) {
        try { this.machines = JSON.parse(cached); } catch (ex) {}
      }
      if (!this.machines || this.machines.length === 0) {
        this.machines = ['SA01_SB01', 'SA01_SB02', 'SA01_SB03', 'SA01_SB04', 'SA01_SB05', 'LA02_SB01'];
      }
    }
    localStorage.setItem('shotblast_machines', JSON.stringify(this.machines));
    this.renderMachineButtons();
    this.updateMachineFilters();
  }

  renderMachineButtons() {
    const container = this.elements.machineSelector;
    if (!container) return;
    container.innerHTML = '';

    this.machines.forEach(code => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-machine-lg' + (code === this.currentMachine ? ' active' : '');
      btn.setAttribute('data-machine', code);
      btn.innerHTML = `<span>${code}</span>`;
      btn.addEventListener('click', () => {
        this.selectMachine(code, true);
      });
      container.appendChild(btn);
    });
  }

  selectMachine(code, autoPromptWorker = false) {
    if (!code) return;
    this.currentMachine = code;
    this.elements.inputMachine.value = code;

    // Update active state on buttons
    const btns = this.elements.machineSelector.querySelectorAll('.btn-machine-lg');
    btns.forEach(b => {
      if (b.getAttribute('data-machine') === code) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    localStorage.setItem('shotblast_last_machine', code);

    // Update hint at Step 2
    if (this.elements.operatorMachineHint) {
      this.elements.operatorMachineHint.textContent = `Ưu tiên người thuộc máy: ${code} (vẫn cho chọn người khác)`;
    }

    if (window.soundManager) window.soundManager.playClick();

    // If operator dropdown is open or search input is focused, refresh it
    if (!this.elements.operatorDropdownList.classList.contains('hidden')) {
      this.renderOperatorDropdown(this.elements.inputOperatorSearch.value);
    }

    // Check if current operator belongs to this machine
    if (this.currentWorker) {
      const matches = this.workerMatchesMachine(this.currentWorker, code);
      if (!matches && autoPromptWorker) {
        // Subtle hint or keep worker
        this.showToast(`ℹ️ Bạn vừa đổi sang ${code}. Người thao tác hiện tại (${this.currentWorker.name}) vẫn được giữ nguyên hoặc bấm "Đổi người" nếu cần.`, 'info');
      }
    }

    this.validateForm();
  }

  updateMachineFilters() {
    // Update filter dropdown in manager view
    const filter = this.elements.filterMachine;
    if (filter) {
      const currVal = filter.value;
      filter.innerHTML = '<option value="">Tất cả Máy</option>';
      this.machines.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        filter.appendChild(opt);
      });
      filter.value = currVal;
    }

    // Update edit machine select modal
    const editSelect = this.elements.editMachine;
    if (editSelect) {
      const currVal = editSelect.value;
      editSelect.innerHTML = '';
      this.machines.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        editSelect.appendChild(opt);
      });
      if (currVal) editSelect.value = currVal;
    }
  }

  // ==========================================
  // STEP 2: WORKER DATA & SELECTION
  // ==========================================
  async loadWorkers() {
    const DEFAULT_WORKERS = [
      { id: "02623124", name: "Nguyễn Công Hải", machines: ["SA01_SB02"], machine: "SA01_SB02", role: "Công nhân vận hành" },
      { id: "02620127", name: "Lê Duy Tuấn", machines: ["SA01_SB03", "SA01_SB04"], machine: "SA01_SB03, SA01_SB04", role: "Công nhân vận hành" },
      { id: "02524300", name: "Nguyễn Văn Kiên", machines: ["SA01_SB01", "SA01_SB02"], machine: "SA01_SB01, SA01_SB02", role: "Leader shotblast" },
      { id: "02526502", name: "Trịnh Trần Huỳnh Hiệp", machines: ["SA01_SB01", "SA01_SB02"], machine: "SA01_SB01, SA01_SB02", role: "Leader shotblast" },
      { id: "02623115", name: "Nguyễn Văn Sỹ", machines: ["SA01_SB01"], machine: "SA01_SB01", role: "Công nhân vận hành" },
      { id: "02620534", name: "Nguyễn Ngọc Tiến", machines: ["SA01_SB02"], machine: "SA01_SB02", role: "Công nhân vận hành" },
      { id: "02627625", name: "Nguyễn Hữu Nghĩa", machines: ["SA01_SB01", "SA01_SB02"], machine: "SA01_SB01, SA01_SB02", role: "Leader shotblast" },
      { id: "02629580", name: "Phan Nhật Trường", machines: ["SA01_SB01"], machine: "SA01_SB01", role: "Công nhân vận hành" },
      { id: "02629599", name: "Đặng Minh Phương Hiệp", machines: ["SA01_SB01"], machine: "SA01_SB01", role: "Công nhân vận hành" },
      { id: "02622295", name: "Nguyễn Hoàng Huy", machines: ["SA01_SB02"], machine: "SA01_SB02", role: "Công nhân vận hành" },
      { id: "02520340", name: "Lê Duy Hải", machines: ["SA01_SB03", "SA01_SB04"], machine: "SA01_SB03, SA01_SB04", role: "Công nhân vận hành" },
      { id: "02646462", name: "Nguyễn Nhất Tâm", machines: ["LA02_SB01"], machine: "LA02_SB01", role: "Công nhân vận hành" },
      { id: "02622462", name: "Huỳnh Chí Cường", machines: ["SA01_SB05"], machine: "SA01_SB05", role: "Công nhân vận hành" },
      { id: "02642721", name: "Trương Văn Thiện", machines: ["LA02_SB01"], machine: "LA02_SB01", role: "Công nhân vận hành" },
      { id: "02644589", name: "Phan Văn Tuyên", machines: ["SA01_SB03", "SA01_SB04"], machine: "SA01_SB03, SA01_SB04", role: "Công nhân vận hành" }
    ];

    try {
      const res = await fetch('/api/workers');
      if (res.ok) {
        this.workers = await res.json();
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      const cached = localStorage.getItem('shotblast_workers');
      if (cached) {
        try { this.workers = JSON.parse(cached); } catch (ex) {}
      }
      if (!this.workers || this.workers.length === 0) {
        this.workers = DEFAULT_WORKERS;
      }
    }
    localStorage.setItem('shotblast_workers', JSON.stringify(this.workers));
  }

  workerMatchesMachine(worker, machineCode) {
    if (!worker || !machineCode) return false;
    const target = machineCode.toUpperCase();
    const shortTarget = target.replace(/^(SA01_|LA02_)/, ''); // e.g. SB01, SB02

    if (Array.isArray(worker.machines)) {
      if (worker.machines.some(m => {
        const mc = String(m).toUpperCase();
        return mc === target || mc === shortTarget || mc.includes(shortTarget);
      })) {
        return true;
      }
    }

    if (worker.machine) {
      const wm = String(worker.machine).toUpperCase();
      if (wm === target || wm === shortTarget || wm.includes(shortTarget)) {
        return true;
      }
    }
    return false;
  }

  renderOperatorDropdown(query = '') {
    const listEl = this.elements.operatorDropdownList;
    if (!listEl) return;
    listEl.innerHTML = '';

    const q = String(query || '').trim().toUpperCase();
    let filtered = this.workers;
    if (q) {
      filtered = this.workers.filter(w => {
        const nameUpper = String(w.name || '').toUpperCase();
        const idUpper = String(w.id || '').toUpperCase();
        const machUpper = String(w.machine || '').toUpperCase();
        return nameUpper.includes(q) || idUpper.includes(q) || machUpper.includes(q);
      });
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Không tìm thấy người thao tác phù hợp với từ khóa "${query}"
        </div>
      `;
      listEl.classList.remove('hidden');
      return;
    }

    // Separate into: Preferred (belonging to current machine) and Others
    const preferred = [];
    const others = [];

    filtered.forEach(w => {
      if (this.workerMatchesMachine(w, this.currentMachine)) {
        preferred.push(w);
      } else {
        others.push(w);
      }
    });

    const createItemNode = (w, isMatch) => {
      const item = document.createElement('div');
      item.className = 'operator-dropdown-item' + (isMatch ? ' match-machine' : '');
      const machDisplay = Array.isArray(w.machines) ? w.machines.join(', ') : (w.machine || '--');
      item.innerHTML = `
        <div>
          <div class="operator-item-name">${w.name}</div>
          <div class="operator-item-sub">MSNV: ${w.id} · Máy: ${machDisplay}</div>
        </div>
        <div>
          <span class="operator-item-badge ${isMatch ? 'badge-match' : ''}">
            ${isMatch ? '⭐ Máy ' + this.currentMachine : machDisplay}
          </span>
        </div>
      `;
      item.addEventListener('click', () => {
        this.selectOperator(w, true);
      });
      return item;
    };

    // Render Preferred Group
    if (preferred.length > 0) {
      const header = document.createElement('div');
      header.className = 'operator-group-title';
      header.textContent = `⭐ Người thuộc máy ${this.currentMachine} (${preferred.length})`;
      listEl.appendChild(header);

      preferred.forEach(w => {
        listEl.appendChild(createItemNode(w, true));
      });
    }

    // Render Others Group
    if (others.length > 0) {
      const header = document.createElement('div');
      header.className = 'operator-group-title';
      header.textContent = `👥 Người thao tác khác (${others.length})`;
      listEl.appendChild(header);

      others.forEach(w => {
        listEl.appendChild(createItemNode(w, false));
      });
    }

    listEl.classList.remove('hidden');
  }

  selectOperator(worker, autoFocusNext = true) {
    if (!worker) return;
    this.currentWorker = worker;
    this.elements.inputWorkerName.value = worker.name;
    this.elements.inputWorkerId.value = worker.id;

    // Update verified card
    this.elements.workerNameDisplay.textContent = worker.name;
    this.elements.workerIdDisplay.textContent = `MSNV: ${worker.id}`;
    const machDisplay = Array.isArray(worker.machines) ? worker.machines.join(', ') : (worker.machine || '--');
    this.elements.workerMachineTag.textContent = `Máy ưu tiên: ${machDisplay}`;

    // Hide input group & dropdown, show verified card
    this.elements.operatorSearchGroup.classList.add('hidden');
    this.elements.operatorDropdownList.classList.add('hidden');
    this.elements.operatorErrorAlert.classList.add('hidden');
    this.elements.workerVerifiedCard.classList.remove('hidden');

    localStorage.setItem('shotblast_last_operator_id', worker.id);
    if (window.soundManager) window.soundManager.playClick();

    if (autoFocusNext) {
      // Focus start time or product code
      setTimeout(() => {
        if (!this.elements.inputStartTime.value) {
          this.elements.inputStartTime.focus();
          this.focusedInput = this.elements.inputStartTime;
        } else {
          this.elements.inputProductCode.focus();
          this.focusedInput = this.elements.inputProductCode;
        }
      }, 150);
    }

    this.validateForm();
  }

  clearOperator() {
    this.currentWorker = null;
    this.elements.inputWorkerName.value = '';
    this.elements.inputWorkerId.value = '';
    this.elements.inputOperatorSearch.value = '';
    this.elements.workerVerifiedCard.classList.add('hidden');
    this.elements.operatorSearchGroup.classList.remove('hidden');
    this.elements.operatorErrorAlert.classList.add('hidden');
    localStorage.removeItem('shotblast_last_operator_id');

    setTimeout(() => {
      this.elements.inputOperatorSearch.focus();
      this.focusedInput = this.elements.inputOperatorSearch;
      this.renderOperatorDropdown('');
    }, 100);

    this.validateForm();
  }

  checkOperatorInput(val) {
    const raw = String(val || '').trim();
    if (!raw) {
      this.renderOperatorDropdown('');
      return;
    }

    // Check exact match on MSNV (e.g. from Barcode scan or direct numeric typing)
    const exactMatch = this.workers.find(w => String(w.id).trim().toUpperCase() === raw.toUpperCase());
    if (exactMatch) {
      this.selectOperator(exactMatch, true);
      this.showToast(`✅ Đã nhận diện người thao tác: ${exactMatch.name}`);
      return;
    }

    this.renderOperatorDropdown(raw);
  }

  // ==========================================
  // STEP 3: SHIFT SELECTION & AUTO-DETECT
  // ==========================================
  detectAndSetCurrentShift(notify = false) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    let shift = 1;
    // Ca 1: 06:00 to 14:00 (360 <= totalMinutes < 840)
    if (totalMinutes >= 360 && totalMinutes < 840) {
      shift = 1;
    }
    // Ca 2: 14:00 to 22:00 (840 <= totalMinutes < 1320)
    else if (totalMinutes >= 840 && totalMinutes < 1320) {
      shift = 2;
    }
    // Ca 3: 22:00 to 06:00 (totalMinutes >= 1320 or totalMinutes < 360)
    else {
      shift = 3;
    }

    this.selectShift(shift, false);
    if (notify) {
      this.showToast(`⚡ Tự động nhận diện ${this.getShiftLabel(shift)} theo giờ hiện tại`, 'info');
    }
  }

  selectShift(shiftNum, isManual = true) {
    this.currentShift = Number(shiftNum) || 1;
    this.elements.inputShift.value = this.currentShift;

    // Update active button
    const btns = this.elements.shiftSelector.querySelectorAll('.btn-shift-pill');
    btns.forEach(b => {
      if (Number(b.getAttribute('data-shift')) === this.currentShift) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (this.elements.shiftAutoBadge) {
      this.elements.shiftAutoBadge.textContent = isManual ? '✓ Đã chọn tay' : '⚡ Tự nhận theo giờ';
      this.elements.shiftAutoBadge.style.background = isManual ? '#E0E7FF' : '#DCFCE7';
      this.elements.shiftAutoBadge.style.color = isManual ? '#3730A3' : '#166534';
    }

    if (window.soundManager) window.soundManager.playClick();
    if (this.elements.inputStartTime.value) this.normalizeShiftTimeInput(this.elements.inputStartTime, false);
    if (this.elements.inputEndTime.value) this.normalizeShiftTimeInput(this.elements.inputEndTime, false);
    this.validateShotTimes();
    this.validateForm();
  }

  getShiftLabel(shift) {
    if (shift === 1) return 'Ca 1 (06:00–14:00)';
    if (shift === 2) return 'Ca 2 (14:00–22:00)';
    return 'Ca 3 (22:00–06:00)';
  }

  // ==========================================
  // STEP 4: SHOT TIMES (START & END) & VALIDATION
  // ==========================================
  getShiftWindow() {
    if (this.currentShift === 1) return { start: 360, end: 840, label: 'Ca 1 (06:00–14:00)' };
    if (this.currentShift === 2) return { start: 840, end: 1320, label: 'Ca 2 (14:00–22:00)' };
    return { start: 1320, end: 1800, label: 'Ca 3 (22:00–06:00)' };
  }

  parseShiftTime(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return { valid: false, empty: true };

    let hour;
    let minute;
    if (raw.includes(':')) {
      const parts = raw.split(':');
      if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) {
        return { valid: false, message: 'Giờ không đúng định dạng' };
      }
      hour = Number(parts[0]);
      minute = Number(parts[1]);
    } else {
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 3 || digits.length > 4) {
        return { valid: false, message: 'Nhập 3–4 số, ví dụ 245 hoặc 1445' };
      }
      hour = Number(digits.slice(0, -2));
      minute = Number(digits.slice(-2));
    }

    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) {
      return { valid: false, message: 'Giờ hoặc phút không hợp lệ' };
    }

    const windowInfo = this.getShiftWindow();
    const base = hour * 60 + minute;
    const candidates = [];
    const add = value => { if (!candidates.includes(value)) candidates.push(value); };

    add(base);
    // Giờ 1–11 được hiểu theo ca. Ví dụ Ca 2: 2:45 → 14:45.
    if (hour >= 1 && hour <= 11) add(base + 720);
    // Ca 3: giờ sau nửa đêm thuộc ngày kế tiếp.
    if (base < 360) add(base + 1440);
    if (hour >= 10 && hour <= 11) add(base + 720);

    const absoluteMinutes = candidates.find(value =>
      value >= windowInfo.start && value < windowInfo.end
    );

    if (absoluteMinutes === undefined) {
      return { valid: false, message: `${raw} không thuộc ${windowInfo.label}` };
    }

    const displayMinutes = absoluteMinutes % 1440;
    const hh = String(Math.floor(displayMinutes / 60)).padStart(2, '0');
    const mm = String(displayMinutes % 60).padStart(2, '0');
    return { valid: true, value: `${hh}:${mm}`, absoluteMinutes };
  }

  normalizeShiftTimeInput(input, showMessage = true) {
    const parsed = this.parseShiftTime(input.value);
    if (parsed.valid) {
      input.value = parsed.value;
      input.dataset.absoluteMinutes = String(parsed.absoluteMinutes);
      input.classList.remove('input-error');
      return parsed;
    }
    delete input.dataset.absoluteMinutes;
    if (!parsed.empty) {
      input.classList.add('input-error');
      if (showMessage) this.showToast(`⚠️ ${parsed.message}`, 'warn');
    }
    return parsed;
  }

  setTimeNow(field) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (field === 'start') {
      this.elements.inputStartTime.value = timeStr;
    } else if (field === 'end') {
      this.elements.inputEndTime.value = timeStr;
    }

    if (window.soundManager) window.soundManager.playClick();
    this.validateShotTimes();
    this.validateForm();
  }

  validateShotTimes() {
    const startInput = this.elements.inputStartTime;
    const endInput = this.elements.inputEndTime;
    const alertEl = this.elements.timeValidationAlert;
    const badgeEl = this.elements.shotDurationBadge;

    const startParsed = this.parseShiftTime(startInput.value);
    const endParsed = this.parseShiftTime(endInput.value);

    if (!startInput.value || !endInput.value) {
      if (alertEl) alertEl.classList.add('hidden');
      if (badgeEl) badgeEl.classList.add('hidden');
      return { valid: false, message: 'Vui lòng nhập cả giờ Bắt đầu và Dừng' };
    }

    if (!startParsed.valid || !endParsed.valid) {
      const message = !startParsed.valid ? startParsed.message : endParsed.message;
      if (alertEl) {
        alertEl.textContent = `⚠️ ${message}`;
        alertEl.classList.remove('hidden');
      }
      if (badgeEl) badgeEl.classList.add('hidden');
      return { valid: false, message };
    }

    if (endParsed.absoluteMinutes <= startParsed.absoluteMinutes) {
      const message = 'Giờ Dừng phải lớn hơn giờ Bắt đầu trong cùng ca';
      if (alertEl) {
        alertEl.textContent = `⚠️ ${message}`;
        alertEl.classList.remove('hidden');
      }
      if (badgeEl) badgeEl.classList.add('hidden');
      return { valid: false, message };
    }

    const duration = endParsed.absoluteMinutes - startParsed.absoluteMinutes;
    if (alertEl) alertEl.classList.add('hidden');
    if (badgeEl) {
      badgeEl.textContent = `Thời lượng: ${duration} phút`;
      badgeEl.classList.remove('hidden');
    }
    return { valid: true, duration };
  }

  // ==========================================
  // STEP 5: PRODUCT & QUANTITY & NUMPAD
  // ==========================================
  renderQuickProductChips() {
    if (!window.productManager) return;
    const container = this.elements.quickProductChips;
    if (!container) return;
    container.innerHTML = '';

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
    this.elements.inputQuantity.value = '';

    this.elements.productSuggestions.classList.add('hidden');
    if (window.soundManager) window.soundManager.playClick();

    setTimeout(() => {
      this.elements.inputQuantity.focus();
      this.focusedInput = this.elements.inputQuantity;
    }, 100);

    this.validateForm();
  }

  applyScannedCode(scannedCode) {
    if (!scannedCode) return;
    const raw = String(scannedCode).trim();
    const clean = raw.replace(/^[\*\$\"\']/, '').replace(/[\*\$\"\']$/, '').trim();

    // Check if worker ID
    const workerMatch = this.workers.find(w => String(w.id).trim().toUpperCase() === clean.toUpperCase());
    if (workerMatch) {
      this.selectOperator(workerMatch, true);
      this.showToast(`✅ Đã nhận diện người thao tác: ${workerMatch.name}`, 'success');
      return;
    }

    // Otherwise check product code
    this.applyScannedProductCode(clean);
  }

  applyScannedProductCode(clean) {
    let foundProd = null;
    if (window.productManager && window.productManager.products) {
      foundProd = window.productManager.findByCode(clean);

      if (!foundProd) {
        const strippedClean = clean.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        foundProd = window.productManager.products.find(p => p.code.replace(/[^A-Z0-9]/gi, '').toUpperCase() === strippedClean);
      }

      if (!foundProd) {
        const tokens = clean.split(/[\r\n\t\|,;#\/]+/).map(t => t.trim()).filter(Boolean);
        for (const tok of tokens) {
          const normalizedTok = tok.replace(/^(1P|P\/N|PN|PART|CODE)[\s\:\-]?/i, '').trim();
          const p = window.productManager.findByCode(normalizedTok);
          if (p) { foundProd = p; break; }
        }
      }

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
    const val = (e && e.target) ? e.target.value.trim() : this.elements.inputProductCode.value.trim();
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
    this.elements.inputQuantity.value = '';
  }

  setChamber(chamber) {
    this.currentChamber = String(chamber);
    this.elements.inputChamber.value = this.currentChamber;

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

  handleNumpad(val) {
    if (window.soundManager) window.soundManager.playClick();
    const targetInput = this.elements.inputQuantity;
    this.focusedInput = targetInput;
    let currentVal = targetInput.value || '';

    if (val === 'clear') {
      targetInput.value = '';
    } else if (val === 'backspace') {
      targetInput.value = currentVal.slice(0, -1);
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
  // FORM VALIDATION & SUBMISSION (ALL 5 STEPS)
  // ==========================================
  validateForm() {
    const hasMachine = Boolean(this.currentMachine);
    const hasWorker = Boolean(this.currentWorker && this.elements.inputWorkerName.value);
    const hasShift = Boolean(this.currentShift);
    const timeStatus = this.validateShotTimes();
    const hasProduct = Boolean(this.elements.inputProductCode.value.trim());
    const hasChamber = Boolean(this.currentChamber);
    const qty = Number(this.elements.inputQuantity.value) || 0;

    const isValid = (hasMachine && hasWorker && hasShift && timeStatus.valid && hasProduct && hasChamber && qty > 0);

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
        if (!hasMachine) {
          this.elements.submitValidationHint.textContent = 'Bước 1: Vui lòng chọn Máy bắn bi';
        } else if (!hasWorker) {
          this.elements.submitValidationHint.textContent = 'Bước 2: Vui lòng chọn Người thao tác';
        } else if (!hasShift) {
          this.elements.submitValidationHint.textContent = 'Bước 3: Vui lòng chọn Ca làm việc';
        } else if (!this.elements.inputStartTime.value || !this.elements.inputEndTime.value) {
          this.elements.submitValidationHint.textContent = 'Bước 4: Vui lòng nhập giờ Bắt đầu và Dừng';
        } else if (!timeStatus.valid) {
          this.elements.submitValidationHint.textContent = 'Bước 4: Giờ Dừng phải lớn hơn giờ Bắt đầu!';
        } else if (!hasProduct) {
          this.elements.submitValidationHint.textContent = 'Bước 5: Vui lòng quét hoặc nhập Mã sản phẩm';
        } else if (!hasChamber) {
          this.elements.submitValidationHint.textContent = 'Bước 5: Vui lòng chọn Số buồng máy (1 – 6 buồng)';
        } else if (qty <= 0) {
          this.elements.submitValidationHint.textContent = 'Bước 5: Vui lòng nhập Số lượng xử lý (> 0 PCS)';
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
    if (!this.currentMachine) {
      this.showToast('⚠️ Bước 1: Vui lòng chọn Máy bắn bi!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      this.highlightField(this.elements.machineSelector);
      return;
    }

    if (!this.currentWorker || !this.elements.inputWorkerName.value) {
      this.showToast('⚠️ Bước 2: Vui lòng chọn Người thao tác!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      this.elements.operatorSearchGroup.classList.remove('hidden');
      this.elements.inputOperatorSearch.focus();
      this.focusedInput = this.elements.inputOperatorSearch;
      this.highlightField(this.elements.inputOperatorSearch);
      this.renderOperatorDropdown('');
      return;
    }

    const timeStatus = this.validateShotTimes();
    if (!this.elements.inputStartTime.value || !this.elements.inputEndTime.value) {
      this.showToast('⚠️ Bước 4: Vui lòng nhập giờ Bắt đầu và Dừng!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      if (!this.elements.inputStartTime.value) {
        this.elements.inputStartTime.focus();
        this.highlightField(this.elements.inputStartTime);
      } else {
        this.elements.inputEndTime.focus();
        this.highlightField(this.elements.inputEndTime);
      }
      return;
    }

    if (!timeStatus.valid) {
      this.showToast('⚠️ Bước 4: Giờ Dừng phải lớn hơn giờ Bắt đầu!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      this.highlightField(this.elements.inputEndTime);
      return;
    }

    const productCode = this.elements.inputProductCode.value.trim().toUpperCase();
    if (!productCode) {
      this.showToast('⚠️ Bước 5: Vui lòng quét hoặc nhập Mã sản phẩm!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      this.elements.inputProductCode.focus();
      this.focusedInput = this.elements.inputProductCode;
      this.highlightField(this.elements.inputProductCode);
      return;
    }

    if (!this.currentChamber) {
      this.showToast('⚠️ Bước 5: Vui lòng chọn Số buồng máy (1 – 6 buồng)!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      this.highlightField(this.elements.chamberSelector);
      return;
    }

    const qty = Number(this.elements.inputQuantity.value) || 0;
    if (qty <= 0) {
      this.showToast('⚠️ Bước 5: Vui lòng nhập Số lượng xử lý (> 0 PCS)!', 'warn');
      if (window.soundManager) window.soundManager.playError();
      this.elements.inputQuantity.focus();
      this.focusedInput = this.elements.inputQuantity;
      this.highlightField(this.elements.inputQuantity);
      return;
    }

    const nextTurn = this.getNextTurnNumber();
    const productName = this.elements.metaProductName.textContent;
    const chamber = Number(this.currentChamber) || 1;
    const settingQty = (this.elements.metaSettingQty && this.elements.metaSettingQty.textContent && this.elements.metaSettingQty.textContent !== '--') 
      ? Number(this.elements.metaSettingQty.textContent) 
      : qty;
    const workerName = this.currentWorker.name;
    const workerId = this.currentWorker.id;
    const shift = Number(this.currentShift) || 1;
    const machine = this.currentMachine || 'SA01_SB01';
    const startTime = this.elements.inputStartTime.value;
    const endTime = this.elements.inputEndTime.value;

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
      startTime: startTime,
      endTime: endTime,
      productCode: productCode,
      quantity: qty,
      chamber: chamber,
      settingQty: settingQty,
      worker: workerName,
      operator: workerName,
      operatorId: workerId,
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
      quantity: qty,
      chamber: chamber,
      machine: machine,
      shift: shift,
      startTime: startTime,
      endTime: endTime,
      worker: workerName
    });
  }

  showSuccessModal(info) {
    this.elements.successTurnDisplay.textContent = `#${info.turn}`;
    this.elements.successProductDisplay.textContent = `${info.productName} (${info.productCode})`;
    this.elements.successQtyDisplay.textContent = `${info.quantity} PCS · Buồng ${info.chamber}`;
    if (this.elements.successTimeDisplay) {
      this.elements.successTimeDisplay.textContent = `${info.startTime} – ${info.endTime}`;
    }
    this.elements.successWorkerDisplay.textContent = `${info.worker} · ${info.machine} (${this.getShiftLabel(info.shift)})`;

    this.elements.successModal.classList.remove('hidden');

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
    // Retain Machine, Operator, Shift!
    // Ergonomic speed: Set next Start Time = previous End Time!
    const lastEndTime = this.elements.inputEndTime.value;
    if (lastEndTime) {
      this.elements.inputStartTime.value = lastEndTime;
    }
    this.elements.inputEndTime.value = '';
    if (this.elements.shotDurationBadge) this.elements.shotDurationBadge.classList.add('hidden');

    this.clearProductBanner();
    this.elements.productSuggestions.classList.add('hidden');

    // Focus product code ready for next shot
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

    // Sort descending by turn
    list.sort((a, b) => (b.turn || 0) - (a.turn || 0));

    let totalFilteredQty = 0;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted" style="padding: 24px;">Chưa có lượt sản lượng nào được ghi nhận.</td></tr>`;
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
          <td class="font-mono text-sm">${b.startTime || '--'}</td>
          <td class="font-mono text-sm">${b.endTime || '--'}</td>
          <td><span class="badge-tag tag-shift">Ca ${b.shift}</span></td>
          <td><span class="badge-tag tag-machine">${b.machine || '--'}</span></td>
          <td class="font-mono text-bold">${b.productCode}</td>
          <td class="col-yellow font-mono text-bold text-accent">${Number(b.quantity).toLocaleString()}</td>
          <td class="col-yellow">${b.chamber} Buồng</td>
          <td class="font-mono text-sm">${b.settingQty || '--'}</td>
          <td class="text-sm font-semibold">${b.operator || b.worker || '--'}</td>
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
    const machineCounts = {};

    this.machines.forEach(m => { machineCounts[m] = 0; });

    todayBatches.forEach(b => {
      const q = Number(b.quantity) || 0;
      totalQty += q;
      if (b.shift === 1) s1 += q;
      else if (b.shift === 2) s2 += q;
      else if (b.shift === 3) s3 += q;

      if (b.machine) {
        machineCounts[b.machine] = (machineCounts[b.machine] || 0) + 1;
      }
    });

    if (this.elements.kpiTotalQty) this.elements.kpiTotalQty.textContent = totalQty.toLocaleString();
    if (this.elements.kpiShift1Qty) this.elements.kpiShift1Qty.textContent = s1.toLocaleString();
    if (this.elements.kpiShift2Qty) this.elements.kpiShift2Qty.textContent = s2.toLocaleString();
    if (this.elements.kpiShift3Qty) this.elements.kpiShift3Qty.textContent = s3.toLocaleString();
    if (this.elements.kpiTotalTurns) this.elements.kpiTotalTurns.textContent = todayBatches.length;

    if (this.elements.kpiMachinesList) {
      this.elements.kpiMachinesList.innerHTML = '';
      this.machines.forEach(m => {
        const tag = document.createElement('span');
        tag.className = 'machine-tag';
        tag.innerHTML = `<b>${m}: ${machineCounts[m] || 0} lượt</b>`;
        this.elements.kpiMachinesList.appendChild(tag);
      });
    }

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
    this.elements.editStartTime.value = b.startTime || '';
    this.elements.editEndTime.value = b.endTime || '';
    this.elements.editWorker.value = b.operator || b.worker || '';
    this.elements.editMachine.value = b.machine || this.machines[0];
    this.elements.editShift.value = b.shift || 1;
    this.elements.editProductCode.value = b.productCode || '';
    this.elements.editQuantity.value = b.quantity || '';
    this.elements.editChamber.value = b.chamber || 1;
    this.elements.editBatchModal.classList.remove('hidden');
  }

  async saveEditBatch() {
    const id = this.elements.editBatchId.value;
    const payload = {
      machine: this.elements.editMachine.value,
      shift: Number(this.elements.editShift.value),
      startTime: this.elements.editStartTime.value,
      endTime: this.elements.editEndTime.value,
      worker: this.elements.editWorker.value.trim(),
      operator: this.elements.editWorker.value.trim(),
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
        <div><b>Thời gian:</b> ${b.startTime || '--'} – ${b.endTime || '--'}</div>
        <div><b>Máy & Ca:</b> ${b.machine} · Ca ${b.shift}</div>
        <div><b>Người thao tác:</b> ${b.operator || b.worker}</div>
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
  // SETTINGS MODAL: MACHINES & WORKERS
  // ==========================================
  openSettingsModal(tab = 'machines') {
    this.elements.settingsModal.classList.remove('hidden');
    this.switchSettingsTab(tab);
  }

  switchSettingsTab(tab) {
    if (tab === 'machines') {
      this.elements.tabSettingsMachines.classList.add('active');
      this.elements.tabSettingsWorkers.classList.remove('active');
      this.elements.settingsContentMachines.classList.remove('hidden');
      this.elements.settingsContentWorkers.classList.add('hidden');
      this.renderMachinesSettingsTable();
    } else {
      this.elements.tabSettingsWorkers.classList.add('active');
      this.elements.tabSettingsMachines.classList.remove('active');
      this.elements.settingsContentWorkers.classList.remove('hidden');
      this.elements.settingsContentMachines.classList.add('hidden');
      this.renderWorkersSettingsTable();
    }
  }

  renderMachinesSettingsTable() {
    const tbody = this.elements.machinesTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';

    this.machines.forEach((code, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-mono">${idx + 1}</td>
        <td><b class="font-mono text-accent">${code}</b></td>
        <td>
          <button type="button" class="btn-action-icon btn-del" title="Xóa máy">🗑️</button>
        </td>
      `;
      tr.querySelector('.btn-del').addEventListener('click', () => {
        this.deleteMachine(code);
      });
      tbody.appendChild(tr);
    });
  }

  async addMachine() {
    const code = (this.elements.inputNewMachineCode.value || '').trim().toUpperCase();
    if (!code) {
      alert('Vui lòng nhập mã máy hợp lệ!');
      return;
    }
    if (this.machines.includes(code)) {
      alert('Mã máy này đã tồn tại!');
      return;
    }

    this.machines.push(code);
    this.elements.inputNewMachineCode.value = '';
    await this.persistMachines();
    this.renderMachinesSettingsTable();
    this.renderMachineButtons();
    this.updateMachineFilters();
    this.showToast(`✅ Đã thêm máy ${code}!`);
  }

  async deleteMachine(code) {
    if (this.machines.length <= 1) {
      alert('Hệ thống phải có ít nhất 1 mã máy!');
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa mã máy ${code}?`)) return;

    this.machines = this.machines.filter(m => m !== code);
    if (this.currentMachine === code) {
      this.selectMachine(this.machines[0], false);
    }
    await this.persistMachines();
    this.renderMachinesSettingsTable();
    this.renderMachineButtons();
    this.updateMachineFilters();
    this.showToast(`🗑️ Đã xóa máy ${code}!`);
  }

  async resetDefaultMachines() {
    if (!confirm('Khôi phục danh sách máy về mặc định ban đầu?')) return;
    this.machines = ['SA01_SB01', 'SA01_SB02', 'SA01_SB03', 'SA01_SB04', 'SA01_SB05', 'LA02_SB01'];
    await this.persistMachines();
    this.renderMachinesSettingsTable();
    this.renderMachineButtons();
    this.updateMachineFilters();
    this.showToast('↺ Đã khôi phục danh sách máy mặc định!');
  }

  async persistMachines() {
    localStorage.setItem('shotblast_machines', JSON.stringify(this.machines));
    try {
      await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machines: this.machines })
      });
    } catch (e) {}
  }

  renderWorkersSettingsTable() {
    const tbody = this.elements.workersTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';

    this.workers.forEach((w, idx) => {
      const tr = document.createElement('tr');
      const machDisplay = Array.isArray(w.machines) ? w.machines.join(', ') : (w.machine || '--');
      tr.innerHTML = `
        <td class="font-mono">${idx + 1}</td>
        <td><b>${w.name}</b></td>
        <td class="font-mono text-bold text-accent">${w.id}</td>
        <td><span class="badge-tag tag-machine">${machDisplay}</span></td>
        <td class="text-sm">${w.role || 'Vận hành'}</td>
        <td>
          <button type="button" class="btn-action-icon btn-edit" title="Sửa thông tin">✏️</button>
          <button type="button" class="btn-action-icon btn-del" title="Xóa người">🗑️</button>
        </td>
      `;
      tr.querySelector('.btn-edit').addEventListener('click', () => {
        this.startEditWorker(w);
      });
      tr.querySelector('.btn-del').addEventListener('click', () => {
        this.deleteWorkerInSettings(w.id);
      });
      tbody.appendChild(tr);
    });
  }

  startEditWorker(w) {
    this.editingWorkerId = w.id;
    this.elements.workerEditorTitle.textContent = `Chỉnh sửa: ${w.name} (${w.id})`;
    this.elements.inputEditWorkerName.value = w.name;
    this.elements.inputEditWorkerId.value = w.id;
    this.elements.inputEditWorkerId.readOnly = true; // Lock ID during edit
    this.elements.inputEditWorkerMachine.value = Array.isArray(w.machines) ? w.machines.join(', ') : (w.machine || '');
    this.elements.inputEditWorkerRole.value = w.role || 'Công nhân vận hành';
    this.elements.btnCancelEditWorker.classList.remove('hidden');
  }

  cancelEditWorker() {
    this.editingWorkerId = null;
    this.elements.workerEditorTitle.textContent = 'Thêm người thao tác mới';
    this.elements.inputEditWorkerName.value = '';
    this.elements.inputEditWorkerId.value = '';
    this.elements.inputEditWorkerId.readOnly = false;
    this.elements.inputEditWorkerMachine.value = '';
    this.elements.inputEditWorkerRole.value = '';
    this.elements.btnCancelEditWorker.classList.add('hidden');
  }

  async saveWorkerInSettings() {
    const name = (this.elements.inputEditWorkerName.value || '').trim();
    const id = (this.elements.inputEditWorkerId.value || '').trim();
    const rawMach = (this.elements.inputEditWorkerMachine.value || '').trim();
    const role = (this.elements.inputEditWorkerRole.value || '').trim() || 'Công nhân vận hành';

    if (!name || !id) {
      alert('Vui lòng nhập Họ tên và Mã số nhân viên (MSNV)!');
      return;
    }

    const machArr = rawMach ? rawMach.split(/[,;\s]+/).filter(Boolean) : ['SA01_SB01'];
    const payload = {
      id: id,
      name: name,
      machines: machArr,
      machine: machArr.join(', '),
      role: role
    };

    try {
      await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}

    const existingIdx = this.workers.findIndex(w => String(w.id).toUpperCase() === id.toUpperCase());
    if (existingIdx >= 0) {
      this.workers[existingIdx] = { ...this.workers[existingIdx], ...payload };
    } else {
      this.workers.push(payload);
    }
    localStorage.setItem('shotblast_workers', JSON.stringify(this.workers));

    // If current selected worker was edited, update
    if (this.currentWorker && String(this.currentWorker.id).toUpperCase() === id.toUpperCase()) {
      this.selectOperator(payload, false);
    }

    this.cancelEditWorker();
    this.renderWorkersSettingsTable();
    this.showToast(`💾 Đã lưu thông tin ${name}!`);
  }

  async deleteWorkerInSettings(id) {
    if (!confirm(`Bạn có chắc muốn xóa người thao tác có MSNV: ${id}?`)) return;

    try {
      await fetch(`/api/workers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {}

    this.workers = this.workers.filter(w => String(w.id).toUpperCase() !== String(id).toUpperCase());
    localStorage.setItem('shotblast_workers', JSON.stringify(this.workers));

    if (this.currentWorker && String(this.currentWorker.id).toUpperCase() === String(id).toUpperCase()) {
      this.clearOperator();
    }

    this.renderWorkersSettingsTable();
    this.showToast(`🗑️ Đã xóa người thao tác!`);
  }

  async resetDefaultWorkers() {
    if (!confirm('Khôi phục danh sách người thao tác ban đầu (Seed)?')) return;
    const DEFAULT_WORKERS = [
      { id: "02623124", name: "Nguyễn Công Hải", machines: ["SA01_SB02"], machine: "SA01_SB02", role: "Công nhân vận hành" },
      { id: "02620127", name: "Lê Duy Tuấn", machines: ["SA01_SB03", "SA01_SB04"], machine: "SA01_SB03, SA01_SB04", role: "Công nhân vận hành" },
      { id: "02524300", name: "Nguyễn Văn Kiên", machines: ["SA01_SB01", "SA01_SB02"], machine: "SA01_SB01, SA01_SB02", role: "Leader shotblast" },
      { id: "02526502", name: "Trịnh Trần Huỳnh Hiệp", machines: ["SA01_SB01", "SA01_SB02"], machine: "SA01_SB01, SA01_SB02", role: "Leader shotblast" },
      { id: "02623115", name: "Nguyễn Văn Sỹ", machines: ["SA01_SB01"], machine: "SA01_SB01", role: "Công nhân vận hành" },
      { id: "02620534", name: "Nguyễn Ngọc Tiến", machines: ["SA01_SB02"], machine: "SA01_SB02", role: "Công nhân vận hành" },
      { id: "02627625", name: "Nguyễn Hữu Nghĩa", machines: ["SA01_SB01", "SA01_SB02"], machine: "SA01_SB01, SA01_SB02", role: "Leader shotblast" },
      { id: "02629580", name: "Phan Nhật Trường", machines: ["SA01_SB01"], machine: "SA01_SB01", role: "Công nhân vận hành" },
      { id: "02629599", name: "Đặng Minh Phương Hiệp", machines: ["SA01_SB01"], machine: "SA01_SB01", role: "Công nhân vận hành" },
      { id: "02622295", name: "Nguyễn Hoàng Huy", machines: ["SA01_SB02"], machine: "SA01_SB02", role: "Công nhân vận hành" },
      { id: "02520340", name: "Lê Duy Hải", machines: ["SA01_SB03", "SA01_SB04"], machine: "SA01_SB03, SA01_SB04", role: "Công nhân vận hành" },
      { id: "02646462", name: "Nguyễn Nhất Tâm", machines: ["LA02_SB01"], machine: "LA02_SB01", role: "Công nhân vận hành" },
      { id: "02622462", name: "Huỳnh Chí Cường", machines: ["SA01_SB05"], machine: "SA01_SB05", role: "Công nhân vận hành" },
      { id: "02642721", name: "Trương Văn Thiện", machines: ["LA02_SB01"], machine: "LA02_SB01", role: "Công nhân vận hành" },
      { id: "02644589", name: "Phan Văn Tuyên", machines: ["SA01_SB03", "SA01_SB04"], machine: "SA01_SB03, SA01_SB04", role: "Công nhân vận hành" }
    ];

    this.workers = DEFAULT_WORKERS;
    localStorage.setItem('shotblast_workers', JSON.stringify(this.workers));
    for (const w of this.workers) {
      try {
        await fetch('/api/workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(w)
        });
      } catch (e) {}
    }
    this.renderWorkersSettingsTable();
    this.showToast('↺ Đã khôi phục danh sách người thao tác mặc định!');
  }

  // ==========================================
  // DSSP & EXCEL & CONNECT MODALS
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
        worker: this.currentWorker ? this.currentWorker.name : 'Người thao tác',
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
    // Top Navigation Tabs
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
      if (this.elements.operatorDropdownList && !this.elements.operatorDropdownList.contains(e.target) && e.target !== this.elements.inputOperatorSearch) {
        this.elements.operatorDropdownList.classList.add('hidden');
      }
    });

    this.elements.btnConnectTablet.addEventListener('click', () => {
      this.elements.utilityMenuDropdown.classList.add('hidden');
      this.openConnectModal();
    });

    if (this.elements.btnOpenSettingsFromMenu) {
      this.elements.btnOpenSettingsFromMenu.addEventListener('click', () => {
        this.elements.utilityMenuDropdown.classList.add('hidden');
        this.openSettingsModal('machines');
      });
    }

    if (this.elements.btnOpenSettingsManager) {
      this.elements.btnOpenSettingsManager.addEventListener('click', () => {
        this.openSettingsModal('machines');
      });
    }

    if (this.elements.btnOpenMachineSettings) {
      this.elements.btnOpenMachineSettings.addEventListener('click', () => {
        this.openSettingsModal('machines');
      });
    }

    if (this.elements.btnOpenWorkerSettings) {
      this.elements.btnOpenWorkerSettings.addEventListener('click', () => {
        this.openSettingsModal('workers');
      });
    }

    this.elements.btnToggleSound.addEventListener('click', () => this.toggleSound());
    this.elements.btnToggleTheme.addEventListener('click', () => this.toggleTheme());
    this.elements.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Step 2: Operator Search Events
    this.elements.inputOperatorSearch.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputOperatorSearch;
      this.renderOperatorDropdown(this.elements.inputOperatorSearch.value);
    });

    this.elements.inputOperatorSearch.addEventListener('input', (e) => {
      this.checkOperatorInput(e.target.value);
    });

    this.elements.btnClearOperator.addEventListener('click', () => {
      this.elements.inputOperatorSearch.value = '';
      this.renderOperatorDropdown('');
      this.elements.inputOperatorSearch.focus();
    });

    this.elements.btnChangeWorker.addEventListener('click', () => {
      this.clearOperator();
    });

    // Step 3: Shift Selector
    const shiftBtns = this.elements.shiftSelector.querySelectorAll('.btn-shift-pill');
    shiftBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const s = Number(btn.getAttribute('data-shift'));
        this.selectShift(s, true);
      });
    });

    // Step 4: Time Entry
    this.elements.btnStartTimeNow.addEventListener('click', () => {
      this.setTimeNow('start');
    });

    this.elements.btnEndTimeNow.addEventListener('click', () => {
      this.setTimeNow('end');
    });

    const keepTimeDigits = (input) => {
      let cleaned = input.value.replace(/[^0-9:]/g, '');
      if (!cleaned.includes(':')) cleaned = cleaned.slice(0, 4);
      input.value = cleaned;
      delete input.dataset.absoluteMinutes;
      this.validateForm();
    };
    this.elements.inputStartTime.addEventListener('input', () => keepTimeDigits(this.elements.inputStartTime));
    this.elements.inputEndTime.addEventListener('input', () => keepTimeDigits(this.elements.inputEndTime));
    this.elements.inputStartTime.addEventListener('blur', () => {
      this.normalizeShiftTimeInput(this.elements.inputStartTime);
      this.validateShotTimes();
      this.validateForm();
    });
    this.elements.inputEndTime.addEventListener('blur', () => {
      this.normalizeShiftTimeInput(this.elements.inputEndTime);
      this.validateShotTimes();
      this.validateForm();
    });

    this.elements.inputStartTime.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputStartTime;
    });

    this.elements.inputEndTime.addEventListener('focus', () => {
      this.focusedInput = this.elements.inputEndTime;
    });

    // Step 5: Product Code
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
          this.applyScannedCode(scannedCode);
        });
      }
    });

    window.addEventListener('barcode-scanned', (e) => {
      if (e.detail && e.detail.code) {
        this.applyScannedCode(e.detail.code);
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

    // Step 5: Chamber buttons (1 - 6)
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
        if (this.elements.inputStartTime.value) this.normalizeShiftTimeInput(this.elements.inputStartTime, false);
        if (this.elements.inputEndTime.value) this.normalizeShiftTimeInput(this.elements.inputEndTime, false);
        this.focusedInput = this.elements.inputQuantity;
        const val = btn.getAttribute('data-val');
        if (val) this.handleNumpad(val);
      });
    });

    if (this.elements.btnNumpadEnter) {
      this.elements.btnNumpadEnter.addEventListener('click', () => {
        if (this.validateForm()) {
          this.submitBatch();
        } else if (this.focusedInput === this.elements.inputOperatorSearch) {
          this.elements.inputStartTime.focus();
        } else if (this.focusedInput === this.elements.inputStartTime) {
          this.elements.inputEndTime.focus();
        } else if (this.focusedInput === this.elements.inputEndTime) {
          this.elements.inputProductCode.focus();
        } else if (this.focusedInput === this.elements.inputProductCode) {
          this.elements.inputQuantity.focus();
        }
      });
    }

    // Submit Batch Button
    this.elements.btnSubmitBatch.addEventListener('click', () => this.submitBatch());

    // Enter Key
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

    // Settings Modal Events
    if (this.elements.btnCloseSettingsModal) {
      this.elements.btnCloseSettingsModal.addEventListener('click', () => this.elements.settingsModal.classList.add('hidden'));
    }
    if (this.elements.tabSettingsMachines) {
      this.elements.tabSettingsMachines.addEventListener('click', () => this.switchSettingsTab('machines'));
    }
    if (this.elements.tabSettingsWorkers) {
      this.elements.tabSettingsWorkers.addEventListener('click', () => this.switchSettingsTab('workers'));
    }
    if (this.elements.btnAddMachine) {
      this.elements.btnAddMachine.addEventListener('click', () => this.addMachine());
    }
    if (this.elements.btnResetDefaultMachines) {
      this.elements.btnResetDefaultMachines.addEventListener('click', () => this.resetDefaultMachines());
    }
    if (this.elements.btnSaveWorker) {
      this.elements.btnSaveWorker.addEventListener('click', () => this.saveWorkerInSettings());
    }
    if (this.elements.btnCancelEditWorker) {
      this.elements.btnCancelEditWorker.addEventListener('click', () => this.cancelEditWorker());
    }
    if (this.elements.btnResetDefaultWorkers) {
      this.elements.btnResetDefaultWorkers.addEventListener('click', () => this.resetDefaultWorkers());
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
    }, 3200);
  }
}

// Global App Instance
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ShotblastApp();
});
