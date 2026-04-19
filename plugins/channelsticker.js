// plugins/channelsticker.js \u2014 SHAVIYA-XMD V2
// Auto Daily Sticker Upload to WhatsApp Channel(s)
// Coded by CDT | Crash Delta Team
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

'use strict';

const { cmd }  = require('../command');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const axios    = require('axios');
const Config   = require('../config');

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  FFMPEG RESOLVE
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
let FF = 'ffmpeg';
try { const s = require('ffmpeg-static'); if (s && fs.existsSync(s)) { try { fs.chmodSync(s, 0o755); } catch (_) {} FF = s; } } catch (_) {}
if (FF === 'ffmpeg') { try { const i = require('@ffmpeg-installer/ffmpeg'); if (i?.path) FF = i.path; } catch (_) {} }

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  STICKER CATEGORIES  (daily rotation)
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
const CATEGORIES = [
  { name: 'Meme Stickers',   emoji: '\ud83d\ude02', gTag: 'funny meme',        tTag: 'meme',         ezTag: 'meme funny'      },
  { name: 'Cute Stickers',   emoji: '\ud83c\udf38', gTag: 'cute kawaii',       tTag: 'cute',          ezTag: 'cute kawaii'     },
  { name: 'Girl Stickers',   emoji: '\ud83d\udc81\u200d\u2640\ufe0f', gTag: 'girl cute',        tTag: 'girl',          ezTag: 'girl cute'       },
  { name: 'Anime Stickers',  emoji: '\ud83c\udf8c', gTag: 'anime kawaii',      tTag: 'anime',         ezTag: 'anime'           },
  { name: 'Savage Stickers', emoji: '\ud83d\udd25', gTag: 'savage attitude',   tTag: 'savage',        ezTag: 'savage attitude' },
  { name: 'Love Stickers',   emoji: '\u2764\ufe0f', gTag: 'love heart cute',   tTag: 'love',          ezTag: 'love heart'      },
  { name: 'Funny Animal',    emoji: '\ud83d\udc3e', gTag: 'funny animal',      tTag: 'animal funny',  ezTag: 'funny animal'    },
  { name: 'Celebration',     emoji: '\ud83c\udf89', gTag: 'celebration party', tTag: 'celebration',   ezTag: 'celebration'     },
  { name: 'Dark Humor',      emoji: '\ud83d\udc80', gTag: 'dark humor skull',  tTag: 'dark humor',    ezTag: 'skull dark'      },
  { name: 'Reaction Pack',   emoji: '\ud83d\ude24', gTag: 'reaction emotion',  tTag: 'reaction',      ezTag: 'reaction face'   },
  { name: 'Cloudy Vibes',    emoji: '\u2601\ufe0f', gTag: 'cloud loading',     tTag: 'cloud',         ezTag: 'cloud aesthetic' },
  { name: 'Dino Pack',       emoji: '\ud83e\udd95', gTag: 'dinosaur funny',    tTag: 'dinosaur',      ezTag: 'dinosaur cute'   },
  { name: 'Neon Aesthetic',  emoji: '\ud83c\udf08', gTag: 'neon colorful',     tTag: 'neon',          ezTag: 'neon aesthetic'  },
  { name: 'Sports Stickers', emoji: '\u26bd', gTag: 'sports football',   tTag: 'sports',        ezTag: 'sports'          },
];

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  PERSISTENT STATE
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
const STATE_FILE = path.join(__dirname, '../data/channelsticker.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_) {}
  return {
    enabled: false, channels: [], categoryIndex: 0,
    lastUploadDate: null, uploadedHashes: [], dailyCount: 0, totalSent: 0,
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

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  HELPERS
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
function hashUrl(url) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  return h.toString(36);
}
function todayStr()  { return new Date().toISOString().slice(0, 10); }
function isNewDay()  { return STATE.lastUploadDate !== todayStr(); }
function getTodayCategory() { return CATEGORIES[STATE.categoryIndex % CATEGORIES.length]; }

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  URL FETCHERS  \u2014 4 independent sources
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

// \u2500\u2500 SOURCE 1: Giphy (no-auth trending endpoint) \u2500\u2500\u2500
// Uses public /trending/stickers \u2014 no API key needed, returns ~25 GIFs
async function fetchGiphyUrls(tag, limit = 25) {
  try {
    const offset = Math.floor(Math.random() * 100);
    // Giphy public CDN endpoint \u2014 no API key required
    const { data } = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: 'dc6zaTOxFJmzC', // legacy public beta key \u2014 kept as fallback
        q: tag,
        limit,
        rating: 'g',
        offset,
      },
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const urls = (data?.data || [])
      .map(g =>
        g.images?.fixed_width?.url ||
        g.images?.downsized?.url   ||
        g.images?.original?.url
      )
      .filter(Boolean);
    console.log(`[csticker] Giphy: ${urls.length} URLs for "${tag}"`);
    return urls;
  } catch (e) {
    console.error('[csticker] Giphy fetch failed:', e.message);
    return [];
  }
}

