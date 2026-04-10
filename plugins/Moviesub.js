const { cmd } = require("../command");
const axios = require("axios");
const fg = require("api-dylux");
const sharp = require("sharp");
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

// ═══════════════════════════════════════════════════
//  Thumbnail Builder
// ═══════════════════════════════════════════════════
async function makeThumbnail(moviePosterUrl, hardThumbUrl, movieDocOn) {
  const primaryUrl = (movieDocOn && moviePosterUrl) ? moviePosterUrl : hardThumbUrl;
  const fallbackUrl = hardThumbUrl;

  async function fetchThumb(url) {
    const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await sharp(img.data).resize(300, 300).jpeg({ quality: 65 }).toBuffer();
  }

  try {
    return await fetchThumb(primaryUrl);
  } catch (e) {
    if (primaryUrl !== fallbackUrl) {
      try { return await fetchThumb(fallbackUrl); } catch {}
    }
    console.log(`[THUMBNAIL ERROR] ${e.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  GDrive URL Fixer
// ═══════════════════════════════════════════════════
function fixDriveUrl(url) {
  if (!url) return null;
  const match = url.match(/[-\w]{25,}/);
  if (match) return `https://drive.google.com/file/d/${match[0]}/view?usp=sharing`;
  return url;
}

// ═══════════════════════════════════════════════════
//  Wait for reply (multi-reply loop support)
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, sender, targetId) {
  return new Promise((resolve) => {
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      if (msg.key.remoteJid === from &&
        (msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid")) &&
        context?.stanzaId === targetId && !isNaN(text)) {
        console.log(`[USER REPLY] Option: ${text}`);
        resolve({ msg, text: text.trim() });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 600000);
  });
}

const API_KEY = "dew_5H5Dbuh4v7NbkNRmI0Ns2u2ZK240aNnJ9lnYQXR9";

// ═══════════════════════════════════════════════════
//  MAIN COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "moviesub",
  alias: ["ms", "submovie"],
  desc: "Download Movies & TV Series (All Fixed Version)",
  category: "downloader",
  react: "🎬",
  filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    if (!q) return reply("❗ කරුණාකර නම සඳහන් කරන්න. (Example: .moviesub Solo Leveling)");

    const FOOTER = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);

    console.log(`\n[PROCESS START] Searching: ${q} | movieDoc: ${movieDocOn}`);

    // 1. Search
    const searchRes = await axios.get(`https://api.srihub.store/movie/moviesub?q=${encodeURIComponent(q)}&apikey=${API_KEY}`);
    const results = searchRes.data?.result;
    if (!results?.length) return reply("❌ කිසිවක් හමු නොවීය.");

    let listText = "🎬 *𝐌𝐎𝐕𝐈𝐄𝐒𝐔𝐁 𝐒𝐄𝐀𝐑𝐂𝐇 𝐑𝐄𝐒𝐔𝐋𝐓𝐒*\n\n";
    results.slice(0, 15).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });
    const sentSearch = await conn.sendMessage(from, { text: listText + `\nඅංකය Reply කරන්න.\n\n${FOOTER}` }, { quoted: m });

    const startSearchFlow = async () => {
      while (true) {
        const selection = await waitForReply(conn, from, sender, sentSearch.key.id);
        if (!selection) break;

        (async () => {
          const idx = parseInt(selection.text) - 1;
          const selectedItem = results[idx];
          if (!selectedItem) return;

          await conn.sendMessage(from, { react: { text: "⏳", key: selection.msg.key } });

          // 2. Details
          const dlRes = await axios.get(`https://api.srihub.store/movie/moviesubdl?url=${encodeURIComponent(selectedItem.url)}&apikey=${API_KEY}`);
          const data = dlRes.data?.result;
          if (!data) return;

          const thumb = await makeThumbnail(data.poster || null, hardThumb, movieDocOn);

          // ── TV SERIES ──
          if (data.type === "TV_SERIES") {
            const season = data.seasons[0];
            console.log(`[TV MODE] ${data.title}`);

            let epList = `📺 *${data.title}*\n\n*${season.season}:*`;
            season.episodes.forEach((ep, i) => { epList += `\n*${i + 1}.* ${ep.title}`; });

            const sentEp = await conn.sendMessage(from, {
              image: { url: movieDocOn ? (data.poster || hardThumb) : hardThumb },
              caption: epList + `\n\nඑපිසෝඩ් අංකය එවන්න.\n\n${FOOTER}`
            }, { quoted: selection.msg });

            const startEpFlow = async () => {
              while (true) {
                const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
                if (!epSel) break;

                (async () => {
                  const epIdx = parseInt(epSel.text) - 1;
                  const selectedEp = season.episodes[epIdx];
                  if (!selectedEp) return;

                  await conn.sendMessage(from, { react: { text: "📥", key: epSel.msg.key } });

                  const driveUrl = fixDriveUrl(selectedEp.iframe);
                  console.log(`[DOWNLOADING TV] ${driveUrl}`);

                  const file = await fg.GDriveDl(driveUrl);
                  const docMsg = await conn.sendMessage(from, {
                    document: { url: file.downloadUrl },
                    fileName: file.fileName,
                    mimetype: file.mimetype,
                    jpegThumbnail: thumb,
                    caption: `🎬 *${data.title}*\n📺 ${selectedEp.title}\n⚖️ Size: ${file.fileSize}\n\n${FOOTER}`
                  }, { quoted: epSel.msg });
                  await conn.sendMessage(from, { react: { text: "✅", key: docMsg.key } });
                })();
              }
            };
            startEpFlow();

          // ── MOVIE ──
          } else if (data.type === "MOVIE") {
            const movieDl = data.downloads?.gdrive;
            if (!movieDl) return conn.sendMessage(from, { text: "❌ Movie download link හමු නොවීය." }, { quoted: selection.msg });

            console.log(`[MOVIE MODE] ${data.title}`);
            await conn.sendMessage(from, { react: { text: "📥", key: selection.msg.key } });

            const driveUrl = fixDriveUrl(movieDl);
            console.log(`[DOWNLOADING MOVIE] ${driveUrl}`);

            const file = await fg.GDriveDl(driveUrl);
            const docMsg = await conn.sendMessage(from, {
              document: { url: file.downloadUrl },
              fileName: file.fileName,
              mimetype: file.mimetype,
              jpegThumbnail: thumb,
              caption: `🎬 *${data.title}*\n⚖️ Size: ${file.fileSize}\n\n${FOOTER}`
            }, { quoted: selection.msg });
            await conn.sendMessage(from, { react: { text: "✅", key: docMsg.key } });
            console.log(`[DONE] Movie sent.`);
          }
        })();
      }
    };
    startSearchFlow();

  } catch (e) {
    console.log(`[FATAL ERROR] ${e.stack}`);
    reply("❌ දෝෂයක් සිදු විය: " + e.message);
  }
});
