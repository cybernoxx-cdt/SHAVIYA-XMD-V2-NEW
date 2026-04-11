// ╔══════════════════════════════════════════════════════════════════╗
// ║     🎮 PC GAMES DOWNLOADER — SHAVIYA-XMD V2                     ║
// ║     FitGirl Repacks + DODI Repacks                               ║
// ║     Author : Savendra Dampriya (CDT)                             ║
// ║     Place  : /plugins/dodi-repack.js                             ║
// ╚══════════════════════════════════════════════════════════════════╝
'use strict';

const { cmd }  = require('../command');
const axios    = require('axios');
const cheerio  = require('cheerio');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');

// ─────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────
const BOT_NAME    = 'SHAVIYA-XMD V2';
const BOT_FOOTER  = '© 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 🇱🇰';
const MAX_RESULTS = 10;
const SESSION_TTL = 20 * 60 * 1000; // 20 min

// Chunk sizes
// WA safe limit per document = 90 MB
// Auto-split threshold: if a part file is > 90MB and <= 500MB → download + split + send
// If > 500MB → too large, just give link
const WA_CHUNK_SIZE    =  90 * 1024 * 1024; //  90 MB per WA doc
const SPLIT_MAX        = 500 * 1024 * 1024; // 500 MB max to auto-split

const TMP_DIR = path.join(os.tmpdir(), 'shaviya_pcgames');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const HTTP_HEADERS = {
  'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language' : 'en-US,en;q=0.5',
  'Connection'      : 'keep-alive',
  'Cache-Control'   : 'no-cache',
};

// ─────────────────────────────────────────
//  SESSION STORES
// ─────────────────────────────────────────
const searchStore = new Map();
const gameStore   = new Map();

function saveSearch(sender, data)  { searchStore.set(sender, { ...data, ts: Date.now() }); }
function loadSearch(sender) {
  const s = searchStore.get(sender);
  if (!s || Date.now() - s.ts > SESSION_TTL) { searchStore.delete(sender); return null; }
  return s;
}
function saveGame(sender, game)    { gameStore.set(sender, { game, ts: Date.now() }); }
function loadGame(sender) {
  const s = gameStore.get(sender);
  if (!s || Date.now() - s.ts > SESSION_TTL) { gameStore.delete(sender); return null; }
  return s.game;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────
//  HTTP HELPER  (retry + anti-403)
// ─────────────────────────────────────────
async function httpGet(url, retries) {
  if (!retries) retries = 3;
  for (var i = 0; i < retries; i++) {
    try {
      return await axios.get(url, {
        headers     : Object.assign({}, HTTP_HEADERS, { 'Referer': new URL(url).origin + '/' }),
        timeout     : 20000,
        maxRedirects: 10,
        decompress  : true,
      });
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2500 * (i + 1));
    }
  }
}

// ─────────────────────────────────────────
//  SCRAPERS
// ─────────────────────────────────────────
var TRUSTED_HOSTS = ['1fichier','gofile','pixeldrain','datanodes','buzzheavier',
                     'racaty','mediafire','mega.nz','workupload','send.cm','ddownload'];

function extractLinks($, content) {
  var dlLinks = []; var seen = new Set();
  content.find('a[href]').each(function(_, el) {
    var href = $(el).attr('href') || '';
    var text = $(el).text().trim();
    if (!href || seen.has(href) || !text) return;
    if (TRUSTED_HOSTS.some(function(h) { return href.includes(h); })) {
      seen.add(href); dlLinks.push({ text: text, href: href });
    }
  });
  return dlLinks;
}

function buildGame(title, size, origSize, langs, genre, company, dlLinks, url, source) {
  var partLinks   = dlLinks.filter(function(l) { return /part\s*0*\d|\.r\d\d\b|part\d/i.test(l.text + l.href); });
  var singleLinks = dlLinks.filter(function(l) { return !/part\s*0*\d|\.r\d\d\b|part\d/i.test(l.text + l.href); });
  return { title: title, size: size, origSize: origSize, langs: langs, genre: genre,
           company: company, dlLinks: dlLinks, partLinks: partLinks, singleLinks: singleLinks,
           url: url, source: source };
}

