// ╔══════════════════════════════════════════════════════════════╗
// ║        🎮 DODI REPACK PC GAMES DOWNLOADER PLUGIN             ║
// ║        SHAVIYA-XMD V2 | CDT | xCDT INVICTUS                 ║
// ║        Author : Savendra Dampriya (CDT)                      ║
// ║        Drop this file into  /plugins/dodi-repack.js          ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const { cmd }  = require('../command');
const axios    = require('axios');
const cheerio  = require('cheerio');
const fs       = require('fs');
const path     = require('path');

// ──────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────
const DODI_BASE      = 'https://dodi-repacks.site';
const SEARCH_URL     = `${DODI_BASE}/?s=`;
const MAX_RESULTS    = 8;        // number of search results to show
const WA_LIMIT_BYTES = 95 * 1024 * 1024;  // 95 MB — WhatsApp document limit
const SESSION_TTL_MS = 10 * 60 * 1000;    // 10 minutes session cache
const THUMB_URL      = 'https://files.catbox.moe/f18ceb.jpg'; // default thumb
const BOT_TAG        = '🎮 *xCDT INVICTUS* | CDT Bot';
const HEADERS        = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' };

// ──────────────────────────────────────────────────────────────
//  IN-MEMORY SESSION STORE  (search results per user)
// ──────────────────────────────────────────────────────────────
//  Map<sender, { results: [], ts: Date.now() }>
const sessionStore = new Map();

function saveSession(sender, results) {
  sessionStore.set(sender, { results, ts: Date.now() });
}

function loadSession(sender) {
  const s = sessionStore.get(sender);
  if (!s) return null;
  if (Date.now() - s.ts > SESSION_TTL_MS) { sessionStore.delete(sender); return null; }
  return s.results;
}

// ──────────────────────────────────────────────────────────────
//  SCRAPER HELPERS
// ──────────────────────────────────────────────────────────────

async function searchDodi(query) {
  const url = `${SEARCH_URL}${encodeURIComponent(query)}`;
  const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $   = cheerio.load(res.data);
  const results = [];

  $('article').each((i, el) => {
    if (results.length >= MAX_RESULTS) return false;
    const title = $(el).find('h2.entry-title a, h1.entry-title a').text().trim();
    const link  = $(el).find('h2.entry-title a, h1.entry-title a').attr('href');
    const date  = $(el).find('time').first().text().trim();
    const thumb = $(el).find('img').first().attr('src') || '';
    if (title && link) results.push({ title, link, date, thumb });
  });

  return results;
}

async function getGameDetails(url) {
  const res  = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $    = cheerio.load(res.data);
  const content = $('.entry-content');
  const title   = $('h1.entry-title, h2.entry-title').first().text().trim();

  // ── Game info key-value pairs from strong tags ──
  const info = {};
  content.find('p, li').each((_, el) => {
    const text = $(el).text();
    const m    = text.match(/^([^:]+):\s*(.+)$/);
    if (m) info[m[1].trim()] = m[2].trim();
  });

  // ── Body text for size extraction ──
  const bodyText = content.text();

  // ── Extract size ──
  const sizeM = bodyText.match(/(?:repack\s*size|size)[^:\d]*[:\s]+([\d.,]+\s*(?:GB|MB|TB))/i);
  const size  = sizeM ? sizeM[1] : 'N/A';

  // ── Extract original size ──
  const origM  = bodyText.match(/(?:original\s*size|game\s*size)[^:\d]*[:\s]+([\d.,]+\s*(?:GB|MB|TB))/i);
  const origSize = origM ? origM[1] : 'N/A';

  // ── Genres ──
  const genreM = bodyText.match(/(?:genre|genres)[^:\w]*[:\s]+([^\n]+)/i);
  const genre  = genreM ? genreM[1].trim() : 'N/A';

  // ── Company / Studio ──
  const compM = bodyText.match(/(?:company|studios?|developer)[^:\w]*[:\s]+([^\n]+)/i);
  const company = compM ? compM[1].trim() : 'N/A';

  // ── Languages ──
  const langM = bodyText.match(/(?:interface|audio)?\s*languages?[^:\w]*[:\s]+([^\n]+)/i);
  const langs = langM ? langM[1].trim() : 'N/A';

  // ── Extract download links ──
  // Trusted DODI hosts
  const TRUSTED_HOSTS = [
    '1fichier.com', 'gofile.io', 'pixeldrain.com', 'datanodes.to',
    'buzzheavier.com', 'racaty.net', 'mediafire.com', 'mega.nz',
    'dodi-repacks.site', 'filehoster', 'torrent', 'magnet:',
    'workupload.com', 'send.cm', 'uploadhaven.com'
  ];

  const dlLinks = [];
  const seen    = new Set();

  content.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (!href || seen.has(href)) return;
    const isTrusted = TRUSTED_HOSTS.some(h => href.includes(h));
    const isDownload = /download|link|part\s*\d|gdrive|drive\.google/i.test(text + href);
    if ((isTrusted || isDownload) && !href.includes('dodi-repacks.site/?') && text) {
      seen.add(href);
      dlLinks.push({ text, href });
    }
  });

  // ── Extract game cover image ──
  let coverImg = '';
  content.find('img').each((_, el) => {
    if (!coverImg) {
      const src = $(el).attr('src') || '';
      if (src && src.startsWith('http')) coverImg = src;
    }
  });

  // ── Split links into PARTS  (multi-part rars) vs SINGLE links ──
  const partLinks   = dlLinks.filter(l => /part\s*\d|\.r\d\d/i.test(l.text + l.href));
  const singleLinks = dlLinks.filter(l => !/part\s*\d|\.r\d\d/i.test(l.text + l.href));

  return {
    title, size, origSize, genre, company, langs,
    dlLinks, partLinks, singleLinks, coverImg, url
  };
}

