// plugins/premiumsticker.js — SHAVIYA-XMD V2
// Premium Animated Sticker Pack Downloader
// Coded by CDT | Crash Delta Team

'use strict';

const { cmd }  = require('../command');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const axios    = require('axios');
const Config   = require('../config');

// ── ffmpeg resolve (same chain as sticker.js) ──────────────────
let ffmpegPath = null;
try {
  const s = require('ffmpeg-static');
  if (s && fs.existsSync(s)) { try { fs.chmodSync(s, 0o755); } catch (_) {} ffmpegPath = s; }
} catch (_) {}
if (!ffmpegPath) {
  try {
    const inst = require('@ffmpeg-installer/ffmpeg');
    if (inst?.path && fs.existsSync(inst.path)) ffmpegPath = inst.path;
  } catch (_) {}
}
if (!ffmpegPath) {
  try {
    const { execSync } = require('child_process');
    const sys = execSync('which ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
    if (sys) ffmpegPath = sys;
  } catch (_) {}
}
const FF = ffmpegPath || 'ffmpeg';

// ── GIPHY public key ───────────────────────────────────────────
const GIPHY_KEY = 'dc6zaTOxFJmzC';

// ── Built-in Premium Pack Catalog ─────────────────────────────
const PACKS = [
  { id: 1,  name: '☁️ Cloudy Vibes',   desc: 'Animated clouds & loading spinners', gTag: 'cloud animated cute',        tTag: 'cloud animation sticker' },
  { id: 2,  name: '🦕 Dino Memes',     desc: 'Funny dino stickers',                gTag: 'dinosaur funny animated',     tTag: 'funny dinosaur sticker' },
  { id: 3,  name: '😂 Ultra Funny',    desc: 'Premium funny animated stickers',    gTag: 'funny meme sticker animated', tTag: 'funny sticker pack' },
  { id: 4,  name: '🌸 Anime Cute',     desc: 'Kawaii anime stickers',              gTag: 'anime cute kawaii sticker',   tTag: 'anime cute sticker' },
  { id: 5,  name: '🔥 Savage Mode',    desc: 'Savage reaction stickers',           gTag: 'savage reaction sticker',     tTag: 'savage attitude sticker' },
  { id: 6,  name: '🎉 Celebration',    desc: 'Party & celebration animated',       gTag: 'celebration party confetti',  tTag: 'celebration sticker animated' },
  { id: 7,  name: '💀 Dark Humor',     desc: 'Dark funny skull stickers',          gTag: 'skull dark humor sticker',    tTag: 'skull funny sticker' },
  { id: 8,  name: '🐱 Cat Vibes',      desc: 'Premium animated cat stickers',      gTag: 'cat funny animated sticker',  tTag: 'cat sticker animated' },
  { id: 9,  name: '💬 Mood Texts',     desc: 'Animated text mood stickers',        gTag: 'mood text sticker animated',  tTag: 'mood text sticker' },
  { id: 10, name: '⚡ Action Pack',    desc: 'Action & energy stickers',           gTag: 'action energy power sticker', tTag: 'action sticker animated' },
];

// ── Fetch helpers ──────────────────────────────────────────────
async function fetchGiphy(tag, limit = 8) {
  try {
    const { data } = await axios.get('https://api.giphy.com/v1/stickers/search', {
      params: { api_key: GIPHY_KEY, q: tag, limit, rating: 'g' },
      timeout: 10000,
    });
    return (data?.data || [])
      .map(g => g.images?.fixed_width?.url || g.images?.downsized?.url)
      .filter(Boolean);
  } catch { return []; }
}

async function fetchGiphyRandom(tag) {
  try {
    const { data } = await axios.get('https://api.giphy.com/v1/stickers/random', {
      params: { api_key: GIPHY_KEY, tag, rating: 'g' },
      timeout: 10000,
    });
    return data?.data?.images?.original?.url || null;
  } catch { return null; }
}

async function fetchTenor(query, limit = 5) {
  try {
    const { data } = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: { q: query, key: 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk', limit, media_filter: 'gif' },
      timeout: 10000,
    });
    return (data?.results || [])
      .map(r => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url)
      .filter(Boolean);
  } catch { return []; }
}