// \u2500\u2500 SOURCE 2: Tenor v1 (anonymous, no key needed) \u2500
// Tenor v1 /search works without key for basic queries
async function fetchTenorUrls(query, limit = 20) {
  try {
    // Try Tenor v2 with anonymous key first
    const { data } = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: {
        q: query,
        key: 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk',
        limit,
        media_filter: 'gif',
        contentfilter: 'medium',
        random: true,
      },
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const urls = (data?.results || [])
      .map(r =>
        r.media_formats?.gif?.url     ||
        r.media_formats?.tinygif?.url ||
        r.media_formats?.mediumgif?.url
      )
      .filter(Boolean);
    console.log(`[csticker] Tenor v2: ${urls.length} URLs for "${query}"`);
    return urls;
  } catch (e) {
    console.error('[csticker] Tenor v2 failed, trying v1:', e.message);
    // \u2500\u2500 Tenor v1 fallback \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    try {
      const { data } = await axios.get('https://api.tenor.com/v1/search', {
        params: { q: query, limit, media_filter: 'minimal', contentfilter: 'medium' },
        timeout: 12000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const urls = (data?.results || [])
        .map(r => r.media?.[0]?.gif?.url || r.media?.[0]?.tinygif?.url)
        .filter(Boolean);
      console.log(`[csticker] Tenor v1: ${urls.length} URLs for "${query}"`);
      return urls;
    } catch (e2) {
      console.error('[csticker] Tenor v1 also failed:', e2.message);
      return [];
    }
  }
}

// \u2500\u2500 SOURCE 3: ezgif / Giphy CDN scrape \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Scrapes Giphy's public web search page to extract CDN gif URLs
async function fetchGiphyCdnUrls(tag, limit = 20) {
  try {
    const query   = encodeURIComponent(tag + ' sticker animated');
    const { data } = await axios.get(`https://giphy.com/search/${query.replace(/%20/g, '-')}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    // Extract media.giphy.com CDN gif URLs from page HTML
    const pattern = /https:\/\/media[0-9]?\.giphy\.com\/media\/[a-zA-Z0-9]+\/giphy\.gif/g;
    const matches = [...new Set((data.match(pattern) || []))];
    const urls    = matches.slice(0, limit);
    console.log(`[csticker] Giphy CDN scrape: ${urls.length} URLs for "${tag}"`);
    return urls;
  } catch (e) {
    console.error('[csticker] Giphy CDN scrape failed:', e.message);
    return [];
  }
}

// \u2500\u2500 SOURCE 4: Sticker.ly public API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Sticker.ly has a public search endpoint (no auth needed)
async function fetchStickerlyUrls(query, limit = 15) {
  try {
    const { data } = await axios.get('https://sticker.ly/api/v1/sticker/search', {
      params: { q: query, page: 1, count: limit, type: 'animated' },
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    const urls = (data?.data?.stickers || [])
      .map(s => s.animated_url || s.image_url)
      .filter(Boolean);
    console.log(`[csticker] Sticker.ly: ${urls.length} URLs for "${query}"`);
    return urls;
  } catch (e) {
    console.error('[csticker] Sticker.ly failed:', e.message);
    return [];
  }
}

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  GET FRESH URLS \u2014 runs all sources in parallel
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
async function getFreshUrls(category, needed = 20) {
  console.log(`[csticker] Fetching URLs for: ${category.name} | Need: ${needed}`);

  // Run all 4 sources in parallel
  const [gUrls, tUrls, cdnUrls, slUrls] = await Promise.allSettled([
    fetchGiphyUrls(category.gTag, 30),
    fetchTenorUrls(category.tTag, 25),
    fetchGiphyCdnUrls(category.ezTag, 25),
    fetchStickerlyUrls(category.ezTag, 20),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  // Merge + shuffle all URLs
  let allUrls = [...gUrls, ...tUrls, ...cdnUrls, ...slUrls]
    .sort(() => Math.random() - 0.5);

  console.log(`[csticker] Total raw URLs: ${allUrls.length} (G:${gUrls.length} T:${tUrls.length} CDN:${cdnUrls.length} SL:${slUrls.length})`);

  if (!allUrls.length) {
    console.error('[csticker] \u274c ALL sources returned 0 URLs!');
    return [];
  }

  // Filter duplicates from state
  const fresh = [];
  for (const u of allUrls) {
    const h = hashUrl(u);
    if (!STATE.uploadedHashes.includes(h)) {
      fresh.push({ url: u, hash: h });
      if (fresh.length >= needed) break;
    }
  }

  // If not enough fresh, clear old hash cache and retry
  if (fresh.length < needed && STATE.uploadedHashes.length > 300) {
    console.log(`[csticker] Hash cache cleared (was ${STATE.uploadedHashes.length}), retrying dedup...`);
    STATE.uploadedHashes = STATE.uploadedHashes.slice(-100);
    for (const u of allUrls) {
      const h = hashUrl(u);
      if (!fresh.find(f => f.hash === h) && !STATE.uploadedHashes.includes(h)) {
        fresh.push({ url: u, hash: h });
        if (fresh.length >= needed) break;
      }
    }
  }

  // Last resort: if still nothing, just use whatever we got (ignore hash dedup)
  if (!fresh.length && allUrls.length > 0) {
    console.log('[csticker] \u26a0\ufe0f All URLs already hashed \u2014 forcing re-use of available URLs');
    STATE.uploadedHashes = [];
    for (const u of allUrls.slice(0, needed)) {
      fresh.push({ url: u, hash: hashUrl(u) });
    }
  }

  console.log(`[csticker] Fresh URLs after dedup: ${fresh.length}`);
  return fresh;
}

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  CONVERT URL \u2192 animated WebP buffer
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
async function urlToWebpBuffer(url) {
  const ts     = Date.now() + Math.random().toString(36).slice(2, 5);
  const isGif  = /\.gif|giphy|tenor/i.test(url);
  const tmpIn  = path.join(os.tmpdir(), `cstk_${ts}.${isGif ? 'gif' : 'png'}`);
  const tmpOut = path.join(os.tmpdir(), `cstk_${ts}.webp`);

  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer':    'https://giphy.com/',
      },
    });

    if (!res.data || res.data.byteLength < 1000) {
      throw new Error(`Downloaded file too small (${res.data?.byteLength} bytes) \u2014 likely invalid`);
    }

    fs.writeFileSync(tmpIn, Buffer.from(res.data));

    const vf = [
      'scale=512:512:force_original_aspect_ratio=decrease',
      'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      ...(isGif ? ['fps=12'] : []),
    ].join(',');

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
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${errOut.slice(-300)}`)));
      proc.on('error', reject);
    });

    const buf = fs.readFileSync(tmpOut);
    if (buf.length < 500) throw new Error('Output WebP too small \u2014 conversion failed');
    return buf;

  } finally {
    try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (_) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
  }
}

// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
//  CORE UPLOAD FUNCTION
// \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
let _conn           = null;
let _uploadRunning  = false;

async function runDailyUpload(conn, logJid = null) {
  if (_uploadRunning) return;
  _uploadRunning = true;

  const log = (
