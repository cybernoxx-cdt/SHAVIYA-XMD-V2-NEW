// ════════════════════════════════════════════════════════════
//  🎬  SINHALA SUB PODDA API PLUGIN  🎬
//  Powered by: https://podda-api.zone.id/
//  Commands: .ssub / .sinhalasub / .subfind / .subdl
//  For: SHAVIYA-XMD-V2 Bot
//  Note: Educational purposes only.
//
//  ⚡ POWERED BY SHAVENDRA DAMPRIYA ⚡
// ════════════════════════════════════════════════════════════

const { cmd }   = require('../command');
const axios     = require('axios');
const sharp     = require('sharp');
const fs        = require('fs');
const path      = require('path');

// ─── PODDA API ENDPOINTS ── ⚡ POWERED BY SHAVENDRA DAMPRIYA ⚡ ──
const SEARCH_API   = 'https://podda-api.zone.id/sinhala-sub-search?text=';
const DOWNLOAD_API = 'https://podda-api.zone.id/sinhala-sub-download?url=';
const POWERED_BY   = '⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡';

// ─── Session Config Helpers (same pattern as existing plugins) ─
function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, `../data/session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}

function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || 'Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️';
}

function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    'https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png';
}

function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

function getDocPrefix(sessionId) {
  return getSessionConfig(sessionId).docPrefix || 'ꜱʜᴀᴠɪʏᴀ xᴍᴅ';
}

// ─── React Helper ──────────────────────────────────────────
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ─── Thumbnail Builder ─────────────────────────────────────
async function makeThumbnail(posterUrl, hardThumbUrl) {
  const src = posterUrl || hardThumbUrl;
  try {
    const img = await axios.get(src, { responseType: 'arraybuffer', timeout: 15000 });
    return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
  } catch {
    try {
      const img = await axios.get(hardThumbUrl, { responseType: 'arraybuffer', timeout: 10000 });
      return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch { return null; }
  }
}

// ─── Wait-For-Reply Helper ─────────────────────────────────
function waitForReply(conn, from, sender, replyToId, timeout = 600000) {
  return new Promise((resolve) => {
    let settled = false;

    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const text = msg.message.conversation ||
                   msg.message?.extendedTextMessage?.text || '';
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isUser = msgSender.includes(sender.split('@')[0]) ||
                     msgSender.includes('@lid');

      if (msg.key.remoteJid === from && isUser && ctx?.stanzaId === replyToId) {
        if (settled) return;
        settled = true;
        conn.ev.off('messages.upsert', handler);
        resolve({ msg, text: text.trim() });
      }
    };

    conn.ev.on('messages.upsert', handler);
    setTimeout(() => {
      if (settled) return;
      conn.ev.off('messages.upsert', handler);
      resolve(null);
    }, timeout);
  });
}

// ════════════════════════════════════════════════════════════
//  📌 COMMAND: .ssub | .sinhalasub | .subfind
//  Search + Interactive Download via PODDA API
// ════════════════════════════════════════════════════════════
cmd({
  pattern:  'ssub',
  alias:    ['sinhalasub2', 'subfind'],
  desc:     'Sinhala Sub movie search & download (PODDA API)',
  category: 'downloader',
  react:    '🎬',
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {

    if (!q) return reply(
      '❗ *Usage:* .ssub <movie name>\n\n' +
      '📌 *Example:* .ssub Avengers\n\n' +
      '🔎 Powered by *PODDA Sinhala Sub API*\n\n' +
      '⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡'
    );

    const FOOTER      = `✫☘ ${getBotName(sessionId)} ☢️☘\n⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡`;
    const HARD_THUMB  = getHardThumbUrl(sessionId);
    const MOVIE_DOC   = isMovieDocOn(sessionId);
    const DOC_PREFIX  = getDocPrefix(sessionId);

    await react(conn, from, m.key, '🔍');

    // ── 1️⃣  Search ─────────────────────────────────────────
    let results = [];
    try {
      const res = await axios.get(
        `${SEARCH_API}${encodeURIComponent(q)}`,
        { timeout: 20000 }
      );

      // PODDA API response may be array or { results: [] } or { data: [] }
      const raw = res.data;
      if (Array.isArray(raw))               results = raw;
      else if (Array.isArray(raw?.results)) results = raw.results;
      else if (Array.isArray(raw?.data))    results = raw.data;
      else                                  results = [];

    } catch (e) {
      return reply('❌ *Search failed!*\n\n' + e.message);
    }

    if (!results.length)
      return reply(`❌ *"${q}"* සඳහා ප්‍රතිඵල හමු නොවීය.\n\nවෙනත් නමකින් සොයන්න. 🔍`);

    // ── 2️⃣  Build Movie List ────────────────────────────────
    let listText =
      `🎬 *SINHALA SUB SEARCH*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔎 *Query:* ${q}\n` +
      `📋 *Found:* ${Math.min(results.length, 10)} results\n` +
      `⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    results.slice(0, 10).forEach((item, i) => {
      const title = item.title || item.name || item.movie_name || 'Unknown';
      const year  = item.year  || item.date || '';
      const lang  = item.language || item.sub_lang || '';
      listText   += `*${i + 1}.* 🎞️ ${title}`;
      if (year) listText += ` *(${year})*`;
      if (lang) listText += ` [${lang}]`;
      listText   += `\n`;
    });

    listText += `\n📌 *Reply number to get download links*\n${FOOTER}`;

    const listMsg = await conn.sendMessage(from, {
      text: listText
    }, { quoted: mek });

    // ── 3️⃣  Movie Selection Loop ────────────────────────────
    const movieLoop = async () => {
      while (true) {
        const sel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!sel) break;

        (async () => {
          const idx = parseInt(sel.text) - 1;
          if (isNaN(idx) || idx < 0 || !results[idx]) {
            return conn.sendMessage(from, {
              text: '❌ වලංගු අංකයක් ඇතුලත් කරන්න. (1 - ' + Math.min(results.length, 10) + ')'
            }, { quoted: sel.msg });
          }

          await react(conn, from, sel.msg.key, '⏳');
          const movie = results[idx];

          // ── 4️⃣  Fetch Download Links ──────────────────────
          const movieUrl = movie.url || movie.link || movie.href || movie.movie_url || '';

          if (!movieUrl) {
            return conn.sendMessage(from, {
              text: '❌ Movie URL හමු නොවීය. Admin හා සම්බන්ධ වන්න.'
            }, { quoted: sel.msg });
          }

          let dlData = null;
          try {
            const dlRes = await axios.get(
              `${DOWNLOAD_API}${encodeURIComponent(movieUrl)}`,
              { timeout: 25000 }
            );
            dlData = dlRes.data;
          } catch (e) {
            return conn.sendMessage(from, {
              text: '❌ Download links ලබා ගැනීම අසාර්ථකයි.\n\n' + e.message
            }, { quoted: sel.msg });
          }

          // ── 5️⃣  Parse Download Links ──────────────────────
          let dlLinks = [];
          if (Array.isArray(dlData))                  dlLinks = dlData;
          else if (Array.isArray(dlData?.links))      dlLinks = dlData.links;
          else if (Array.isArray(dlData?.downloads))  dlLinks = dlData.downloads;
          else if (Array.isArray(dlData?.data))       dlLinks = dlData.data;

          const title   = movie.title || movie.name || movie.movie_name || 'Unknown Movie';
          const poster  = movie.image || movie.poster || movie.thumbnail || movie.img || null;
          const year    = movie.year  || movie.date || '';
          const rating  = movie.rating || '';
          const desc    = movie.description || movie.desc || movie.plot || '';

          // ── 6️⃣  Send Movie Info + Links ───────────────────
          let infoText =
            `🎬 *${title}*` +
            (year ? ` *(${year})*` : '') +
            `\n━━━━━━━━━━━━━━━━━━\n` +
            `⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡\n` +
            `━━━━━━━━━━━━━━━━━━\n`;

          if (rating) infoText += `⭐ *Rating:* ${rating}\n`;
          if (desc)   infoText += `📝 *Story:* ${desc.substring(0, 250)}...\n`;

          if (dlLinks.length) {
            infoText += `\n💾 *Download Links:*\n`;
            dlLinks.forEach((lnk, i) => {
              const label   = lnk.label   || lnk.quality  || lnk.server  || lnk.title  || lnk.name  || `Link ${i + 1}`;
              const size    = lnk.size    || lnk.filesize  || '';
              const server  = lnk.server  || lnk.host      || '';
              infoText += `\n*${i + 1}.* 📥 *${label}*`;
              if (size)   infoText += ` | 📦 ${size}`;
              if (server) infoText += ` | 🖥️ ${server}`;
              infoText += `\n`;
            });
            infoText += `\n📌 *Reply link number to download*`;
          } else {
            // No structured links — show raw URL
            infoText +=
              `\n🔗 *Movie URL:*\n${movieUrl}\n\n` +
              `⚠️ Direct download link above. Copy & paste in browser.`;
          }

          infoText += `\n\n${FOOTER}`;

          const thumb = await makeThumbnail(poster, HARD_THUMB);

          let infoMsg;
          try {
            infoMsg = await conn.sendMessage(from, {
              image:   { url: poster || HARD_THUMB },
              caption: infoText,
            }, { quoted: sel.msg });
          } catch {
            infoMsg = await conn.sendMessage(from, {
              text: infoText
            }, { quoted: sel.msg });
          }

          if (!dlLinks.length) return; // Nothing more to do

          // ── 7️⃣  Link Selection Loop ───────────────────────
          const linkLoop = async () => {
            while (true) {
              const dlSel = await waitForReply(conn, from, sender, infoMsg.key.id);
              if (!dlSel) break;

              (async () => {
                const dIdx = parseInt(dlSel.text) - 1;
                if (isNaN(dIdx) || dIdx < 0 || !dlLinks[dIdx]) {
                  return conn.sendMessage(from, {
                    text: '❌ වලංගු link අංකයක් ඇතුලත් කරන්න. (1 - ' + dlLinks.length + ')'
                  }, { quoted: dlSel.msg });
                }

                await react(conn, from, dlSel.msg.key, '📥');
                const chosen = dlLinks[dIdx];

                const fileUrl   = chosen.url  || chosen.link  || chosen.href || chosen.download_url || '';
                const label     = chosen.label || chosen.quality || chosen.server || `Link ${dIdx + 1}`;
                const size      = chosen.size  || chosen.filesize || '?';
                const fileName  = `${title} (${label}).mp4`.replace(/[\/\\:*?"<>|]/g, '');
                const caption   =
                  `🎬 *${title}*\n` +
                  `━━━━━━━━━━━━━━━━━━\n` +
                  `💾 *Quality:* ${label}\n` +
                  `📦 *Size:* ${size}\n` +
                  `🏷️ *File:* 【${DOC_PREFIX}】 ${fileName}\n` +
                  `⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡\n\n` +
                  `${FOOTER}`;

                if (!fileUrl) {
                  return conn.sendMessage(from, {
                    text: `❌ Download URL හමු නොවීය.\n\nRaw data:\n${JSON.stringify(chosen, null, 2)}`
                  }, { quoted: dlSel.msg });
                }

                try {
                  const docMsg = await conn.sendMessage(from, {
                    document:      { url: fileUrl },
                    fileName:      fileName,
                    mimetype:      'video/mp4',
                    jpegThumbnail: thumb || undefined,
                    caption,
                  }, { quoted: dlSel.msg });

                  await react(conn, from, docMsg.key, '✅');

                } catch (e) {
                  // Fallback — send direct link
                  await conn.sendMessage(from, {
                    text:
                      `⚠️ File direct send කිරීම අසාර්ථකයි.\n\n` +
                      `📎 *Direct link:*\n${fileUrl}\n\n` +
                      caption
                  }, { quoted: dlSel.msg });
                }

              })();
            }
          };
          linkLoop();

        })();
      }
    };
    movieLoop();

  } catch (e) {
    console.error('📛 SSUB ERROR:', e);
    reply('⚠️ Error: ' + e.message);
  }
});

