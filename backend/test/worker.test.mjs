import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker.js';

const BOT_TOKEN = '123456:TEST_BOT_TOKEN_FOR_CI';
const SESSION_SECRET = 'test-signing-key-hmac-256';
const ADMIN_SECRET = 'test-admin-secret-key';
const ADMIN_TG_ID = '7468650530';

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function buildTelegramInitData(userObj, botToken = BOT_TOKEN) {
  const params = new URLSearchParams();
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));
  params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
  params.set('user', JSON.stringify(userObj));

  const entries = [];
  for (const [k, v] of params.entries()) entries.push(`${k}=${v}`);
  entries.sort();
  const dataCheckString = entries.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

function buildTelegramWidgetAuth(userFields, botToken = BOT_TOKEN) {
  const data = {
    auth_date: Math.floor(Date.now() / 1000),
    ...userFields
  };
  const dataCheckString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return { ...data, hash };
}

function createMockEnv({ preseededVouchers = [], preseededUsers = [] } = {}) {
  const users = new Map(); // telegram_id -> row
  for (const u of preseededUsers) users.set(Number(u.telegram_id), { ...u });

  const vouchers = new Map(); // code_hash -> row
  for (const v of preseededVouchers) vouchers.set(v.code_hash, { ...v });

  const voucherDevices = []; // { code_hash, device_id }
  const vipVouchers = new Map(); // telegram_id -> voucher_code
  const dailyQuota = new Map(); // `${id}:${date}` -> count
  const kvStore = new Map([
    [
      'VIP_BUNDLE_JSON',
      {
        lexicon: [{ word: 'ubiquitous', band: 8 }],
        reading: [{ id: 'R1', title: 'Academic Passage' }],
        writing: [{ id: 'W1', title: 'Task 2 Essay' }],
        speaking: { topic_bank: [{ id: 'S1', topic: 'Education' }] }
      }
    ]
  ]);

  const DB = {
    async batch(stmts) {
      const results = [];
      for (const s of stmts) results.push(await s.run());
      return results;
    },
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      const stmt = {
        _params: [],
        bind(...args) {
          this._params = args;
          return this;
        },
        async first() {
          const p = this._params;
          if (/SELECT is_vip, vip_expires_at FROM users WHERE telegram_id = \?/i.test(normalized)) {
            return users.get(Number(p[0])) || null;
          }
          if (/SELECT \* FROM users WHERE telegram_id = \?/i.test(normalized)) {
            return users.get(Number(p[0])) || null;
          }
          if (/SELECT \* FROM vouchers WHERE code_hash = \? AND revoked = 0/i.test(normalized)) {
            const v = vouchers.get(p[0]);
            return v && v.revoked !== 1 ? v : null;
          }
          if (/SELECT \* FROM vouchers WHERE code_hash = \?/i.test(normalized)) {
            return vouchers.get(p[0]) || null;
          }
          if (/SELECT tier, revoked, expires_at FROM vouchers WHERE code_hash = \?/i.test(normalized)) {
            return vouchers.get(p[0]) || null;
          }
          if (/SELECT \* FROM promo_codes WHERE code = \?/i.test(normalized)) {
            return null;
          }
          if (/SELECT \* FROM voucher_devices WHERE code_hash = \? AND device_id = \?/i.test(normalized)) {
            return voucherDevices.find((d) => d.code_hash === p[0] && d.device_id === p[1]) || null;
          }
          if (/SELECT COUNT\(\*\) as dev_count FROM voucher_devices WHERE code_hash = \?/i.test(normalized)) {
            return { dev_count: voucherDevices.filter((d) => d.code_hash === p[0]).length };
          }
          if (/SELECT count FROM daily_quota WHERE telegram_id = \? AND date_str = \?/i.test(normalized)) {
            return { count: dailyQuota.get(`${p[0]}:${p[1]}`) || 0 };
          }
          if (/SELECT voucher_code FROM vip_vouchers WHERE telegram_id = \?/i.test(normalized)) {
            const code = vipVouchers.get(Number(p[0]));
            return code ? { voucher_code: code } : null;
          }
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          const p = this._params;
          if (/^INSERT INTO users \(telegram_id, first_name, username/i.test(normalized)) {
            const existing = users.get(Number(p[0])) || { telegram_id: Number(p[0]), is_vip: 0, vip_expires_at: 0 };
            users.set(Number(p[0]), {
              ...existing,
              first_name: p[1],
              username: p[2],
              progress_json: p[3],
              srs_due_count: p[4]
            });
          } else if (/^INSERT INTO users \(telegram_id, is_vip, vip_activated_at, vip_expires_at/i.test(normalized)) {
            const tid = Number(p[0]);
            const existing = users.get(tid) || { telegram_id: tid };
            const isSprintInsert = normalized.includes('vip_expires_at > ?');
            users.set(tid, {
              ...existing,
              telegram_id: tid,
              is_vip: 1,
              vip_expires_at: isSprintInsert ? Number(p[1]) : 0
            });
          } else if (/^UPDATE users SET is_vip = 0 WHERE telegram_id = \?/i.test(normalized)) {
            const u = users.get(Number(p[0]));
            if (u) u.is_vip = 0;
          } else if (/^INSERT INTO voucher_devices/i.test(normalized)) {
            voucherDevices.push({ code_hash: p[0], device_id: p[1] });
          } else if (/^UPDATE vouchers SET telegram_id = \? WHERE code_hash = \?/i.test(normalized)) {
            const v = vouchers.get(p[1]);
            if (v) v.telegram_id = Number(p[0]);
          } else if (/^INSERT INTO vouchers/i.test(normalized)) {
            const [codeHash, tier, expiresAt] = p;
            vouchers.set(codeHash, { code_hash: codeHash, tier, max_devices: 3, revoked: 0, expires_at: expiresAt || 0, telegram_id: null });
          } else if (/^INSERT OR IGNORE INTO vouchers/i.test(normalized)) {
            const [codeHash, tier, expiresAt] = p;
            if (!vouchers.has(codeHash)) {
              vouchers.set(codeHash, { code_hash: codeHash, tier, max_devices: 3, revoked: 0, expires_at: expiresAt || 0 });
            }
          } else if (/^INSERT INTO daily_quota/i.test(normalized)) {
            const key = `${p[0]}:${p[1]}`;
            dailyQuota.set(key, (dailyQuota.get(key) || 0) + 1);
          }
          return { success: true };
        }
      };
      return stmt;
    }
  };

  const VIP_KV = {
    async get(key, type) {
      const val = kvStore.get(key);
      if (val === undefined) return null;
      if (type === 'json') return typeof val === 'string' ? JSON.parse(val) : val;
      return typeof val === 'string' ? val : JSON.stringify(val);
    },
    async put(key, value) {
      kvStore.set(key, value);
    }
  };

  const AI = {
    async run(model, opts) {
      return { response: `Mock AI reply via ${model} (${(opts.messages || []).length} msgs)` };
    }
  };

  return {
    BOT_TOKEN,
    SESSION_SIGNING_KEY: SESSION_SECRET,
    ADMIN_SECRET_KEY: ADMIN_SECRET,
    ADMIN_TG_ID,
    STUDIO_WEB_URL: 'https://ielts-prep-studio-olive.vercel.app',
    DB,
    VIP_KV,
    AI
  };
}

test('GET /api/health returns 200 ok', async () => {
  const env = createMockEnv();
  const res = await worker.fetch(new Request('https://worker.test/api/health'), env, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
});

test('POST /api/sync rejects unauthenticated telegramId: ADMIN_TG_ID spoof', async () => {
  const env = createMockEnv();
  const req = new Request('https://worker.test/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId: Number(ADMIN_TG_ID), deviceId: 'spoof-dev' })
  });
  const res = await worker.fetch(req, env, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.isVip, false);
  assert.equal(data.vipData, null);
  assert.equal(data.sessionToken, null);
});

test('POST /api/sync accepts valid Telegram initData for admin and issues private VIP session', async () => {
  const env = createMockEnv();
  const initData = buildTelegramInitData({ id: Number(ADMIN_TG_ID), first_name: 'Lyan', username: 'hyuguo' });
  const req = new Request('https://worker.test/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, deviceId: 'dev-1' })
  });
  const res = await worker.fetch(req, env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
  const data = await res.json();
  assert.equal(data.isVip, true);
  assert.ok(data.sessionToken && data.sessionToken.split('.').length === 3);
  assert.ok(data.vipData && Array.isArray(data.vipData.lexicon));
});

test('POST /api/auth/telegram-widget rejects invalid hash and issues sessionToken on valid hash', async () => {
  const env = createMockEnv();
  const badRes = await worker.fetch(
    new Request('https://worker.test/api/auth/telegram-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(ADMIN_TG_ID), first_name: 'Spoof', auth_date: Math.floor(Date.now() / 1000), hash: 'deadbeef' })
    }),
    env,
    {}
  );
  assert.equal(badRes.status, 401);

  const authPayload = buildTelegramWidgetAuth({ id: 555001, first_name: 'Alice', username: 'alice_ielts' });
  const goodRes = await worker.fetch(
    new Request('https://worker.test/api/auth/telegram-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    }),
    env,
    {}
  );
  assert.equal(goodRes.status, 200);
  const goodData = await goodRes.json();
  assert.equal(goodData.success, true);
  assert.ok(goodData.sessionToken && goodData.sessionToken.split('.').length === 3);
  assert.equal(goodData.isVip, false);
});

test('GET /api/vip-bundle blocks anonymous callers and unlocks for verified VIP Bearer token', async () => {
  const env = createMockEnv();
  const anonRes = await worker.fetch(new Request('https://worker.test/api/vip-bundle'), env, {});
  assert.equal(anonRes.status, 403);
  assert.equal(anonRes.headers.get('Cache-Control'), 'private, no-store');

  const initData = buildTelegramInitData({ id: Number(ADMIN_TG_ID), first_name: 'Admin' });
  const syncRes = await worker.fetch(
    new Request('https://worker.test/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    }),
    env,
    {}
  );
  const { sessionToken } = await syncRes.json();

  const vipRes = await worker.fetch(
    new Request('https://worker.test/api/vip-bundle', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    }),
    env,
    {}
  );
  assert.equal(vipRes.status, 200);
  assert.equal(vipRes.headers.get('Cache-Control'), 'private, no-store');
  const vipBody = await vipRes.json();
  assert.equal(vipBody.success, true);
  assert.ok(vipBody.vipData.lexicon.length > 0);
});

test('POST /api/redeem-code links voucher, avoids TDZ crash, blocks distinct account hijack, enforces 3-device cap', async () => {
  const code = 'IPS-VIP-TEST99';
  const env = createMockEnv({
    preseededVouchers: [
      { code_hash: sha256Hex(code), tier: 'vip', max_devices: 3, revoked: 0, expires_at: 0, telegram_id: null }
    ]
  });

  const userAInit = buildTelegramInitData({ id: 100001, first_name: 'UserA' });
  const userBInit = buildTelegramInitData({ id: 200002, first_name: 'UserB' });

  // Claim 1 by User A (Device 1)
  const r1 = await worker.fetch(
    new Request('https://worker.test/api/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: userAInit, code, deviceId: 'dev-1' })
    }),
    env,
    {}
  );
  assert.equal(r1.status, 200);
  const d1 = await r1.json();
  assert.equal(d1.success, true);
  assert.ok(d1.sessionToken);

  // Hijack attempt by User B -> must return 403 (and NEVER throw ReferenceError TDZ)
  const rHijack = await worker.fetch(
    new Request('https://worker.test/api/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: userBInit, code, deviceId: 'dev-hijack' })
    }),
    env,
    {}
  );
  assert.equal(rHijack.status, 403);

  // Device 2 and 3 for User A succeed; Device 4 hits cap
  for (const dev of ['dev-2', 'dev-3']) {
    const rDev = await worker.fetch(
      new Request('https://worker.test/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userAInit, code, deviceId: dev })
      }),
      env,
      {}
    );
    assert.equal(rDev.status, 200);
  }

  const rCap = await worker.fetch(
    new Request('https://worker.test/api/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: userAInit, code, deviceId: 'dev-4' })
    }),
    env,
    {}
  );
  assert.equal(rCap.status, 403);
});

