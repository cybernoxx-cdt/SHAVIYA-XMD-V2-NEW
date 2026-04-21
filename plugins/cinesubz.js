/**
 * ╔══════════════════════════════════════════════════════╗
 * ║       SHAVIYA-XMD V2 — CineSubz Advanced Plugin      ║
 * ║  Movies + TV Series | Smart Upload | Crash-Proof     ║
 * ╚══════════════════════════════════════════════════════╝
 */

'use strict';

const { cmd }  = require('../command');
const axios    = require('axios');
const sharp    = require('sharp');
const fs       = require('fs');
const path     = require('path');

// ══════════════════════════════════════════════════════
//  API CONFIG
// ══════════════════════════════════════════════════════
const API_KEY  = '42a61f2a33c61caf';
const BASE_URL = 'https://api-dark-shan-yt.koyeb.app';

// Heroku Eco dyno safe upload limit (bytes → ~430 MB)
// WhatsApp rejects docs >2 GB, but dyno RAM crash happens ~500 MB
const MAX_UPLOAD_BYTES = 430 * 1024 * 1024;

// ══════════════════════════════════════════════════════
//  PER-USER COOLDOWN  (prevent spam during slow upload)
// ══════════════════════════════════════════════════════
const activeSessions = new Map();   // jid → true while flow running
const COOLDOWN_MS    = 8 * 60 * 1000; // 8 min cooldown per user

