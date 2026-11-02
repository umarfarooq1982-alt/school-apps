// Fake school API for Jest. GET requests answer from captured server
// responses (fixtures/*.json, keyed by role then path); writes echo success.
const family = require('./mobile-family.json');

let extra = {};
try {
  // Optional fixture packs added per app area (teacher, admin web, …).
  extra = require('./index.js');
} catch {
  extra = {};
}

let role = 'parent';
const calls = [];

function setFakeRole(r) {
  role = r;
}

function envelope(data, status = 200, message = 'Success') {
  return { statusCode: status, success: status < 400, message, data };
}

// '/api/mobile/vouchers/61' matches a fixture key '/api/mobile/vouchers/:id'.
function lookup(table, path) {
  if (!table) {
    return undefined;
  }
  if (table[path]) {
    return table[path];
  }
  const parts = path.split('/');
  const key = Object.keys(table).find(k => {
    const kp = k.split('/');
    return kp.length === parts.length && kp.every((seg, i) => seg.startsWith(':') || seg === parts[i]);
  });
  return key ? table[key] : undefined;
}

async function fakeFetch(url, opts = {}) {
  const u = new URL(url);
  const method = (opts.method || 'GET').toUpperCase();
  const path = u.pathname;
  calls.push({ method, path, query: u.search });
  let body;
  const tables = [extra[role], family[role], extra.common];
  if (method === 'GET') {
    let hit;
    for (const t of tables) {
      hit = hit || lookup(t, path);
    }
    body = hit
      ? envelope(hit.data, hit.status || 200, hit.message)
      : envelope([], 200, 'No fixture');
  } else {
    let sent = {};
    try {
      sent = typeof opts.body === 'string' ? JSON.parse(opts.body) : {};
    } catch {
      sent = {};
    }
    let hit;
    for (const t of tables) {
      hit = hit || lookup(t, `${method} ${path}`);
    }
    body = hit ? envelope(hit.data, hit.status || 200, hit.message) : envelope({ id: 1, ...sent }, 200, 'Saved');
  }
  return {
    ok: body.statusCode < 400,
    status: body.statusCode,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

module.exports = { fakeFetch, setFakeRole, calls };