function parseInfo(body) {
  return {
    size     : ((body.match(/repack\s*size[^:\d]*[:\s]+([\d.,]+\s*(?:GB|MB))/i)          || [])[1] || 'N/A'),
    origSize : ((body.match(/(?:original|game)\s*size[^:\d]*[:\s]+([\d.,]+\s*(?:GB|MB|TB))/i) || [])[1] || 'N/A'),
    langs    : (((body.match(/languages?[^:\w\n]*[:\s]+([^\n]{3,80})/i)  || [])[1]) || 'N/A').trim(),
    genre    : (((body.match(/genres?[^:\w\n]*[:\s]+([^\n]{3,80})/i)     || [])[1]) || 'N/A').trim(),
    company  : (((body.match(/(?:company|developer)[^:\w\n]*[:\s]+([^\n]{3,60})/i) || [])[1]) || 'N/A').trim(),
  };
}

async function searchFitGirl(query) {
  var res = await httpGet('https://fitgirl-repacks.site/?s=' + encodeURIComponent(query));
  var $   = cheerio.load(res.data);
  var out = [];
  $('article').each(function(i, el) {
    if (out.length >= MAX_RESULTS) return false;
    var title = $(el).find('h1.entry-title a,h2.entry-title a').text().trim();
    var link  = $(el).find('h1.entry-title a,h2.entry-title a').attr('href') || '';
    var date  = $(el).find('time').first().text().trim();
    if (title && link) out.push({ title: title, link: link, date: date, source: 'fitgirl' });
  });
  return out;
}

async function getFitGirlDetails(url) {
  var res     = await httpGet(url);
  var $       = cheerio.load(res.data);
  var title   = $('h1.entry-title').first().text().trim();
  var content = $('.entry-content');
  var info    = parseInfo(content.text());
  var dlLinks = extractLinks($, content);
  return buildGame(title, info.size, info.origSize, info.langs, info.genre, info.company, dlLinks, url, 'fitgirl');
}

async function searchDodi(query) {
  var res = await httpGet('https://dodi-repacks.site/?s=' + encodeURIComponent(query));
  var $   = cheerio.load(res.data);
  var out = [];
  $('article').each(function(i, el) {
    if (out.length >= MAX_RESULTS) return false;
    var title = $(el).find('h2.entry-title a,h1.entry-title a').text().trim();
    var link  = $(el).find('h2.entry-title a,h1.entry-title a').attr('href') || '';
    var date  = $(el).find('time').first().text().trim();
    if (title && link) out.push({ title: title, link: link, date: date, source: 'dodi' });
  });
  return out;
}

async function getDodiDetails(url) {
  var res     = await httpGet(url);
  var $       = cheerio.load(res.data);
  var title   = $('h1.entry-title,h2.entry-title').first().text().trim();
  var content = $('.entry-content');
  var info    = parseInfo(content.text());
  var dlLinks = extractLinks($, content);
  return buildGame(title, info.size, info.origSize, info.langs, info.genre, info.company, dlLinks, url, 'dodi');
}

async function getDetails(url, source) {
  if (source === 'dodi' || url.includes('dodi-repacks')) return getDodiDetails(url);
  return getFitGirlDetails(url);
}

// ─────────────────────────────────────────
//  THUMBNAIL
// ─────────────────────────────────────────
async function makeThumbnail() {
  try {
    var sharp = require('sharp');
    var r = await axios.get('https://files.catbox.moe/f18ceb.jpg', { responseType: 'arraybuffer', timeout: 8000 });
    return await sharp(Buffer.from(r.data)).resize(300).jpeg({ quality: 65 }).toBuffer();
  } catch (e) { return null; }
}

// ─────────────────────────────────────────
//  FIX DOWNLOAD URL
// ─────────────────────────────────────────
function fixUrl(href) {
  if (/pixeldrain\.com\/u\//.test(href)) {
    var id = href.split('/').pop().split('?')[0];
    return 'https://pixeldrain.com/api/file/' + id + '?download';
  }
  return href;
}

function getMime(fileName) {
  if (/\.mp4$/i.test(fileName))         return 'video/mp4';
  if (/\.zip$/i.test(fileName))         return 'application/zip';
  if (/\.(rar|r\d\d)$/i.test(fileName)) return 'application/x-rar-compressed';
  if (/\.iso$/i.test(fileName))         return 'application/x-iso9660-image';
  if (/\.7z$/i.test(fileName))          return 'application/x-7z-compressed';
  if (/\.exe$/i.test(fileName))         return 'application/x-msdownload';
  return 'application/octet-stream';
}

