const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_URL = 'https://api.paymongo.com/v1/checkout_sessions';
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!SECRET_KEY) {
  console.error('Missing PAYMONGO_SECRET_KEY. Copy .env.example to .env and set it.');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Validates client input and builds the PayMongo payload. Amounts arrive in
// pesos and are converted to centavos (PayMongo's smallest unit).
function buildPayload(input, origin) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new Error('At least one item is required');

  const line_items = items.map((i) => {
    const name = String(i.name || '').trim();
    const quantity = Number(i.quantity);
    const amount = Math.round(Number(i.price) * 100);
    if (!name) throw new Error('Item name is required');
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Invalid quantity');
    if (!Number.isFinite(amount) || amount < 2000) throw new Error('Minimum amount per item is PHP 20.00');
    return { currency: 'PHP', amount, name, quantity };
  });

  return {
    data: {
      attributes: {
        line_items,
        payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
        description: String(input.description || 'Maya Checkout Studio order'),
        success_url: `${origin}/success.html`,
        cancel_url: `${origin}/cancel.html`,
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
      },
    },
  };
}

async function createCheckoutSession(req, res) {
  let input;
  try { input = await readJson(req); } catch { return send(res, 400, { error: 'Invalid JSON' }); }

  let payload;
  try {
    payload = buildPayload(input, `http://${req.headers.host}`);
  } catch (e) {
    return send(res, 400, { error: e.message });
  }

  try {
    const pm = await fetch(PAYMONGO_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Basic ' + Buffer.from(`${SECRET_KEY}:`).toString('base64'),
      },
      body: JSON.stringify(payload),
    });
    const json = await pm.json().catch(() => ({}));
    if (!pm.ok) {
      const detail = json.errors?.map((e) => e.detail).join('; ') || 'PayMongo request failed';
      return send(res, pm.status, { error: detail });
    }
    const { id, attributes } = json.data;
    send(res, 200, { id, checkout_url: attributes.checkout_url });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: 'Could not reach PayMongo' });
  }
}

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/checkout') return createCheckoutSession(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  send(res, 405, { error: 'Method not allowed' });
}).listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