// ──────────────────────────────────────────────────────────────
//  THUMBNAIL HELPER (same pattern as cinesubz.js)
// ──────────────────────────────────────────────────────────────
async function makeThumbnail(imgUrl) {
  try {
    const sharp = require('sharp');
    const src   = imgUrl || THUMB_URL;
    const res   = await axios.get(src, { responseType: 'arraybuffer', timeout: 10000 });
    return await sharp(Buffer.from(res.data)).resize(300).jpeg({ quality: 65 }).toBuffer();
  } catch {
    try {
      const sharp = require('sharp');
      const res   = await axios.get(THUMB_URL, { responseType: 'arraybuffer', timeout: 10000 });
      return await sharp(Buffer.from(res.data)).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch { return null; }
  }
}

// ──────────────────────────────────────────────────────────────
//  REACT HELPER
// ──────────────────────────────────────────────────────────────
async function react(conn, from, key, emoji) {
  try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

// ──────────────────────────────────────────────────────────────
//  MESSAGE FORMATTERS
// ──────────────────────────────────────────────────────────────

function fmtSearch(results, query) {
  if (!results.length)
    return `❌ *DODI REPACK*\n\nNo results found for:\n*"${query}"*\n\nTry a different name or check spelling.\n\n${BOT_TAG}`;

  let msg = `🎮 *DODI REPACK SEARCH RESULTS*\n`;
  msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg    += `🔍 Query : *${query}*\n`;
  msg    += `📦 Found : *${results.length}* result${results.length > 1 ? 's' : ''}\n`;
  msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  results.forEach((g, i) => {
    msg += `*${i + 1}.* 🎯 ${g.title}\n`;
    if (g.date) msg += `    📅 ${g.date}\n`;
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📌 Reply with *.dodi get <number>* to get download links\n`;
  msg += `📌 Example: *.dodi get 1*\n\n`;
  msg += BOT_TAG;
  return msg;
}

function fmtDetails(g) {
  let msg = `🎮 *${g.title}*\n`;
  msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg    += `💾 *Repack Size :* ${g.size}\n`;
  if (g.origSize !== 'N/A') msg += `🗂️  *Original Size :* ${g.origSize}\n`;
  if (g.genre    !== 'N/A') msg += `🎭 *Genre :* ${g.genre.substring(0, 60)}\n`;
  if (g.company  !== 'N/A') msg += `🏢 *Company :* ${g.company.substring(0, 50)}\n`;
  if (g.langs    !== 'N/A') msg += `🌐 *Languages :* ${g.langs.substring(0, 60)}\n`;
  msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // ── Single / full-game links ──
  if (g.singleLinks.length) {
    msg += `📥 *DOWNLOAD LINKS*\n`;
    g.singleLinks.slice(0, 12).forEach((l, i) => {
      msg += `${i + 1}. ${l.text}\n    🔗 ${l.href}\n`;
    });
    msg += '\n';
  }

  // ── Multi-part links ──
  if (g.partLinks.length) {
    msg += `📦 *MULTI-PART FILES*\n`;
    msg += `⚠️ WhatsApp limit fix: use *.dodi part <number>* to get each part\n\n`;
    g.partLinks.slice(0, 20).forEach((l, i) => {
      msg += `${i + 1}. ${l.text}\n    🔗 ${l.href}\n`;
    });
    msg += '\n';
  }

  if (!g.singleLinks.length && !g.partLinks.length) {
    msg += `⚠️ No direct download links found.\n`;
    msg += `🔗 Visit the page: ${g.url}\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += BOT_TAG;
  return msg;
}

function fmtHelp(prefix) {
  const p = prefix || '.';
  return (
    `🎮 *DODI REPACK PC GAMES DOWNLOADER*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*📌 COMMANDS*\n\n` +
    `▸ *${p}dodi search <game name>*\n` +
    `   Search PC games on DODI Repacks\n\n` +
    `▸ *${p}dodi get <number>*\n` +
    `   Get download links for result #\n\n` +
    `▸ *${p}dodi link <url>*\n` +
    `   Get links from a DODI page URL\n\n` +
    `▸ *${p}dodi part <url> <part#>*\n` +
    `   Send a specific part file to WA\n` +
    `   (auto-splits if file > 95 MB)\n\n` +
    `▸ *${p}dodi info <url>*\n` +
    `   Show only game info (no links)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*💡 EXAMPLES*\n\n` +
    `• ${p}dodi search WRC 7\n` +
    `• ${p}dodi get 1\n` +
    `• ${p}dodi search GTA 5\n` +
    `• ${p}dodi link https://dodi-repacks.site/gta-v/\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*⚠️ WHATSAPP LIMIT NOTES*\n` +
    `• WhatsApp max document size : 95 MB\n` +
    `• DODI games are usually split into\n` +
    `  parts (e.g. 8 × 2 GB). Bot sends\n` +
    `  each part as a separate document.\n` +
    `• Large games: use *.dodi part* cmd\n\n` +
    BOT_TAG
  );
}

// ──────────────────────────────────────────────────────────────
//  SEND A SINGLE DOWNLOAD PART AS WA DOCUMENT
//  Handles WhatsApp 95 MB limit — warns user if too large
// ──────────────────────────────────────────────────────────────
async function sendFilePart(conn, from, mek, linkObj, gameTitle) {
  const { text, href } = linkObj;

  // ── Convert pixeldrain browse → direct download ──
  let dlUrl = href;
  if (/pixeldrain\.com\/u\//.test(dlUrl)) {
    const id = dlUrl.split('/').pop().split('?')[0];
    dlUrl = `https://pixeldrain.com/api/file/${id}?download`;
  }

  // ── Check remote file size via HEAD ──
  let remoteSize = 0;
  let fileName   = `${gameTitle} - ${text}.bin`.replace(/[\\/:"*?<>|]/g, '');

  try {
    const head = await axios.head(dlUrl, { headers: HEADERS, timeout: 12000, maxRedirects: 10 });
    remoteSize = parseInt(head.headers['content-length'] || '0', 10);

    // Extract real filename from Content-Disposition
    const cd = head.headers['content-disposition'] || '';
    const fn = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (fn && fn[1]) fileName = fn[1].replace(/['"]/g, '').trim();
  } catch (e) {
    // HEAD not supported — proceed anyway
  }

  // ── WhatsApp 95 MB hard limit ──
  if (remoteSize > WA_LIMIT_BYTES) {
    const sizeMB = (remoteSize / 1024 / 1024).toFixed(1);
    await conn.sendMessage(from, {
      text:
        `⚠️ *WhatsApp File Size Limit!*\n\n` +
        `📁 *File  :* ${fileName}\n` +
        `📦 *Size  :* ${sizeMB} MB\n` +
        `🚫 *Limit :* 95 MB\n\n` +
        `This file is too large to send via WhatsApp.\n` +
        `Use this direct link to download:\n\n` +
        `🔗 ${dlUrl}\n\n` +
        BOT_TAG
    }, { quoted: mek });
    return;
  }

  // ── Guess mimetype from filename ──
  let mime = 'application/octet-stream';
  if (/\.mp4$/i.test(fileName))  mime = 'video/mp4';
  if (/\.zip$/i.test(fileName))  mime = 'application/zip';
  if (/\.rar$/i.test(fileName))  mime = 'application/x-rar-compressed';
  if (/\.iso$/i.test(fileName))  mime = 'application/x-iso9660-image';
  if (/\.exe$/i.test(fileName))  mime = 'application/x-msdownload';

  const thumb   = await makeThumbnail(null);
  const caption = `📦 *${gameTitle}*\n📁 ${text}\n\n${BOT_TAG}`;

  await conn.sendMessage(from, {
    document      : { url: dlUrl },
    fileName      : fileName,
    mimetype      : mime,
    jpegThumbnail : thumb || undefined,
    caption
  }, { quoted: mek });
}

// ──────────────────────────────────────────────────────────────
//  GAME SESSION STORE (for .dodi part command)
//  stores last fetched game details per user
// ──────────────────────────────────────────────────────────────
const gameStore = new Map();

function saveGame(sender, game) {
  gameStore.set(sender, { game, ts: Date.now() });
}

function loadGame(sender) {
  const s = gameStore.get(sender);
  if (!s) return null;
  if (Date.now() - s.ts > SESSION_TTL_MS) { gameStore.delete(sender); return null; }
  return s.game;
}

// ──────────────────────────────────────────────────────────────
//  MAIN COMMAND HANDLER
// ──────────────────────────────────────────────────────────────
cmd({
  pattern  : 'dodi',
  alias    : ['pcgame', 'dodigame'],
  react    : '🎮',
  desc     : 'Search & Download DODI Repack PC Games',
  category : 'downloader',
  filename : __filename,
},
async (conn, mek, m, { from, args, q, reply, sender, sessionId }) => {
  try {
    const config = require('../config');
    const prefix = config.PREFIX || '.';
    const sub    = (args[0] || '').toLowerCase().trim();
    const rest   = args.slice(1).join(' ').trim();

    // ── .dodi  (no args → help) ──────────────────────────────
    if (!sub) {
      return reply(fmtHelp(prefix));
    }

    // ── .dodi search <query> ─────────────────────────────────
    if (sub === 'search' || sub === 's') {
      if (!rest) return reply(`❌ Game name missing!\nExample: *${prefix}dodi search WRC 7*`);

      await react(conn, from, mek.key, '🔍');
      await reply(`🔍 Searching DODI for *"${rest}"* ...`);

      let results;
      try {
        results = await searchDodi(rest);
      } catch (e) {
        return reply(`❌ Search failed: ${e.message}\n\nDODI site may be down. Try again later.`);
      }

      saveSession(sender, results);
      return reply(fmtSearch(results, rest));
    }

    // ── .dodi get <number> ───────────────────────────────────
    if (sub === 'get' || sub === 'g') {
      const num   = parseInt(rest, 10);
      const cache = loadSession(sender);

      if (!cache || !cache.length)
        return reply(`❌ No search results found!\nUse *${prefix}dodi search <game name>* first.`);
      if (isNaN(num) || num < 1 || num > cache.length)
        return reply(`❌ Enter a number between *1 – ${cache.length}*`);

      const picked = cache[num - 1];
      await react(conn, from, mek.key, '⏳');
      await reply(`⏳ Fetching details for:\n*${picked.title}*`);

      let game;
      try {
        game = await getGameDetails(picked.link);
      } catch (e) {
        return reply(`❌ Failed to get game details: ${e.message}`);
      }

      saveGame(sender, game);
      await react(conn, from, mek.key, '✅');
      return reply(fmtDetails(game));
    }

    // ── .dodi link <url> ─────────────────────────────────────
    if (sub === 'link' || sub === 'l') {
      if (!rest || !rest.startsWith('http'))
        return reply(`❌ Invalid URL!\nExample: *${prefix}dodi link https://dodi-repacks.site/...*`);

      await react(conn, from, mek.key, '⏳');
      await reply(`⏳ Fetching game details from URL...`);

      let game;
      try {
        game = await getGameDetails(rest);
      } catch (e) {
        return reply(`❌ Failed: ${e.message}`);
      }

      saveGame(sender, game);
      await react(conn, from, mek.key, '✅');
      return reply(fmtDetails(game));
    }

    // ── .dodi info <url> ─────────────────────────────────────
    if (sub === 'info' || sub === 'i') {
      if (!rest || !rest.startsWith('http'))
        return reply(`❌ Provide a valid DODI URL.\nExample: *${prefix}dodi info https://dodi-repacks.site/...*`);

      await react(conn, from, mek.key, '⏳');
      let game;
      try {
        game = await getGameDetails(rest);
      } catch (e) {
        return reply(`❌ Failed: ${e.message}`);
      }

      let msg = `🎮 *${game.title}*\n`;
      msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg    += `💾 *Repack Size :* ${game.size}\n`;
      if (game.origSize !== 'N/A') msg += `🗂️  *Original Size :* ${game.origSize}\n`;
      if (game.genre    !== 'N/A') msg += `🎭 *Genre :* ${game.genre.substring(0, 60)}\n`;
      if (game.company  !== 'N/A') msg += `🏢 *Company :* ${game.company.substring(0, 50)}\n`;
      if (game.langs    !== 'N/A') msg += `🌐 *Languages :* ${game.langs.substring(0, 60)}\n`;
      msg    += `🔗 Source: ${game.url}\n\n`;
      msg    += BOT_TAG;
      return reply(msg);
    }

    // ── .dodi part <url|number> <part_number> ────────────────
    //  Sends a specific download part as WhatsApp document
    //  .dodi part 2      → sends part 2 from last game's partLinks
    //  .dodi part <url> 3 → fetches URL, sends part 3
    if (sub === 'part' || sub === 'p') {
      // Check if first arg is a URL or a number
      const isURL    = rest.startsWith('http');
      let   gameData = null;
      let   partNum  = 1;

      if (isURL) {
        const parts = rest.split(/\s+/);
        const url   = parts[0];
        partNum     = parseInt(parts[1] || '1', 10);

        await react(conn, from, mek.key, '⏳');
        await reply(`⏳ Loading game page...`);
        try {
          gameData = await getGameDetails(url);
          saveGame(sender, gameData);
        } catch (e) {
          return reply(`❌ Failed to load page: ${e.message}`);
        }
      } else {
        // Number only — use last game
        partNum  = parseInt(rest, 10) || 1;
        gameData = loadGame(sender);
        if (!gameData)
          return reply(`❌ No game loaded!\nFirst use *${prefix}dodi get <number>* or *${prefix}dodi link <url>*`);
      }

      // All links combined (single + part) for easy indexing
      const allLinks = [...gameData.singleLinks, ...gameData.partLinks];

      if (!allLinks.length)
        return reply(`❌ No download links found for this game.`);
      if (partNum < 1 || partNum > allLinks.length)
        return reply(`❌ Part number must be between *1 – ${allLinks.length}*\n\nUse *${prefix}dodi get <n>* first to see all links.`);

      const linkObj = allLinks[partNum - 1];
      await react(conn, from, mek.key, '⏳');
      await reply(`📥 Preparing file *${partNum}/${allLinks.length}* ...\n📁 ${linkObj.text}`);

      try {
        await sendFilePart(conn, from, mek, linkObj, gameData.title);
        await react(conn, from, mek.key, '✅');
      } catch (e) {
        await react(conn, from, mek.key, '❌');
        return reply(
          `❌ *Send Failed!*\n\n` +
          `${e.message}\n\n` +
          `📎 Direct link:\n${linkObj.href}\n\n` +
          BOT_TAG
        );
      }
      return;
    }

    // ── .dodi send <number>  (sends all parts one by one) ────
    //  WARNING: only works for small games (<95MB per part)
    if (sub === 'send' || sub === 'dl') {
      const num  = parseInt(rest, 10);
      const game = loadGame(sender);

      if (!game)
        return reply(`❌ No game loaded! Use *${prefix}dodi get <number>* first.`);

      const allLinks = [...game.singleLinks, ...game.partLinks];
      if (!allLinks.length)
        return reply(`❌ No download links found.`);

      const sendList = isNaN(num)
        ? allLinks                      // send ALL
        : [allLinks[num - 1]].filter(Boolean);  // send specific

      if (!sendList.length)
        return reply(`❌ Invalid part number. Range: 1 – ${allLinks.length}`);

      await react(conn, from, mek.key, '⏳');
      await reply(
        `📤 Sending *${sendList.length}* file${sendList.length > 1 ? 's' : ''}...\n` +
        `⚠️ WhatsApp limit: 95 MB per file\n\n` +
        `Please wait...`
      );

      let ok = 0, fail = 0;
      for (let i = 0; i < sendList.length; i++) {
        const lnk = sendList[i];
        try {
          await reply(`📦 Sending *${i + 1}/${sendList.length}* : ${lnk.text}`);
          await sendFilePart(conn, from, mek, lnk, game.title);
          ok++;
          // Small delay between files so WA doesn't throttle
          if (i < sendList.length - 1) await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          fail++;
          await reply(`❌ Part ${i + 1} failed: ${e.message}\n🔗 ${lnk.href}`);
        }
      }

      await react(conn, from, mek.key, ok > 0 ? '✅' : '❌');
      return reply(
        `🏁 *Done!*\n` +
        `✅ Sent  : ${ok}\n` +
        (fail ? `❌ Failed : ${fail}\n` : '') +
        `\n${BOT_TAG}`
      );
    }

    // ── Unknown sub-command ───────────────────────────────────
    return reply(
      `❓ Unknown command: *${sub}*\n\n` +
      `Type *${prefix}dodi* to see all commands.\n\n` +
      BOT_TAG
    );

  } catch (err) {
    console.error('[DODI PLUGIN ERROR]', err);
    reply(`❌ *Unexpected Error*\n\n${err.message}\n\nPlease try again.\n\n${BOT_TAG}`);
  }
});
