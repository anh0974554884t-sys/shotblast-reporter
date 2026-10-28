const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const { spawn, execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

const BATCHES_FILE = path.join(DATA_DIR, 'production_data.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SAMPLE_BATCHES_FILE = path.join(DATA_DIR, 'sample_batches.json');
const DEFAULT_PRODUCTS_FILE = path.join(DATA_DIR, 'default_products.json');
const WORKERS_FILE = path.join(DATA_DIR, 'workers.json');
const MACHINES_FILE = path.join(DATA_DIR, 'machines.json');

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(BATCHES_FILE)) {
  if (fs.existsSync(SAMPLE_BATCHES_FILE)) {
    fs.copyFileSync(SAMPLE_BATCHES_FILE, BATCHES_FILE);
  } else {
    fs.writeFileSync(BATCHES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

if (!fs.existsSync(PRODUCTS_FILE)) {
  if (fs.existsSync(DEFAULT_PRODUCTS_FILE)) {
    fs.copyFileSync(DEFAULT_PRODUCTS_FILE, PRODUCTS_FILE);
  } else {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

const DEFAULT_MACHINES = [
  "SA01_SB01",
  "SA01_SB02",
  "SA01_SB03",
  "SA01_SB04",
  "SA01_SB05",
  "LA02_SB01"
];

if (!fs.existsSync(MACHINES_FILE)) {
  fs.writeFileSync(MACHINES_FILE, JSON.stringify(DEFAULT_MACHINES, null, 2), 'utf8');
}

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

if (!fs.existsSync(WORKERS_FILE)) {
  fs.writeFileSync(WORKERS_FILE, JSON.stringify(DEFAULT_WORKERS, null, 2), 'utf8');
}

function readJSON(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Lỗi đọc file ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Lỗi ghi file ${filePath}:`, err.message);
    return false;
  }
}

// Get local IPv4 addresses for tablets
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, ip: iface.address });
      }
    }
  }
  return addresses;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API ROUTES ---
  if (pathname === '/api/info' && method === 'GET') {
    let tunnelUrl = null;
    try {
      const tunnelFile = path.join(DATA_DIR, 'tunnel.json');
      if (fs.existsSync(tunnelFile)) {
        tunnelUrl = JSON.parse(fs.readFileSync(tunnelFile, 'utf8')).url;
      }
    } catch (e) {}

    return sendJSON(res, 200, {
      status: 'online',
      serverTime: new Date().toISOString(),
      addresses: getNetworkAddresses(),
      port: PORT,
      tunnelUrl: tunnelUrl
    });
  }

  // GET Batches
  if (pathname === '/api/batches' && method === 'GET') {
    const batches = readJSON(BATCHES_FILE, []);
    const { date, shift, machine } = parsedUrl.query;
    let filtered = batches;
    if (date) filtered = filtered.filter(b => b.date === date);
    if (shift) filtered = filtered.filter(b => String(b.shift) === String(shift));
    if (machine) filtered = filtered.filter(b => b.machine === machine);
    return sendJSON(res, 200, filtered);
  }

  // POST Add Batch
  if (pathname === '/api/batches' && method === 'POST') {
    try {
      const payload = await parseRequestBody(req);
      const batches = readJSON(BATCHES_FILE, []);

      // Calculate next turn for current date & shift (or continuous)
      const now = new Date();
      const todayStr = payload.date || now.toISOString().split('T')[0];
      const monthStr = payload.month || todayStr.substring(0, 7);

      const existingToday = batches.filter(b => b.date === todayStr);
      const nextTurn = payload.turn ? Number(payload.turn) : (existingToday.length + 1);

      const newBatch = {
        id: 'sb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        date: todayStr,
        month: monthStr,
        shift: Number(payload.shift) || 1,
        line: payload.line || 'SMC3',
        stage: payload.stage || 'Shotblast',
        machine: payload.machine || 'SA01_SB01',
        turn: nextTurn,
        startTime: payload.startTime || '',
        endTime: payload.endTime || '',
        productCode: (payload.productCode || '').trim().toUpperCase(),
        quantity: Number(payload.quantity) || 0,
        chamber: Number(payload.chamber) || 1,
        settingQty: Number(payload.settingQty) || 0,
        timestamp: payload.timestamp || now.toISOString(),
        worker: payload.worker || payload.operator || 'Người thao tác',
        operator: payload.operator || payload.worker || 'Người thao tác',
        operatorId: payload.operatorId || ''
      };

      batches.push(newBatch);
      writeJSON(BATCHES_FILE, batches);
      return sendJSON(res, 201, { success: true, batch: newBatch, totalCount: batches.length });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // PUT Update Batch
  if (pathname.startsWith('/api/batches/') && method === 'PUT') {
    const id = pathname.replace('/api/batches/', '');
    try {
      const payload = await parseRequestBody(req);
      const batches = readJSON(BATCHES_FILE, []);
      const idx = batches.findIndex(b => b.id === id);
      if (idx === -1) {
        return sendJSON(res, 404, { error: 'Không tìm thấy lượt ghi nhận' });
      }

      batches[idx] = {
        ...batches[idx],
        shift: payload.shift !== undefined ? Number(payload.shift) : batches[idx].shift,
        machine: payload.machine || batches[idx].machine,
        turn: payload.turn !== undefined ? Number(payload.turn) : batches[idx].turn,
        startTime: payload.startTime !== undefined ? payload.startTime : (batches[idx].startTime || ''),
        endTime: payload.endTime !== undefined ? payload.endTime : (batches[idx].endTime || ''),
        productCode: payload.productCode !== undefined ? payload.productCode.trim().toUpperCase() : batches[idx].productCode,
        quantity: payload.quantity !== undefined ? Number(payload.quantity) : batches[idx].quantity,
        chamber: payload.chamber !== undefined ? Number(payload.chamber) : batches[idx].chamber,
        settingQty: payload.settingQty !== undefined ? Number(payload.settingQty) : batches[idx].settingQty,
        worker: payload.worker || payload.operator || batches[idx].worker,
        operator: payload.operator || payload.worker || batches[idx].operator,
        operatorId: payload.operatorId !== undefined ? payload.operatorId : batches[idx].operatorId
      };

      writeJSON(BATCHES_FILE, batches);
      return sendJSON(res, 200, { success: true, batch: batches[idx] });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // DELETE Batch (Single or All)
  if (pathname === '/api/batches' && method === 'DELETE') {
    writeJSON(BATCHES_FILE, []);
    return sendJSON(res, 200, { success: true, message: 'Đã xóa toàn bộ dữ liệu lượt' });
  }

  if (pathname.startsWith('/api/batches/') && method === 'DELETE') {
    const id = pathname.replace('/api/batches/', '');
    const batches = readJSON(BATCHES_FILE, []);
    const filtered = batches.filter(b => b.id !== id);
    writeJSON(BATCHES_FILE, filtered);
    return sendJSON(res, 200, { success: true, remaining: filtered.length });
  }

  // GET Products (DSSP)
  if (pathname === '/api/products' && method === 'GET') {
    const products = readJSON(PRODUCTS_FILE, []);
    return sendJSON(res, 200, products);
  }

  // GET Single Product by Code (e.g., /api/product/MGP20ABAC893A075)
  if ((pathname.startsWith('/api/product/') || pathname.startsWith('/api/products/')) && method === 'GET') {
    const rawCode = decodeURIComponent(pathname.replace(/^\/api\/products?\//, '')).trim().toUpperCase();
    if (rawCode) {
      const products = readJSON(PRODUCTS_FILE, []);
      const stripped = rawCode.replace(/[^A-Z0-9]/gi, '');
      const p = products.find(x => 
        (x.code && x.code.toUpperCase() === rawCode) ||
        (x.code && x.code.replace(/[^A-Z0-9]/gi, '').toUpperCase() === stripped)
      );
      if (p) {
        return sendJSON(res, 200, p);
      } else {
        return sendJSON(res, 404, { error: 'Không tìm thấy sản phẩm với mã: ' + rawCode });
      }
    }
  }

  // POST Add/Update Product
  if (pathname === '/api/products' && method === 'POST') {
    try {
      const payload = await parseRequestBody(req);
      const products = readJSON(PRODUCTS_FILE, []);
      const code = (payload.code || '').trim().toUpperCase();
      if (!code) {
        return sendJSON(res, 400, { error: 'Mã sản phẩm không được trống' });
      }

      const existingIdx = products.findIndex(p => p.code.toUpperCase() === code);
      if (existingIdx >= 0) {
        products[existingIdx] = {
          ...products[existingIdx],
          name: payload.name || products[existingIdx].name,
          settingQty: Number(payload.settingQty) || products[existingIdx].settingQty,
          notes: payload.notes || products[existingIdx].notes
        };
      } else {
        products.push({
          id: 'sp_' + Date.now(),
          code: code,
          name: payload.name || `Sản phẩm ${code}`,
          settingQty: Number(payload.settingQty) || 10,
          notes: payload.notes || ''
        });
      }
      writeJSON(PRODUCTS_FILE, products);
      return sendJSON(res, 200, { success: true, products });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // GET Machines
  if (pathname === '/api/machines' && method === 'GET') {
    const machines = readJSON(MACHINES_FILE, DEFAULT_MACHINES);
    return sendJSON(res, 200, machines);
  }

  // POST Save Machines
  if (pathname === '/api/machines' && method === 'POST') {
    try {
      const payload = await parseRequestBody(req);
      const list = Array.isArray(payload) ? payload : (payload.machines || []);
      if (!Array.isArray(list) || list.length === 0) {
        return sendJSON(res, 400, { error: 'Danh sách mã máy không hợp lệ' });
      }
      writeJSON(MACHINES_FILE, list);
      return sendJSON(res, 200, { success: true, machines: list });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // GET Workers
  if (pathname === '/api/workers' && method === 'GET') {
    const workers = readJSON(WORKERS_FILE, DEFAULT_WORKERS);
    return sendJSON(res, 200, workers);
  }

  // POST Add/Update Worker
  if (pathname === '/api/workers' && method === 'POST') {
    try {
      const payload = await parseRequestBody(req);
      const workers = readJSON(WORKERS_FILE, DEFAULT_WORKERS);
      const workerId = String(payload.id || '').trim();
      if (!workerId) {
        return sendJSON(res, 400, { error: 'Mã nhân viên (MSNV) không được để trống' });
      }

      const existingIdx = workers.findIndex(w => String(w.id).trim().toUpperCase() === workerId.toUpperCase());
      const machinesArr = Array.isArray(payload.machines) 
        ? payload.machines 
        : (payload.machine ? String(payload.machine).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);

      const workerData = {
        id: workerId,
        name: payload.name || `Nhân viên ${workerId}`,
        shift: Number(payload.shift) || 1,
        machine: payload.machine || (machinesArr.length > 0 ? machinesArr.join(', ') : 'SA01_SB01'),
        machines: machinesArr.length > 0 ? machinesArr : [payload.machine || 'SA01_SB01'],
        role: payload.role || 'Công nhân vận hành'
      };

      if (existingIdx >= 0) {
        workers[existingIdx] = { ...workers[existingIdx], ...workerData };
      } else {
        workers.push(workerData);
      }
      writeJSON(WORKERS_FILE, workers);
      return sendJSON(res, 200, { success: true, workers, worker: workerData });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // DELETE Worker
  if (pathname.startsWith('/api/workers/') && method === 'DELETE') {
    const workerId = decodeURIComponent(pathname.replace('/api/workers/', '')).trim();
    const workers = readJSON(WORKERS_FILE, DEFAULT_WORKERS);
    const filtered = workers.filter(w => String(w.id).trim().toUpperCase() !== workerId.toUpperCase());
    writeJSON(WORKERS_FILE, filtered);
    return sendJSON(res, 200, { success: true, workers: filtered });
  }

  // Reset to default sample data
  if (pathname === '/api/reset-sample' && method === 'POST') {
    if (fs.existsSync(SAMPLE_BATCHES_FILE)) {
      fs.copyFileSync(SAMPLE_BATCHES_FILE, BATCHES_FILE);
    }
    if (fs.existsSync(DEFAULT_PRODUCTS_FILE)) {
      fs.copyFileSync(DEFAULT_PRODUCTS_FILE, PRODUCTS_FILE);
    }
    return sendJSON(res, 200, { success: true, message: 'Đã khôi phục dữ liệu mẫu' });
  }

  // --- STATIC FILE SERVING ---
  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

let ngrokProcess = null;

function startNgrokTunnel() {
  const ngrokExe = path.join(__dirname, 'ngrok.exe');
  if (!fs.existsSync(ngrokExe)) return;

  const tunnelFile = path.join(DATA_DIR, 'tunnel.json');
  let domain = 'autistic-chute-suspend.ngrok-free.dev';
  try {
    if (fs.existsSync(tunnelFile)) {
      const t = JSON.parse(fs.readFileSync(tunnelFile, 'utf8'));
      if (t.url) {
        domain = t.url.replace(/^https?:\/\//, '');
      }
    }
  } catch (e) {}

  try {
    try {
      execSync('taskkill /f /im ngrok.exe', { stdio: 'ignore' });
    } catch (e) {}

    ngrokProcess = spawn(ngrokExe, ['http', PORT.toString(), `--url=${domain}`, '--log=stdout'], {
      windowsHide: true
    });

    ngrokProcess.stdout.on('data', data => {
      const str = data.toString();
      if (str.includes('started tunnel')) {
        console.log(`🌐 [4G/5G SẴN SÀNG] Đã mở đường truyền cố định: https://${domain}\n`);
      }
    });

    ngrokProcess.stderr.on('data', () => {});

    ngrokProcess.on('error', err => {
      console.error('Ngrok lỗi:', err.message);
    });

    ngrokProcess.on('exit', code => {
      ngrokProcess = null;
      // Tự động kết nối lại nếu ngrok bị ngắt
      setTimeout(() => {
        startNgrokTunnel();
      }, 5000);
    });
  } catch (err) {
    console.error('Lỗi khởi động ngrok tunnel:', err.message);
  }
}

function cleanupNgrok() {
  if (ngrokProcess) {
    try {
      ngrokProcess.kill();
    } catch (e) {}
    ngrokProcess = null;
  }
}

process.on('uncaughtException', err => {
  console.error('Lỗi ngoại lệ (đã bỏ qua để server không sập):', err.message);
});
process.on('unhandledRejection', reason => {
  console.error('Lỗi Promise (đã bỏ qua):', reason);
});
process.on('exit', cleanupNgrok);
process.on('SIGINT', () => { cleanupNgrok(); process.exit(); });
process.on('SIGTERM', () => { cleanupNgrok(); process.exit(); });

server.listen(PORT, '0.0.0.0', () => {
  const networks = getNetworkAddresses();
  console.log('\n========================================================================');
  console.log('🏭 HỆ THỐNG NHẬP BÁO CÁO SẢN LƯỢNG SHOTBLAST (SMC3 - ANODIZING)');
  console.log('========================================================================');
  console.log(`▶ Truy cập tại máy chủ (PC): http://localhost:${PORT}`);
  console.log('▶ Truy cập trên TABLET / Điện thoại qua Wi-Fi xưởng:');
  if (networks.length === 0) {
    console.log(`   http://localhost:${PORT}`);
  } else {
    networks.forEach(net => {
      console.log(`   👉 http://${net.ip}:${PORT}  (${net.name})`);
    });
  }
  try {
    const tunnelFile = path.join(DATA_DIR, 'tunnel.json');
    if (fs.existsSync(tunnelFile)) {
      const tInfo = JSON.parse(fs.readFileSync(tunnelFile, 'utf8'));
      if (tInfo && tInfo.url) {
        console.log('▶ Truy cập bằng 4G/5G TỪ XA (Vĩnh viễn):');
        console.log(`   🌐 ${tInfo.url}`);
      }
    }
  } catch (e) {}
  console.log('========================================================================');

  // Tự động kết nối đường truyền 4G cố định
  startNgrokTunnel();
});