test('POST /api/ai/chat rejects body.telegramId bypass and returns both text/reply + modelUsed/model', async () => {
  const env = createMockEnv();
  const spoofReq = new Request('https://worker.test/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.5' },
    body: JSON.stringify({ telegramId: Number(ADMIN_TG_ID), userId: ADMIN_TG_ID, prompt: 'Explain coercion' })
  });
  const res = await worker.fetch(spoofReq, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.isVip, false);
  assert.equal(typeof body.text, 'string');
  assert.equal(body.reply, body.text);
  assert.equal(body.model, body.modelUsed);
});

test('GET /api/radar/feed blocks ?userId & ?clientVip bypasses and marks VIP responses private', async () => {
  const env = createMockEnv();
  const spoofRes = await worker.fetch(
    new Request(`https://worker.test/api/radar/feed?userId=${ADMIN_TG_ID}&clientVip=1`),
    env,
    {}
  );
  assert.equal(spoofRes.status, 200);
  const spoofData = await spoofRes.json();
  assert.equal(spoofData.isVip, false);
  assert.notEqual(spoofRes.headers.get('Cache-Control'), 'private, no-store');

  const initData = buildTelegramInitData({ id: Number(ADMIN_TG_ID), first_name: 'Admin' });
  const syncRes = await worker.fetch(
    new Request('https://worker.test/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    }),
    env,
    {}
  );
  const { sessionToken } = await syncRes.json();

  const vipRes = await worker.fetch(
    new Request('https://worker.test/api/radar/feed', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    }),
    env,
    {}
  );
  assert.equal(vipRes.status, 200);
  assert.equal(vipRes.headers.get('Cache-Control'), 'private, no-store');
  const vipData = await vipRes.json();
  assert.equal(vipData.isVip, true);
});

test('Admin endpoints (/api/admin/mint and /api/setup-commands) require ADMIN_SECRET_KEY Bearer auth', async () => {
  const env = createMockEnv();
  const unauthMint = await worker.fetch(
    new Request('https://worker.test/api/admin/mint', { method: 'POST', body: JSON.stringify({ count: 1 }) }),
    env,
    {}
  );
  assert.equal(unauthMint.status, 401);

  const unauthSetup = await worker.fetch(new Request('https://worker.test/api/setup-commands'), env, {});
  assert.equal(unauthSetup.status, 401);

  const authMint = await worker.fetch(
    new Request('https://worker.test/api/admin/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
      body: JSON.stringify({ count: 1, tier: 'vip' })
    }),
    env,
    {}
  );
  assert.equal(authMint.status, 200);
  const mintData = await authMint.json();
  assert.equal(mintData.success, true);
  assert.equal(mintData.codes.length, 1);
});

test('GET /api/tools/collocations ignores unauthenticated ?telegram_id= spoofing', async () => {
  const env = createMockEnv();
  const res = await worker.fetch(
    new Request(`https://worker.test/api/tools/collocations?word=research&telegram_id=${ADMIN_TG_ID}`),
    env,
    {}
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.quota.isVip, false);
});
