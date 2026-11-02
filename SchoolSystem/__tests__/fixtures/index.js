// Loads every fixture pack in this folder named "<role>.<area>.json"
// (e.g. teacher.mobile.json, admin.accounts.json) and merges them per role.
// Each pack maps a path, or "METHOD path" for writes, to { data, status?, message? }.
const fs = require('fs');
const path = require('path');

const packs = { common: {} };
for (const file of fs.readdirSync(__dirname)) {
  const m = file.match(/^([a-z]+)\.[a-z0-9-]+\.json$/);
  if (!m) {
    continue;
  }
  const role = m[1];
  packs[role] = { ...(packs[role] || {}), ...require(path.join(__dirname, file)) };
}

module.exports = packs;