// ══════════════════════════════════════════════════════
//  SESSION CONFIG  (per-bot settings stored in /data/)
// ══════════════════════════════════════════════════════
const DATA_DIR = path.join(__dirname, '../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSessionConfig(sessionId) {
  try {
    const file = path.join(DATA_DIR, `session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {}
  return {};
}

function saveSessionConfig(sessionId, cfg) {
  try {
    ensureDataDir();
    const file = path.join(DATA_DIR, `session_config_${sessionId}.json`);
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
  } catch (_) {}
}

const getBotName    = sid => getSessionConfig(sid).botName    || 'Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️';
const getThumbUrl   = sid => getSessionConfig(sid).thumbUrl   || 'https://files.catbox.moe/2w9wht.jpg';
const getDocPrefix  = sid => getSessionConfig(sid).docPrefix  || 'SHAVIYA-XMD';
const getFilePre    = sid => getSessionConfig(sid).filePrefix || 'ꜰɪʟᴍ ʙʏ ꜱʜᴀᴠɪʏᴀ';
const isMovieDocOn  = sid => getSessionConfig(sid).movieDoc   === true;

// ══════════════════════════════════════════════════════
//  HELPER: REACT
// ══════════════════════════════════════════════════════
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch (_) {}
}

// ══════════════════════════════════════════════════════
//  HELPER: THUMBNAIL  (always safe, never crashes)
// ══════════════════════════════════════════════════════
async function makeThumbnail(posterUrl, sessionId) {
  const fallback = getThumbUrl(sessionId);
  const useMovie = isMovieDocOn(sessionId);
  const targetUrl = (useMovie && posterUrl) ? posterUrl : fallback;

  async function fetch(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return await sharp(Buffer.from(res.data)).resize(300).jpeg({ quality: 65 }).toBuffer();
  }

  try { return await fetch(targetUrl); } catch (_) {
    if (targetUrl !== fallback) {
      try { return await fetch(fallback); } catch (_2) {}
    }
    return null;
  }
}

// ══════════════════════════════════════════════════════
//  HELPER: WAIT FOR NUMBERED REPLY
//  Returns { msg, text } or null on timeout
// ══════════════════════════════════════════════════════
function waitForReply(conn, from, sender, targetMsgId, timeoutMs = 600000) {
  return new Promise(resolve => {
    let done = false;

    const handler = ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.message) return;

      const text    = (msg.message.conversation || msg.message?.extendedTextMessage?.text || '').trim();
      const ctx     = msg.message?.extendedTextMessage?.contextInfo;
      const msgFrom = msg.key.remoteJid;
      const msgBy   = msg.key.participant || msg.key.remoteJid;

      const isRightChat   = msgFrom === from;
      const isRightReply  = ctx?.stanzaId === targetMsgId;
      const isRightSender = msgBy.includes(sender.split('@')[0]) || msgBy.includes('@lid');
      const isNumber      = /^\d+$/.test(text);

      if (isRightChat && isRightReply && isRightSender && isNumber) {
        if (done) return;
        done = true;
        conn.ev.off('messages.upsert', handler);
        resolve({ msg, text });
      }
    };

    conn.ev.on('messages.upsert', handler);

    setTimeout(() => {
      if (!done) {
        done = true;
        conn.ev.off('messages.upsert', handler);
        resolve(null);
      }
    }, timeoutMs);
  });
}

// ══════════════════════════════════════════════════════
//  HELPER: GET REAL FILE SIZE (HEAD request)
// ══════════════════════════════════════════════════════
async function getRealSizeBytes(url) {
  try {
    const res = await axios.head(url, { timeout: 12000 });
    const cl  = parseInt(res.headers['content-length']);
    return isNaN(cl) ? null : cl;
  } catch (_) { return null; }
}

// ══════════════════════════════════════════════════════
//  HELPER: PARSE "1.4 GB" / "850 MB" → bytes
// ══════════════════════════════════════════════════════
function parseSizeBytes(raw) {
  if (!raw) return null;
  const s = raw.toString().trim().toUpperCase();
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return null;
  if (s.includes('GB')) return n * 1024 * 1024 * 1024;
  if (s.includes('MB')) return n * 1024 * 1024;
  if (s.includes('KB')) return n * 1024;
  if (n > 1048576) return n; // raw bytes
  return null;
}

function formatBytes(bytes) {
  if (!bytes) return 'Unknown';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576)    return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// ══════════════════════════════════════════════════════
//  RESOLVE DOWNLOAD LINK
//  Priority: Pixeldrain → Direct → Google Drive
//  Returns { url, fileName, sizeBytes, mimetype } or null
// ══════════════════════════════════════════════════════
async function resolveDownloadLink(dlPageUrl, label) {
  let res;
  try {
    res = await axios.get(
      `${BASE_URL}/movie/cinesubz-download?url=${encodeURIComponent(dlPageUrl)}&apikey=${API_KEY}`,
      { timeout: 30000 }
    );
  } catch (err) {
    console.error(`[SHAVIYA-CINE] resolveDownloadLink fetch error (${label}):`, err.message);
    return null;
  }

  const data  = res.data?.data || {};
  const links = data.download || [];
  const title = data.title    || null;
  const size  = data.size     || null;

  console.log(`[SHAVIYA-CINE] ${label} — available links: [${links.map(l => l.name).join(', ')}]`);

  // 1. Pixeldrain (fast, reliable)
  const pixRaw = links.find(d => d.name?.toLowerCase().includes('pix'))?.url;
  if (pixRaw) {
    const fileId = pixRaw.split('/').pop().split('?')[0];
    const pixUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
    console.log(`[SHAVIYA-CINE] ${label} → Pixeldrain: ${pixUrl}`);
    return { url: pixUrl, fileName: title, sizeRaw: size, mimetype: 'video/mp4' };
  }

  // 2. Direct/Unknown link (skip Telegram)
  const direct = links.find(d => {
    const name = (d.name || '').toLowerCase();
    const url  = d.url  || '';
    if (url.includes('t.me') || name === 'telegram') return false;
    return name === 'unknown' || (url.startsWith('http') && url.includes('.'));
  })?.url;
  if (direct) {
    console.log(`[SHAVIYA-CINE] ${label} → Direct: ${direct}`);
    return { url: direct, fileName: title, sizeRaw: size, mimetype: 'video/mp4' };
  }

  // 3. Google Drive (slowest — last resort)
  const gdriveRaw = links.find(d => d.name?.toLowerCase() === 'gdrive')?.url;
  if (gdriveRaw) {
    try {
      const fg      = require('api-dylux');
      const viewUrl = gdriveRaw
        .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
        .replace('&export=download', '/view');
      const r = await fg.GDriveDl(viewUrl);
      console.log(`[SHAVIYA-CINE] ${label} → GDrive OK: ${r.fileName}`);
      return { url: r.downloadUrl, fileName: r.fileName, sizeRaw: r.fileSize, mimetype: r.mimetype || 'video/mp4' };
    } catch (e) {
      console.error(`[SHAVIYA-CINE] GDrive resolve failed:`, e.message);
    }
  }

  console.warn(`[SHAVIYA-CINE] ${label} → No usable link found`);
  return null;
}

// ══════════════════════════════════════════════════════
//  SMART SEND MOVIE
//  - Size check via HEAD before uploading
//  - Sends as WhatsApp document if under limit
//  - Sends link card if too big (bot never crashes)
//  - Graceful error handling for all network failures
// ══════════════════════════════════════════════════════
async function smartSendMovie(conn, from, quotedMsg, dlResult, title, quality, sessionId, posterUrl) {
  const botName   = getBotName(sessionId);
  const docPrefix = getDocPrefix(sessionId);
  const filePre   = getFilePre(sessionId);

  // Build clean filename
  const rawName  = (dlResult.fileName || `${title} (${quality}).mp4`)
    .replace(/\[Cinesubz\.co\]/gi, '')
    .replace(/[\\/:"*?<>|]/g, '')
    .trim();
  const fileName = `${filePre} ${rawName}`.trim();

  // Determine size
  let sizeBytes = parseSizeBytes(dlResult.sizeRaw);
  if (!sizeBytes) {
    console.log(`[SHAVIYA-CINE] HEAD size check: ${title}`);
    sizeBytes = await getRealSizeBytes(dlResult.url);
  }
  console.log(`[SHAVIYA-CINE] Size: ${sizeBytes ? formatBytes(sizeBytes) : 'unknown'} | Limit: ${formatBytes(MAX_UPLOAD_BYTES)}`);

  const thumb   = await makeThumbnail(posterUrl, sessionId);
  const sizeStr = sizeBytes ? formatBytes(sizeBytes) : 'Unknown';

  const caption = `🎬 *${docPrefix}*\n\n` +
                  `📽️ *Title:* ${title}\n` +
                  `💎 *Quality:* ${quality}\n` +
                  `📦 *Size:* ${sizeStr}\n` +
                  `📁 *Format:* MP4\n\n` +
                  `──────────────\n` +
                  `💫 *${botName}*`;

  // If file is within limit (or size unknown → try anyway)
  if (!sizeBytes || sizeBytes <= MAX_UPLOAD_BYTES) {
    try {
      const docMsg = await conn.sendMessage(from, {
        document: { url: dlResult.url },
        fileName,
        mimetype: dlResult.mimetype || 'video/mp4',
        jpegThumbnail: thumb || undefined,
        caption
      }, { quoted: quotedMsg });

      await react(conn, from, docMsg.key, '✅');
      console.log(`[SHAVIYA-CINE] ✅ Sent as document: ${fileName}`);
      return;

    } catch (uploadErr) {
      // Upload failed (network/stream) — fall through to link card
      console.error(`[SHAVIYA-CINE] Upload failed for "${title}":`, uploadErr.message);
      // DO NOT rethrow — bot stays alive
    }
  }

  // Too big OR upload failed → send link card
  const bigSizeStr = sizeBytes ? formatBytes(sizeBytes) : '(size unknown)';
  console.warn(`[SHAVIYA-CINE] Sending link card for "${title}" (${bigSizeStr})`);

  const linkMsg = await conn.sendMessage(from, {
    text: `🎬 *${title}*\n` +
          `💎 *Quality:* ${quality}\n` +
          `📦 *Size:* ${bigSizeStr}\n\n` +
          `⚠️ *File too large to upload via WhatsApp*\n` +
          `*(Bot limit: ${formatBytes(MAX_UPLOAD_BYTES)})*\n\n` +
          `📥 *Direct Download Link:*\n` +
          `${dlResult.url}\n\n` +
          `💡 *IDM / browser හරහා download කරන්න*\n\n` +
          `──────────────\n` +
          `💫 *${botName}*`
  }, { quoted: quotedMsg });

  await react(conn, from, linkMsg.key, '🔗');
}

// ══════════════════════════════════════════════════════
//  QUALITY SELECTION FLOW  (movie + single episode)
// ══════════════════════════════════════════════════════
async function runQualityFlow(conn, from, sender, quotedMsg, dlLinks, title, sessionId, posterUrl) {
  if (!dlLinks?.length) {
    await conn.sendMessage(from, { text: `❌ *Download links not available*\n🎬 *${title}*` }, { quoted: quotedMsg });
    return;
  }

  const botName = getBotName(sessionId);

  let qualText = `🎬 *${title}*\n\n📥 *Quality Select කරන්න:*\n`;
  dlLinks.forEach((dl, i) => {
    qualText += `\n*${i + 1}.* ${dl.quality}${dl.size ? ` _(${dl.size})_` : ''}`;
  });
  qualText += `\n\n──────────────\n💫 *${botName}*`;

  const sentQ = await conn.sendMessage(from, { text: qualText }, { quoted: quotedMsg });
  const sel   = await waitForReply(conn, from, sender, sentQ.key.id);
  if (!sel) return;

  const chosen = dlLinks[parseInt(sel.text) - 1];
  if (!chosen) {
    await conn.sendMessage(from, { text: `❌ *Invalid selection!*` }, { quoted: sel.msg });
    return;
  }

  await react(conn, from, sel.msg.key, '⬇️');

  const dlResult = await resolveDownloadLink(chosen.link, title);
  if (!dlResult) {
    await conn.sendMessage(from, { text: `❌ *Download link resolve failed!*\n🎬 *${title}*\n💎 *${chosen.quality}*` }, { quoted: sel.msg });
    return;
  }

  await react(conn, from, sel.msg.key, '📥');
  await smartSendMovie(conn, from, sel.msg, dlResult, title, chosen.quality, sessionId, posterUrl);
}

// ══════════════════════════════════════════════════════
//  TV SERIES FLOW
// ══════════════════════════════════════════════════════
async function runTVFlow(conn, from, sender, quotedMsg, item, sessionId) {
  const botName  = getBotName(sessionId);
  const thumbUrl = getThumbUrl(sessionId);

  await react(conn, from, quotedMsg.key, '⏳');

  // Fetch TV info
  let tvData;
  try {
    const res = await axios.get(
      `${BASE_URL}/tv/cinesubz-info?url=${encodeURIComponent(item.link)}&apikey=${API_KEY}`,
      { timeout: 30000 }
    );
    tvData = res.data?.data;
  } catch (e) {
    await conn.sendMessage(from, { text: `❌ *TV info fetch failed*\n${e.message}` }, { quoted: quotedMsg });
    return;
  }

  if (!tvData?.seasons?.length) {
    await conn.sendMessage(from, { text: `❌ *No season data found*` }, { quoted: quotedMsg });
    return;
  }

  // Season list
  let seasonText = `📺 *${tvData.title}*\n`;
  if (tvData.year)   seasonText += `📅 *Year:* ${tvData.year}\n`;
  if (tvData.rating) seasonText += `⭐ *Rating:* ${tvData.rating}\n`;
  seasonText += `\n🎯 *Season Select කරන්න:*\n`;
  tvData.seasons.forEach((s, i) => {
    seasonText += `\n*${i + 1}.* Season ${s.s_no} _(${s.episodes?.length || 0} episodes)_`;
  });
  seasonText += `\n\n──────────────\n💫 *${botName}*`;

  const posterSrc = isMovieDocOn(sessionId) ? (tvData.image || thumbUrl) : thumbUrl;
  const sentSeason = await conn.sendMessage(from, {
    image: { url: posterSrc },
    caption: seasonText
  }, { quoted: quotedMsg });

  const sSel = await waitForReply(conn, from, sender, sentSeason.key.id);
  if (!sSel) return;

  const season = tvData.seasons[parseInt(sSel.text) - 1];
  if (!season) {
    await conn.sendMessage(from, { text: `❌ *Invalid season*` }, { quoted: sSel.msg });
    return;
  }

  await react(conn, from, sSel.msg.key, '📺');

  // Episode list
  let epText = `📺 *${tvData.title}*\n🎬 *Season ${season.s_no}*\n\n`;
  epText += `*0.* 📦 *ALL EPISODES DOWNLOAD*\n`;
  season.episodes.forEach((ep, i) => {
    epText += `\n*${i + 1}.* Episode ${ep.e_no}`;
  });
  epText += `\n\n──────────────\n💫 *${botName}*`;

  const sentEp = await conn.sendMessage(from, { text: epText }, { quoted: sSel.msg });
  const epSel  = await waitForReply(conn, from, sender, sentEp.key.id);
  if (!epSel) return;

  const epNum = parseInt(epSel.text);

  // ── Download ALL episodes ──
  if (epNum === 0) {
    await react(conn, from, epSel.msg.key, '⏳');

    // Get quality from first episode
    let firstDlLinks;
    try {
      const r = await axios.get(
        `${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(season.episodes[0].link)}&apikey=${API_KEY}`,
        { timeout: 30000 }
      );
      firstDlLinks = r.data?.data?.download;
    } catch (e) {
      await conn.sendMessage(from, { text: `❌ *Failed to get episode info*` }, { quoted: epSel.msg });
      return;
    }

    if (!firstDlLinks?.length) return;

    let qualText = `📺 *${tvData.title}*\n🎬 *Season ${season.s_no} — ALL EPISODES*\n\n📥 *Quality Select කරන්න:*\n`;
    firstDlLinks.forEach((dl, i) => {
      qualText += `\n*${i + 1}.* ${dl.quality}${dl.size ? ` _(${dl.size})_` : ''}`;
    });
    qualText += `\n\n──────────────\n💫 *${botName}*`;

    const sentAQ = await conn.sendMessage(from, { text: qualText }, { quoted: epSel.msg });
    const aqSel  = await waitForReply(conn, from, sender, sentAQ.key.id);
    if (!aqSel) return;

    const chosenQIdx = parseInt(aqSel.text) - 1;
    if (isNaN(chosenQIdx) || !firstDlLinks[chosenQIdx]) return;

    await react(conn, from, aqSel.msg.key, '📥');

    await conn.sendMessage(from, {
      text: `⬇️ *Downloading ${season.episodes.length} episodes...*\n` +
            `📺 *${tvData.title} — Season ${season.s_no}*\n` +
            `💎 *Quality:* ${firstDlLinks[chosenQIdx].quality}\n\n` +
            `⏳ *Please wait...*`
    }, { quoted: aqSel.msg });

    let successCount = 0;
    for (const ep of season.episodes) {
      try {
        console.log(`[SHAVIYA-CINE] Fetching S${season.s_no}E${ep.e_no}...`);
        const epRes    = await axios.get(
          `${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(ep.link)}&apikey=${API_KEY}`,
          { timeout: 30000 }
        );
        const epLinks  = epRes.data?.data?.download;
        const epChosen = epLinks?.[chosenQIdx] || epLinks?.[0];
        if (!epChosen) { console.warn(`[SHAVIYA-CINE] No link for E${ep.e_no}`); continue; }

        const dlResult = await resolveDownloadLink(epChosen.link, `S${season.s_no}E${ep.e_no}`);
        if (!dlResult) continue;

        const epTitle = `${tvData.title} S${season.s_no}E${ep.e_no}`;
        await smartSendMovie(conn, from, aqSel.msg, dlResult, epTitle, epChosen.quality, sessionId, tvData.image || null);
        successCount++;

        // Short pause between episodes to avoid flood
        await new Promise(r => setTimeout(r, 2000));

      } catch (epErr) {
        console.error(`[SHAVIYA-CINE] Episode ${ep.e_no} error:`, epErr.message);
        // Continue with next episode — never crash
      }
    }

    await conn.sendMessage(from, {
      text: `✅ *Download Complete!*\n` +
            `📺 *${tvData.title} — Season ${season.s_no}*\n` +
            `📊 *Sent:* ${successCount}/${season.episodes.length} episodes\n\n` +
            `──────────────\n💫 *${botName}*`
    }, { quoted: aqSel.msg });

  } else {
    // ── Single episode ──
    const ep = season.episodes[epNum - 1];
    if (!ep) {
      await conn.sendMessage(from, { text: `❌ *Invalid episode*` }, { quoted: epSel.msg });
      return;
    }

    await react(conn, from, epSel.msg.key, '⏳');

    let epDlLinks;
    try {
      const r = await axios.get(
        `${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(ep.link)}&apikey=${API_KEY}`,
        { timeout: 30000 }
      );
      epDlLinks = r.data?.data?.download;
    } catch (e) {
      await conn.sendMessage(from, { text: `❌ *Episode info failed*\n${e.message}` }, { quoted: epSel.msg });
      return;
    }

    const epTitle = `${tvData.title} S${season.s_no} E${ep.e_no}`;
    await runQualityFlow(conn, from, sender, epSel.msg, epDlLinks, epTitle, sessionId, tvData.image || null);
  }
}

// ══════════════════════════════════════════════════════
//  MAIN COMMAND: .movie / .cz / .cinesubz
// ══════════════════════════════════════════════════════
cmd({
  pattern: 'movie',
  alias: ['cz', 'cinesubz', 'ct', 'cinetv'],
  desc: 'Download movies & TV series from CineSubz',
  category: 'downloader',
  react: '🎬',
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {

  // Cooldown check (one active flow per user)
  const coolKey = `${from}_${sender}`;
  if (activeSessions.has(coolKey)) {
    return reply('⏳ *Please wait!* Your previous movie request is still running.\n\nWait for it to finish first.');
  }

  try {
    if (!q) {
      return reply(
        `🎬 *SHAVIYA-XMD Movie Downloader*\n\n` +
        `📌 *Usage:*\n   .movie <name>\n\n` +
        `✨ *Examples:*\n   .movie Avengers\n   .movie Game of Thrones\n\n` +
        `📺 *Supports:* Movies & TV Series\n` +
        `🎯 *Quality:* 360p / 480p / 720p / 1080p\n\n` +
        `──────────────\n💫 *${getBotName(sessionId)}*`
      );
    }

    activeSessions.set(coolKey, true);

    const botName   = getBotName(sessionId);
    const docPrefix = getDocPrefix(sessionId);

    await react(conn, from, mek.key, '🔍');

    // ── Search ──
    let results;
    try {
      const res = await axios.get(
        `${BASE_URL}/movie/cinesubz-search?q=${encodeURIComponent(q)}&apikey=${API_KEY}`,
        { timeout: 25000 }
      );
      results = res.data?.data;
    } catch (e) {
      activeSessions.delete(coolKey);
      return reply(`❌ *Search failed!*\n\n${e.message}\n\nPlease try again later.`);
    }

    if (!results?.length) {
      activeSessions.delete(coolKey);
      return reply(`❌ *No results found for*\n🎬 *"${q}"*\n\nTry different keywords.`);
    }

    // ── Results list ──
    let listText = `🎬 *SEARCH RESULTS*\n\n`;
    listText += `🔍 *Query:* ${q}\n`;
    listText += `📊 *Found:* ${Math.min(15, results.length)} results\n\n`;
    listText += `┌─⊷ ${docPrefix}\n`;
    results.slice(0, 15).forEach((v, i) => {
      const icon = v.type === 'tvshows' ? '📺' : '🎬';
      listText += `│ *${i + 1}.* ${icon} ${v.title}\n`;
    });
    listText += `└──────────────\n\n`;
    listText += `📝 *Reply with number* (1-${Math.min(15, results.length)})\n`;
    listText += `⏱️ *Timeout:* 10 min\n\n`;
    listText += `──────────────\n💫 *${botName}*`;

    const sentList = await conn.sendMessage(from, { text: listText }, { quoted: mek });
    const sel      = await waitForReply(conn, from, sender, sentList.key.id);

    if (!sel) {
      activeSessions.delete(coolKey);
      return;
    }

    const idx  = parseInt(sel.text) - 1;
    const item = results[idx];

    if (!item) {
      activeSessions.delete(coolKey);
      await conn.sendMessage(from, {
        text: `❌ *Invalid selection!*\nPlease choose 1 to ${Math.min(15, results.length)}.`
      }, { quoted: sel.msg });
      return;
    }

    await react(conn, from, sel.msg.key, '⏳');
    console.log(`[SHAVIYA-CINE] Selected: ${item.title} | Type: ${item.type}`);

    // ── TV Series path ──
    if (item.type === 'tvshows') {
      await runTVFlow(conn, from, sender, sel.msg, item, sessionId);
      activeSessions.delete(coolKey);
      return;
    }

    // ── Movie path ──
    let movieData;
    try {
      const res = await axios.get(
        `${BASE_URL}/movie/cinesubz-info?url=${encodeURIComponent(item.link)}&apikey=${API_KEY}`,
        { timeout: 30000 }
      );
      movieData = res.data?.data;
    } catch (e) {
      activeSessions.delete(coolKey);
      await conn.sendMessage(from, { text: `❌ *Movie info failed*\n${e.message}` }, { quoted: sel.msg });
      return;
    }

    if (!movieData) {
      activeSessions.delete(coolKey);
      await conn.sendMessage(from, { text: `❌ *Movie data empty*` }, { quoted: sel.msg });
      return;
    }

    // Movie info card
    let infoText = `🎬 *${movieData.title}*\n\n`;
    if (movieData.year)      infoText += `📅 *Year:* ${movieData.year}\n`;
    if (movieData.rating)    infoText += `⭐ *Rating:* ${movieData.rating}\n`;
    if (movieData.duration)  infoText += `⏱️ *Duration:* ${movieData.duration}\n`;
    if (movieData.country)   infoText += `🌍 *Country:* ${movieData.country}\n`;
    if (movieData.directors) infoText += `🎬 *Director:* ${movieData.directors}\n`;
    if (movieData.cast)      infoText += `👥 *Cast:* ${movieData.cast}\n`;
    if (movieData.genre)     infoText += `🎭 *Genre:* ${movieData.genre}\n`;

    if (movieData.download?.length) {
      infoText += `\n📥 *Quality Select කරන්න:*\n`;
      movieData.download.forEach((d, i) => {
        infoText += `\n*${i + 1}.* ${d.quality}${d.size ? ` _(${d.size})_` : ''}`;
      });
    }
    infoText += `\n\n──────────────\n💫 *${getBotName(sessionId)}*`;

    const useMovieThumb = isMovieDocOn(sessionId);
    const posterSrc     = (useMovieThumb && movieData.image) ? movieData.image : getThumbUrl(sessionId);

    const sentInfo = await conn.sendMessage(from, {
      image: { url: posterSrc },
      caption: infoText
    }, { quoted: sel.msg });

    await runQualityFlow(
      conn, from, sender, sentInfo,
      movieData.download,
      movieData.title,
      sessionId,
      movieData.image || null
    );

    activeSessions.delete(coolKey);

  } catch (err) {
    activeSessions.delete(coolKey);
    console.error('[SHAVIYA-CINE] MAIN ERROR:', err.message);
    // Non-fatal — bot stays alive
    try {
      await conn.sendMessage(from, {
        text: `❌ *Error:* ${err.message}\n\nPlease try again.`
      }, { quoted: mek });
    } catch (_) {}
  }
});

// ══════════════════════════════════════════════════════
//  OWNER SETTINGS COMMANDS
// ══════════════════════════════════════════════════════

cmd({
  pattern: 'moviedoc',
  alias: ['posterthumb'],
  react: '🖼️',
  desc: 'Toggle movie poster as doc thumbnail (owner)',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ *Owner only*');
  const sub = args[0]?.toLowerCase();
  if (!sub || !['on', 'off'].includes(sub)) {
    const cur = isMovieDocOn(sessionId) ? '✅ ON' : '❌ OFF';
    return reply(`🖼️ *Movie Poster Thumbnail*\nCurrent: ${cur}\n\nUsage: .moviedoc on/off`);
  }
  const cfg = getSessionConfig(sessionId);
  cfg.movieDoc = (sub === 'on');
  saveSessionConfig(sessionId, cfg);
  reply(`${sub === 'on' ? '✅' : '❌'} *Movie poster thumbnail:* ${sub.toUpperCase()}`);
});

cmd({
  pattern: 'setbotname',
  alias: ['setname', 'setfooter', 'botname'],
  react: '✏️',
  desc: 'Set bot display name / footer (owner)',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ *Owner only*');
  if (!q) return reply(`📌 *Current:* ${getBotName(sessionId)}\n\nUsage: .setbotname SHAVIYA-XMD`);
  const cfg = getSessionConfig(sessionId);
  cfg.botName = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Bot name set:* ${q.trim()}`);
});

