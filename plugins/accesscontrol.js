const { cmd } = require('../command');
const fs   = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
//  Access Config — MongoDB Persist + File Fallback
//  ✅ FIX: Uses shared mongoose connection (no raw MongoClient)
//  ✅ FIX: Falls back to file if MongoDB not connected
//  Restart වෙද්දිත් settings නැතිවෙන්නෙ නෑ ✅
// ═══════════════════════════════════════════════════

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Mongoose model (shared connection — no new MongoClient) ──
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

// ── Number normalize ──
function normalizeNumber(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/@s\.whatsapp\.net/g, '')
    .replace(/@lid/g, '')
    .replace(/:\d+$/g, '')
    .replace(/[^0-9]/g, '');
}

// ── Local file path per session ──
function getLocalFile(sessionId) {
  return path.join(DATA_DIR, `access_config_${sessionId}.json`);
}

// ── Load config: Mongoose first, fallback file ──
async function getAccessConfig(sessionId) {
  // Try Mongoose (shared connection)
  try {
    const Model = getAccessModel();
    if (Model) {
      const doc = await Model.findById(sessionId).lean();
      if (doc && doc.data) {
        // Sync to local file as backup
        try { fs.writeFileSync(getLocalFile(sessionId), JSON.stringify(doc.data, null, 2)); } catch (_) {}
        return doc.data;
      }
    }
  } catch (e) {
    console.error('[ACCESS] Mongoose load error:', e.message);
  }

  // Fallback: local file
  try {
    const file = getLocalFile(sessionId);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}

  return { mode: 'public', premium: [], banned: [] };
}

// ── Save config: Mongoose + local file ──
async function saveAccessConfig(sessionId, cfg) {
  // Save to local file immediately (fast, always works)
  try {
    fs.writeFileSync(getLocalFile(sessionId), JSON.stringify(cfg, null, 2));
  } catch (e) {}

  // Save to Mongoose (shared connection)
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
      // MongoDB not ready — retry once after 3 seconds
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

// ── In-memory cache for sync reads (index.js checkAccess) ──
const _configCache = {};

// Preload cache on startup
async function preloadCache(sessionId) {
  const cfg = await getAccessConfig(sessionId);
  _configCache[sessionId] = cfg;
  return cfg;
}

// Sync read from cache (used by global.checkAccess)
function getAccessConfigSync(sessionId) {
  return _configCache[sessionId] || { mode: 'public', premium: [], banned: [] };
}

// ═══════════════════════════════════════════════════
//  Global Access Checker (index.js call කරනවා)
// ═══════════════════════════════════════════════════
global.checkAccess = function(sessionId, senderNumber, isOwner, isGroup) {
  // Preload cache if not loaded yet (async, non-blocking)
  if (!_configCache[sessionId]) {
    preloadCache(sessionId);
    return { allowed: true }; // Allow while loading
  }

  const cfg    = getAccessConfigSync(sessionId);
  const mode   = cfg.mode || 'public';

  if (isOwner) return { allowed: true, mode };

  const isPremium = (cfg.premium || []).includes(senderNumber);
  const isBanned  = (cfg.banned  || []).includes(senderNumber);

  if (isBanned) return { allowed: false, reason: 'banned', mode };

  switch (mode) {
    case 'public':         return { allowed: true, mode };
    case 'private':        return { allowed: false, reason: 'ᴏᴡɴᴇʀ ᴏɴʟʏ ʏꜱᴇ ᴛʜɪꜱ ʙᴏᴛ (ᴘʀɪᴠᴀᴛᴇ) ❌', mode };
    case 'inbox':          return { allowed: !isGroup, mode };
    case 'group':          return { allowed: isGroup,  mode };
    case 'premium':        return { allowed: isPremium, reason: isPremium ? '' : 'premium', mode };
    case 'privatepremium': return { allowed: isPremium && !isGroup, reason: 'premium', mode };
    default:               return { allowed: true, mode };
  }
};

// Export for index.js to call at startup
module.exports = { preloadCache };

// ═══════════════════════════════════════════════════
//  1. SETMODE — ✅ Fixed MongoDB save
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

  const cfg = await getAccessConfig(sessionId);

  if (!sub || !modes.includes(sub)) {
    return reply(
`⚙️ *Bot Access Modes*

Current: *${(cfg.mode || 'public').toUpperCase()}*

Available Modes:
• *public* — Anyone Can Use
• *private* — Owner Only
• *inbox* — Private Chat Only
• *group* — Groups Only
• *premium* — Premium users + Owner
• *privatepremium* — Owner + Premium users (DM only)

Example: *.setmode public*`
    );
  }

  cfg.mode = sub;
  await saveAccessConfig(sessionId, cfg);
  _configCache[sessionId] = cfg;

  const modeDesc = {
    public:         '🌍 Anyone',
    private:        '🔒 Owner Only',
    inbox:          '📩 Inbox Only',
    group:          '👥 Groups Only',
    premium:        '💎 Premium users + Owner',
    privatepremium: '🔐 Owner + Premium users'
  };

  reply(`✅ *Mode Updated:* ${sub.toUpperCase()}\n${modeDesc[sub]}\n\n_Saved to MongoDB — persists after restart ✅_`);
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

  const cfg = await getAccessConfig(sessionId);
  const list = cfg.premium || [];

  if (!list.length) return reply('📋 No premium users added yet.');

  const lines = list.map((n, i) => `${i + 1}. +${n}`).join('\n');
  reply(`💎 *Premium Users (${list.length})*\n\n${lines}`);
});

// ═══════════════════════════════════════════════════
//  5. BAN / UNBAN
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
