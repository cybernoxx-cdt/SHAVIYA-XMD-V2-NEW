// plugins/channelsticker.js — SHAVIYA-XMD V2
// Auto Daily Sticker Upload to WhatsApp Channel(s)
// Coded by CDT | Crash Delta Team
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use strict';

const { cmd }  = require('../command');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const axios    = require('axios');
const Config   = require('../config');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FFMPEG RESOLVE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let FF = 'ffmpeg';
try { const s = require('ffmpeg-static'); if (s && fs.existsSync(s)) { try { fs.chmodSync(s, 0o755); } catch (_) {} FF = s; } } catch (_) {}
if (FF === 'ffmpeg') { try { const i = require('@ffmpeg-installer/ffmpeg'); if (i?.path) FF = i.path; } catch (_) {} }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STICKER CATEGORIES  (daily rotation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CATEGORIES = [
  { name: 'Meme Stickers',      emoji: '😂', gTag: 'funny meme sticker animated',      tTag: 'meme sticker pack' },
  { name: 'Cute Stickers',      emoji: '🌸', gTag: 'cute kawaii sticker animated',      tTag: 'cute sticker animated' },
  { name: 'Girl Stickers',      emoji: '💁‍♀️', gTag: 'girl cute sticker animated',       tTag: 'girl sticker animated' },
  { name: 'Anime Stickers',     emoji: '🎌', gTag: 'anime sticker animated kawaii',     tTag: 'anime sticker pack' },
  { name: 'Savage Stickers',    emoji: '🔥', gTag: 'savage attitude sticker animated',  tTag: 'savage sticker animated' },
  { name: 'Love Stickers',      emoji: '❤️', gTag: 'love heart cute sticker animated',  tTag: 'love sticker animated' },
  { name: 'Funny Animal',       emoji: '🐾', gTag: 'funny animal sticker animated',     tTag: 'funny animal sticker' },
  { name: 'Celebration',        emoji: '🎉', gTag: 'celebration confetti sticker',      tTag: 'celebration sticker animated' },
  { name: 'Dark Humor',         emoji: '💀', gTag: 'dark humor skull sticker animated', tTag: 'dark humor sticker' },
  { name: 'Reaction Pack',      emoji: '😤', gTag: 'reaction expression sticker',       tTag: 'reaction sticker animated' },
  { name: 'Cloudy Vibes',       emoji: '☁️', gTag: 'cloud loading spinner animated',    tTag: 'cloud animation sticker' },
  { name: 'Dino Pack',          emoji: '🦕', gTag: 'dinosaur funny sticker animated',   tTag: 'dinosaur sticker pack' },
  { name: 'Neon Aesthetic',     emoji: '🌈', gTag: 'neon colorful aesthetic sticker',   tTag: 'neon sticker animated' },
  { name: 'Sports Stickers',    emoji: '⚽', gTag: 'sports football sticker animated',  tTag: 'sports sticker animated' },
];

const GIPHY_KEY = 'dc6zaTOxFJmzC';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PERSISTENT STATE  (file-based, survives restarts)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const STATE_FILE = path.join(__dirname, '../data/channelsticker.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_) {}
  return {
    enabled:       false,          // master on/off
    channels:      [],             // array of JIDs (max 5)
    categoryIndex: 0,              // current category rotation index
    lastUploadDate: null,          // 'YYYY-MM-DD' of last upload
    uploadedHashes: [],            // MD5 hashes of uploaded sticker URLs (dedup)
    dailyCount:    0,              // stickers sent today
    totalSent:     0,              // lifetime total
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) { console.error('[csticker] saveState error:', e.message); }
}

let STATE = loadState();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Simple hash for URL dedup (no crypto dep needed)
function hashUrl(url) {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isNewDay() {
  return STATE.lastUploadDate !== todayStr();
}

function getTodayCategory() {
  // Rotate category each day
  const idx = STATE.categoryIndex % CATEGORIES.length;
  return CATEGORIES[idx];
}

// ── Fetch sticker URLs ────────────────────────────
async function fetchGiphyUrls(tag, limit = 25) {
  try {
    const { data } = await axios.get('https://api.giphy.com/v1/stickers/search', {
      params: { api_key: GIPHY_KEY, q: tag, limit, rating: 'g', offset: Math.floor(Math.random() * 50) },
      timeout: 12000,
    });
    return (data?.data || [])
      .map(g => g.images?.fixed_width?.url || g.images?.downsized?.url || g.images?.original?.url)
      .filter(Boolean);
  } catch { return []; }
}

async function fetchTenorUrls(query, limit = 15) {
  try {
    const { data } = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: { q: query, key: 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk', limit, media_filter: 'gif', random: true },
      timeout: 12000,
    });
    return (data?.results || [])
      .map(r => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url)
      .filter(Boolean);
  } catch { return []; }
}

// ── Get unique URLs (not already uploaded) ────────
async function getFreshUrls(category, needed = 20) {
  let urls = [];

  // Fetch from GIPHY
  const gUrls = await fetchGiphyUrls(category.gTag, 30);
  urls.push(...gUrls);

  // Fetch from Tenor
  const tUrls = await fetchTenorUrls(category.tTag, 20);
  urls.push(...tUrls);

  // Shuffle
  urls = urls.sort(() => Math.random() - 0.5);

  // Filter duplicates
  const fresh = [];
  for (const u of urls) {
    const h = hashUrl(u);
    if (!STATE.uploadedHashes.includes(h)) {
      fresh.push({ url: u, hash: h });
      if (fresh.length >= needed) break;
    }
  }

  // If still not enough, clear old hashes (keep last 500) and retry
  if (fresh.length < needed && STATE.uploadedHashes.length > 500) {
    STATE.uploadedHashes = STATE.uploadedHashes.slice(-200);
    for (const u of urls) {
      const h = hashUrl(u);
      if (!fresh.find(f => f.hash === h) && !STATE.uploadedHashes.includes(h)) {
        fresh.push({ url: u, hash: h });
        if (fresh.length >= needed) break;
      }
    }
  }

  return fresh;
}

// ── Convert URL → animated WebP buffer ────────────
async function urlToWebpBuffer(url) {
  const ts    = Date.now() + Math.random().toString(36).slice(2, 5);
  const isGif = /\.gif|giphy|tenor/i.test(url);
  const tmpIn  = path.join(os.tmpdir(), `cstk_${ts}.${isGif ? 'gif' : 'png'}`);
  const tmpOut = path.join(os.tmpdir(), `cstk_${ts}.webp`);

  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    fs.writeFileSync(tmpIn, Buffer.from(res.data));

    const vf = `scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000${isGif ? ',fps=12' : ''}`;

    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(FF, [
        '-y', '-i', tmpIn, '-vf', vf,
        '-vcodec', 'libwebp', '-lossless', '0',
        '-compression_level', '6', '-q:v', '70',
        '-loop', '0', '-preset', 'default', '-an', tmpOut,
      ]);
      let errOut = '';
      proc.stderr.on('data', d => { errOut += d.toString(); });
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${errOut.slice(-200)}`)));
      proc.on('error', reject);
    });

    return fs.readFileSync(tmpOut);
  } finally {
    if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE UPLOAD FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _conn = null; // reference to Baileys socket (set on first use)
let _uploadRunning = false;

async function runDailyUpload(conn, logJid = null) {
  if (_uploadRunning) return;
  _uploadRunning = true;

  const log = (msg) => {
    console.log('[csticker]', msg);
    if (logJid && conn) {
      conn.sendMessage(logJid, { text: msg }).catch(() => {});
    }
  };

  try {
    if (!STATE.enabled) return;
    if (!STATE.channels.length) {
      log('⚠️ No channels set. Use .setchannel to add channels.');
      return;
    }

    // Reset daily count if new day
    if (isNewDay()) {
      STATE.dailyCount    = 0;
      STATE.lastUploadDate = todayStr();
      STATE.categoryIndex = (STATE.categoryIndex + 1) % CATEGORIES.length;
      saveState(STATE);
    }

    if (STATE.dailyCount >= 20) {
      log(`✅ Daily quota (20) already reached for today.`);
      return;
    }

    const category = getTodayCategory();
    const needed   = 20 - STATE.dailyCount;

    log(`🎴 Starting daily upload | Category: ${category.emoji} ${category.name} | Need: ${needed} stickers`);

    const freshItems = await getFreshUrls(category, needed);
    if (!freshItems.length) {
      log('❌ No fresh sticker URLs found. Will retry next cycle.');
      return;
    }

    log(`📦 Found ${freshItems.length} fresh stickers. Converting & uploading...`);

    let uploaded = 0;
    let failed   = 0;

    for (const item of freshItems) {
      if (!STATE.enabled) break; // stop if turned off mid-upload

      try {
        const webpBuf = await urlToWebpBuffer(item.url);

        // Send to all channels
        for (const channelJid of STATE.channels) {
          try {
            await conn.sendMessage(channelJid, {
              sticker: webpBuf,
              stickerMetadata: {
                pack:   `${category.emoji} ${category.name}`,
                author: Config.AUTHOR || 'CDT | SHAVIYA',
              },
            });
            await new Promise(r => setTimeout(r, 600)); // small delay per channel
          } catch (e) {
            console.error('[csticker] channel send fail:', channelJid, e.message);
          }
        }

        // Mark as uploaded
        STATE.uploadedHashes.push(item.hash);
        STATE.dailyCount++;
        STATE.totalSent++;
        uploaded++;

        // Keep hash list manageable
        if (STATE.uploadedHashes.length > 2000) {
          STATE.uploadedHashes = STATE.uploadedHashes.slice(-1000);
        }

        saveState(STATE);

        // Delay between stickers (avoid flood)
        await new Promise(r => setTimeout(r, 2500));

      } catch (e) {
        failed++;
        console.error('[csticker] sticker process fail:', e.message);
        await new Promise(r => setTimeout(r, 1000));
      }

      if (STATE.dailyCount >= 20) break;
    }

    log(
      `✅ Upload complete!\n` +
      `📊 Category: ${category.emoji} ${category.name}\n` +
      `📤 Uploaded: ${uploaded} | Failed: ${failed}\n` +
      `📅 Today total: ${STATE.dailyCount}/20\n` +
      `📈 All time: ${STATE.totalSent} stickers`
    );

  } catch (e) {
    console.error('[csticker] runDailyUpload error:', e.message);
  } finally {
    _uploadRunning = false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCHEDULER  (checks every 30 min, uploads at 9AM)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _schedulerStarted = false;

function startScheduler(conn) {
  if (_schedulerStarted) return;
  _schedulerStarted = true;
  _conn = conn;

  console.log('[csticker] ✅ Scheduler started (checks every 30 min)');

  setInterval(async () => {
    if (!STATE.enabled || !_conn) return;

    const now  = new Date();
    const hour = now.getHours();
    const min  = now.getMinutes();

    // Upload window: 9:00 AM - 9:30 AM daily
    const isUploadTime = (hour === 9 && min < 30);

    if (isUploadTime && (isNewDay() || STATE.dailyCount < 20)) {
      console.log('[csticker] ⏰ Upload time triggered!');
      await runDailyUpload(_conn);
    }
  }, 30 * 60 * 1000); // every 30 minutes
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OWNER CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function isOwner(m) {
  const sender   = (m.sender || '').split('@')[0].replace(/[^0-9]/g, '');
  const ownerNum = (Config.OWNER_NUMBER || '94707085822').toString().replace(/[^0-9]/g, '');
  return sender === ownerNum;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMD: .csticker on/off/status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern:  'csticker',
  alias:    ['channelsticker', 'csticket'],
  desc:     'Auto daily sticker upload to WhatsApp channel',
  category: 'owner',
  fromMe:   true,
  filename: __filename,
}, async (conn, mek, m, { q: text, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Owner only.');

  // Start scheduler on first use
  startScheduler(conn);

  const arg = (text || '').trim().toLowerCase();

  // ── .csticker (no args) → status ─────────────────
  if (!arg || arg === 'status') {
    const cat = getTodayCategory();
    return reply(
      `╭━━━「 🎴 *CHANNEL STICKER* 」━━━╮\n` +
      `┃\n` +
      `┃ Status:  ${STATE.enabled ? '✅ ON' : '❌ OFF'}\n` +
      `┃ Channels: ${STATE.channels.length}/5\n` +
      `┃ Today: ${STATE.dailyCount}/20 stickers sent\n` +
      `┃ Total sent: ${STATE.totalSent}\n` +
      `┃ Today's category:\n` +
      `┃  ${cat.emoji} ${cat.name}\n` +
      `┃ Upload time: 9:00 AM daily\n` +
      `┃\n` +
      `${STATE.channels.length ? STATE.channels.map((c, i) => `┃ Ch${i+1}: ...${c.slice(-20)}`).join('\n') + '\n' : ''}` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
      `Commands:\n` +
      `*.csticker on* - Enable auto upload\n` +
      `*.csticker off* - Disable\n` +
      `*.setchannel <jid>* - Add channel\n` +
      `*.removechannel <jid>* - Remove channel\n` +
      `*.csticker now* - Upload immediately\n` +
      `*.csticker cats* - Show all categories`
    );
  }

  // ── .csticker on ──────────────────────────────────
  if (arg === 'on') {
    if (!STATE.channels.length) {
      return reply('❌ No channels added yet!\nUse *.setchannel <jid>* first.');
    }
    STATE.enabled = true;
    saveState(STATE);
    startScheduler(conn);
    return reply(
      `✅ *Auto sticker upload ENABLED!*\n\n` +
      `📅 Daily: 20 stickers at 9:00 AM\n` +
      `🔄 Category rotates daily\n` +
      `📢 Channels: ${STATE.channels.length}\n\n` +
      `_Use .csticker now to upload immediately_`
    );
  }

  // ── .csticker off ─────────────────────────────────
  if (arg === 'off') {
    STATE.enabled = false;
    saveState(STATE);
    return reply('❌ *Auto sticker upload DISABLED.*');
  }

  // ── .csticker now (manual trigger) ───────────────
  if (arg === 'now') {
    if (!STATE.channels.length) return reply('❌ No channels set. Use .setchannel first.');
    await reply('⏳ Starting manual upload now...');
    // Reset daily counter to allow re-upload
    STATE.dailyCount    = 0;
    STATE.lastUploadDate = null;
    saveState(STATE);
    await runDailyUpload(conn, m.key.remoteJid);
    return;
  }

  // ── .csticker cats (show categories) ─────────────
  if (arg === 'cats' || arg === 'categories') {
    const current = STATE.categoryIndex % CATEGORIES.length;
    let txt = `╭━━━「 📋 *STICKER CATEGORIES* 」━━━╮\n\n`;
    CATEGORIES.forEach((c, i) => {
      const isCurrent = i === current;
      txt += `  ${isCurrent ? '▶️' : '  '} *${i+1}.* ${c.emoji} ${c.name}\n`;
    });
    txt += `\n┃ ▶️ = Today's category\n`;
    txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    return reply(txt);
  }

  // ── .csticker reset ───────────────────────────────
  if (arg === 'reset') {
    STATE.dailyCount     = 0;
    STATE.lastUploadDate = null;
    STATE.uploadedHashes = [];
    saveState(STATE);
    return reply('✅ Daily counter & duplicate cache reset.');
  }

  return reply(
    `Unknown option. Use:\n` +
    `*.csticker on/off/status/now/cats/reset*`
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMD: .setchannel <jid>
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern:  'setchannel',
  desc:     'Add a WhatsApp channel JID for auto sticker upload',
  category: 'owner',
  fromMe:   true,
  filename: __filename,
}, async (conn, mek, m, { q: text, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Owner only.');

  // Clean JID — strip < > brackets, quotes, spaces
  console.log('[setchannel] raw q:', JSON.stringify(text));
  const jid = (text || '').trim()
    .replace(/^[<"'\s]+|[>"'\s]+$/g, '')
    .replace(/\s+/g, '');

  if (!jid) {
    return reply(
      `╭─「 📢 *SET CHANNEL* 」\n` +
      `│\n` +
      `│ Usage: *.setchannel <jid>*\n` +
      `│\n` +
      `│ How to get channel JID:\n` +
      `│ 1. Bot channel message forward කරන්න\n` +
      `│ 2. *.channeljid* command use කරන්න\n` +
      `│    (format: 120363...@newsletter)\n` +
      `│\n` +
      `│ Current channels (${STATE.channels.length}/5):\n` +
      `${STATE.channels.length ? STATE.channels.map((c, i) => `│ ${i+1}. ${c}`).join('\n') : '│ _None added yet_'}\n` +
      `╰──────────────────`
    );
  }

  // Validate JID format
  if (!jid.includes('@newsletter') && !jid.includes('@g.us') && !jid.includes('@s.whatsapp.net')) {
    return reply(
      `❌ Invalid JID format!\n\n` +
      `Channel JID format: *120363xxxxxx@newsletter*\n` +
      `Group JID format: *120363xxxxxx@g.us*`
    );
  }

  if (STATE.channels.includes(jid)) {
    return reply('⚠️ This channel is already added!');
  }

  if (STATE.channels.length >= 5) {
    return reply(
      `❌ Maximum 5 channels reached!\n` +
      `Remove one first: *.removechannel <jid>*`
    );
  }

  STATE.channels.push(jid);
  saveState(STATE);

  return reply(
    `✅ *Channel added!*\n\n` +
    `📢 JID: \`${jid}\`\n` +
    `📊 Total channels: ${STATE.channels.length}/5\n\n` +
    `_Use .csticker on to enable auto upload_`
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMD: .removechannel <jid>
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern:  'removechannel',
  alias:    ['delchannel', 'rmchannel'],
  desc:     'Remove a channel from auto sticker upload',
  category: 'owner',
  fromMe:   true,
  filename: __filename,
}, async (conn, mek, m, { q: text, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Owner only.');

  const jid = (text || '').trim();

  if (!jid) {
    if (!STATE.channels.length) return reply('❌ No channels added yet.');
    let txt = `╭─「 📢 *CHANNELS* 」\n`;
    STATE.channels.forEach((c, i) => { txt += `│ *${i+1}.* ${c}\n`; });
    txt += `│\n│ Remove: *.removechannel <jid>*\n╰──────────────────`;
    return reply(txt);
  }

  const idx = STATE.channels.indexOf(jid);
  if (idx === -1) return reply(`❌ Channel not found:\n\`${jid}\``);

  STATE.channels.splice(idx, 1);
  if (!STATE.channels.length) STATE.enabled = false;
  saveState(STATE);

  return reply(
    `✅ *Channel removed!*\n` +
    `📊 Remaining: ${STATE.channels.length}/5` +
    (STATE.channels.length === 0 ? '\n\n⚠️ No channels left — auto upload disabled.' : '')
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AUTO-START scheduler when plugin loads
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Will be properly initialized when first command is run
// (conn reference needed)
console.log('[csticker] ✅ Plugin loaded | Channels:', STATE.channels.length, '| Enabled:', STATE.enabled);