cmd({
  pattern: 'setthumb',
  alias: ['thumburl'],
  react: '🖼️',
  desc: 'Set default thumbnail URL (owner)',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ *Owner only*');
  if (!q || !q.startsWith('http')) return reply(`📌 *Usage:* .setthumb https://example.com/image.jpg`);
  const cfg = getSessionConfig(sessionId);
  cfg.thumbUrl = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Thumbnail URL updated!*`);
});

cmd({
  pattern: 'setprefix',
  alias: ['docpre', 'setdocpre'],
  react: '🏷️',
  desc: 'Set document caption prefix (owner)',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ *Owner only*');
  if (!q) return reply(`📌 *Current:* ${getDocPrefix(sessionId)}\n\nUsage: .setprefix SHAVIYA-XMD`);
  const cfg = getSessionConfig(sessionId);
  cfg.docPrefix = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Doc prefix set:* ${q.trim()}`);
});

cmd({
  pattern: 'setfilepre',
  alias: ['filenamepre'],
  react: '📁',
  desc: 'Set file name prefix (owner)',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ *Owner only*');
  if (!q) return reply(`📌 *Current:* ${getFilePre(sessionId)}\n\nUsage: .setfilepre 【SHAVIYA】`);
  const cfg = getSessionConfig(sessionId);
  cfg.filePrefix = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *File prefix set:* ${q.trim()}`);
});

cmd({
  pattern: 'moviesettings',
  alias: ['msettings', 'moviestatus'],
  react: '⚙️',
  desc: 'View all movie plugin settings (owner)',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, sessionId }) => {
  if (!isOwner) return reply('❌ *Owner only*');
  const thumbUrl = getThumbUrl(sessionId);
  reply(
    `⚙️ *SHAVIYA-XMD MOVIE SETTINGS*\n\n` +
    `📛 *Bot Name:* ${getBotName(sessionId)}\n` +
    `🏷️ *Doc Prefix:* ${getDocPrefix(sessionId)}\n` +
    `📁 *File Prefix:* ${getFilePre(sessionId)}\n` +
    `🎬 *Movie Poster Thumb:* ${isMovieDocOn(sessionId) ? '✅ ON' : '❌ OFF'}\n` +
    `🖼️ *Thumbnail:* ${thumbUrl.substring(0, 50)}...\n\n` +
    `📝 *Commands:*\n` +
    `   .setbotname <n>\n` +
    `   .setprefix <p>\n` +
    `   .setfilepre <p>\n` +
    `   .setthumb <url>\n` +
    `   .moviedoc on/off\n\n` +
    `──────────────\n💫 *SHAVIYA-XMD V2*`
  );
});
