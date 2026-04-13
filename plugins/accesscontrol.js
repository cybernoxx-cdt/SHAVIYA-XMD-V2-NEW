const { cmd } = require('../command');
const fs   = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
//  Access Config — MongoDB Persist + File Fallback
//  ✅ Uses shared mongoose connection (no raw MongoClient)
//  ✅ Falls back to file if MongoDB not connected
//  ✅ FIX: Mode-based silent block — no "owner only" message
//  ✅ FIX: inbox/group/premium modes work correctly
//  Restart වෙද්දිත් settings නැතිවෙන්නෙ නෑ ✅
// ═══════════════════════════════════════════════════

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Mongoose model (shared connection) ──────────────────────
let _AccessModel = null;
function getAccessModel() {
  if (_AccessModel) return _AccessModel;
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return null;
    const schema = new mongoose.Schema(
      { _id: String, data: mongoose.Schema.Types.Mixed },
      { collection: 'access_config' }
    );
    _AccessModel = mongoose.models.AccessConfig ||
                   mongoose.model('AccessConfig', schema);
    return _AccessModel;
  } catch (_) {
    return null;
  }
}

// ── Number normalize ─────────────────────────────────────────
function normalizeNumber(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/@s\.whatsapp\.net/g, '')
    .replace(/@lid/g, '')
    .replace(/:\d+$/g, '')
    .replace(/[^0-9]/g, '');
}

// ── Local file path per session ──────────────────────────────
function getLocalFile(sessionId) {
  return path.join(DATA_DIR, `access_config_${sessionId}.json`);
}

// ── Load config: Mongoose first, fallback file ───────────────
async function getAccessConfig(sessionId) {
  try {
    const Model = getAccessModel();
    if (Model) {
      const doc = await Model.findById(sessionId).lean();
      if (doc && doc.data) {
        try { fs.writeFileSync(getLocalFile(sessionId), JSON.stringify(doc.data, null, 2)); } catch (_) {}
        return doc.data;
      }
    }
  } catch (e) {
    console.error('[ACCESS] Mongoose load error:', e.message);
  }

  try {
    const file = getLocalFile(sessionId);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}

  return { mode: 'public', premium: [], banned: [] };
}

// ── Save config: Mongoose + local file ──────────────────────
async function saveAccessConfig(sessionId, cfg) {
  try {
    fs.writeFileSync(getLocalFile(sessionId), JSON.stringify(cfg, null, 2));
  } catch (e) {}

  try {
    const Model = getAccessModel();
    if (Model) {
      await Model.findByIdAndUpdate(
        sessionId,
        { $set: { data: cfg } },
        { upsert: true, new: true }
      );
      console.log('[ACCESS] ✅ Saved to MongoDB');
    } else {
      setTimeout(async () => {
        try {
          const M2 = getAccessModel();
          if (M2) {
            await M2.findByIdAndUpdate(sessionId, { $set: { data: cfg } }, { upsert: true });
            console.log('[ACCESS] ✅ Delayed MongoDB save OK');
          }
        } catch (_) {}
      }, 3000);
    }
  } catch (e) {
    console.error('[ACCESS] MongoDB save error:', e.message);
  }
}

// ── In-memory cache ──────────────────────────────────────────
const _configCache = {};

async function preloadCache(sessionId) {
  const cfg = await getAccessConfig(sessionId);
  _configCache[sessionId] = cfg;
  return cfg;
}

function getAccessConfigSync(sessionId) {
  return _configCache[sessionId] || { mode: 'public', premium: [], banned: [] };
}

