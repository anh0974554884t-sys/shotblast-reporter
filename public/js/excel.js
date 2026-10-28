// ==========================================================================
// EXCEL REPORT EXPORTER (EXACT FORMAT MATCHING FACTORY EXCEL SHEET)
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
  const stageStr = meta.stage || 'Shotblast';

  // Calculate total quantity
  const totalQty = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  // Build Sheet 1: Production Report (Báo Cáo Sản Lượng Ngày)
  const sheetData = [];

  // Row 1: Path & Stamp header info
  sheetData.push([
    "Đường dẫn lưu trữ:",
    "Z:\\Production (生産)\\Surface Treat\\Hiếu - Anodizing\\BCSX_Anodizing\\AAA Dữ liệu báo cáo hàng ngày.xlsx",
    "", "", "", "", "",
    "BỘ PHẬN SẢN XUẤT (Production Dept)",
    "",
    "TỔNG SẢN LƯỢNG NGÀY:"
  ]);

  // Row 2: Subtitle & Total banner
  sheetData.push([
    "DÂY CHUYỀN:",
    lineStr,
    "CÔNG ĐOẠN:",
    stageStr,
    "", "", "",
    `Ngày xác nhận: ${dateStr} - Người lập: ${meta.worker || 'V.T.Hiếu'}`,
    "",
    totalQty // Total qty in prominent cell
  ]);

  // Row 3: Blank separator
  sheetData.push([]);

  // Row 4: Japanese subheaders
  sheetData.push([
    "年月",       // Tháng
    "直",         // Ca
    "ライン",     // Dây chuyền
    "固定",       // Công đoạn
    "機械番号",   // Mã số thiết bị
    "回",         // Lượt
    "開始",       // Bắt đầu
    "停止",       // Dừng
    "品番",       // Mã sản phẩm
    "生産数 (個)",// Số lượng xử lý
    "チャンバー数",// Số buồng
    "設定 数/バッチ (個)", // SL/lượt đặt
    "登録日時",    // Thời gian ghi
    "担当者"      // Người thao tác
  ]);

  // Row 5: Vietnamese Headers (Matching factory standards)
  sheetData.push([
    "Tháng",
    "Ca",
    "Dây chuyền",
    "Công Đoạn",
    "Mã số thiết bị",
    "Lượt",
    "Bắt đầu",
    "Dừng",
    "Mã sản phẩm",
    "Số lượng xử lý",
    "Số buồng",
    "SL/lượt đặt",
    "Thời gian ghi",
    "Người thao tác"
  ]);

  // Row 6+: Data rows
  batches.forEach((b, idx) => {
    // Format timestamp nicely
    let timeFormatted = b.timestamp || '';
    if (timeFormatted.includes('T')) {
      const parts = timeFormatted.split('T');
      timeFormatted = parts[1].substring(0, 8) + ' ' + parts[0];
    }

    sheetData.push([
      b.month || monthStr,
      Number(b.shift) || 1,
      b.line || lineStr,
      b.stage || stageStr,
      b.machine || 'SA01_SB01',
      b.turn || (idx + 1),
      b.startTime || '',
      b.endTime || '',
      b.productCode || '',
      Number(b.quantity) || 0,
      Number(b.chamber) || 1,
      Number(b.settingQty) || 0,
      timeFormatted,
      b.operator || b.worker || 'Người thao tác'
    ]);
  });

  // Summary Row at the end
  sheetData.push([]);
  sheetData.push([
    "TỔNG CỘNG:",
    "", "", "", "", "", "",
    `${batches.length} lượt`,
    "",
    totalQty,
    "", "", "", ""
  ]);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Convert array of arrays to worksheet
  const ws1 = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws1['!cols'] = [
    { wch: 12 }, // Tháng
    { wch: 8 },  // Ca
    { wch: 12 }, // Dây chuyền
    { wch: 14 }, // Công đoạn
    { wch: 16 }, // Mã thiết bị
    { wch: 8 },  // Lượt
    { wch: 10 }, // Bắt đầu
    { wch: 10 }, // Dừng
    { wch: 22 }, // Mã sản phẩm
    { wch: 16 }, // Số lượng xử lý
    { wch: 12 }, // Số buồng
    { wch: 20 }, // SL/lượt đặt
    { wch: 20 }, // Thời gian ghi
    { wch: 18 }  // Người thao tác
  ];

  // Append Sheet 1 (Name: '1' or 'Bao_Cao_Ngay')
  XLSX.utils.book_append_sheet(wb, ws1, "1");

  // Build Sheet 2: DSSP (Danh Sách Sản Phẩm Master)
  if (products && products.length > 0) {
    const dsspData = [
      ["DANH MỤC SẢN PHẨM & ĐỊNH MỨC THIẾT ĐẶT (DSSP) - LINE SMC3 SHOTBLAST"],
      ["Cập nhật ngày: " + dateStr],
      [],
      ["STT", "Mã sản phẩm (品番)", "Tên quy cách sản phẩm", "SL/lượt đặt (設定 数/バッチ)", "Ghi chú"]
    ];

    products.forEach((p, i) => {
      dsspData.push([
        i + 1,
        p.code,
        p.name || '',
        Number(p.settingQty) || 10,
        p.notes || ''
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(dsspData);
    ws2['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 28 },
      { wch: 22 },
      { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "DSSP");
  }

  // Trigger download
  const filename = `Bao_Cao_San_Luong_Shotblast_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
}

window.exportProductionToExcel = exportProductionToExcel;
