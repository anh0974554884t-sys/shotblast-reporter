const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const pool = require('./db');

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

  // --- API ROUTES (POSTGRESQL) ---
  function vnDateString() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }

  function mapBatch(row) {
    return {
      id: row.id,
      date: row.production_date instanceof Date
        ? row.production_date.toISOString().slice(0, 10)
        : String(row.production_date).slice(0, 10),
      month: row.production_month,
      shift: row.shift,
      line: row.line,
      stage: row.stage,
      machine: row.machine_code,
      turn: row.turn_number,
      startTime: row.start_time || '',
      endTime: row.end_time || '',
      productCode: row.product_code,
      quantity: row.quantity,
      chamber: row.chamber,
      settingQty: row.setting_qty,
      timestamp: row.recorded_at,
      worker: row.worker_name || row.operator_name || '',
      operator: row.operator_name || row.worker_name || '',
      operatorId: row.operator_id || ''
    };
  }

  function mapProduct(row) {
    return {
      id: row.id,
      stt: row.stt,
      code: row.code,
      factory: row.factory || '',
      category: row.category || '',
      series: row.series || '',
      name: row.name || '',
      settingQty: row.setting_qty,
      notes: row.notes || ''
    };
  }

  function mapWorker(row) {
    const machines = Array.isArray(row.machines) ? row.machines : [];
    return {
      id: row.employee_id,
      employeeId: row.employee_id,
      name: row.name,
      shift: row.shift,
      machines,
      machine: machines.join(', '),
      role: row.role,
      active: row.active
    };
  }

  async function databaseError(res, err) {
    console.error('PostgreSQL error:', err);
    return sendJSON(res, 500, {
      error: 'Lỗi cơ sở dữ liệu. Dữ liệu chưa được lưu.',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }

  if (pathname === '/api/info' && method === 'GET') {
    let tunnelUrl = null;
    try {
      const tunnelFile = path.join(DATA_DIR, 'tunnel.json');
      if (fs.existsSync(tunnelFile)) {
        tunnelUrl = JSON.parse(fs.readFileSync(tunnelFile, 'utf8')).url;
      }
      const dbResult = await pool.query('SELECT NOW() AS server_time');
      return sendJSON(res, 200, {
        status: 'online', database: 'online',
        serverTime: dbResult.rows[0].server_time,
        addresses: getNetworkAddresses(), port: PORT, tunnelUrl
      });
    } catch (err) {
      return sendJSON(res, 503, {
        status: 'degraded', database: 'offline',
        serverTime: new Date().toISOString(),
        addresses: getNetworkAddresses(), port: PORT, tunnelUrl
      });
    }
  }

  if (pathname === '/api/batches' && method === 'GET') {
    try {
      const clauses = [];
      const params = [];
      const { date, shift, machine } = parsedUrl.query;
      if (date) { params.push(date); clauses.push(`production_date = $${params.length}`); }
      if (shift) { params.push(Number(shift)); clauses.push(`shift = $${params.length}`); }
      if (machine) { params.push(machine); clauses.push(`machine_code = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT * FROM production_batches ${where}
         ORDER BY production_date DESC, recorded_at DESC`, params
      );
      return sendJSON(res, 200, result.rows.map(mapBatch));
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/batches' && method === 'POST') {
    let client;
    try {
      const payload = await parseRequestBody(req);
      const productionDate = payload.date || vnDateString();
      const productionMonth = payload.month || productionDate.slice(0, 7);
      const machine = String(payload.machine || '').trim();
      const shift = Number(payload.shift) || 1;
      const productCode = String(payload.productCode || '').trim().toUpperCase();
      const quantity = Number(payload.quantity);
      const chamber = Number(payload.chamber);
      if (!machine || !productCode || !Number.isFinite(quantity) || quantity < 0 || chamber < 1 || chamber > 6) {
        return sendJSON(res, 400, { error: 'Dữ liệu báo cáo không hợp lệ' });
      }
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`${productionDate}|${machine}|${shift}`]
      );
      let turn = Number(payload.turn);
      if (!Number.isInteger(turn) || turn < 1) {
        const turnResult = await client.query(
          `SELECT COALESCE(MAX(turn_number), 0) + 1 AS next_turn
           FROM production_batches
           WHERE production_date = $1 AND machine_code = $2 AND shift = $3`,
          [productionDate, machine, shift]
        );
        turn = Number(turnResult.rows[0].next_turn);
      }
      const id = `sb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const result = await client.query(
        `INSERT INTO production_batches (
          id, production_date, production_month, shift, line, stage,
          machine_code, turn_number, start_time, end_time, product_code,
          quantity, chamber, setting_qty, worker_name, operator_name,
          operator_id, recorded_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW()
        ) RETURNING *`,
        [
          id, productionDate, productionMonth, shift,
          payload.line || 'SMC3', payload.stage || 'Shotblast', machine, turn,
          payload.startTime || '', payload.endTime || '', productCode,
          quantity, chamber, Number(payload.settingQty) || 0,
          payload.worker || payload.operator || 'Người thao tác',
          payload.operator || payload.worker || 'Người thao tác',
          String(payload.operatorId || ''), payload.timestamp || new Date().toISOString()
        ]
      );
      await client.query('COMMIT');
      const count = await pool.query('SELECT COUNT(*)::INTEGER AS total FROM production_batches');
      return sendJSON(res, 201, {
        success: true, batch: mapBatch(result.rows[0]), totalCount: count.rows[0].total
      });
    } catch (err) {
      if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
      if (err.code === '23505') return sendJSON(res, 409, { error: 'Số lượt đã tồn tại. Hãy tải lại và lưu lại.' });
      if (err.code === '23503') return sendJSON(res, 400, { error: 'Mã máy không tồn tại hoặc chưa kích hoạt.' });
      return databaseError(res, err);
    } finally { if (client) client.release(); }
  }

  if (pathname.startsWith('/api/batches/') && method === 'PUT') {
    try {
      const id = decodeURIComponent(pathname.slice('/api/batches/'.length));
      const payload = await parseRequestBody(req);
      const current = await pool.query('SELECT * FROM production_batches WHERE id = $1', [id]);
      if (!current.rowCount) return sendJSON(res, 404, { error: 'Không tìm thấy lượt ghi nhận' });
      const old = current.rows[0];
      const result = await pool.query(
        `UPDATE production_batches SET
          shift=$2, machine_code=$3, turn_number=$4, start_time=$5, end_time=$6,
          product_code=$7, quantity=$8, chamber=$9, setting_qty=$10,
          worker_name=$11, operator_name=$12, operator_id=$13, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [
          id,
          payload.shift !== undefined ? Number(payload.shift) : old.shift,
          payload.machine || old.machine_code,
          payload.turn !== undefined ? Number(payload.turn) : old.turn_number,
          payload.startTime !== undefined ? payload.startTime : old.start_time,
          payload.endTime !== undefined ? payload.endTime : old.end_time,
          payload.productCode !== undefined ? String(payload.productCode).trim().toUpperCase() : old.product_code,
          payload.quantity !== undefined ? Number(payload.quantity) : old.quantity,
          payload.chamber !== undefined ? Number(payload.chamber) : old.chamber,
          payload.settingQty !== undefined ? Number(payload.settingQty) : old.setting_qty,
          payload.worker || payload.operator || old.worker_name,
          payload.operator || payload.worker || old.operator_name,
          payload.operatorId !== undefined ? String(payload.operatorId) : old.operator_id
        ]
      );
      return sendJSON(res, 200, { success: true, batch: mapBatch(result.rows[0]) });
    } catch (err) {
      if (err.code === '23505') return sendJSON(res, 409, { error: 'Số lượt đã tồn tại.' });
      return databaseError(res, err);
    }
  }

  if (pathname === '/api/batches' && method === 'DELETE') {
    try {
      const result = await pool.query('DELETE FROM production_batches');
      return sendJSON(res, 200, { success: true, deleted: result.rowCount, message: 'Đã xóa toàn bộ dữ liệu lượt' });
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname.startsWith('/api/batches/') && method === 'DELETE') {
    try {
      const id = decodeURIComponent(pathname.slice('/api/batches/'.length));
      const result = await pool.query('DELETE FROM production_batches WHERE id=$1', [id]);
      const count = await pool.query('SELECT COUNT(*)::INTEGER AS total FROM production_batches');
      return sendJSON(res, result.rowCount ? 200 : 404, {
        success: Boolean(result.rowCount), remaining: count.rows[0].total
      });
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/products' && method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM products WHERE active=TRUE ORDER BY stt NULLS LAST, code');
      return sendJSON(res, 200, result.rows.map(mapProduct));
    } catch (err) { return databaseError(res, err); }
  }

  if ((pathname.startsWith('/api/product/') || pathname.startsWith('/api/products/')) && method === 'GET') {
    try {
      const rawCode = decodeURIComponent(pathname.replace(/^\/api\/products?\//, '')).trim().toUpperCase();
      const stripped = rawCode.replace(/[^A-Z0-9]/gi, '');
      const result = await pool.query(
        `SELECT * FROM products WHERE active=TRUE AND
         (UPPER(code)=$1 OR UPPER(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'))=$2)
         LIMIT 1`, [rawCode, stripped]
      );
      if (!result.rowCount) return sendJSON(res, 404, { error: 'Không tìm thấy sản phẩm với mã: ' + rawCode });
      return sendJSON(res, 200, mapProduct(result.rows[0]));
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/products' && method === 'POST') {
    try {
      const payload = await parseRequestBody(req);
      const code = String(payload.code || '').trim().toUpperCase();
      if (!code) return sendJSON(res, 400, { error: 'Mã sản phẩm không được trống' });
      const id = String(payload.id || `sp_${Date.now()}`);
      const result = await pool.query(
        `INSERT INTO products (id,stt,code,factory,category,series,name,setting_qty,notes,active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
         ON CONFLICT (code) DO UPDATE SET
          factory=COALESCE(NULLIF(EXCLUDED.factory,''),products.factory),
          category=COALESCE(NULLIF(EXCLUDED.category,''),products.category),
          series=COALESCE(NULLIF(EXCLUDED.series,''),products.series),
          name=COALESCE(NULLIF(EXCLUDED.name,''),products.name),
          setting_qty=EXCLUDED.setting_qty, notes=EXCLUDED.notes,
          active=TRUE, updated_at=NOW()
         RETURNING *`,
        [id, payload.stt || null, code, payload.factory || '', payload.category || '',
         payload.series || '', payload.name || `Sản phẩm ${code}`,
         Number(payload.settingQty) || 10, payload.notes || '']
      );
      return sendJSON(res, 200, { success: true, product: mapProduct(result.rows[0]) });
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/machines' && method === 'GET') {
    try {
      const result = await pool.query('SELECT code FROM machines WHERE active=TRUE ORDER BY sort_order, code');
      return sendJSON(res, 200, result.rows.map(row => row.code));
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/machines' && method === 'POST') {
    let client;
    try {
      const payload = await parseRequestBody(req);
      const list = (Array.isArray(payload) ? payload : payload.machines || [])
        .map(value => String(value).trim()).filter(Boolean);
      if (!list.length) return sendJSON(res, 400, { error: 'Danh sách mã máy không hợp lệ' });
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query('UPDATE machines SET active=FALSE, updated_at=NOW()');
      for (let i = 0; i < list.length; i += 1) {
        await client.query(
          `INSERT INTO machines(code,sort_order,active) VALUES($1,$2,TRUE)
           ON CONFLICT(code) DO UPDATE SET sort_order=$2,active=TRUE,updated_at=NOW()`,
          [list[i], i + 1]
        );
      }
      await client.query('COMMIT');
      return sendJSON(res, 200, { success: true, machines: list });
    } catch (err) {
      if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
      return databaseError(res, err);
    } finally { if (client) client.release(); }
  }

  if (pathname === '/api/workers' && method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM workers WHERE active=TRUE ORDER BY employee_id');
      return sendJSON(res, 200, result.rows.map(mapWorker));
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/workers' && method === 'POST') {
    try {
      const payload = await parseRequestBody(req);
      const employeeId = String(payload.id || payload.employeeId || '').trim();
      if (!employeeId) return sendJSON(res, 400, { error: 'Mã nhân viên không được để trống' });
      const machines = Array.isArray(payload.machines)
        ? payload.machines.map(String)
        : String(payload.machine || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      const result = await pool.query(
        `INSERT INTO workers(employee_id,name,shift,machines,role,active)
         VALUES($1,$2,$3,$4::jsonb,$5,TRUE)
         ON CONFLICT(employee_id) DO UPDATE SET
          name=EXCLUDED.name,shift=EXCLUDED.shift,machines=EXCLUDED.machines,
          role=EXCLUDED.role,active=TRUE,updated_at=NOW()
         RETURNING *`,
        [employeeId, payload.name || `Nhân viên ${employeeId}`,
         Number(payload.shift) || 1, JSON.stringify(machines),
         payload.role || 'Công nhân vận hành']
      );
      return sendJSON(res, 200, { success: true, worker: mapWorker(result.rows[0]) });
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname.startsWith('/api/workers/') && method === 'DELETE') {
    try {
      const employeeId = decodeURIComponent(pathname.slice('/api/workers/'.length)).trim();
      await pool.query('UPDATE workers SET active=FALSE,updated_at=NOW() WHERE employee_id=$1', [employeeId]);
      const result = await pool.query('SELECT * FROM workers WHERE active=TRUE ORDER BY employee_id');
      return sendJSON(res, 200, { success: true, workers: result.rows.map(mapWorker) });
    } catch (err) { return databaseError(res, err); }
  }

  if (pathname === '/api/reset-sample' && method === 'POST') {
    return sendJSON(res, 409, {
      success: false,
      error: 'Chức năng khôi phục dữ liệu mẫu đã tắt để bảo vệ dữ liệu PostgreSQL.'
    });
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
