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

function getPrefix(sessionId) {
  return getSessionConfig(sessionId).docPrefix || "ꜱʜᴀᴠɪʏᴀ xᴍᴅ";
}

// ═══════════════════════════════════════════════════
//  React helper
// ═══════════════════════════════════════════════════
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ═══════════════════════════════════════════════════
//  Thumbnail Builder - ONLY for thumbnail (small image, safe)
// ═══════════════════════════════════════════════════
async function makeThumbnail(moviePosterUrl, hardThumbUrl, movieDocOn) {
  const primaryUrl = (movieDocOn && moviePosterUrl) ? moviePosterUrl : hardThumbUrl;
  const fallbackUrl = hardThumbUrl;

  async function fetchThumb(url) {
    const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
  }

  try {
    return await fetchThumb(primaryUrl);
  } catch (e) {
    if (primaryUrl !== fallbackUrl) {
      try { return await fetchThumb(fallbackUrl); } catch {}
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  Wait for reply - single resolve, safe cleanup
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, sender, replyToId, timeout = 600000) {
  return new Promise((resolve) => {
    let settled = false;

    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");
      if (msg.key.remoteJid === from && isCorrectUser && ctx?.stanzaId === replyToId) {
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

// ═══════════════════════════════════════════════════
//  FIX: Send via URL streaming - NO buffer in RAM
//  Buffer download කළොත් Heroku dyno OOM crash වෙනවා
//  Pixeldrain URL direct ලෙස WhatsApp stream කරනවා
// ═══════════════════════════════════════════════════
async function sendPixelFile(conn, from, pixeldrainUrl, fileName, caption, quotedMsg, posterUrl, sessionId) {
  const thumb = await makeThumbnail(posterUrl || null, getHardThumbUrl(sessionId), isMovieDocOn(sessionId));
  await react(conn, from, quotedMsg.key, "📥");

  try {
    // ✅ URL stream - memory safe, bot restart නොවේ
    const docMsg = await conn.sendMessage(from, {
      document: { url: pixeldrainUrl },
      fileName: fileName.replace(/[\/\\:*?"<>|]/g, ""),
      mimetype: "video/mp4",
      jpegThumbnail: thumb || undefined,
      caption,
    }, { quoted: quotedMsg });

    await react(conn, from, docMsg.key, "✅");

  } catch (e) {
    console.log("❌ sendPixelFile error:", e.message);
    await conn.sendMessage(from, {
      text: `❌ File send කිරීමේදී දෝෂයක් සිදු විය.\n\n📎 Direct link:\n${pixeldrainUrl}\n\n${caption}`
    }, { quoted: quotedMsg });
  }
}

// ═══════════════════════════════════════════════════
//  SINHALASUB COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "sinhalasub",
  desc: "SinhalaSub.lk Pixeldrain downloader",
  category: "downloader",
  react: "🔍",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    if (!q) return reply("❗ Example: .sinhalasub Avatar");

    const FOOTER     = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);
    const DOC_PREFIX = getPrefix(sessionId);

    await react(conn, from, m.key, "🔍");

    // 1️⃣ Search
    let results;
    try {
      const searchRes = await axios.get(
        `https://darkyasiya-new-movie-api.vercel.app/api/movie/sinhalasub/search?q=${encodeURIComponent(q)}`,
        { timeout: 20000 }
      );
      results = searchRes.data?.data?.data;
    } catch (e) {
      return reply("❌ Search API error: " + e.message);
    }

    if (!results?.length) return reply("❌ No results found. වෙනත් නමකින් සොයන්න.");

    let listText = `🎬 *SinhalaSub.lk Results (Pixeldrain)*\n\n`;
    results.slice(0, 10).forEach((v, i) => {
      listText += `*${i + 1}.* ${v.title} (${v.year || ""})\n`;
    });

    const listMsg = await conn.sendMessage(from, {
      text: listText + `\n📌 Reply number\n\n${FOOTER}`
    }, { quoted: mek });

    // ── Infinite Movie Select Loop ──
    const startMovieFlow = async () => {
      while (true) {
        const movieSel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!movieSel) break;

        (async () => {
          const index = parseInt(movieSel.text) - 1;
          if (isNaN(index) || !results[index]) {
            return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: movieSel.msg });
          }

          await react(conn, from, movieSel.msg.key, "⏳");
          const selectedMovie = results[index];

          // 2️⃣ Get movie info
          let info;
          try {
            const infoRes = await axios.get(
              `https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/infodl?q=${encodeURIComponent(selectedMovie.link)}&apiKey=a3b8844e3897880d75331c5b2526d701`,
              { timeout: 20000 }
            );
            info = infoRes.data?.data;
          } catch (e) {
            return conn.sendMessage(from, { text: "❌ Movie info API error: " + e.message }, { quoted: movieSel.msg });
          }

          if (!info) return conn.sendMessage(from, { text: "❌ Movie info හමු නොවීය." }, { quoted: movieSel.msg });

          // 3️⃣ Filter Pixeldrain links
          const pixLinks = (info.downloadLinks || []).filter(d =>
            d.server?.toLowerCase().includes("pixeldrain")
          );

          if (!pixLinks.length) {
            return conn.sendMessage(from, {
              text: `❌ *${info.title}*\n\nPixeldrain links හමු නොවීය.\nවෙනත් quality server ඇති නමුත් Pixeldrain නොමැත.`
            }, { quoted: movieSel.msg });
          }

          let infoText = `🎬 *${info.title}*\n\n`;
          if (info.date)    infoText += `📅 *Year:* ${info.date}\n`;
          if (info.country) infoText += `🌍 *Country:* ${info.country}\n`;
          if (info.rating)  infoText += `⭐ *Rating:* ${info.rating}\n`;
          if (info.description) infoText += `📝 *Description:* ${info.description.substring(0, 200)}...\n`;
          infoText += `\n*💎 Available Qualities (Pixeldrain):*\n`;
          pixLinks.forEach((d, i) => {
            infoText += `*${i + 1}.* ${d.quality} (${d.size || "?"})\n`;
          });

          const thumb = await makeThumbnail(selectedMovie.image || null, hardThumb, movieDocOn);

          const infoMsg = await conn.sendMessage(from, {
            image: { url: selectedMovie.image || hardThumb },
            caption: infoText + `\n📌 Reply download number\n${FOOTER}`
          }, { quoted: movieSel.msg });

          // ── Infinite Quality Select Loop ──
          const startQualityFlow = async () => {
            while (true) {
              const dlSel = await waitForReply(conn, from, sender, infoMsg.key.id);
              if (!dlSel) break;

              (async () => {
                const dIndex = parseInt(dlSel.text) - 1;
                if (isNaN(dIndex) || !pixLinks[dIndex]) {
                  return conn.sendMessage(from, { text: "❌ වලංගු quality අංකයක් ඇතුලත් කරන්න." }, { quoted: dlSel.msg });
                }

                const selectedLink = pixLinks[dIndex];
                await react(conn, from, dlSel.msg.key, "📥");

                // ✅ FIX: pixeldrain URL — buffer download නැත, URL stream only
                const fileId = selectedLink.link.split('/').pop().split('?')[0];
                const pixelStreamUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
                const fileName = `${info.title} (${selectedLink.quality}).mp4`.replace(/[\/\\:*?"<>|]/g, "");
                const caption = `🎬 *File:* 【${DOC_PREFIX}】 ${info.title} (${selectedLink.quality}).mp4\n⚖️ *Size:* ${selectedLink.size || "?"}\n💎 *Quality:* ${selectedLink.quality}\n\n${FOOTER}`;

                await sendPixelFile(conn, from, pixelStreamUrl, fileName, caption, dlSel.msg, selectedMovie.image, sessionId);

              })();
            }
          };
          startQualityFlow();

        })();
      }
    };

    startMovieFlow();

  } catch (e) {
    console.error("📛 SINHALASUB ERROR:", e);
    reply("⚠️ Error: " + e.message);
  }
});