// ── Convert URL → animated WebP → send sticker ────────────────
async function sendAsSticker(url, conn, jid, m, packName, author) {
  const ts    = Date.now() + Math.random().toString(36).slice(2, 5);
  const isGif = /\.gif|giphy|tenor/i.test(url);
  const tmpIn  = path.join(os.tmpdir(), `pstk_${ts}.${isGif ? 'gif' : 'png'}`);
  const tmpOut = path.join(os.tmpdir(), `pstk_${ts}.webp`);

  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    fs.writeFileSync(tmpIn, Buffer.from(res.data));

    const vf = `scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000${isGif ? ',fps=15' : ''}`;
    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(FF, ['-y', '-i', tmpIn, '-vf', vf, '-vcodec', 'libwebp', '-lossless', '0', '-compression_level', '6', '-q:v', '70', '-loop', '0', '-preset', 'default', '-an', tmpOut]);
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
      proc.on('error', reject);
    });

    await conn.sendMessage(jid, {
      sticker: fs.readFileSync(tmpOut),
      stickerMetadata: { pack: packName || Config.PACKNAME || 'SHAVIYA Premium', author: author || Config.AUTHOR || 'CDT' },
    }, { quoted: m });
    return true;
  } catch (e) {
    console.error('[premiumsticker]', e.message);
    return false;
  } finally {
    if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

// ── Session store ─────────────────────────────────────────────
const sessions = new Map();
function setSession(jid, data) {
  sessions.set(jid, { ...data, ts: Date.now() });
  setTimeout(() => sessions.delete(jid), 5 * 60 * 1000);
}

// ── Menu builder ──────────────────────────────────────────────
function buildMenu() {
  let t = `╭━━━「 🎴 *PREMIUM STICKER PACKS* 」━━━╮\n`;
  t    += `┃  Animated & HD Sticker Collections\n`;
  t    += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  PACKS.forEach(p => {
    t += `  *${p.id}.* ${p.name}\n`;
    t += `      └ _${p.desc}_\n\n`;
  });
  t += `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
  t += `┃ Reply with *number* to download\n`;
  t += `┃ Ex: reply *1* → Cloud pack\n`;
  t += `┃\n`;
  t += `┃ *.premium random* - Random sticker\n`;
  t += `┃ *.premium search <kw>* - Search\n`;
  t += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
  return t;
}

// ── Send pack helper ───────────────────────────────────────────
async function sendPack(pack, conn, jid, m, reply) {
  let urls = await fetchGiphy(pack.gTag, 8);
  if (urls.length < 3) {
    const t = await fetchTenor(pack.tTag, 5);
    urls = [...urls, ...t];
  }
  if (!urls.length) return reply(`❌ Could not fetch stickers for *${pack.name}*. Try again.`);

  const limit = Math.min(urls.length, 8);
  await reply(`✅ *${pack.name}*\nSending *${limit}* animated stickers...`);

  let sent = 0;
  for (let i = 0; i < limit; i++) {
    if (await sendAsSticker(urls[i], conn, jid, m, pack.name, 'CDT Premium')) sent++;
    await new Promise(r => setTimeout(r, 900));
  }
  return reply(`╭─「 ✅ *DONE* 」\n│ Pack: *${pack.name}*\n│ Sent: *${sent}/${limit}* stickers\n│ Type *.premium* for more!\n╰──────────────────`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COMMAND: .premium
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern:  'premium',
  alias:    ['packsticker', 'premiumsticker'],
  desc:     'Premium animated sticker packs',
  category: 'sticker',
  filename: __filename,
}, async (conn, m, mek, { text, reply }) => {
  const jid = m.key.remoteJid;
  const arg = (text || '').trim().toLowerCase();

  if (!arg) {
    setSession(jid, { type: 'menu' });
    return reply(buildMenu());
  }

  // .premium random
  if (arg === 'random') {
    const pack = PACKS[Math.floor(Math.random() * PACKS.length)];
    await reply(`🎲 *Random Pack:* ${pack.name}\n⏳ Fetching...`);
    let url = await fetchGiphyRandom(pack.gTag);
    if (!url) { const t = await fetchTenor(pack.tTag, 3); url = t[0] || null; }
    if (!url) return reply('❌ Failed. Try again.');
    const ok = await sendAsSticker(url, conn, jid, m, pack.name, 'CDT Premium');
    return reply(ok ? `✅ *${pack.name}* sticker sent!` : '❌ Convert failed.');
  }

  // .premium search <kw>
  if (arg.startsWith('search ')) {
    const kw = text.trim().slice(7).trim();
    if (!kw) return reply('Usage: *.premium search <keyword>*');
    await reply(`🔍 *Searching:* _${kw}_`);
    let urls = await fetchGiphy(kw, 6);
    if (!urls.length) urls = await fetchTenor(kw, 5);
    if (!urls.length) return reply(`❌ No stickers found for "${kw}"`);
    await reply(`✅ Found *${urls.length}* stickers. Sending...`);
    let sent = 0;
    for (const u of urls.slice(0, 6)) {
      if (await sendAsSticker(u, conn, jid, m, kw, 'CDT Search')) sent++;
      await new Promise(r => setTimeout(r, 800));
    }
    return reply(`🎴 Sent *${sent}* stickers for _"${kw}"_`);
  }

  // .premium <number> directly
  const num = parseInt(arg);
  if (!isNaN(num) && num >= 1 && num <= 10) {
    const pack = PACKS.find(p => p.id === num);
    await reply(`╭─「 🎴 *${pack.name}* 」\n│ _${pack.desc}_\n│ ⏳ Fetching...\n╰──────────────────`);
    return sendPack(pack, conn, jid, m, reply);
  }

  setSession(jid, { type: 'menu' });
  return reply(buildMenu());
});

// ── Reply-based number selection ──────────────────────────────
cmd({
  pattern:            /^(10|[1-9])$/,
  on:                 'text',
  dontAddCommandList: true,
  filename:           __filename,
}, async (conn, m, mek, { reply }) => {
  const jid     = m.key.remoteJid;
  const session = sessions.get(jid);
  if (!session || session.type !== 'menu') return;

  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return;

  const raw = (m.message?.extendedTextMessage?.text || m.message?.conversation || '').trim();
  const num  = parseInt(raw);
  const pack = PACKS.find(p => p.id === num);
  if (!pack) return;

  sessions.delete(jid);
  await reply(`╭─「 🎴 *${pack.name}* 」\n│ _${pack.desc}_\n│ ⏳ Fetching animated stickers...\n╰──────────────────`);
  return sendPack(pack, conn, jid, m, reply);
});
