// ==========================================================================
// EXCEL REPORT EXPORTER (KHỚP CHUẨN FORM MẪU BÁO CÁO CÔNG TY SMC)
// Dựa trên file mẫu SMC3_SHOTBLAST_20261027.xlsm (Sheet MENU từ Ngày -> Tổng thời gian hoạt động)
// ==========================================================================

function exportProductionToExcel(batches, products, meta = {}) {
  if (typeof XLSX === 'undefined') {
    alert('Thư viện Excel (SheetJS) chưa tải xong. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau vài giây!');
    return;
  }

  const now = new Date();
  const dateStr = meta.date || now.toISOString().split('T')[0];
  const monthStr = meta.month || dateStr.substring(0, 7);
  const lineStr = meta.line || 'SMC3';

  // Helper map products for quick lookup
  const productMap = new Map();
  if (Array.isArray(products)) {
    products.forEach(p => {
      if (p && p.code) {
        productMap.set(p.code.toUpperCase(), p);
      }
    });
  }

  // Build Sheet 1: MENU (Form mẫu chuẩn của SMC Anodizing Shotblast)
  const menuData = [];

  // Row 1: Japanese Subheaders (Hàng 4 của form mẫu)
  menuData.push([
    "作業日",                 // 1: Ngày
    "年月",                   // 2: Tháng
    "直",                     // 3: Ca
    "ライン",                 // 4: Dây chuyền
    "固定",                   // 5: Công đoạn
    "機械番号",               // 6: Mã số thiết bị
    "回",                     // 7: Lượt
    "品番",                   // 8: Mã sản phẩm
    "機種",                   // 9: Chủng loại
    "生産分類",               // 10: Phân loại sản xuất
    "設定 稼働率",            // 11: Hiệu suất thiết đặt
    "設定サイクル(秒/個)",     // 12: Cycletime thiết đặt
    "可動率",                 // 13: Hiệu suất khả dụng
    "稼働率",                 // 14: Tỉ lệ hoạt động
    "実行サイクルタイム(秒/個)",// 15: Cycletime thực tế
    "生産体制",               // 16: Số ca sản xuất
    "生産数",                 // 17: Số lượng xử lý
    "チャンバー数",           // 18: Số buồng
    "設定 数/バッチ",         // 19: Số lượng/mẻ thiết đặt
    "チェック",               // 20: Kiểm tra
    "開始",                   // 21: Bắt đầu
    "終了",                   // 22: Kết thúc
    "総運転時間(分)"           // 23: Tổng thời gian hoạt động
  ]);

  // Row 2: Units row (Hàng 5 của form mẫu)
  menuData.push([
    "", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "",
    "(2直)",                  // 16
    "(個)",                   // 17
    "",
    "(個)",                   // 19
    "",
    "開始",                   // 21
    "終了",                   // 22
    "総運転時間(分)"           // 23
  ]);

  // Row 3: Vietnamese Headers (Hàng 6 của form mẫu chuẩn công ty)
  menuData.push([
    "Ngày",                   // 1
    "Tháng",                  // 2
    "Ca",                     // 3
    "Dây chuyền",             // 4
    "Công Đoạn",              // 5
    "Mã số thiết bị",         // 6
    "Lượt",                   // 7
    "Mã sản phẩm",            // 8
    "Chủng loại",             // 9
    "Phân loại sản xuất",     // 10
    "Hiệu suất thiết đặt",    // 11
    "Cycletime thiết đặt",    // 12
    "Hiệu suất khả dụng",     // 13
    "Tỉ lệ hoạt động",        // 14
    "Cycletime thực tế",      // 15
    "Số ca sản xuất",         // 16
    "Số lượng xử lý",         // 17
    "Số buồng",               // 18
    "Số lượng/mẻ thiết đặt",  // 19
    "Kiểm tra",               // 20
    "Bắt đầu",                // 21
    "Kết thúc",               // 22
    "Tổng thời gian hoạt động"// 23
  ]);

  // Row 4+: Data Rows (Tính toán theo dữ liệu thực tế nhập từ Tablet)
  batches.forEach((b, idx) => {
    const code = (b.productCode || '').trim().toUpperCase();
    const prod = productMap.get(code) || {};

    // Tính thời gian hoạt động (phút)
    let durationMins = 0;
    if (b.startTime && b.endTime && b.startTime.includes(':') && b.endTime.includes(':')) {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      let startM = sh * 60 + sm;
      let endM = eh * 60 + em;
      if (endM < startM) endM += 1440; // Xử lý qua nửa đêm ca 3
      durationMins = endM - startM;
    }

    const qty = Number(b.quantity) || 0;
    let actualCycle = '';
    if (qty > 0 && durationMins > 0) {
      actualCycle = Number(((durationMins * 60) / qty).toFixed(1));
    }

    const effSetting = prod.efficiency !== undefined ? prod.efficiency : 0.76;
    const cycleSetting = prod.cycleTime !== undefined ? prod.cycleTime : '';
    const chamber = Number(b.chamber) || 1;
    const settingQty = Number(b.settingQty) || prod.settingQty || 10;
    const batchLine = b.line || b.factory || lineStr;

    menuData.push([
      b.date || dateStr,                              // 1: Ngày
      b.month || monthStr,                            // 2: Tháng
      Number(b.shift) || 1,                           // 3: Ca
      batchLine,                                      // 4: Dây chuyền (SMC2 / SMC3)
      b.stage || 'Shotblast',                         // 5: Công Đoạn
      b.machine || 'SA01_SB01',                       // 6: Mã số thiết bị
      b.turn || (idx + 1),                            // 7: Lượt
      code,                                           // 8: Mã sản phẩm
      prod.series || prod.category || prod.name || '',// 9: Chủng loại
      "Sản xuất/生産",                                // 10: Phân loại sản xuất
      effSetting,                                     // 11: Hiệu suất thiết đặt
      cycleSetting,                                   // 12: Cycletime thiết đặt
      "",                                             // 13: Hiệu suất khả dụng (để trống cho công ty tính)
      "",                                             // 14: Tỉ lệ hoạt động
      actualCycle,                                    // 15: Cycletime thực tế
      2,                                              // 16: Số ca sản xuất (2 ca)
      qty,                                            // 17: Số lượng xử lý
      chamber,                                        // 18: Số buồng
      settingQty,                                     // 19: Số lượng/mẻ thiết đặt
      "OK",                                           // 20: Kiểm tra
      b.startTime || '',                              // 21: Bắt đầu
      b.endTime || '',                                // 22: Kết thúc
      durationMins                                    // 23: Tổng thời gian hoạt động (phút)
    ]);
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Convert array of arrays to worksheet
  const wsMenu = XLSX.utils.aoa_to_sheet(menuData);

  // Set column widths chuẩn xác cho 23 cột
  wsMenu['!cols'] = [
    { wch: 12 }, // 1: Ngày
    { wch: 10 }, // 2: Tháng
    { wch: 6 },  // 3: Ca
    { wch: 12 }, // 4: Dây chuyền
    { wch: 12 }, // 5: Công Đoạn
    { wch: 14 }, // 6: Mã số thiết bị
    { wch: 6 },  // 7: Lượt
    { wch: 22 }, // 8: Mã sản phẩm
    { wch: 18 }, // 9: Chủng loại
    { wch: 16 }, // 10: Phân loại sản xuất
    { wch: 18 }, // 11: Hiệu suất thiết đặt
    { wch: 18 }, // 12: Cycletime thiết đặt
    { wch: 16 }, // 13: Hiệu suất khả dụng
    { wch: 14 }, // 14: Tỉ lệ hoạt động
    { wch: 18 }, // 15: Cycletime thực tế
    { wch: 14 }, // 16: Số ca sản xuất
    { wch: 14 }, // 17: Số lượng xử lý
    { wch: 10 }, // 18: Số buồng
    { wch: 20 }, // 19: Số lượng/mẻ thiết đặt
    { wch: 10 }, // 20: Kiểm tra
    { wch: 10 }, // 21: Bắt đầu
    { wch: 10 }, // 22: Kết thúc
    { wch: 22 }  // 23: Tổng thời gian hoạt động
  ];

  // Append Sheet 1: MENU
  XLSX.utils.book_append_sheet(wb, wsMenu, "MENU");

  // Sheet 2: Danh sách sản phẩm master (DSSP)
  if (Array.isArray(products) && products.length > 0) {
    const dsspRows = [
      ["STT", "Nhà máy", "Mã sản phẩm", "Chủng loại", "Quy cách", "SL/mẻ (Shotblast)", "Cycletime (s)", "Hiệu suất"]
    ];

    products.forEach((p, i) => {
      dsspRows.push([
        p.stt || (i + 1),
        p.factory || 'SMC3',
        p.code,
        p.category || '',
        p.name || '',
        Number(p.settingQty) || 10,
        p.cycleTime || '',
        p.efficiency || 0.76
      ]);
    });

    const wsDssp = XLSX.utils.aoa_to_sheet(dsspRows);
    wsDssp['!cols'] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 24 },
      { wch: 18 },
      { wch: 26 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDssp, "DSSP");
  }

  // Trigger download
  const filename = `BCSX_Shotblast_${lineStr}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
}

window.exportProductionToExcel = exportProductionToExcel;
