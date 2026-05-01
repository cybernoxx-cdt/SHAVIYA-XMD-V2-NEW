const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
//  Session Config Helpers
// ═══════════════════════════════════════════════════
function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, `../data/session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}

function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || "Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️";
}

function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";
}

function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

function getDocPrefix(sessionId) {
  return getSessionConfig(sessionId).docPrefix || "SHAVIYA-XMD";
}

function getFilePrefix(sessionId) {
  return getSessionConfig(sessionId).filePrefix || "ꜰɪʟᴍ ᴜᴘʟᴏᴀᴅ ʙʏ ꜱʜᴀᴠɪʏᴀ";
}

// ═══════════════════════════════════════════════════
//  API Config — CineSubz (Extract/Download)
// ═══════════════════════════════════════════════════
const CINESUBZ_EXTRACT_URL = "https://cinesubz-api-cnw.vercel.app/api/extract";

// ═══════════════════════════════════════════════════
//  Thumbnail Builder
// ═══════════════════════════════════════════════════
async function makeThumbnail(moviePosterUrl, hardThumbUrl, movieDocOn) {
  const primaryUrl = (movieDocOn && moviePosterUrl) ? moviePosterUrl : hardThumbUrl;

  async function fetchThumb(url) {
    const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
  }

  try {
    return await fetchThumb(primaryUrl);
  } catch (e) {
    if (primaryUrl !== hardThumbUrl) {
      try { return await fetchThumb(hardThumbUrl); } catch {}
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  Wait For Reply
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, sender, targetId, timeout = 120000) {
  return new Promise((resolve) => {
    let settled = false;
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isTargetReply = context?.stanzaId === targetId;
      const isCorrectUser = msgSender.includes(sender.split('@')[0]);

      if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && text.trim() !== "") {
        if (settled) return;
        settled = true;
        conn.ev.off("messages.upsert", handler);
        resolve({ msg, text: text.trim() });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => {
      if (settled) return;
      conn.ev.off("messages.upsert", handler);
      resolve(null);
    }, timeout);
  });
}

async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ═══════════════════════════════════════════════════
//  Format File Size
// ═══════════════════════════════════════════════════
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "Unknown";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// ═══════════════════════════════════════════════════
//  Smart Size Check (HEAD request)
// ═══════════════════════════════════════════════════
const MAX_SEND_MB = 450;

async function getRealSizeMB(url) {
  try {
    const res = await axios.head(url, { timeout: 10000 });
    const cl = res.headers['content-length'];
    if (cl) return parseInt(cl) / (1024 * 1024);
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════
//  Smart Send — auto size check, no bot crash
// ═══════════════════════════════════════════════════
async function smartSendMovie(conn, from, url, fileName, title, quality, thumb, caption, quotedMsg) {
  let sizeMB = await getRealSizeMB(url);

  console.log(`📦 [CZ2] Size: ${sizeMB ? sizeMB.toFixed(1) + ' MB' : 'unknown'} | Limit: ${MAX_SEND_MB} MB`);

  if (!sizeMB || sizeMB <= MAX_SEND_MB) {
    const docMsg = await conn.sendMessage(from, {
      document: { url },
      fileName: fileName || `${title} (${quality}).mp4`,
      mimetype: "video/mp4",
      jpegThumbnail: thumb || undefined,
      caption
    }, { quoted: quotedMsg });
    await conn.sendMessage(from, { react: { text: "✅", key: docMsg.key } });
    console.log(`✅ [CZ2] Sent as document: ${fileName}`);
    return;
  }

  // File too large → send link
  const formattedMB = sizeMB >= 1024
    ? `${(sizeMB / 1024).toFixed(2)} GB`
    : `${sizeMB.toFixed(0)} MB`;

  console.log(`⚠️ [CZ2] File too large (${formattedMB}) — sending link`);

  const linkMsg = await conn.sendMessage(from, {
    text:
      `🎬 *${title}*\n` +
      `💎 *Quality:* ${quality}\n` +
      `📦 *Size:* ${formattedMB}\n\n` +
      `⚠️ *File too large to send via WhatsApp*\n` +
      `*(Max: ${MAX_SEND_MB} MB — this file: ${formattedMB})*\n\n` +
      `📥 *Direct Download Link:*\n${url}\n\n` +
      `💡 IDM / browser හරහා download කරන්න`
  }, { quoted: quotedMsg });

  await conn.sendMessage(from, { react: { text: "🔗", key: linkMsg.key } });
}

// ═══════════════════════════════════════════════════
//  MAIN COMMAND — .cz2 <id> [mv|tv]
// ═══════════════════════════════════════════════════
cmd({
  pattern: "cz2",
  alias: ["cinesubznew", "czdown"],
  desc: "Download movie/series using CineSubz extract API",
  category: "downloader",
  react: "🍿",
  filename: __filename
}, async (conn, mek, m, { from, args, reply, sender, sessionId }) => {
  try {
    const id   = args[0];
    const type = args[1] || "mv"; // default: mv (movie)

    if (!id) {
      return reply(
        `🍿 *SHAVIYA-XMD | CineSubz Download*\n\n` +
        `📌 *Usage:*\n` +
        `   .cz2 <id> mv   → Movie download\n` +
        `   .cz2 <id> tv   → TV series download\n\n` +
        `✨ *Example:*\n` +
        `   .cz2 10410 mv\n\n` +
        `💡 Use *.cinetv2* to search & get ID\n\n` +
        `💫 *${getBotName(sessionId)}*`
      );
    }

    await react(conn, from, m.key, "⏳");

    // ── Extract download links ──
    console.log(`[CZ2] Extracting: id=${id} type=${type}`);

    const extractRes = await axios.get(CINESUBZ_EXTRACT_URL, {
      params: { id, type },
      timeout: 20000
    });

    const data = extractRes.data;
    console.log(`[CZ2] Response keys:`, Object.keys(data || {}));

    // Normalize — API could return different shapes
    const title   = data?.title || data?.name || `Movie (${id})`;
    const poster  = data?.image || data?.poster || data?.thumbnail || null;

    // Download links array — try multiple field names
    let links = data?.downloads || data?.links || data?.qualities || data?.files || [];

    // If links is single object (one quality) → wrap in array
    if (!Array.isArray(links) && links?.url) {
      links = [links];
    }

    // Fallback: if top-level has url directly
    if (!links.length && data?.url) {
      links = [{ quality: "Default", url: data.url, size: data.size || "" }];
    }

    if (!links.length) {
      console.log(`[CZ2] Raw response:`, JSON.stringify(data).slice(0, 500));
      return reply(
        `❌ *No download links found!*\n\n` +
        `🔑 *ID:* ${id} | *Type:* ${type}\n\n` +
        `💡 Make sure the ID and type are correct.\n` +
        `   Try: .cz2 ${id} ${type === 'mv' ? 'tv' : 'mv'}`
      );
    }

    // ── Show quality list ──
    const movieDocOn = isMovieDocOn(sessionId);
    const hardThumb  = getHardThumbUrl(sessionId);
    const thumb      = await makeThumbnail(poster, hardThumb, movieDocOn);

    let qualText = `🎬 *${title}*\n\n`;
    qualText += `📥 *Select Quality:*\n\n`;
    links.forEach((l, i) => {
      qualText += `*${i + 1}.* 💎 ${l.quality || l.label || `Quality ${i+1}`}`;
      if (l.size) qualText += ` _(${l.size})_`;
      qualText += `\n`;
    });
    qualText += `\n📝 *Reply with number*\n`;
    qualText += `⏱️ Timeout: 2 minutes\n\n`;
    qualText += `💫 *${getBotName(sessionId)}*`;

    let sentQual;
    if (thumb) {
      sentQual = await conn.sendMessage(from, {
        image: { url: poster || hardThumb },
        caption: qualText
      }, { quoted: mek });
    } else {
      sentQual = await conn.sendMessage(from, { text: qualText }, { quoted: mek });
    }

    // ── Wait for quality selection ──
    const sel = await waitForReply(conn, from, sender, sentQual.key.id);
    if (!sel) return;

    const qIdx = parseInt(sel.text) - 1;
    const chosen = links[qIdx];
    if (!chosen) return reply("❌ Invalid selection.");

    await react(conn, from, sel.msg.key, "📥");

    const dlUrl      = chosen.url || chosen.link;
    const quality    = chosen.quality || chosen.label || "HD";
    const DOC_PREFIX = getDocPrefix(sessionId);
    const FILE_PREFIX = getFilePrefix(sessionId);
    const fileName   = `${FILE_PREFIX} ${title} (${quality}).mp4`;

    const caption =
      `🎬 *${DOC_PREFIX}*\n\n` +
      `📽️ *Title:* ${title}\n` +
      `💎 *Quality:* ${quality}\n` +
      `📦 *Size:* ${chosen.size || 'Unknown'}\n` +
      `📁 *Format:* MP4\n\n` +
      `──────────────\n` +
      `💫 *${getBotName(sessionId)}*`;

    if (!dlUrl) return reply("❌ Download URL not found for this quality.");

    console.log(`[CZ2] Sending: ${fileName} | URL: ${dlUrl}`);

    await smartSendMovie(
      conn, from,
      dlUrl, fileName,
      title, quality,
      thumb, caption,
      sel.msg
    );

  } catch (e) {
    console.error("CZ2 ERROR:", e.message);
    reply(`❌ Error: ${e.message}`);
  }
});