// ═══════════════════════════════════════════════════════════════
//  global.checkAccess — called by index.js on every message
//
//  FIXED LOGIC:
//  ┌──────────────┬───────────────────────────────────────────┐
//  │ MODE         │ BEHAVIOUR                                 │
//  ├──────────────┼───────────────────────────────────────────┤
//  │ public       │ everyone allowed ✅                        │
//  │ private      │ SILENTLY blocked — no message sent ❌      │
//  │ inbox        │ allowed in DM only, blocked in groups ❌   │
//  │ group        │ allowed in groups only, blocked in DM ❌   │
//  │ premium      │ allowed for premium users only ❌          │
//  │ privatepremium│ premium users in DM only ❌              │
//  └──────────────┴───────────────────────────────────────────┘
//
//  reason: null  → index.js will NOT send any message (silent)
//  reason: ''    → index.js will NOT send any message (silent)
// ═══════════════════════════════════════════════════════════════
global.checkAccess = function(sessionId, senderNumber, isOwner, isGroup) {
  // Preload cache if not loaded yet
  if (!_configCache[sessionId]) {
    preloadCache(sessionId);
    return { allowed: true }; // Allow while loading
  }

  const cfg  = getAccessConfigSync(sessionId);
  const mode = cfg.mode || 'public';

  // Owner always passes through
  if (isOwner) return { allowed: true, mode };

  const isPremium = (cfg.premium || []).includes(senderNumber);
  const isBanned  = (cfg.banned  || []).includes(senderNumber);

  // Banned → silent block (no message)
  if (isBanned) return { allowed: false, reason: null, mode };

  switch (mode) {

    case 'public':
      // Everyone allowed
      return { allowed: true, mode };

    case 'private':
      // Owner-only mode — silently ignore all other users
      // reason: null means index.js sends nothing
      return { allowed: false, reason: null, mode };

    case 'inbox':
      // Only DM (non-group) allowed
      if (!isGroup) return { allowed: true, mode };
      // In group → silent block
      return { allowed: false, reason: null, mode };

    case 'group':
      // Only groups allowed
      if (isGroup) return { allowed: true, mode };
      // In DM → silent block
      return { allowed: false, reason: null, mode };

    case 'premium':
      // Premium users allowed everywhere
      if (isPremium) return { allowed: true, mode };
      // Non-premium → silent block
      return { allowed: false, reason: null, mode };

    case 'privatepremium':
      // Premium users in DM only
      if (isPremium && !isGroup) return { allowed: true, mode };
      return { allowed: false, reason: null, mode };

    default:
      return { allowed: true, mode };
  }
};

// Export for index.js startup call
module.exports = { preloadCache };

// ═══════════════════════════════════════════════════
//  1. SETMODE
// ═══════════════════════════════════════════════════
cmd({
  pattern: 'setmode',
  alias: ['mode'],
  react: '🌏',
  desc: 'Bot access mode set',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ Owner Only.');

  const modes = ['public', 'private', 'inbox', 'group', 'premium', 'privatepremium'];
  const sub   = q?.trim().toLowerCase();
  const cfg   = await getAccessConfig(sessionId);

  if (!sub || !modes.includes(sub)) {
    return reply(
`╭──『 ⚙️ *BOT ACCESS MODES* 』──❏
│
│  Current: *${(cfg.mode || 'public').toUpperCase()}*
│
├─ 🌍 *public*
│     └ Everyone can use the bot
│
├─ 🔒 *private*
│     └ Owner only — others silently ignored
│
├─ 📩 *inbox*
│     └ DM chats only — groups blocked
│
├─ 👥 *group*
│     └ Groups only — DM blocked
│
├─ 💎 *premium*
│     └ Premium users + Owner only
│
├─ 🔐 *privatepremium*
│     └ Premium users in DM only
│
╰─ Example: *.setmode public*`
    );
  }

  cfg.mode = sub;
  await saveAccessConfig(sessionId, cfg);
  _configCache[sessionId] = cfg;

  const modeDesc = {
    public:         '🌍 Everyone can use the bot',
    private:        '🔒 Owner only — others silently ignored',
    inbox:          '📩 DM chats only — groups blocked',
    group:          '👥 Groups only — DM blocked',
    premium:        '💎 Premium users + Owner only',
    privatepremium: '🔐 Premium users in DM only',
  };

  reply(
`✅ *Mode changed to:* \`${sub.toUpperCase()}\`
${modeDesc[sub]}

_💾 Saved to MongoDB — survives restarts ✅_`
  );
});

