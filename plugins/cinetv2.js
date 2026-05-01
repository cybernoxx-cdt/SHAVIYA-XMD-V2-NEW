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

// ═══════════════════════════════════════════════════
//  API Config — CineTV (Search)
// ═══════════════════════════════════════════════════
const CINETV_SEARCH_URL = "https://cinesubz-api-cnw.vercel.app/api/search";

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
//  MAIN COMMAND — .cinetv2 (Search)
// ═══════════════════════════════════════════════════
cmd({
  pattern: "cinetv2",
  alias: ["ctv2", "cinetvnew"],
  desc: "Search movies/series via CineTV API",
  category: "downloader",
  react: "🎬",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    if (!q) {
      return reply(
        `🎬 *SHAVIYA-XMD | CineTV Search*\n\n` +
        `📌 *Usage:* .cinetv2 <movie name>\n` +
        `✨ *Example:* .cinetv2 spider man\n\n` +
        `💫 *${getBotName(sessionId)}*`
      );
    }

    await react(conn, from, m.key, "🔍");

    // ── Search ──
    const searchRes = await axios.get(CINETV_SEARCH_URL, {
      params: { q },
      timeout: 15000
    });

    // API response: array directly or wrapped in .results / .data
    let results = searchRes.data;
    if (!Array.isArray(results)) {
      results = searchRes.data?.results || searchRes.data?.data || [];
    }

    if (!results.length) {
      return reply(`❌ *No results found for:* _${q}_\n\nTry different keywords.`);
    }

    // ── Build list ──
    let listText = `🎬 *CineTV Search Results*\n`;
    listText += `🔍 *Query:* ${q}\n`;
    listText += `📊 *Found:* ${results.length} results\n\n`;

    results.slice(0, 12).forEach((item, i) => {
      const typeIcon = (item.type === "tv" || item.type === "tvshows") ? "📺" : "🎬";
      listText += `*${i + 1}.* ${typeIcon} *${item.title || item.name}*\n`;
      if (item.year) listText += `     📅 ${item.year}\n`;
    });

    listText += `\n📝 *Reply with number to continue*\n`;
    listText += `⏱️ Timeout: 2 minutes\n\n`;
    listText += `💫 *${getBotName(sessionId)}*`;

    const sentList = await conn.sendMessage(from, { text: listText }, { quoted: mek });

    // ── Wait for selection ──
    const sel = await waitForReply(conn, from, sender, sentList.key.id);
    if (!sel) return;

    const idx = parseInt(sel.text) - 1;
    const selected = results[idx];
    if (!selected) return reply("❌ Invalid selection.");

    await react(conn, from, sel.msg.key, "✅");

    // ── Show movie info ──
    const movieDocOn = isMovieDocOn(sessionId);
    const hardThumb = getHardThumbUrl(sessionId);
    const thumb = await makeThumbnail(selected.image || selected.poster || null, hardThumb, movieDocOn);

    // Build info text with available fields
    let infoText = `🎬 *${selected.title || selected.name}*\n\n`;
    if (selected.year)     infoText += `📅 *Year:* ${selected.year}\n`;
    if (selected.rating)   infoText += `⭐ *Rating:* ${selected.rating}\n`;
    if (selected.duration) infoText += `⏱️ *Duration:* ${selected.duration}\n`;
    if (selected.genre)    infoText += `🎭 *Genre:* ${selected.genre}\n`;
    if (selected.country)  infoText += `🌍 *Country:* ${selected.country}\n`;
    if (selected.id)       infoText += `\n🔑 *ID:* \`${selected.id}\`\n`;
    if (selected.type)     infoText += `📂 *Type:* ${selected.type}\n`;

    infoText += `\n──────────────\n`;
    infoText += `💡 *Use* \`.cz2 ${selected.id || ''}\` *to download*\n`;
    infoText += `💫 *${getBotName(sessionId)}*`;

    if (thumb) {
      await conn.sendMessage(from, {
        image: { url: selected.image || selected.poster || hardThumb },
        caption: infoText
      }, { quoted: sel.msg });
    } else {
      await conn.sendMessage(from, { text: infoText }, { quoted: sel.msg });
    }

  } catch (e) {
    console.error("CINETV2 ERROR:", e.message);
    reply(`❌ Error: ${e.message}`);
  }
});
