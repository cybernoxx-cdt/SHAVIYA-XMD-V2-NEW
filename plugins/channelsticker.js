// plugins/channelsticker.js — SHAVIYA-XMD V2
// Auto Daily Sticker Upload to WhatsApp Channel(s)
// Coded by CDT | Crash Delta Team
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADVANCED SOURCES (7 total):
//  1. Giphy API      — multi-key rotation
//  2. Tenor          — v2 → v1 fallback
//  3. Giphy CDN      — web scrape, no key
//  4. waifu.pics     — free anime GIF API
//  5. nekos.best     — free anime GIF API
//  6. otakugifs.xyz  — free anime reactions
//  7. kyoko.rest     — free anime GIF API
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
//  STICKER CATEGORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CATEGORIES = [
  { name: 'Meme Stickers',   emoji: '😂', gTag: 'funny meme sticker',         tTag: 'meme sticker',        ezTag: 'meme funny',     waifuType: 'dance',    nekosType: 'laugh'    },
  { name: 'Cute Stickers',   emoji: '🌸', gTag: 'cute kawaii sticker',         tTag: 'cute sticker',        ezTag: 'cute kawaii',    waifuType: 'pat',      nekosType: 'smile'    },
  { name: 'Girl Stickers',   emoji: '💁‍♀️', gTag: 'girl cute sticker',          tTag: 'girl sticker',        ezTag: 'girl cute',      waifuType: 'wink',     nekosType: 'wink'     },
  { name: 'Anime Stickers',  emoji: '🎌', gTag: 'anime sticker kawaii',        tTag: 'anime sticker',       ezTag: 'anime kawaii',   waifuType: 'happy',    nekosType: 'happy'    },
  { name: 'Savage Stickers', emoji: '🔥', gTag: 'savage attitude sticker',     tTag: 'savage sticker',      ezTag: 'savage',         waifuType: 'slap',     nekosType: 'thumbsup' },
  { name: 'Love Stickers',   emoji: '❤️', gTag: 'love heart sticker',          tTag: 'love sticker',        ezTag: 'love heart',     waifuType: 'hug',      nekosType: 'kiss'     },
  { name: 'Funny Animal',    emoji: '🐾', gTag: 'funny animal sticker',        tTag: 'animal funny',        ezTag: 'funny animal',   waifuType: 'poke',     nekosType: 'smile'    },
  { name: 'Celebration',     emoji: '🎉', gTag: 'celebration party sticker',   tTag: 'celebration sticker', ezTag: 'celebration',    waifuType: 'dance',    nekosType: 'happy'    },
  { name: 'Dark Humor',      emoji: '💀', gTag: 'dark humor skull sticker',    tTag: 'dark humor sticker',  ezTag: 'skull dark',     waifuType: 'bully',    nekosType: 'laugh'    },
  { name: 'Reaction Pack',   emoji: '😤', gTag: 'reaction expression sticker', tTag: 'reaction sticker',    ezTag: 'reaction face',  waifuType: 'cry',      nekosType: 'blushing' },
  { name: 'Cloudy Vibes',    emoji: '☁️', gTag: 'cloud aesthetic sticker',     tTag: 'cloud sticker',       ezTag: 'cloud aesthetic',waifuType: 'smile',    nekosType: 'smile'    },
  { name: 'Dino Pack',       emoji: '🦕', gTag: 'dinosaur funny sticker',      tTag: 'dinosaur sticker',    ezTag: 'dinosaur cute',  waifuType: 'dance',    nekosType: 'happy'    },
  { name: 'Neon Aesthetic',  emoji: '🌈', gTag: 'neon colorful sticker',       tTag: 'neon sticker',        ezTag: 'neon aesthetic', waifuType: 'wave',     nekosType: 'wave'     },
  { name: 'Sports Stickers', emoji: '⚽', gTag: 'sports football sticker',     tTag: 'sports sticker',      ezTag: 'sports',         waifuType: 'highfive', nekosType: 'thumbsup' },
  { name: 'Sad Vibes',       emoji: '😢', gTag: 'sad crying sticker',          tTag: 'sad sticker',         ezTag: 'sad cry',        waifuType: 'cry',      nekosType: 'cry'      },
  { name: 'Boss Vibes',      emoji: '😎', gTag: 'boss cool sticker',           tTag: 'cool sticker',        ezTag: 'boss cool',      waifuType: 'wink',     nekosType: 'wink'     },
  { name: 'Food Stickers',   emoji: '🍕', gTag: 'food funny sticker',          tTag: 'food sticker',        ezTag: 'food funny',     waifuType: 'nom',      nekosType: 'smile'    },
  { name: 'Night Vibes',     emoji: '🌙', gTag: 'night moon aesthetic',        tTag: 'night sticker',       ezTag: 'night aesthetic',waifuType: 'sleep',    nekosType: 'smile'    },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GIPHY KEY POOL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GIPHY_KEYS = [
  'dc6zaTOxFJmzC',
  'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh',
  'FmQNA5N3p4PFPAgxoGr5EcArqmOqhfos',
  'J5i2rqHn6SUWSlFNMXHXWfAT5AFOXQ3V',
];
let _giphyKeyIdx = 0;
function nextGiphyKey() { return GIPHY_KEYS[(_giphyKeyIdx++) % GIPHY_KEYS.length]; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PERSISTENT STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const STATE_FILE = path.join(__dirname, '../data/channelsticker.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_) {}
  return {
    enabled: false, channels: [], categoryIndex: 0,
    lastUploadDate: null, uploadedHashes: [], dailyCount: 0, totalSent: 0,
    dailyLimit: 20, uploadHour: 9,
    sourceStats: {}, failedSources: {}, customCategories: [],
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

// Ensure new fields exist on old state files
if (!STATE.dailyLimit)       STATE.dailyLimit       = 20;
if (!STATE.uploadHour)       STATE.uploadHour       = 9;
if (!STATE.sourceStats)      STATE.sourceStats      = {};
if (!STATE.failedSources)    STATE.failedSources    = {};
if (!STATE.customCategories) STATE.customCategories = [];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function hashUrl(url) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  return h.toString(36);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function isNewDay() { return STATE.lastUploadDate !== todayStr(); }
function getAllCategories() { return [...CATEGORIES, ...(STATE.customCategories || [])]; }
function getTodayCategory() { const all = getAllCategories(); return all[STATE.categoryIndex % all.length]; }

function markSourceSuccess(name, count) {
  STATE.sourceStats[name] = (STATE.sourceStats[name] || 0) + count;
  delete STATE.failedSources[name];
}
function markSourceFailed(name) { STATE.failedSources[name] = Date.now(); }
function isSourceOnCooldown(name) {
  const t = STATE.failedSources?.[name];
  return t && (Date.now() - t) < 60 * 60 * 1000;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 1: Giphy API  (key rotation, stickers + gifs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchGiphyUrls(tag, limit = 25) {
  if (isSourceOnCooldown('giphy')) return [];
  for (const ep of ['stickers', 'gifs']) {
    try {
      const { data } = await axios.get(`https://api.giphy.com/v1/${ep}/search`, {
        params: { api_key: nextGiphyKey(), q: tag, limit, rating: 'g', offset: Math.floor(Math.random() * 60) },
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const urls = (data?.data || [])
        .map(g => g.images?.fixed_width?.url || g.images?.downsized?.url || g.images?.original?.url)
        .filter(Boolean);
      if (urls.length) { markSourceSuccess('giphy', urls.length); console.log(`[csticker] ✅ Giphy(${ep}): ${urls.length}`); return urls; }
    } catch (_) {}
  }
  markSourceFailed('giphy');
  console.log('[csticker] ❌ Giphy failed');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 2: Tenor  (v2 → v1 fallback)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchTenorUrls(query, limit = 20) {
  if (isSourceOnCooldown('tenor')) return [];
  try {
    const { data } = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: { q: query, key: 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk', limit, media_filter: 'gif', contentfilter: 'medium' },
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const urls = (data?.results || []).map(r => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || r.media_formats?.mediumgif?.url).filter(Boolean);
    if (urls.length) { markSourceSuccess('tenor', urls.length); console.log(`[csticker] ✅ Tenor v2: ${urls.length}`); return urls; }
  } catch (_) {}
  try {
    const { data } = await axios.get('https://api.tenor.com/v1/search', {
      params: { q: query, limit, media_filter: 'minimal', contentfilter: 'medium' },
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const urls = (data?.results || []).map(r => r.media?.[0]?.gif?.url || r.media?.[0]?.tinygif?.url).filter(Boolean);
    if (urls.length) { markSourceSuccess('tenor', urls.length); console.log(`[csticker] ✅ Tenor v1: ${urls.length}`); return urls; }
  } catch (_) {}
  markSourceFailed('tenor');
  console.log('[csticker] ❌ Tenor failed');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 3: Giphy CDN Scrape  (no key needed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchGiphyCdnUrls(tag, limit = 20) {
  if (isSourceOnCooldown('giphy_cdn')) return [];
  try {
    const slug = tag.trim().replace(/\s+/g, '-').toLowerCase();
    const { data } = await axios.get(`https://giphy.com/search/${slug}`, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'text/html' },
    });
    const p1 = /https:\/\/media[0-9]?\.giphy\.com\/media\/[a-zA-Z0-9]+\/giphy\.gif/g;
    const p2 = /https:\/\/media[0-9]?\.giphy\.com\/media\/[a-zA-Z0-9]+\/200\.gif/g;
    const urls = [...new Set([...(data.match(p1) || []), ...(data.match(p2) || [])])].slice(0, limit);
    if (urls.length) { markSourceSuccess('giphy_cdn', urls.length); console.log(`[csticker] ✅ Giphy CDN: ${urls.length}`); return urls; }
  } catch (_) {}
  markSourceFailed('giphy_cdn');
  console.log('[csticker] ❌ Giphy CDN scrape failed');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 4: waifu.pics  (free anime GIFs, no key)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WAIFU_TYPES = ['wink','pat','hug','bully','cry','dance','happy','poke','slap','smile','wave','shoot','highfive','handhold','kick','bite','glomp','blush','cuddle','nom','bonk','yeet','nope'];
async function fetchWaifuUrls(type, limit = 20) {
  if (isSourceOnCooldown('waifu')) return [];
  try {
    const t = WAIFU_TYPES.includes(type) ? type : WAIFU_TYPES[Math.floor(Math.random() * WAIFU_TYPES.length)];
    const { data } = await axios.post(`https://api.waifu.pics/many/sfw/${t}`, {}, {
      timeout: 8000, headers: { 'Content-Type': 'application/json' },
    });
    const urls = (data?.files || []).slice(0, limit);
    if (urls.length) { markSourceSuccess('waifu', urls.length); console.log(`[csticker] ✅ waifu.pics(${t}): ${urls.length}`); return urls; }
  } catch (_) {}
  markSourceFailed('waifu');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 5: nekos.best  (free anime GIFs, no key)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const NEKOS_TYPES = ['smile','wave','laugh','happy','blushing','thumbsup','wink','pat','hug','cry','kiss','cuddle','dance','poke','slap','bite','bonk','yeet','blush','handhold','kick','nope','nom','nod'];
async function fetchNekosUrls(type, limit = 20) {
  if (isSourceOnCooldown('nekos')) return [];
  try {
    const t = NEKOS_TYPES.includes(type) ? type : NEKOS_TYPES[Math.floor(Math.random() * NEKOS_TYPES.length)];
    const { data } = await axios.get(`https://nekos.best/api/v2/${t}?amount=${limit}`, { timeout: 8000 });
    const urls = (data?.results || []).map(r => r.url).filter(Boolean);
    if (urls.length) { markSourceSuccess('nekos', urls.length); console.log(`[csticker] ✅ nekos.best(${t}): ${urls.length}`); return urls; }
  } catch (_) {}
  markSourceFailed('nekos');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 6: otakugifs.xyz  (anime reactions, no key)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const OTAKU_TYPES = ['angry','baka','bite','blush','bonk','bored','cry','cuddle','dance','facepalm','feed','handhold','happy','highfive','hug','kick','kiss','laugh','pat','poke','pout','run','shrug','slap','sleep','smile','smug','stare','think','thumbsup','tired','wave','wink','yes','yeet','nod','nope','nom','lick'];
async function fetchOtakuUrls(type, limit = 10) {
  if (isSourceOnCooldown('otaku')) return [];
  try {
    const t = OTAKU_TYPES.includes(type) ? type : OTAKU_TYPES[Math.floor(Math.random() * OTAKU_TYPES.length)];
    const fetches = Array.from({ length: Math.min(limit, 8) }, () =>
      axios.get(`https://api.otakugifs.xyz/gif?reaction=${t}`, { timeout: 6000 }).then(r => r.data?.url).catch(() => null)
    );
    const results = await Promise.allSettled(fetches);
    const urls = [...new Set(results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value))];
    if (urls.length) { markSourceSuccess('otaku', urls.length); console.log(`[csticker] ✅ otakugifs(${t}): ${urls.length}`); return urls; }
  } catch (_) {}
  markSourceFailed('otaku');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCE 7: kyoko.rest  (anime GIFs, no key)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const KYOKO_TYPES = ['wink','pat','hug','dance','cry','smile','blush','wave','poke','bite','bonk','cuddle','happy','highfive','kick','kiss','laugh','nod','nom','nope','slap','smug','yeet'];
async function fetchKyokoUrls(type, limit = 8) {
  if (isSourceOnCooldown('kyoko')) return [];
  try {
    const t = KYOKO_TYPES.includes(type) ? type : KYOKO_TYPES[Math.floor(Math.random() * KYOKO_TYPES.length)];
    const fetches = Array.from({ length: Math.min(limit, 6) }, () =>
      axios.get(`https://api.kyoko.rest/v1/animate/${t}`, { timeout: 6000 }).then(r => r.data?.url || r.data?.gif).catch(() => null)
    );
    const results = await Promise.allSettled(fetches);
    const urls = [...new Set(results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value))];
    if (urls.length) { markSourceSuccess('kyoko', urls.length); console.log(`[csticker] ✅ kyoko.rest(${t}): ${urls.length}`); return urls; }
  } catch (_) {}
  markSourceFailed('kyoko');
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MASTER FETCH — all 7 sources in parallel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getFreshUrls(category, needed = 20) {
  console.log(`[csticker] 🔍 Fetching | ${category.name} | Need: ${needed}`);

  const wt = category.waifuType || 'dance';
  const nt = category.nekosType || 'smile';

  const [gUrls, tUrls, cdnUrls, waifuUrls, nekosUrls, otakuUrls, kyokoUrls] =
    await Promise.allSettled([
      fetchGiphyUrls(category.gTag, 30),
      fetchTenorUrls(category.tTag, 25),
      fetchGiphyCdnUrls(category.ezTag, 25),
      fetchWaifuUrls(wt, 20),
      fetchNekosUrls(nt, 20),
      fetchOtakuUrls(nt, 10),
      fetchKyokoUrls(wt, 8),
    ]).then(r => r.map(x => x.status === 'fulfilled' ? x.value : []));

  console.log(`[csticker] 📊 G:${gUrls.length} T:${tUrls.length} CDN:${cdnUrls.length} Waifu:${waifuUrls.length} Nekos:${nekosUrls.length} Otaku:${otakuUrls.length} Kyoko:${kyokoUrls.length}`);

  let allUrls = [...gUrls, ...tUrls, ...cdnUrls, ...waifuUrls, ...nekosUrls, ...otakuUrls, ...kyokoUrls]
    .sort(() => Math.random() - 0.5);

  if (!allUrls.length) { console.error('[csticker] ❌ ALL 7 sources = 0 URLs'); return []; }

  // Dedup
  let fresh = [];
  for (const u of allUrls) {
    const h = hashUrl(u);
    if (!STATE.uploadedHashes.includes(h)) { fresh.push({ url: u, hash: h }); if (fresh.length >= needed) break; }
  }

  // Hash cache overflow
  if (fresh.length < needed && STATE.uploadedHashes.length > 300) {
    console.log(`[csticker] 🧹 Hash cache trimmed (${STATE.uploadedHashes.length} → 100)`);
    STATE.uploadedHashes = STATE.uploadedHashes.slice(-100);
    for (const u of allUrls) {
      const h = hashUrl(u);
      if (!fresh.find(f => f.hash === h) && !STATE.uploadedHashes.includes(h)) { fresh.push({ url: u, hash: h }); if (fresh.length >= needed) break; }
    }
  }

  // Last resort — bypass dedup
  if (!fresh.length && allUrls.length > 0) {
    console.log('[csticker] ⚠️ Bypassing dedup');
    STATE.uploadedHashes = [];
    fresh = allUrls.slice(0, needed).map(u => ({ url: u, hash: hashUrl(u) }));
  }

  console.log(`[csticker] ✅ Fresh URLs ready: ${fresh.length}`);
  return fresh;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONVERT URL → animated WebP buffer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function urlToWebpBuffer(url) {
  const ts     = Date.now() + Math.random().toString(36).slice(2, 5);
  const isGif  = /\.gif|giphy|tenor/i.test(url);
  const tmpIn  = path.join(os.tmpdir(), `cstk_${ts}.${isGif ? 'gif' : 'png'}`);
  const tmpOut = path.join(os.tmpdir(), `cstk_${ts}.webp`);
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 25000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://giphy.com/', 'Accept': 'image/*,*/*' },
    });
    if (!res.data || res.data.byteLength < 500) throw new Error(`Too small (${res.data?.byteLength || 0}B)`);
    fs.writeFileSync(tmpIn, Buffer.from(res.data));

    const vf = ['scale=512:512:force_original_aspect_ratio=decrease', 'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000', ...(isGif ? ['fps=15'] : [])].join(',');
    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(FF, ['-y', '-i', tmpIn, '-vf', vf, '-vcodec', 'libwebp', '-lossless', '0', '-compression_level', '6', '-q:v', '75', '-loop', '0', '-preset', 'default', '-an', tmpOut]);
      let errOut = '';
      proc.stderr.on('data', d => { errOut += d.toString(); });
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${errOut.slice(-300)}`)));
      proc.on('error', reject);
    });

    const buf = fs.readFileSync(tmpOut);
    if (buf.length < 200) throw new Error('Output WebP too small');
    return buf;
  } finally {
    try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (_) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE UPLOAD FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _conn = null, _uploadRunning = false;

async function runDailyUpload(conn, logJid = null) {
  if (_uploadRunning) return;
  _uploadRunning = true;
  const log = msg => { console.log('[csticker]', msg); if (logJid && conn) conn.sendMessage(logJid, { text: msg }).catch(() => {}); };

  try {
    if (!STATE.enabled) return;
    if (!STATE.channels.length) { log('⚠️ No channels set. Use .setchannel'); return; }

    if (isNewDay()) {
      STATE.dailyCount = 0;
      STATE.lastUploadDate = todayStr();
      STATE.categoryIndex = (STATE.categoryIndex + 1) % getAllCategories().length;
      saveState(STATE);
    }

    const limit = STATE.dailyLimit || 20;
    if (STATE.dailyCount >= limit) { log(`✅ Daily quota (${limit}) reached.`); return; }

    const category = getTodayCategory();
    const needed   = limit - STATE.dailyCount;

    log(`🎴 Upload start\n📂 ${category.emoji} ${category.name}\n📦 Need: ${needed}`);

    const freshItems = await getFreshUrls(category, needed);
    if (!freshItems.length) { log('❌ No URLs from any source. Check connection.'); return; }

    log(`✅ ${freshItems.length} stickers ready. Uploading...`);
    let uploaded = 0, failed = 0;

    for (const item of freshItems) {
      if (!STATE.enabled) break;
      try {
        const webpBuf = await urlToWebpBuffer(item.url);
        for (const channelJid of STATE.channels) {
          try {
            await conn.sendMessage(channelJid, {
              sticker: webpBuf,
              stickerMetadata: { pack: `${category.emoji} ${category.name}`, author: Config.AUTHOR || 'CDT | SHAVIYA' },
            });
            await new Promise(r => setTimeout(r, 500));
          } catch (e) { console.error('[csticker] send fail:', channelJid, e.message); }
        }
        STATE.uploadedHashes.push(item.hash);
        STATE.dailyCount++;
        STATE.totalSent++;
        uploaded++;
        if (STATE.uploadedHashes.length > 2000) STATE.uploadedHashes = STATE.uploadedHashes.slice(-1000);
        saveState(STATE);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        failed++;
        console.error('[csticker] sticker fail:', e.message);
        await new Promise(r => setTimeout(r, 1000));
      }
      if (STATE.dailyCount >= limit) break;
    }

    log(`🎉 Done!\n📊 ${category.emoji} ${category.name}\n📤 Uploaded: ${uploaded} | ❌ Failed: ${failed}\n📅 Today: ${STATE.dailyCount}/${limit}\n📈 Total: ${STATE.totalSent}`);
  } catch (e) {
    console.error('[csticker] runDailyUpload error:', e.message);
  } finally {
    _uploadRunning = false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCHEDULER  (checks every 15 min)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _schedulerStarted = false;
function startScheduler(conn) {
  if (_schedulerStarted) return;
  _schedulerStarted = true;
  _conn = conn;
  console.log('[csticker] ✅ Scheduler started (15min intervals)');
  setInterval(async () => {
    if (!STATE.enabled || !_conn) return;
    const h = new Date().getHours(), min = new Date().getMinutes();
    const uh = STATE.uploadHour ?? 9;
    if (h === uh && min < 30 && (isNewDay() || STATE.dailyCount < (STATE.dailyLimit || 20))) {
      console.log('[csticker] ⏰ Scheduled upload!');
      await runDailyUpload(_conn);
    }
  }, 15 * 60 * 1000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMD: .csticker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern: 'csticker', alias: ['channelsticker', 'csticket'],
  desc: 'Auto daily sticker upload to channel', category: 'owner', fromMe: true, filename: __filename,
}, async (conn, mek, m, { q: text, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Owner only.');
  startScheduler(conn);
  const arg = (text || '').trim().toLowerCase();

  // STATUS
  if (!arg || arg === 'status') {
    const cat = getTodayCategory();
    const limit = STATE.dailyLimit || 20;
    const stats = Object.entries(STATE.sourceStats || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `┃  ${k}: ${v}`).join('\n');
    return reply(
      `╭━━━「 🎴 *CHANNEL STICKER* 」━━━╮\n┃\n` +
      `┃ Status  : ${STATE.enabled ? '✅ ON' : '❌ OFF'}\n` +
      `┃ Channels: ${STATE.channels.length}/10\n` +
      `┃ Today   : ${STATE.dailyCount}/${limit}\n` +
      `┃ Total   : ${STATE.totalSent} sent\n` +
      `┃ Category: ${cat.emoji} ${cat.name}\n` +
      `┃ Time    : ${STATE.uploadHour ?? 9}:00 AM\n┃\n` +
      `${STATE.channels.length ? STATE.channels.map((c, i) => `┃ Ch${i+1}: ...${c.slice(-20)}`).join('\n') + '\n┃\n' : ''}` +
      `${stats ? `┃ 📊 Sources:\n${stats}\n┃\n` : ''}` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
      `*.csticker on/off* — toggle\n` +
      `*.csticker now* — upload now\n` +
      `*.csticker cats* — categories\n` +
      `*.csticker sources* — source status\n` +
      `*.csticker setlimit <n>* — daily limit\n` +
      `*.csticker sethour <0-23>* — upload time\n` +
      `*.csticker addcat <emoji> <name>* — add category\n` +
      `*.csticker reset* — reset all`
    );
  }

  if (arg === 'on') {
    if (!STATE.channels.length) return reply('❌ No channels!\nUse *.setchannel <jid>* first.');
    STATE.enabled = true; saveState(STATE); startScheduler(conn);
    return reply(`✅ *ENABLED!*\n\n📅 ${STATE.dailyLimit || 20} stickers @ ${STATE.uploadHour ?? 9}:00 AM\n🌐 7 sources active\n📢 Channels: ${STATE.channels.length}\n\n_Use .csticker now to test_`);
  }

  if (arg === 'off') { STATE.enabled = false; saveState(STATE); return reply('❌ *DISABLED.*'); }

  if (arg === 'now') {
    if (!STATE.channels.length) return reply('❌ No channels set.');
    await reply('⏳ Uploading now...');
    STATE.dailyCount = 0; STATE.lastUploadDate = null; saveState(STATE);
    await runDailyUpload(conn, m.key.remoteJid);
    return;
  }

  if (arg === 'cats' || arg === 'categories') {
    const all = getAllCategories(); const cur = STATE.categoryIndex % all.length;
    let txt = `╭━━━「 📋 *CATEGORIES (${all.length})* 」━━━╮\n\n`;
    all.forEach((c, i) => { txt += `  ${i === cur ? '▶️' : '  '} *${i+1}.* ${c.emoji} ${c.name}${i >= CATEGORIES.length ? ' *(custom)*' : ''}\n`; });
    txt += `\n┃ ▶️ = Today's\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    return reply(txt);
  }

  if (arg === 'sources') {
    const list = [
      ['giphy','Giphy API'], ['tenor','Tenor'], ['giphy_cdn','Giphy CDN'],
      ['waifu','waifu.pics'], ['nekos','nekos.best'], ['otaku','otakugifs.xyz'], ['kyoko','kyoko.rest'],
    ];
    let txt = `╭━━━「 🌐 *SOURCES (7)* 」━━━╮\n\n`;
    list.forEach(([k, label]) => {
      const ok = !isSourceOnCooldown(k);
      txt += `  ${ok ? '🟢' : '🔴'} *${label}* — ${STATE.sourceStats[k] || 0} fetched\n`;
    });
    txt += `\n┃ 🔴 = 1hr cooldown after fail\n`;
    txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n_Use .csticker resetsources to clear_`;
    return reply(txt);
  }

  if (arg.startsWith('setlimit ')) {
    const n = parseInt(arg.split(' ')[1]);
    if (!n || n < 1 || n > 100) return reply('❌ *.csticker setlimit 20* (1–100)');
    STATE.dailyLimit = n; saveState(STATE);
    return reply(`✅ Daily limit: *${n}* stickers`);
  }

  if (arg.startsWith('sethour ')) {
    const h = parseInt(arg.split(' ')[1]);
    if (isNaN(h) || h < 0 || h > 23) return reply('❌ *.csticker sethour 9* (0–23)');
    STATE.uploadHour = h; saveState(STATE);
    return reply(`✅ Upload time: *${h}:00* daily`);
  }

  if (arg.startsWith('addcat ')) {
    const parts = text.trim().split(' ').slice(1);
    if (parts.length < 2) return reply('❌ *.csticker addcat 🎭 Theater*');
    const emoji = parts[0], name = parts.slice(1).join(' '), tag = name.toLowerCase();
    if (!STATE.customCategories) STATE.customCategories = [];
    STATE.customCategories.push({ name, emoji, gTag: `${tag} sticker`, tTag: `${tag} sticker`, ezTag: tag, waifuType: 'dance', nekosType: 'smile' });
    saveState(STATE);
    return reply(`✅ Added: ${emoji} *${name}*\nTotal categories: ${getAllCategories().length}`);
  }

  if (arg.startsWith('removecat ')) {
    const name = text.trim().split(' ').slice(1).join(' ');
    const idx = (STATE.customCategories || []).findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) return reply(`❌ Not found: "${name}"`);
    STATE.customCategories.splice(idx, 1); saveState(STATE);
    return reply(`✅ Removed: *${name}*`);
  }

  if (arg === 'resetsources') {
    STATE.failedSources = {}; saveState(STATE);
    return reply('✅ All source cooldowns cleared. 7 sources active.');
  }

  if (arg === 'reset') {
    STATE.dailyCount = 0; STATE.lastUploadDate = null;
    STATE.uploadedHashes = []; STATE.sourceStats = {}; STATE.failedSources = {};
    saveState(STATE);
    return reply('✅ Reset complete.\n• Counter → 0\n• Cache → cleared\n• Stats → cleared\n• Cooldowns → cleared');
  }

  return reply(`Unknown option.\n*.csticker on/off/now/cats/sources*\n*.csticker setlimit/sethour/addcat/reset*`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMD: .setchannel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern: 'setchannel', desc: 'Add channel JID for sticker upload',
  category: 'owner', fromMe: true, filename: __filename,
}, async (conn, mek, m, { q: text, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Owner only.');
  const jid = (text || '').trim().replace(/^[<"'\s]+|[>"'\s]+$/g, '').replace(/\s+/g, '');
  if (!jid) {
    return reply(
      `╭─「 📢 *SET CHANNEL* 」\n│\n│ *.setchannel <jid>*\n│\n│ Get JID:\n│ 1. Forward channel message\n│ 2. Use *.channeljid*\n│    Format: 120363...@newsletter\n│\n│ Channels (${STATE.channels.length}/10):\n` +
      `${STATE.channels.length ? STATE.channels.map((c,i) => `│ ${i+1}. ${c}`).join('\n') : '│ _None_'}\n╰──────────────────`
    );
  }
  if (!jid.includes('@newsletter') && !jid.includes('@g.us') && !jid.includes('@s.whatsapp.net'))
    return reply(`❌ Invalid JID!\n\nChannel: *120363xxxxxx@newsletter*\nGroup: *120363xxxxxx@g.us*`);
  if (STATE.channels.includes(jid)) return reply('⚠️ Already added!');
  if (STATE.channels.length >= 10)  return reply('❌ Max 10 channels reached!');
  STATE.channels.push(jid); saveState(STATE);
  return reply(`✅ *Channel added!*\n\n📢 \`${jid}\`\n📊 ${STATE.channels.length}/10\n\n_Use .csticker on to enable_`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CMD: .removechannel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({
  pattern: 'removechannel', alias: ['delchannel', 'rmchannel'],
  desc: 'Remove channel from sticker upload', category: 'owner', fromMe: true, filename: __filename,
}, async (conn, mek, m, { q: text, reply, isOwner }) => {
  if (!isOwner) return reply('❌ Owner only.');
  const jid = (text || '').trim();
  if (!jid) {
    if (!STATE.channels.length) return reply('❌ No channels.');
    let txt = `╭─「 📢 *CHANNELS* 」\n`;
    STATE.channels.forEach((c, i) => { txt += `│ *${i+1}.* ${c}\n`; });
    txt += `│\n│ *.removechannel <jid>*\n╰──────────────────`;
    return reply(txt);
  }
  const idx = STATE.channels.indexOf(jid);
  if (idx === -1) return reply(`❌ Not found:\n\`${jid}\``);
  STATE.channels.splice(idx, 1);
  if (!STATE.channels.length) STATE.enabled = false;
  saveState(STATE);
  return reply(`✅ *Removed!*\n📊 Remaining: ${STATE.channels.length}/10` + (STATE.channels.length === 0 ? '\n\n⚠️ No channels — auto upload disabled.' : ''));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('[csticker] ✅ Loaded | Sources: 7 | Categories:', getAllCategories().length, '| Channels:', STATE.channels.length, '| Enabled:', STATE.enabled);