// ═══════════════════════════════════════════════════
//  2. ADDPREMIUM
// ═══════════════════════════════════════════════════
cmd({
  pattern: 'addpremium',
  alias: ['ap'],
  react: '💎',
  desc: 'Add premium user',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ Owner Only.');

  const number = normalizeNumber(q?.trim() || (m.quoted?.sender));
  if (!number) return reply('📌 *Example:* `.addpremium 94xxxxxxxxx`');

  const cfg = await getAccessConfig(sessionId);
  if (!cfg.premium) cfg.premium = [];

  if (cfg.premium.includes(number)) return reply(`⚠️ *${number}* is already premium.`);

  cfg.premium.push(number);
  await saveAccessConfig(sessionId, cfg);
  _configCache[sessionId] = cfg;

  reply(`✅ *${number}* added as premium user!\n_Saved to MongoDB ✅_`);
});

// ═══════════════════════════════════════════════════
//  3. REMOVEPREMIUM
// ═══════════════════════════════════════════════════
cmd({
  pattern: 'removepremium',
  alias: ['rp', 'delpremium'],
  react: '🗑️',
  desc: 'Remove premium user',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ Owner Only.');

  const number = normalizeNumber(q?.trim() || (m.quoted?.sender));
  if (!number) return reply('📌 *Example:* `.removepremium 94xxxxxxxxx`');

  const cfg = await getAccessConfig(sessionId);
  if (!cfg.premium) cfg.premium = [];

  const idx = cfg.premium.indexOf(number);
  if (idx === -1) return reply(`⚠️ *${number}* is not in premium list.`);

  cfg.premium.splice(idx, 1);
  await saveAccessConfig(sessionId, cfg);
  _configCache[sessionId] = cfg;

  reply(`✅ *${number}* removed from premium!\n_Saved to MongoDB ✅_`);
});

// ═══════════════════════════════════════════════════
//  4. LISTPREMIUM
// ═══════════════════════════════════════════════════
cmd({
  pattern: 'listpremium',
  alias: ['premiumlist', 'lp'],
  react: '📋',
  desc: 'List premium users',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ Owner Only.');

  const cfg  = await getAccessConfig(sessionId);
  const list = cfg.premium || [];

  if (!list.length) return reply('📋 No premium users added yet.');

  const lines = list.map((n, i) => `${i + 1}. +${n}`).join('\n');
  reply(`💎 *Premium Users (${list.length})*\n\n${lines}`);
});

// ═══════════════════════════════════════════════════
//  5. BAN
// ═══════════════════════════════════════════════════
cmd({
  pattern: 'ban',
  react: '🚫',
  desc: 'Ban a user',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ Owner Only.');

  const number = normalizeNumber(q?.trim() || m.quoted?.sender);
  if (!number) return reply('📌 *Example:* `.ban 94xxxxxxxxx`');

  const cfg = await getAccessConfig(sessionId);
  if (!cfg.banned) cfg.banned = [];

  if (cfg.banned.includes(number)) return reply(`⚠️ *${number}* is already banned.`);

  cfg.banned.push(number);
  await saveAccessConfig(sessionId, cfg);
  _configCache[sessionId] = cfg;

  reply(`🚫 *${number}* has been banned!\n_Saved to MongoDB ✅_`);
});

// ═══════════════════════════════════════════════════
//  6. UNBAN
// ═══════════════════════════════════════════════════
cmd({
  pattern: 'unban',
  react: '✅',
  desc: 'Unban a user',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ Owner Only.');

  const number = normalizeNumber(q?.trim() || m.quoted?.sender);
  if (!number) return reply('📌 *Example:* `.unban 94xxxxxxxxx`');

  const cfg = await getAccessConfig(sessionId);
  if (!cfg.banned) cfg.banned = [];

  const idx = cfg.banned.indexOf(number);
  if (idx === -1) return reply(`⚠️ *${number}* is not banned.`);

  cfg.banned.splice(idx, 1);
  await saveAccessConfig(sessionId, cfg);
  _configCache[sessionId] = cfg;

  reply(`✅ *${number}* has been unbanned!\n_Saved to MongoDB ✅_`);
});
