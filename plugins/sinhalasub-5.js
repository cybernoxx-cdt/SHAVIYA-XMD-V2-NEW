const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
//  Session Config Helpers (cinesubz.js හා share කරනවා)
// ═══════════════════════════════════════════════════
function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, `../data/session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}

function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
}

function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";
}

function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

function getPrefix(sessionId) {
  return getSessionConfig(sessionId).docPrefix || "𝐇𝐀𝐒𝐈𝐘𝐀 𝐌𝐃";
}

// ═══════════════════════════════════════════════════
//  React helper
// ═══════════════════════════════════════════════════
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ═══════════════════════════════════════════════════
//  Thumbnail Builder
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
//  Wait for reply - never rejects, null on timeout
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
    const searchRes = await axios.get(
      `https://darkyasiya-new-movie-api.vercel.app/api/movie/sinhalasub/search?q=${encodeURIComponent(q)}`
    );

    const results = searchRes.data?.data?.data;
    if (!results?.length) return reply("❌ No results found");

    let listText = `🎬 *SinhalaSub.lk Results (Pixeldrain)*\n\n`;
    results.slice(0, 10).forEach((v, i) => {
      listText += `*${i + 1}.* ${v.title} (${v.year})\n`;
    });

    const listMsg = await conn.sendMessage(from, {
      text: listText + `\nReply number\n\n${FOOTER}`
    }, { quoted: mek });

    // ── Infinite Movie Select Loop ──
    const startMovieFlow = async () => {
      while (true) {
        const movieSel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!movieSel) break;

        (async () => {
          const index = parseInt(movieSel.text) - 1;
          if (isNaN(index) || !results[index]) return;

          await react(conn, from, movieSel.msg.key, "⏳");

          const selectedMovie = results[index];

          // 3️⃣ Get movie info
          const infoRes = await axios.get(
            `https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/infodl?q=${encodeURIComponent(selectedMovie.link)}&apiKey=a3b8844e3897880d75331c5b2526d701`
          );

          const info = infoRes.data?.data;
          if (!info) return;

          // 4️⃣ Show qualities
          let infoText = `🎬 *${info.title}*\n\n`;
          if (info.date)    infoText += `📅 *Year:* ${info.date}\n`;
          if (info.country) infoText += `🌍 *Country:* ${info.country}\n`;
          if (info.rating)  infoText += `⭐ *Rating:* ${info.rating}\n`;
          if (info.description) infoText += `📝 *Description:* ${info.description?.substring(0, 200)}...\n`;
          infoText += `\n*Available Pixeldrain Qualities:*`;

          const pixLinks = info.downloadLinks.filter(d => d.server?.toLowerCase().includes("pixeldrain"));
          pixLinks.forEach((d, i) => {
            infoText += `\n*${i + 1}.* ${d.quality} (${d.size})`;
          });

          const thumb = await makeThumbnail(selectedMovie.image || null, hardThumb, movieDocOn);

          const infoMsg = await conn.sendMessage(from, {
            image: { url: selectedMovie.image || hardThumb },
            caption: infoText + `\n\nReply download number\n${FOOTER}`
          }, { quoted: movieSel.msg });

          // ── Infinite Quality Select Loop ──
          const startQualityFlow = async () => {
            while (true) {
              const dlSel = await waitForReply(conn, from, sender, infoMsg.key.id);
              if (!dlSel) break;

              (async () => {
                const dIndex = parseInt(dlSel.text) - 1;
                if (isNaN(dIndex) || !pixLinks[dIndex]) return;

                const selectedLink = pixLinks[dIndex];

                await react(conn, from, dlSel.msg.key, "📥");

                const fileId = selectedLink.link.split('/').pop();
                const directPixLink = `https://pixeldrain.com/api/file/${fileId}?download`;

                const docMsg = await conn.sendMessage(from, {
                  document: { url: directPixLink },
                  fileName: `${info.title} (${selectedLink.quality}).mp4`.replace(/[\/\\:*?"<>|]/g, ""),
                  mimetype: "video/mp4",
                  jpegThumbnail: thumb || undefined,
                  caption: `🎬 *File:* 【${DOC_PREFIX}】 ${info.title} (${selectedLink.quality}).mp4\n⚖️ *Size:* ${selectedLink.size}\n💎 *Quality:* ${selectedLink.quality}\n\n${FOOTER}`
                }, { quoted: dlSel.msg });

                await react(conn, from, docMsg.key, "✅");
              })();
            }
          };
          startQualityFlow();

        })();
      }
    };
    startMovieFlow();

  } catch (e) {
    console.error("📛 CRITICAL ERROR:", e);
    reply("⚠️ Error: " + e.message);
  }
});