// ─────────────────────────────────────────
//  GET REMOTE FILE INFO
// ─────────────────────────────────────────
async function getRemoteInfo(url) {
  try {
    var res  = await axios.head(url, { headers: HTTP_HEADERS, timeout: 15000, maxRedirects: 10 });
    var size = parseInt(res.headers['content-length'] || '0', 10);
    var cd   = res.headers['content-disposition'] || '';
    var fnM  = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    var name = fnM ? fnM[1].replace(/['"]/g, '').trim() : '';
    var supportsRange = res.headers['accept-ranges'] === 'bytes';
    return { size: size, name: name, supportsRange: supportsRange };
  } catch (e) {
    return { size: 0, name: '', supportsRange: false };
  }
}

// ─────────────────────────────────────────
//  REACT HELPER
// ─────────────────────────────────────────
async function react(conn, from, key, emoji) {
  try { await conn.sendMessage(from, { react: { text: emoji, key: key } }); } catch (e) {}
}

// ─────────────────────────────────────────
//  ★ CORE SEND SYSTEM ★
//
//  File size logic:
//  ≤ 90 MB             → Send directly as WA document
//  90 MB < x ≤ 500 MB  → Download to temp, split into 90MB chunks, send each
//  > 500 MB            → Too large, send direct link only
// ─────────────────────────────────────────
async function streamAndSend(conn, from, mek, linkObj, gameTitle) {
  var dlUrl = fixUrl(linkObj.href);
  var label = (linkObj.text || 'Part').replace(/[\\/:"*?<>|]/g, '-').substring(0, 50);

  // Get file info
  var info       = await getRemoteInfo(dlUrl);
  var totalSize  = info.size;
  var remoteName = info.name;
  var supRange   = info.supportsRange;

  var fileName = remoteName || (gameTitle + '_' + label + '.rar').replace(/[\\/:"*?<>|]/g, '-');
  var sizeMB   = totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) : '?';
  var thumb    = await makeThumbnail();

  // ── CASE A: Unknown or small (≤ 90MB) → direct send ──────
  if (totalSize === 0 || totalSize <= WA_CHUNK_SIZE) {
    await conn.sendMessage(from, {
      text: '📥 *Sending:* ' + label + '\n📦 Size: ' + (totalSize > 0 ? sizeMB + ' MB' : 'Unknown (sending directly...)')
    }, { quoted: mek });

    await conn.sendMessage(from, {
      document      : { url: dlUrl },
      fileName      : fileName,
      mimetype      : getMime(fileName),
      jpegThumbnail : thumb || undefined,
      caption       : '📦 *' + gameTitle + '*\n📁 ' + label + '\n\n' + BOT_FOOTER,
    }, { quoted: mek });

    return { sent: 1, chunks: 1 };
  }

  // ── CASE B: > 500MB → link only ──────────────────────────
  if (totalSize > SPLIT_MAX) {
    await conn.sendMessage(from, {
      text:
        '⚠️ *File Too Large to Auto-Send*\n\n' +
        '📁 *File  :* ' + fileName + '\n' +
        '📦 *Size  :* ' + sizeMB + ' MB\n' +
        '🚫 *Limit :* 500 MB\n\n' +
        '📥 Download directly:\n' +
        '🔗 ' + dlUrl + '\n\n' +
        BOT_FOOTER
    }, { quoted: mek });
    return { sent: 0, chunks: 0 };
  }

  // ── CASE C: 90MB < size ≤ 500MB → chunk split + send ─────
  var numChunks = Math.ceil(totalSize / WA_CHUNK_SIZE);

  await conn.sendMessage(from, {
    text:
      '✂️  *Auto Chunk Split System*\n\n' +
      '📁 ' + fileName + '\n' +
      '📦 Total Size  : ' + sizeMB + ' MB\n' +
      '✂️  Chunks      : ' + numChunks + ' parts\n' +
      '📩 Each Chunk  : ~' + Math.round(WA_CHUNK_SIZE / 1024 / 1024) + ' MB\n\n' +
      '⏳ Please wait, downloading...'
  }, { quoted: mek });

  // Check if server supports Range requests
  if (!supRange) {
    // No range support — download full file then split
    var fullTmp = path.join(TMP_DIR, 'full_' + Date.now() + '.tmp');
    try {
      await conn.sendMessage(from, {
        text: '⬇️ Downloading full file (' + sizeMB + ' MB)...\nThis may take a while.'
      }, { quoted: mek });

      var fullRes = await axios.get(dlUrl, {
        headers     : HTTP_HEADERS,
        responseType: 'arraybuffer',
        timeout     : 10 * 60 * 1000,
        maxRedirects: 10,
      });
      fs.writeFileSync(fullTmp, Buffer.from(fullRes.data));

      // Split and send
      var fullBuf  = fs.readFileSync(fullTmp);
      var sentOk   = 0;
      var totalChk = Math.ceil(fullBuf.length / WA_CHUNK_SIZE);

      for (var ci = 0; ci < totalChk; ci++) {
        var cStart   = ci * WA_CHUNK_SIZE;
        var cEnd     = Math.min(cStart + WA_CHUNK_SIZE, fullBuf.length);
        var chunk    = fullBuf.slice(cStart, cEnd);
        var chunkMB  = (chunk.length / 1024 / 1024).toFixed(1);
        var chunkName = fileName.replace(/(\.\w+)?$/, function(ext) {
          return '_part' + String(ci + 1).padStart(2, '0') + 'of' + totalChk + (ext || '.bin');
        });
        var chunkTmp  = path.join(TMP_DIR, 'chunk_' + Date.now() + '_' + ci + '.tmp');

        fs.writeFileSync(chunkTmp, chunk);

        await conn.sendMessage(from, {
          text: '📤 Sending chunk *' + (ci + 1) + '/' + totalChk + '* (' + chunkMB + ' MB)...'
        }, { quoted: mek });

        try {
          await conn.sendMessage(from, {
            document      : { url: 'file://' + chunkTmp },
            fileName      : chunkName,
            mimetype      : 'application/octet-stream',
            jpegThumbnail : thumb || undefined,
            caption       : '📦 *' + gameTitle + '*\n✂️  Part ' + (ci + 1) + '/' + totalChk + '\n📁 ' + label + '\n\n' + BOT_FOOTER,
          }, { quoted: mek });
          sentOk++;
        } catch (sendErr) {
          await conn.sendMessage(from, {
            text: '❌ Chunk ' + (ci + 1) + ' send failed: ' + sendErr.message
          }, { quoted: mek });
        }

        if (fs.existsSync(chunkTmp)) fs.unlinkSync(chunkTmp);
        await sleep(1500);
      }

      if (fs.existsSync(fullTmp)) fs.unlinkSync(fullTmp);
      return { sent: sentOk, chunks: totalChk };

    } catch (dlErr) {
      if (fs.existsSync(fullTmp)) fs.unlinkSync(fullTmp);
      await conn.sendMessage(from, {
        text: '❌ Download failed: ' + dlErr.message + '\n\n🔗 Direct link:\n' + dlUrl + '\n\n' + BOT_FOOTER
      }, { quoted: mek });
      return { sent: 0, chunks: 0 };
    }
  }

  // Range supported → download chunk by chunk (memory efficient)
  var sentCount = 0;
  for (var i = 0; i < numChunks; i++) {
    var byteStart = i * WA_CHUNK_SIZE;
    var byteEnd   = Math.min(byteStart + WA_CHUNK_SIZE - 1, totalSize - 1);
    var chunkSzMB = ((byteEnd - byteStart + 1) / 1024 / 1024).toFixed(1);
    var cName     = fileName.replace(/(\.\w+)?$/, function(ext) {
      return '_part' + String(i + 1).padStart(2, '0') + 'of' + numChunks + (ext || '.bin');
    });
    var tmpPath   = path.join(TMP_DIR, 'rng_' + Date.now() + '_' + i + '.tmp');

    await conn.sendMessage(from, {
      text: '⬇️  Chunk *' + (i + 1) + '/' + numChunks + '* (' + chunkSzMB + ' MB) downloading...'
    }, { quoted: mek });

    try {
      var rngRes = await axios.get(dlUrl, {
        headers      : Object.assign({}, HTTP_HEADERS, { 'Range': 'bytes=' + byteStart + '-' + byteEnd }),
        responseType : 'arraybuffer',
        timeout      : 5 * 60 * 1000,
        maxRedirects : 10,
      });

      fs.writeFileSync(tmpPath, Buffer.from(rngRes.data));

      await conn.sendMessage(from, {
        text: '📤 Sending chunk *' + (i + 1) + '/' + numChunks + '* (' + chunkSzMB + ' MB)...'
      }, { quoted: mek });

      await conn.sendMessage(from, {
        document      : { url: 'file://' + tmpPath },
        fileName      : cName,
        mimetype      : 'application/octet-stream',
        jpegThumbnail : thumb || undefined,
        caption       : '📦 *' + gameTitle + '*\n✂️  Part ' + (i + 1) + '/' + numChunks + '\n📁 ' + label + '\n\n' + BOT_FOOTER,
      }, { quoted: mek });

      sentCount++;
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      await sleep(1500);

    } catch (chunkErr) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      await conn.sendMessage(from, {
        text:
          '❌ *Chunk ' + (i + 1) + '/' + numChunks + ' Failed*\n' +
          'Error: ' + chunkErr.message + '\n\n' +
          '🔗 Direct: ' + dlUrl + '\n' +
          'Range: bytes=' + byteStart + '-' + byteEnd + '\n\n' +
          BOT_FOOTER
      }, { quoted: mek });
    }
  }

  return { sent: sentCount, chunks: numChunks };
}

// ─────────────────────────────────────────
//  MESSAGE FORMATTERS
// ─────────────────────────────────────────
function fmtSearch(results, query, srcName, srcEmoji) {
  if (!results.length) {
    return srcEmoji + ' *' + srcName + '* ' + srcEmoji + '\n\n' +
           '👾 Entered Name || ' + query + '\n\n' +
           '❌ *No games found.*\n\nTry a different name.\n\n' + BOT_FOOTER;
  }
  var msg = srcEmoji + ' *' + srcName + '* ' + srcEmoji + '\n\n';
  msg    += '👾 Entered Name || ' + query + '\n\n';
  msg    += '🔢 Reply below number\n\n';
  msg    += '*[Search Results]*\n\n';
  results.forEach(function(g, i) {
    msg += '🔶 *' + (i + 1) + ' »* ◦ ' + g.title + '\n';
  });
  msg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  msg += '📌 *Reply with number* to get download links\n\n' + BOT_FOOTER;
  return msg;
}

function fmtLinks(game) {
  var srcLabel = game.source === 'fitgirl' ? '🎮 FITGIRL REPACKS 🎮' : '🎮 DODI REPACKS 🎮';
  var allLinks = game.singleLinks.concat(game.partLinks);
  var msg = srcLabel + '\n\n';
  msg    += '🍀 *Title ➤* ' + game.title + '\n\n';
  if (game.size     !== 'N/A') msg += '💾 *Repack Size :* ' + game.size + '\n';
  if (game.origSize !== 'N/A') msg += '🗂️  *Original   :* ' + game.origSize + '\n';
  if (game.genre    !== 'N/A') msg += '🎭 *Genre       :* ' + game.genre.substring(0, 60) + '\n';
  if (game.langs    !== 'N/A') msg += '🌐 *Languages   :* ' + game.langs.substring(0, 60) + '\n';
  msg += '\n🔢 Reply below number\n\n';
  msg += '*[Download Links]*\n\n';
  if (!allLinks.length) {
    msg += '⚠️ No direct links found.\n🔗 ' + game.url + '\n';
  } else {
    allLinks.slice(0, 25).forEach(function(l, i) {
      var lbl = (l.text || l.href.split('/').pop() || 'Part ' + (i + 1)).substring(0, 55);
      msg += '🔶 *' + (i + 1) + ' »* ◦ ' + lbl + '\n';
    });
    msg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '📌 *Reply with number* to download & send\n';
    msg += '✂️  90MB–500MB files are auto-split into chunks\n';
    msg += '⬇️  Files over 500MB → direct link given\n';
  }
  msg += '\n' + BOT_FOOTER;
  return msg;
}

function fmtHelp(prefix) {
  var p = prefix || '.';
  return (
    BOT_NAME + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎮 *PC GAMES DOWNLOADER*\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📌 *SEARCH COMMANDS*\n\n' +
    '▸ *' + p + 'fg <game>*    — FitGirl Search\n' +
    '▸ *' + p + 'dodi <game>*  — DODI Search\n' +
    '▸ *' + p + 'pcgame <game>*— Search Both\n\n' +
    '📌 *FLOW*\n' +
    '① Search → Reply number → Get links\n' +
    '② Links appear → Reply number → File sent!\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '✂️  *AUTO CHUNK SPLIT*\n\n' +
    '• ≤ 90 MB   → Sent directly to WA\n' +
    '• 90–500 MB → Split into 90MB pieces\n' +
    '• > 500 MB  → Direct download link\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 *EXAMPLE*\n\n' +
    p + 'fg GTA 5\n' +
    '→ Reply: 1\n' +
    '→ Links appear\n' +
    '→ Reply: 3  (auto sends part 3)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    BOT_FOOTER
  );
}

// ─────────────────────────────────────────
//  SHARED SEARCH RUNNER
// ─────────────────────────────────────────
async function doSearch(conn, mek, m, ctx, query, source) {
  var from = ctx.from, sender = ctx.sender, reply = ctx.reply;
  var srcName = source === 'fitgirl' ? 'FITGIRL REPACKS' : 'DODI REPACKS';
  await react(conn, from, mek.key, '🔍');
  await reply('🔍 Searching *' + srcName + '*...\n👾 Query || ' + query);
  var results;
  try {
    results = source === 'fitgirl' ? await searchFitGirl(query) : await searchDodi(query);
  } catch (e) {
    var alt = source === 'fitgirl' ? 'dodi' : 'fg';
    return reply(
      '❌ *Search Failed!*\n\n' +
      'Source : ' + srcName + '\n' +
      'Error  : ' + e.message + '\n\n' +
      '💡 Try: *.' + alt + ' ' + query + '*\n\n' +
      BOT_FOOTER
    );
  }
  saveSearch(sender, { results: results, query: query, source: source });
  return reply(fmtSearch(results, query, srcName, '🎮'));
}

// ─────────────────────────────────────────
//  NUMBER REPLY ROUTER
// ─────────────────────────────────────────
async function handleNumber(conn, mek, m, ctx, num) {
  var from = ctx.from, sender = ctx.sender, reply = ctx.reply;

  // Phase 2: pick a download link from loaded game
  var game = loadGame(sender);
  if (game) {
    var allLinks = game.singleLinks.concat(game.partLinks);
    if (num >= 1 && num <= allLinks.length) {
      var lnk = allLinks[num - 1];
      await react(conn, from, mek.key, '⏳');
      try {
        var result = await streamAndSend(conn, from, mek, lnk, game.title);
        await react(conn, from, mek.key, '✅');
        if (result.sent > 1) {
          await reply('✅ *Done!* Sent ' + result.sent + '/' + result.chunks + ' chunks successfully.\n\n' + BOT_FOOTER);
        }
      } catch (e) {
        await react(conn, from, mek.key, '❌');
        reply('❌ Failed: ' + e.message + '\n\n🔗 ' + lnk.href + '\n\n' + BOT_FOOTER);
      }
      return true;
    }
  }

  // Phase 1: pick a search result
  var session = loadSearch(sender);
  if (session && session.results.length) {
    if (num >= 1 && num <= session.results.length) {
      var picked = session.results[num - 1];
      await react(conn, from, mek.key, '⏳');
      await reply('⏳ Loading links for:\n*' + picked.title + '*');
      var game2;
      try {
        game2 = await getDetails(picked.link, picked.source || session.source);
      } catch (e) {
        return reply('❌ Failed: ' + e.message + '\n\n' + BOT_FOOTER);
      }
      saveGame(sender, game2);
      await react(conn, from, mek.key, '✅');
      await reply(fmtLinks(game2));
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────
//  COMMANDS
// ─────────────────────────────────────────

// .fg — FitGirl search
cmd({
  pattern  : 'fg',
  alias    : ['fitgirl'],
  react    : '🎮',
  desc     : 'Search FitGirl Repacks PC games',
  category : 'downloader',
  filename : __filename,
}, async function(conn, mek, m, ctx) {
  try {
    if (!ctx.q) return ctx.reply(fmtHelp('.'));
    await doSearch(conn, mek, m, ctx, ctx.q, 'fitgirl');
  } catch (e) { console.error('[FG]', e.message); ctx.reply('❌ ' + e.message); }
});

// .dodi — DODI search
cmd({
  pattern  : 'dodi',
  alias    : ['dodipc'],
  react    : '🎮',
  desc     : 'Search DODI Repacks PC games',
  category : 'downloader',
  filename : __filename,
}, async function(conn, mek, m, ctx) {
  try {
    if (!ctx.q) return ctx.reply(fmtHelp('.'));
    await doSearch(conn, mek, m, ctx, ctx.q, 'dodi');
  } catch (e) { console.error('[DODI]', e.message); ctx.reply('❌ ' + e.message); }
});

// .pcgame — search both
cmd({
  pattern  : 'pcgame',
  alias    : ['pc', 'pcgames'],
  react    : '🎮',
  desc     : 'Search FitGirl + DODI for PC games',
  category : 'downloader',
  filename : __filename,
}, async function(conn, mek, m, ctx) {
  var from = ctx.from, sender = ctx.sender, reply = ctx.reply, q = ctx.q;
  try {
    if (!q) return reply(fmtHelp('.'));
    await react(conn, from, mek.key, '🔍');
    await reply('🔍 Searching *FitGirl + DODI*...\n👾 ' + q);
    var results = await Promise.allSettled([searchFitGirl(q), searchDodi(q)]);
    var fg = results[0].status === 'fulfilled' ? results[0].value : [];
    var dd = results[1].status === 'fulfilled' ? results[1].value : [];
    var combined = fg.slice(0, 5).concat(dd.slice(0, 5));
    if (!combined.length) return reply('❌ No results found for *' + q + '*\n\n' + BOT_FOOTER);
    var msg = '🎮 *PC GAMES SEARCH RESULTS* 🎮\n\n';
    msg    += '👾 Entered Name || ' + q + '\n\n';
    msg    += '🔢 Reply below number\n\n';
    msg    += '*[Search Results]*\n\n';
    combined.forEach(function(g, i) {
      var tag = g.source === 'fitgirl' ? '🍀FG' : '💎DD';
      msg += '🔶 *' + (i + 1) + ' »* [' + tag + '] ' + g.title + '\n';
    });
    msg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '🍀FG = FitGirl  |  💎DD = DODI\n';
    msg += '📌 *Reply with number* to get links\n\n' + BOT_FOOTER;
    saveSearch(sender, { results: combined, query: q, source: 'mixed' });
    return reply(msg);
  } catch (e) { console.error('[PCGAME]', e.message); reply('❌ ' + e.message); }
});

// .dlpart <number> — manual part trigger
cmd({
  pattern  : 'dlpart',
  alias    : ['dlp', 'sendpart'],
  react    : '📥',
  desc     : 'Download & send a specific game part (with auto chunk split)',
  category : 'downloader',
  filename : __filename,
}, async function(conn, mek, m, ctx) {
  var from = ctx.from, sender = ctx.sender, reply = ctx.reply, q = ctx.q;
  try {
    var num  = parseInt(q, 10);
    var game = loadGame(sender);
    if (!game) return reply('❌ No game loaded!\n\nUse *.fg* or *.dodi* to search first.\n\n' + BOT_FOOTER);
    var all = game.singleLinks.concat(game.partLinks);
    if (!all.length) return reply('❌ No download links found.\n\n' + BOT_FOOTER);
    if (isNaN(num) || num < 1 || num > all.length)
      return reply('❌ Enter a number between *1 – ' + all.length + '*\n\n' + BOT_FOOTER);
    await react(conn, from, mek.key, '⏳');
    var result = await streamAndSend(conn, from, mek, all[num - 1], game.title);
    await react(conn, from, mek.key, '✅');
    if (result.sent > 1) reply('✅ Done! Sent ' + result.sent + '/' + result.chunks + ' chunks.\n\n' + BOT_FOOTER);
  } catch (e) { console.error('[DLPART]', e.message); ctx.reply('❌ ' + e.message); }
});

// Number reply handler (on:"body")
cmd({
  on                : 'body',
  pattern           : /^\s*(\d{1,2})\s*$/,
  dontAddCommandList: true,
  filename          : __filename,
}, async function(conn, mek, m, ctx) {
  try {
    var sender = ctx.sender;
    if (!loadSearch(sender) && !loadGame(sender)) return;
    var num = parseInt(ctx.body.trim(), 10);
    if (!isNaN(num)) await handleNumber(conn, mek, m, ctx, num);
  } catch (e) { console.error('[NUM HANDLER]', e.message); }
});
