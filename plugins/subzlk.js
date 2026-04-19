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
//  FIX 1: waitForReply - multi-reply loop
//  resolve(null) timeout fix කළා — loop hang වෙන්නේ නැහැ
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, sender, targetId, timeout = 600000) {
  return new Promise((resolve) => {
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isReply = context?.stanzaId === targetId;
      const isUser = msgSender.includes(sender.split("@")[0]) || msgSender.includes("@lid");
      if (msg.key.remoteJid === from && isUser && isReply && !isNaN(text.trim()) && text.trim() !== "") {
        resolve({ msg, text: text.trim() });
      }
    };
    conn.ev.on("messages.upsert", handler);
    // FIX: resolve(null) add කළා — timeout ගිහින් loop break වෙනවා
    setTimeout(() => {
      conn.ev.off("messages.upsert", handler);
      resolve(null); // ← මේක නොතිබුණා, loop forever hang වුණා
    }, timeout);
  });
}

// ═══════════════════════════════════════════════════
//  waitForReplyOnce - quality select (single use)
// ═══════════════════════════════════════════════════
function waitForReplyOnce(conn, from, sender, targetId, timeout = 600000) {
  return new Promise((resolve) => {
    let settled = false;
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isReply = context?.stanzaId === targetId;
      const isUser = msgSender.includes(sender.split("@")[0]) || msgSender.includes("@lid");
      if (msg.key.remoteJid === from && isUser && isReply && !isNaN(text.trim()) && text.trim() !== "") {
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
//  FIX 2: sendFile - Dylux + URL stream fallback
//  Buffer download (arraybuffer) ඉවත් කළා — bot restart නොවේ
// ═══════════════════════════════════════════════════
async function sendFile(conn, from, directUrl, fileName, caption, quotedMsg, posterUrl, sessionId) {
  const thumb = await makeThumbnail(posterUrl || null, getHardThumbUrl(sessionId), isMovieDocOn(sessionId));
  await react(conn, from, quotedMsg.key, "📥");

  // ── Strategy 1: api-dylux (GDrive fast) ──
  try {
    let fg;
    try { fg = require('api-dylux'); } catch { throw new Error("api-dylux not installed"); }

    const driveViewUrl = directUrl
      .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
      .replace('&export=download&authuser=0', '/view')
      .replace('&export=download', '/view');

    console.log("🚀 Trying Dylux:", driveViewUrl);
    const res = await fg.GDriveDl(driveViewUrl);
    console.log("📦 Dylux OK:", res.fileName, res.fileSize);

    const docMsg = await conn.sendMessage(from, {
      document: { url: res.downloadUrl },
      fileName: res.fileName || fileName,
      mimetype: res.mimetype || "video/mp4",
      jpegThumbnail: thumb || undefined,
      caption,
    }, { quoted: quotedMsg });

    await react(conn, from, docMsg.key, "✅");
    return; // success

  } catch (dyluxErr) {
    console.log("⚠️ Dylux failed:", dyluxErr.message);
  }

  // ── Strategy 2: URL stream (no RAM buffer) ──
  // FIX: arraybuffer download ඉවත් කළා — OOM crash නොවේ
  try {
    console.log("📡 Trying URL stream:", directUrl);
    const docMsg = await conn.sendMessage(from, {
      document: { url: directUrl },
      fileName: fileName.replace(/[\/\\:*?"<>|]/g, ""),
      mimetype: "video/mp4",
      jpegThumbnail: thumb || undefined,
      caption,
    }, { quoted: quotedMsg });

    await react(conn, from, docMsg.key, "✅");

  } catch (e) {
    console.log("❌ URL stream failed:", e.message);
    await conn.sendMessage(from, {
      text: `❌ File send කිරීමේදී දෝෂයක් සිදු විය.\n\n📎 Manual link:\n${directUrl}\n\n${caption}`
    }, { quoted: quotedMsg });
  }
}

// ═══════════════════════════════════════════════════
//  API
// ═══════════════════════════════════════════════════
const API = "https://subzslk.vercel.app/api";

// ═══════════════════════════════════════════════════
//  MAIN COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "moviesublk",
  alias: ["msub", "moviesub"],
  desc: "moviesublk.com වෙතින් Sinhala Sub සමඟ Movies & Series Download",
  category: "downloader",
  react: "🎬",
  filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    if (!q) return reply("❗ Example: `.moviesublk solo leveling`");

    const FOOTER = `✫☘${getBotName(sessionId)}☢️☘`;
    await react(conn, from, mek.key, "🔍");

    // ── Search ──
    let results;
    try {
      const searchRes = await axios.get(
        `${API}?action=search&query=${encodeURIComponent(q)}`,
        { timeout: 20000 }
      );
      results = searchRes.data?.results;
    } catch (e) {
      return reply(`❌ Search API error: ${e.message}\n\nAPI: ${API}`);
    }

    if (!results?.length) return reply("❌ ප්‍රතිඵල හමු නොවීය. වෙනත් නමකින් සොයන්න.");

    let listText = `🎬 *MOVIESUBLK SEARCH RESULTS*\n\n`;
    results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });
    listText += `\n📌 අංකය Reply කරන්න.\n\n${FOOTER}`;

    const sentSearch = await conn.sendMessage(from, { text: listText }, { quoted: mek });

    // ── Title selection loop ──
    const searchLoop = async () => {
      while (true) {
        const sel = await waitForReply(conn, from, sender, sentSearch.key.id);
        if (!sel) break; // timeout → loop end

        (async () => {
          const idx = parseInt(sel.text) - 1;
          const chosen = results[idx];
          if (!chosen) return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: sel.msg });

          await react(conn, from, sel.msg.key, "⏳");

          // ── Details ──
          let det;
          try {
            const detRes = await axios.get(
              `${API}?action=details&url=${encodeURIComponent(chosen.link)}`,
              { timeout: 20000 }
            );
            det = detRes.data;
          } catch (e) {
            return conn.sendMessage(from, { text: `❌ Details API error: ${e.message}` }, { quoted: sel.msg });
          }

          if (!det?.status) return conn.sendMessage(from, { text: "❌ Details ගැනීමේ දෝෂයක්. API response: " + JSON.stringify(det).substring(0, 100) }, { quoted: sel.msg });

          // ── Series / Anime ──
          if (det.has_episodes && det.episodes?.length) {
            let epText = `📺 *${det.title}*\n\n*Episodes:*\n`;
            det.episodes.forEach((ep, i) => {
              epText += `*${i + 1}.* ${ep.ep || ep.title || ep.name || `EP ${i + 1}`}\n`;
            });
            epText += `\nඑපිසෝඩ් අංකය Reply කරන්න.\n\n${FOOTER}`;

            const sentEp = await conn.sendMessage(from, {
              image: { url: det.image || getHardThumbUrl(sessionId) },
              caption: epText,
            }, { quoted: sel.msg });

            const epLoop = async () => {
              while (true) {
                const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
                if (!epSel) break;

                (async () => {
                  const epIdx = parseInt(epSel.text) - 1;
                  const ep = det.episodes[epIdx];
                  if (!ep) return conn.sendMessage(from, { text: "❌ වලංගු episode අංකයක් ඇතුලත් කරන්න." }, { quoted: epSel.msg });

                  await react(conn, from, epSel.msg.key, "⏳");

                  // FIX 3: ep.anchor || ep.link || ep.url — field name safe check
                  const epLink = ep.anchor || ep.link || ep.url || ep.href;
                  if (!epLink) {
                    return conn.sendMessage(from, { text: "❌ Episode link හමු නොවීය.\nAPI field: " + JSON.stringify(ep).substring(0, 150) }, { quoted: epSel.msg });
                  }

                  let gd;
                  try {
                    const gdRes = await axios.get(
                      `${API}?action=gdrive&url=${encodeURIComponent(epLink)}`,
                      { timeout: 20000 }
                    );
                    gd = gdRes.data;
                  } catch (e) {
                    return conn.sendMessage(from, { text: `❌ GDrive API error: ${e.message}` }, { quoted: epSel.msg });
                  }

                  if (!gd?.status || !gd.gdrive_links?.length)
                    return conn.sendMessage(from, { text: "❌ Download link හමු නොවීය." }, { quoted: epSel.msg });

                  const epName = ep.ep || ep.title || ep.name || `EP ${epIdx + 1}`;

                  if (gd.gdrive_links.length === 1) {
                    await sendFile(conn, from, gd.gdrive_links[0].direct,
                      `${det.title} - ${epName}.mp4`,
                      `✅ *Download Complete*\n\n🎬 *${det.title}*\n📺 *${epName}*\n\n${FOOTER}`,
                      epSel.msg, det.image, sessionId);
                  } else {
                    let qText = `💎 *Quality තෝරන්න:*\n*${det.title} - ${epName}*\n\n`;
                    gd.gdrive_links.forEach((l, i) => { qText += `*${i + 1}.* ${l.label || l.quality || l.name || `Q${i + 1}`}\n`; });
                    qText += `\nඅංකය Reply කරන්න.\n\n${FOOTER}`;
                    const sentQ = await conn.sendMessage(from, { text: qText }, { quoted: epSel.msg });

                    // Quality = one-time reply
                    const qSel = await waitForReplyOnce(conn, from, sender, sentQ.key.id);
                    if (!qSel) return;
                    const picked = gd.gdrive_links[parseInt(qSel.text) - 1];
                    if (!picked) return;
                    await sendFile(conn, from, picked.direct,
                      `${det.title} - ${epName}.mp4`,
                      `✅ *Download Complete*\n\n🎬 *${det.title}*\n📺 *${epName}*\n\n${FOOTER}`,
                      qSel.msg, det.image, sessionId);
                  }
                })();
              }
            };
            epLoop();

          } else {
            // ── Movie ──
            const movieLink = chosen.link || chosen.url || chosen.href;
            let gd;
            try {
              const gdRes = await axios.get(
                `${API}?action=gdrive&url=${encodeURIComponent(movieLink)}`,
                { timeout: 20000 }
              );
              gd = gdRes.data;
            } catch (e) {
              return conn.sendMessage(from, { text: `❌ GDrive API error: ${e.message}` }, { quoted: sel.msg });
            }

            if (!gd?.status || !gd.gdrive_links?.length)
              return conn.sendMessage(from, { text: "❌ Download link හමු නොවීය." }, { quoted: sel.msg });

            if (gd.gdrive_links.length === 1) {
              await sendFile(conn, from, gd.gdrive_links[0].direct,
                `${det.title}.mp4`,
                `✅ *Download Complete*\n\n🎬 *${det.title}*\n\n${FOOTER}`,
                sel.msg, det.image, sessionId);
            } else {
              let qText = `💎 *Quality තෝරන්න:*\n*${det.title}*\n\n`;
              gd.gdrive_links.forEach((l, i) => { qText += `*${i + 1}.* ${l.label || l.quality || l.name || `Q${i + 1}`}\n`; });
              qText += `\nඅංකය Reply කරන්න.\n\n${FOOTER}`;
              const sentQ = await conn.sendMessage(from, { text: qText }, { quoted: sel.msg });

              const qSel = await waitForReplyOnce(conn, from, sender, sentQ.key.id);
              if (!qSel) return;
              const picked = gd.gdrive_links[parseInt(qSel.text) - 1];
              if (!picked) return;
              await sendFile(conn, from, picked.direct,
                `${det.title}.mp4`,
                `✅ *Download Complete*\n\n🎬 *${det.title}*\n\n${FOOTER}`,
                qSel.msg, det.image, sessionId);
            }
          }
        })();
      }
    };

    searchLoop();

  } catch (e) {
    console.log("❌ moviesublk error:", e);
    reply("❌ දෝෂයක් සිදු විය: " + e.message);
  }
});
