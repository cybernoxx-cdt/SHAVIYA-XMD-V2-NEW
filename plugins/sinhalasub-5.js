const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
//  API CONFIG (hardcoded)
// ═══════════════════════════════════════════════════
const API_BASE   = "https://whiteshadow-x-api.onrender.com/api/movie";
const API_TOKEN  = "e76n2P"; // hardcoded api key

const SEARCH_URL  = (q)   => `${API_BASE}/sinhalasub-search?q=${encodeURIComponent(q)}&apitoken=${API_TOKEN}`;
const DETAILS_URL = (url) => `${API_BASE}/sinhalasub-details?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;
const DL_URL      = (url) => `${API_BASE}/sinhalasub-dl?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;

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
//  React helper
// ═══════════════════════════════════════════════════
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ═══════════════════════════════════════════════════
//  Thumbnail Builder (small, safe)
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
//  waitForReply - multi-use loop (search list / downloads list)
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
//  Clean title (remove trailing "| සිංහල උපසිරසි සමඟ" part for lists)
// ═══════════════════════════════════════════════════
function cleanTitle(title) {
  if (!title) return "Unknown";
  return title.split("|")[0].trim();
}

// ═══════════════════════════════════════════════════
//  SINHALASUB (WhiteShadow API) COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "sinhalasub",
  alias: ["sub", "ssub", "sslk"],
  desc: "SinhalaSub.lk (WhiteShadow API) Search / Details / Download",
  category: "downloader",
  react: "🔍",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    if (!q) return reply("❗ Example: `.sinhalasubw Mortal Kombat`");

    const FOOTER     = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);

    await react(conn, from, m.key, "🔍");

    // 1️⃣ SEARCH
    let items;
    try {
      const searchRes = await axios.get(SEARCH_URL(q), { timeout: 20000 });
      if (!searchRes.data?.success) throw new Error(searchRes.data?.message || "search failed");
      items = searchRes.data?.result?.items;
    } catch (e) {
      return reply("❌ Search API error: " + e.message);
    }

    if (!items?.length) return reply("❌ ප්‍රතිඵල හමු නොවීය. වෙනත් නමකින් සොයන්න.");

    let listText = `🎬 *SinhalaSub.lk Search Results*\n\n`;
    items.slice(0, 10).forEach((v, i) => {
      listText += `*${i + 1}.* ${cleanTitle(v.title)}${v.quality ? ` [${v.quality}]` : ""}\n`;
    });
    listText += `\n📌 අංකයෙන් Reply කරන්න.\n\n${FOOTER}`;

    const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: mek });

    // ── Movie select loop ──
    const startMovieFlow = async () => {
      while (true) {
        const movieSel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!movieSel) break;

        (async () => {
          const index = parseInt(movieSel.text) - 1;
          const selected = items[index];
          if (isNaN(index) || !selected) {
            return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: movieSel.msg });
          }

          await react(conn, from, movieSel.msg.key, "⏳");

          // 2️⃣ DETAILS
          let details;
          try {
            const detRes = await axios.get(DETAILS_URL(selected.url), { timeout: 20000 });
            if (!detRes.data?.success) throw new Error(detRes.data?.message || "details failed");
            details = detRes.data?.result;
          } catch (e) {
            return conn.sendMessage(from, { text: "❌ Details API error: " + e.message }, { quoted: movieSel.msg });
          }

          if (!details) return conn.sendMessage(from, { text: "❌ Movie details හමු නොවීය." }, { quoted: movieSel.msg });

          // 3️⃣ DOWNLOAD LINKS
          let downloads;
          try {
            const dlRes = await axios.get(DL_URL(selected.url), { timeout: 20000 });
            if (!dlRes.data?.success) throw new Error(dlRes.data?.message || "download fetch failed");
            downloads = dlRes.data?.result?.downloads;
          } catch (e) {
            return conn.sendMessage(from, { text: "❌ Download API error: " + e.message }, { quoted: movieSel.msg });
          }

          if (!downloads?.length) {
            return conn.sendMessage(from, { text: `❌ *${cleanTitle(details.title)}*\n\nDownload links හමු නොවීය.` }, { quoted: movieSel.msg });
          }

          // Build info caption
          let infoText = `🎬 *${cleanTitle(details.title)}*\n\n`;
          if (details.meta?.year)    infoText += `📅 *Year:* ${details.meta.year}\n`;
          if (details.meta?.imdb)    infoText += `⭐ *IMDB:* ${details.meta.imdb}\n`;
          if (details.meta?.quality) infoText += `💿 *Quality:* ${details.meta.quality}\n`;
          if (details.meta?.runtime) infoText += `⏱️ *Runtime:* ${details.meta.runtime}\n`;
          if (details.meta?.views)   infoText += `👁️ *Views:* ${details.meta.views}\n`;
          if (details.genres?.length) infoText += `🎭 *Genres:* ${details.genres.join(", ")}\n`;
          if (details.description)  infoText += `📝 *Description:* ${details.description.substring(0, 200)}\n`;
          if (details.cast?.length)  infoText += `🎬 *Cast:* ${details.cast.slice(0, 5).map(c => c.name).join(", ")}\n`;

          infoText += `\n*💎 Available Downloads:*\n`;
          downloads.forEach((d, i) => {
            infoText += `*${i + 1}.* ${d.host} - ${d.quality} (${d.size || "?"})\n`;
          });
          infoText += `\n📌 Download අංකයෙන් Reply කරන්න.\n${FOOTER}`;

          const infoMsg = await conn.sendMessage(from, {
            image: { url: details.poster || selected.poster || hardThumb },
            caption: infoText
          }, { quoted: movieSel.msg });

          // ── Download select loop ──
          const startDlFlow = async () => {
            while (true) {
              const dlSel = await waitForReply(conn, from, sender, infoMsg.key.id);
              if (!dlSel) break;

              (async () => {
                const dIndex = parseInt(dlSel.text) - 1;
                const picked = downloads[dIndex];
                if (isNaN(dIndex) || !picked) {
                  return conn.sendMessage(from, { text: "❌ වලංගු download අංකයක් ඇතුලත් කරන්න." }, { quoted: dlSel.msg });
                }

                await react(conn, from, dlSel.msg.key, "📥");

                // Download page links are redirect/landing pages (not direct file streams),
                // so we send them as a clickable text link with full info instead of
                // attempting a raw document stream (which would fail on an HTML page).
                const caption =
                  `✅ *Download Link Ready*\n\n` +
                  `🎬 *${cleanTitle(details.title)}*\n` +
                  `🌐 *Host:* ${picked.host}\n` +
                  `💎 *Quality:* ${picked.quality}\n` +
                  `⚖️ *Size:* ${picked.size || "?"}\n\n` +
                  `🔗 *Link:*\n${picked.link}\n\n` +
                  `⚠️ Link එක browser එකෙන් open කර, Download button එක click කරන්න.\n\n${FOOTER}`;

                try {
                  const sent = await conn.sendMessage(from, { text: caption }, { quoted: dlSel.msg });
                  await react(conn, from, sent.key, "✅");
                } catch (e) {
                  console.log("❌ sinhalasubw send error:", e.message);
                  await conn.sendMessage(from, { text: `❌ Link යැවීමේ දෝෂයක්.\n\n🔗 ${picked.link}` }, { quoted: dlSel.msg });
                }
              })();
            }
          };
          startDlFlow();

        })();
      }
    };

    startMovieFlow();

  } catch (e) {
    console.error("📛 SINHALASUBW ERROR:", e);
    reply("⚠️ Error: " + e.message);
  }
});