// ════════════════════════════════════════════════════════════
//  📌 COMMAND: .subdl <url>
//  Direct download by URL — skip search step
// ════════════════════════════════════════════════════════════
cmd({
  pattern:  'subdl',
  desc:     'Sinhala Sub direct download by movie page URL',
  category: 'downloader',
  react:    '📥',
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {

    if (!q) return reply(
      '❗ *Usage:* .subdl <movie page URL>\n\n' +
      '📌 *Example:* .subdl https://sinhalasub.lk/movie/...\n\n' +
      '⚡ Direct download without search step\n\n' +
      '⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡'
    );

    const FOOTER     = `✫☘ ${getBotName(sessionId)} ☢️☘\n⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡`;
    const HARD_THUMB = getHardThumbUrl(sessionId);
    const DOC_PREFIX = getDocPrefix(sessionId);

    await react(conn, from, m.key, '⏳');

    let dlData = null;
    try {
      const res = await axios.get(
        `${DOWNLOAD_API}${encodeURIComponent(q)}`,
        { timeout: 25000 }
      );
      dlData = res.data;
    } catch (e) {
      return reply('❌ Download links ලබා ගැනීම අසාර්ථකයි.\n\n' + e.message);
    }

    let dlLinks = [];
    if (Array.isArray(dlData))                  dlLinks = dlData;
    else if (Array.isArray(dlData?.links))      dlLinks = dlData.links;
    else if (Array.isArray(dlData?.downloads))  dlLinks = dlData.downloads;
    else if (Array.isArray(dlData?.data))       dlLinks = dlData.data;

    if (!dlLinks.length) {
      return reply(
        '❌ Download links හමු නොවීය.\n\n' +
        '📎 Raw response:\n' + JSON.stringify(dlData, null, 2).substring(0, 500)
      );
    }

    let listText =
      `📥 *DIRECT DOWNLOAD LINKS*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔗 URL: ${q.substring(0, 60)}...\n` +
      `📋 *Found:* ${dlLinks.length} links\n` +
      `⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    dlLinks.forEach((lnk, i) => {
      const label  = lnk.label   || lnk.quality  || lnk.server  || lnk.title  || `Link ${i + 1}`;
      const size   = lnk.size    || lnk.filesize  || '?';
      const server = lnk.server  || lnk.host      || '';
      listText    += `*${i + 1}.* 💾 *${label}* | 📦 ${size}`;
      if (server)  listText += ` | 🖥️ ${server}`;
      listText    += `\n`;
    });

    listText += `\n📌 *Reply number to download*\n${FOOTER}`;

    const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: mek });

    const linkLoop = async () => {
      while (true) {
        const sel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!sel) break;

        (async () => {
          const idx = parseInt(sel.text) - 1;
          if (isNaN(idx) || idx < 0 || !dlLinks[idx]) {
            return conn.sendMessage(from, {
              text: '❌ වලංගු අංකයක් ඇතුලත් කරන්න. (1 - ' + dlLinks.length + ')'
            }, { quoted: sel.msg });
          }

          await react(conn, from, sel.msg.key, '📥');
          const chosen  = dlLinks[idx];
          const fileUrl = chosen.url  || chosen.link  || chosen.href || chosen.download_url || '';
          const label   = chosen.label || chosen.quality || chosen.server || `Link ${idx + 1}`;
          const size    = chosen.size  || chosen.filesize || '?';
          const fileName = `SinhalaSub (${label}).mp4`.replace(/[\/\\:*?"<>|]/g, '');
          const caption  =
            `📥 *SinhalaSub Download*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `💾 *Quality:* ${label}\n` +
            `📦 *Size:* ${size}\n` +
            `🏷️ *File:* 【${DOC_PREFIX}】 ${fileName}\n` +
            `⚡ *POWERED BY SHAVENDRA DAMPRIYA* ⚡\n\n` +
            `${FOOTER}`;

          if (!fileUrl) {
            return conn.sendMessage(from, {
              text: '❌ URL හමු නොවීය.\n\n' + JSON.stringify(chosen, null, 2)
            }, { quoted: sel.msg });
          }

          try {
            const thumb  = await makeThumbnail(null, HARD_THUMB);
            const docMsg = await conn.sendMessage(from, {
              document:      { url: fileUrl },
              fileName,
              mimetype:      'video/mp4',
              jpegThumbnail: thumb || undefined,
              caption,
            }, { quoted: sel.msg });
            await react(conn, from, docMsg.key, '✅');
          } catch (e) {
            await conn.sendMessage(from, {
              text: `⚠️ Send error.\n📎 Direct link:\n${fileUrl}\n\n${caption}`
            }, { quoted: sel.msg });
          }

        })();
      }
    };
    linkLoop();

  } catch (e) {
    console.error('📛 SUBDL ERROR:', e);
    reply('⚠️ Error: ' + e.message);
  }
});
