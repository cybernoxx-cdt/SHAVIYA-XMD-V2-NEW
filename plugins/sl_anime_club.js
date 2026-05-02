const { cmd } = require("../command");
const axios = require("axios");
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const fg = require('api-dylux'); // ✅ cinetv_fixed ලෙ same — proper GDrive resolve

// ───────── SESSION CONFIG ─────────
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
    "https://whiteshadow-uploader.vercel.app/files/8xh.jpg";
}

// ───────── CONFIGURATION ─────────
const API_BASE = "https://sl-anime1.vercel.app/api/handler";

// ───────── Thumbnail ─────────
async function makeThumbnail(url) {
  try {
    const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
  } catch (e) {
    return null;
  }
}

// ───────── React helper ─────────
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ───────── Wait for Reply (multi-reply loop) ─────────
function waitForReply(conn, from, sender, targetId, timeout = 600000) {
  return new Promise((resolve) => {
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isTargetReply = context?.stanzaId === targetId;
      const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");
      if (msg.key.remoteJid === from && isCorrectUser && isTargetReply) {
        resolve({ msg, text: text.trim() });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => { conn.ev.off("messages.upsert", handler); resolve(null); }, timeout);
  });
}

// ───────── Wait for Single Reply (one-time, then off) ─────────
function waitForReplyOnce(conn, from, sender, targetId, timeout = 600000) {
  return new Promise((resolve) => {
    let settled = false;
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isTargetReply = context?.stanzaId === targetId;
      const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");
      if (msg.key.remoteJid === from && isCorrectUser && isTargetReply) {
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
//  ✅ FIX: resolveGDriveLink — api-dylux fg.GDriveDl use කරනවා
//  cinetv_fixed.js ලෙ same pattern — proper stream URL resolve කරයි
//  ❌ OLD: googleapis alt=media&key= (quota/restrict → 2.5KB error JSON)
// ═══════════════════════════════════════════════════
async function resolveGDriveLink(driveUrl, label) {
  try {
    console.log(`🔗 [ANIME] ${label} → Resolving GDrive: ${driveUrl}`);
    const r = await fg.GDriveDl(driveUrl);
    console.log(`📦 [ANIME] ${label} GDrive OK: ${r.fileName} | ${r.fileSize}`);
    return {
      url: r.downloadUrl,
      fileName: r.fileName,
      fileSize: r.fileSize,
      mimetype: r.mimetype || 'video/mp4',
    };
  } catch (e) {
    console.log(`❌ [ANIME] ${label} GDrive resolve failed:`, e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  ✅ Smart Size Parser
// ═══════════════════════════════════════════════════
function parseSizeMB(raw) {
  if (!raw) return null;
  const str = raw.toString().trim().toUpperCase();
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  if (str.includes('GB')) return num * 1024;
  if (str.includes('KB')) return num / 1024;
  if (str.includes('MB')) return num;
  if (num > 1048576) return num / (1024 * 1024);
  return null;
}

async function getRealSizeMB(url) {
  try {
    const res = await axios.head(url, { timeout: 10000 });
    const cl = res.headers['content-length'];
    if (cl) return parseInt(cl) / (1024 * 1024);
  } catch (_) {}
  return null;
}

// ═══════════════════════════════════════════════════
//  ✅ Smart Send — size check කරලා send / link card
//  Heroku 512MB dyno → 450MB safe limit
// ═══════════════════════════════════════════════════
const MAX_SEND_MB = 450;

async function smartSend(conn, from, dlResult, title, epNum, quality, thumb, quotedMsg, sessionId) {
  const FOOTER = getBotName(sessionId);
  const fileName = dlResult.fileName || `${title} - Ep ${epNum} [${quality}].mp4`;
  const caption = `✅ *Download Complete*\n\n🎬 *Anime:* ${title}\n📺 *Episode:* ${epNum}\n💎 *Quality:* ${quality}\n\n${FOOTER}`;

  let sizeMB = parseSizeMB(dlResult.fileSize);
  if (!sizeMB && dlResult.url) {
    console.log(`📏 [ANIME] HEAD check: ${title} Ep ${epNum}`);
    sizeMB = await getRealSizeMB(dlResult.url);
  }

  console.log(`📦 [ANIME] Size: ${sizeMB ? sizeMB.toFixed(1) + ' MB' : 'unknown'} | Limit: ${MAX_SEND_MB} MB`);

  if (!sizeMB || sizeMB <= MAX_SEND_MB) {
    // ✅ Size OK — document ලෙස send
    const docMsg = await conn.sendMessage(from, {
      document: { url: dlResult.url },
      fileName: fileName.replace(/[\/\\:*?"<>|]/g, ""),
      mimetype: dlResult.mimetype || 'video/mp4',
      jpegThumbnail: thumb || undefined,
      caption,
    }, { quoted: quotedMsg });
    await react(conn, from, docMsg.key, "✅");
    console.log(`✅ [ANIME] Sent: ${fileName}`);
  } else {
    // ⚠️ Too large — link card
    const formattedMB = sizeMB >= 1024
      ? `${(sizeMB / 1024).toFixed(2)} GB`
      : `${sizeMB.toFixed(0)} MB`;
    const linkMsg = await conn.sendMessage(from, {
      text: `🎬 *${title}*\n📺 *Episode:* ${epNum}\n💎 *Quality:* ${quality}\n📦 *Size:* ${formattedMB}\n\n⚠️ File too large for WhatsApp. Direct link:\n${dlResult.url}\n\n${FOOTER}`
    }, { quoted: quotedMsg });
    await react(conn, from, linkMsg.key, "🔗");
  }
}

// ═══════════════════════════════════════════════════
//  ✅ Download Handler (single episode)
//  direct_link → GDrive resolve → smart send
// ═══════════════════════════════════════════════════
async function handleDownload(conn, from, sender, url, title, quotedMsg, epNum, thumbUrl, sessionId) {
  try {
    const dlRes = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(url)}`, { timeout: 20000 });
    const dlLinks = dlRes.data?.download_links;
    if (!dlLinks?.length) {
      return conn.sendMessage(from, { text: "❌ Download links හමු නොවීය." }, { quoted: quotedMsg });
    }

    const FOOTER = getBotName(sessionId);
    let qText = `🎬 *Quality තෝරන්න:*\n*${title}*\n📺 *Episode:* ${epNum}\n\n`;
    dlLinks.forEach((dl, i) => { qText += `*${i + 1}.* ${dl.quality}\n`; });
    const sentQual = await conn.sendMessage(from, {
      text: qText + `\n📌 Quality අංකය Reply කරන්න.\n\n${FOOTER}`
    }, { quoted: quotedMsg });

    const qSel = await waitForReplyOnce(conn, from, sender, sentQual.key.id);
    if (!qSel) return;

    const chosen = dlLinks[parseInt(qSel.text) - 1];
    if (!chosen) return conn.sendMessage(from, { text: "❌ වලංගු quality අංකයක් ඇතුලත් කරන්න." }, { quoted: qSel.msg });

    await react(conn, from, qSel.msg.key, "📥");

    // ✅ GDrive link resolve
    const driveUrl = chosen.direct_link
      .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
      .replace('&export=download&authuser=0', '/view')
      .replace('&export=download', '/view');

    const dlResult = await resolveGDriveLink(driveUrl, `${title} Ep${epNum}`);
    if (!dlResult) {
      // Fallback: direct URL try
      console.log(`⚠️ [ANIME] GDrive resolve failed, trying direct URL: ${chosen.direct_link}`);
      const thumb = await makeThumbnail(thumbUrl || getHardThumbUrl(sessionId));
      await smartSend(conn, from,
        { url: chosen.direct_link, fileName: null, fileSize: null, mimetype: 'video/mp4' },
        title, epNum, chosen.quality, thumb, qSel.msg, sessionId
      );
      return;
    }

    const thumb = await makeThumbnail(thumbUrl || getHardThumbUrl(sessionId));
    await smartSend(conn, from, dlResult, title, epNum, chosen.quality, thumb, qSel.msg, sessionId);

  } catch (e) {
    console.log("❌ handleDownload error:", e.message);
    conn.sendMessage(from, { text: "❌ Download error: " + e.message }, { quoted: quotedMsg });
  }
}

// ═══════════════════════════════════════════════════
//  ✅ Download ALL Episodes (0 input)
//  Quality once → loop each ep → resolve → smart send
// ═══════════════════════════════════════════════════
async function handleAllEpisodes(conn, from, sender, episodes, title, quotedMsg, thumbUrl, sessionId) {
  const FOOTER = getBotName(sessionId);

  // Quality selection once (from first episode)
  const firstEp = episodes[0];
  let firstDlLinks;
  try {
    const dlRes = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(firstEp.link)}`, { timeout: 20000 });
    firstDlLinks = dlRes.data?.download_links;
  } catch (e) {
    return conn.sendMessage(from, { text: "❌ Download links ගැනීමේ දෝෂය: " + e.message }, { quoted: quotedMsg });
  }

  if (!firstDlLinks?.length) {
    return conn.sendMessage(from, { text: "❌ Download links හමු නොවීය." }, { quoted: quotedMsg });
  }

  let qText = `📦 *ALL EPISODES DOWNLOAD*\n*${title}*\n📺 *Episodes:* ${episodes.length}\n\n💎 *Quality තෝරන්න:*\n`;
  firstDlLinks.forEach((dl, i) => { qText += `*${i + 1}.* ${dl.quality}\n`; });
  const sentQ = await conn.sendMessage(from, {
    text: qText + `\n📌 Quality reply කරන්න (${episodes.length}ම ඒ quality ලෙස download වේ)\n\n${FOOTER}`
  }, { quoted: quotedMsg });

  const qSel = await waitForReplyOnce(conn, from, sender, sentQ.key.id);
  if (!qSel) return;

  const qIdx = parseInt(qSel.text) - 1;
  if (isNaN(qIdx) || !firstDlLinks[qIdx]) {
    return conn.sendMessage(from, { text: "❌ වලංගු quality අංකයක් ඇතුලත් කරන්න." }, { quoted: qSel.msg });
  }

  const chosenQuality = firstDlLinks[qIdx].quality;
  await react(conn, from, qSel.msg.key, "📥");

  await conn.sendMessage(from, {
    text: `⏳ *Sending All ${episodes.length} Episodes...*\n📺 *${title}*\n💎 *Quality:* ${chosenQuality}\n\n${FOOTER}`
  }, { quoted: qSel.msg });

  // ✅ Sequential — resolve each episode properly
  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    try {
      console.log(`📥 [ANIME] Episode ${ep.ep_num} (${i + 1}/${episodes.length})...`);

      const dlRes = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(ep.link)}`, { timeout: 20000 });
      const dlLinks = dlRes.data?.download_links;
      if (!dlLinks?.length) {
        await conn.sendMessage(from, { text: `⚠️ EP ${ep.ep_num}: Download link නොමැත, skip කරයි.` }, { quoted: qSel.msg });
        continue;
      }

      // Same quality හෝ closest match
      const chosen = dlLinks.find(d => d.quality === chosenQuality) || dlLinks[0];

      // ✅ GDrive proper resolve (not raw googleapis key)
      const driveUrl = chosen.direct_link
        .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
        .replace('&export=download&authuser=0', '/view')
        .replace('&export=download', '/view');

      const dlResult = await resolveGDriveLink(driveUrl, `${title} Ep${ep.ep_num}`);
      const thumb = await makeThumbnail(thumbUrl || getHardThumbUrl(sessionId));

      if (!dlResult) {
        console.log(`⚠️ [ANIME] EP${ep.ep_num} GDrive failed, trying direct...`);
        await smartSend(conn, from,
          { url: chosen.direct_link, fileName: null, fileSize: null, mimetype: 'video/mp4' },
          title, ep.ep_num, chosen.quality, thumb, qSel.msg, sessionId
        );
      } else {
        await smartSend(conn, from, dlResult, title, ep.ep_num, chosen.quality, thumb, qSel.msg, sessionId);
      }

      console.log(`✅ [ANIME] Sent EP ${ep.ep_num}`);

      // Rate limit avoid — episodes අතර delay
      if (i < episodes.length - 1) await new Promise(r => setTimeout(r, 3000));

    } catch (e) {
      console.log(`❌ [ANIME] EP ${ep.ep_num} error:`, e.message);
      await conn.sendMessage(from, { text: `⚠️ EP ${ep.ep_num}: Error - ${e.message}` }, { quoted: qSel.msg });
    }
  }

  await conn.sendMessage(from, {
    text: `✅ *All ${episodes.length} Episodes Sent!*\n🎬 *${title}*\n💎 *Quality:* ${chosenQuality}\n\n${FOOTER}`
  }, { quoted: qSel.msg });
}

// ═══════════════════════════════════════════════════
//  MAIN COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "anime",
  alias: ["ac2", "slanime"],
  desc: "SL Anime Club Downloader | 0 = All Episodes",
  category: "downloader",
  react: "⛩️",
  filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    if (!q) return reply("❗ Example: .anime solo leveling\n\n💡 Episode list ලෙස *0* reply කළොත් all episodes download වේ.");

    const FOOTER = getBotName(sessionId);
    const hardThumb = getHardThumbUrl(sessionId);

    await react(conn, from, mek.key, "🔍");

    // 1️⃣ Search
    let results;
    try {
      const searchRes = await axios.get(`${API_BASE}?action=search&query=${encodeURIComponent(q)}`, { timeout: 20000 });
      results = searchRes.data?.data;
    } catch (e) {
      return reply("❌ Search API error: " + e.message);
    }

    if (!results?.length) return reply("❌ කිසිවක් හමු නොවීය. වෙනත් නමකින් සොයන්න.");

    let listText = "⛩️ *𝐒𝐋 𝐀𝐍𝐈𝐌𝐄 𝐂𝐋𝐔𝐁 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n";
    results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });
    const sentSearch = await conn.sendMessage(from, {
      text: listText + `\n📌 අංකය Reply කරන්න.\n\n${FOOTER}`
    }, { quoted: mek });

    // ── Search List Loop (multi-reply) ──
    const startSearchFlow = async () => {
      while (true) {
        const animeSelection = await waitForReply(conn, from, sender, sentSearch.key.id);
        if (!animeSelection) break;

        (async () => {
          const idx = parseInt(animeSelection.text) - 1;
          const selected = results[idx];
          if (!selected || isNaN(idx)) {
            return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: animeSelection.msg });
          }

          await react(conn, from, animeSelection.msg.key, "⏳");

          // 2️⃣ Details
          let details;
          try {
            const detRes = await axios.get(`${API_BASE}?action=details&url=${encodeURIComponent(selected.link)}`, { timeout: 20000 });
            details = detRes.data?.data;
          } catch (e) {
            return conn.sendMessage(from, { text: "❌ Details API error: " + e.message }, { quoted: animeSelection.msg });
          }

          if (!details) return conn.sendMessage(from, { text: "❌ Details හමු නොවීය." }, { quoted: animeSelection.msg });

          // 3️⃣ Has episodes?
          if (details.episodes?.length) {
            let epText = `⛩️ *${details.title}*\n\n`;
            epText += `📺 *Total Episodes:* ${details.episodes.length}\n\n`;
            epText += `*Episodes:*\n`;
            details.episodes.forEach((ep, i) => {
              epText += `*${i + 1}.* Episode ${ep.ep_num}\n`;
            });
            epText += `\n💡 *0* reply කළොත් *ALL ${details.episodes.length} episodes* download වේ!\n`;
            epText += `📌 Episode අංකය reply කරන්න.\n\n${FOOTER}`;

            const sentEp = await conn.sendMessage(from, {
              image: { url: details.image || hardThumb },
              caption: epText
            }, { quoted: animeSelection.msg });

            // ── Episode List Loop (multi-reply) ──
            const startEpFlow = async () => {
              while (true) {
                const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
                if (!epSel) break;

                (async () => {
                  const epText2 = epSel.text.trim();

                  // ✅ 0 = Download ALL episodes
                  if (epText2 === "0") {
                    await react(conn, from, epSel.msg.key, "📦");
                    await handleAllEpisodes(
                      conn, from, sender,
                      details.episodes,
                      details.title,
                      epSel.msg,
                      details.image || hardThumb,
                      sessionId
                    );
                    return;
                  }

                  const epIdx = parseInt(epText2) - 1;
                  const chosenEp = details.episodes[epIdx];
                  if (!chosenEp || isNaN(epIdx)) {
                    return conn.sendMessage(from, { text: "❌ වලංගු episode අංකයක් ඇතුලත් කරන්න.\n💡 *0* reply කළොත් ALL episodes download වේ." }, { quoted: epSel.msg });
                  }

                  await react(conn, from, epSel.msg.key, "⏳");
                  await handleDownload(
                    conn, from, sender,
                    chosenEp.link,
                    details.title,
                    epSel.msg,
                    chosenEp.ep_num,
                    details.image || hardThumb,
                    sessionId
                  );
                })();
              }
            };
            startEpFlow();

          } else {
            // ── Movie (no episodes) ──
            await react(conn, from, animeSelection.msg.key, "🎬");
            await handleDownload(
              conn, from, sender,
              selected.link,
              details.title,
              animeSelection.msg,
              "Movie",
              details.image || hardThumb,
              sessionId
            );
          }
        })();
      }
    };

    startSearchFlow();

  } catch (e) {
    console.error("📛 ANIME COMMAND ERROR:", e);
    reply("❌ දෝෂයක් සිදු විය: " + e.message);
  }
});
