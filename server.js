const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match || process.env[match[1].trim()]) continue;
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(__dirname, '..', '.env'));

const root = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 4173);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function prepareDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 20_000) reject(new Error('too_large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

async function sendLead(req, res) {
  try {
    const lead = await readBody(req);
    const fields = ['firstName', 'lastName', 'phone', 'telegram'];
    if (fields.some(key => !String(lead[key] || '').trim())) {
      return json(res, 400, { ok: false, message: 'Заполните все обязательные поля.' });
    }

    const namePattern = /^[A-Za-zА-Яа-яЁё\s'’-]{2,}$/;
    const phonePattern = /^\d{7,15}$/;
    const contactPattern = /^(?:@\S+|https?:\/\/\S+)$/i;
    if (!namePattern.test(lead.firstName) || !namePattern.test(lead.lastName)) {
      return json(res, 400, { ok: false, message: 'Имя и фамилия могут содержать только буквы.' });
    }
    if (!phonePattern.test(lead.phone)) {
      return json(res, 400, { ok: false, message: 'Телефон должен содержать от 7 до 15 цифр.' });
    }
    if (!contactPattern.test(lead.telegram)) {
      return json(res, 400, { ok: false, message: 'Укажите @имя или полную ссылку на Telegram/VK.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return json(res, 503, {
        ok: false,
        configured: false,
        message: 'Форма готова. Для отправки подключите Telegram-бота.'
      });
    }

    const saved = await pool.query(
      `INSERT INTO business_upgrade_leads
        (first_name, last_name, phone, contact, service)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [lead.firstName.trim(), lead.lastName.trim(), lead.phone, lead.telegram.trim(), lead.service || null]
    );
    const record = saved.rows[0];

    const text = [
      '🚀 Новая заявка с сайта',
      '',
      `Заявка №${record.id}`,
      `Имя: ${lead.firstName}`,
      `Фамилия: ${lead.lastName}`,
      `Телефон: ${lead.phone}`,
      `Telegram/VK: ${lead.telegram}`,
      `Интерес: ${lead.service || 'Не выбран'}`
    ].join('\n');

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    if (!response.ok) throw new Error('telegram_error');
    const telegramResult = await response.json();
    await pool.query(
      `UPDATE business_upgrade_leads
       SET telegram_delivered = TRUE, telegram_message_id = $1
       WHERE id = $2`,
      [telegramResult.result?.message_id || null, record.id]
    );
    return json(res, 200, { ok: true, leadId: record.id });
  } catch (error) {
    return json(res, 500, { ok: false, message: 'Не удалось отправить заявку. Попробуйте ещё раз.' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/lead') return sendLead(req, res);

  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.normalize(path.join(root, requestPath));
  if (!filePath.startsWith(root)) return json(res, 403, { message: 'Forbidden' });

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

prepareDatabase()
  .then(() => server.listen(port, () => console.log(`Local: http://localhost:${port}`)))
  .catch(error => {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  });
