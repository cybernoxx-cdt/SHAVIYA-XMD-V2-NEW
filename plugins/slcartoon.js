const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
//  API CONFIG (hardcoded)
// ═══════════════════════════════════════════════════
const API_BASE  = "https://whiteshadow-x-api.onrender.com/api/movie/sinhalacartoo-lk";
const API_TOKEN = "e76n2P"; // hardcoded api key

const SEARCH_URL  = (q)   => `${API_BASE}?type=search&q=${encodeURIComponent(q)}&apitoken=${API_TOKEN}`;
const LATEST_URL  = ()    => `${API_BASE}?type=latest&apitoken=${API_TOKEN}`;
const DETAILS_URL = (url) => `${API_BASE}?type=movie&url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;

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
async function makeThumbnail(moviePosterUrl, hardThumbUrl) {
  // ✅ Always prefer the real movie/episode poster; only fall back to the
  // custom default image if the poster is missing or fails to fetch.
  const primaryUrl = moviePosterUrl || hardThumbUrl;
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
//  waitForReply - multi-use loop
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
//  Helpers
// ═══════════════════════════════════════════════════
function cleanTitle(title) {
  if (!title) return "Unknown";
  return title.replace(/^HD\s*[\d.]*\s*/i, "").split("|")[0].trim();
}

// Shorten the long descriptive label field down to something readable in a list
function shortLabel(label, type) {
  if (!label) return type === "telegram" ? "Telegram" : "Direct Download";
  const main = label.split("•")[0].trim();
  return main;
}

// ═══════════════════════════════════════════════════
//  Series/season detection - some "direct" entries bundle
//  MULTIPLE episode file URLs joined together (newline/space
//  separated) instead of a single movie file URL. Split them
//  out into a clean per-episode list so we never try to
//  "document.url" a broken multi-link string.
// ═══════════════════════════════════════════════════
function extractUrls(raw) {
  if (!raw) return [];
  const matches = raw.match(/https?:\/\/\S+/g) || [];
  // de-dup while preserving order
  return [...new Set(matches)];
}

function episodeLabel(url, index) {
  const fileName = decodeURIComponent(url.split("/").pop() || `Episode ${index + 1}`);
  const epMatch = fileName.match(/S(\d+)E(\d+)/i);
  if (epMatch) return `Episode ${parseInt(epMatch[2], 10)} (S${epMatch[1]})`;
  return fileName.replace(/\.mp4.*$/i, ".mp4");
}

// ═══════════════════════════════════════════════════
//  Pick the best poster image.
//  SinhalaCartoons' "details.poster" field often falls back to a blank
//  Gravatar silhouette (gravatar.com/avatar/...&d=mm) when the site has
//  no real poster meta set for that page. In that case the search/latest
//  listing's "image" field (an actual screenshot/poster jpg) is far
//  better, so prefer that instead.
// ═══════════════════════════════════════════════════
function bestPoster(details, selected) {
  const p = details?.poster || "";
  const isPlaceholder = !p || p.includes("gravatar.com");
  return (isPlaceholder && selected?.image) ? selected.image : (p || selected?.image);
}

// ═══════════════════════════════════════════════════
//  Send the actual video file (direct CDN url - no ad-gate)
// ═══════════════════════════════════════════════════
async function sendDirectFile(conn, from, directUrl, fileName, caption, quotedMsg, posterUrl, sessionId) {
  const thumb = await makeThumbnail(posterUrl || null, getHardThumbUrl(sessionId));
  await react(conn, from, quotedMsg.key, "📥");

  try {
    const docMsg = await conn.sendMessage(from, {
      document: { url: directUrl },
      fileName: fileName.replace(/[\/\\:*?"<>|]/g, ""),
      mimetype: "video/mp4",
      jpegThumbnail: thumb || undefined,
      caption,
    }, { quoted: quotedMsg });

    await react(conn, from, docMsg.key, "✅");
  } catch (e) {
    console.log("❌ sendDirectFile error:", e.message);
    await conn.sendMessage(from, {
      text: `❌ File send කිරීමේදී දෝෂයක් සිදු විය.\n\n📎 Direct link:\n${directUrl}\n\n${caption}`
    }, { quoted: quotedMsg });
  }
}

// ═══════════════════════════════════════════════════
//  Shared flow: given a resolved list of {title, link, image?}, run details + download
// ═══════════════════════════════════════════════════
async function runDetailsFlow(conn, from, sender, selMsg, selected, hardThumb, movieDocOn, sessionId, FOOTER) {
  await react(conn, from, selMsg.msg.key, "⏳");

  // DETAILS
  let details;
  try {
    const detRes = await axios.get(DETAILS_URL(selected.link), { timeout: 20000 });
    if (detRes.data?.status !== "success") throw new Error(detRes.data?.message || "details failed");
    details = detRes.data?.result;
  } catch (e) {
    return conn.sendMessage(from, { text: "❌ Details API error: " + e.message }, { quoted: selMsg.msg });
  }

  if (!details) return conn.sendMessage(from, { text: "❌ Details හමු නොවීය." }, { quoted: selMsg.msg });

  const links = details.download_links || [];
  if (!links.length) {
    return conn.sendMessage(from, { text: `❌ *${cleanTitle(details.title)}*\n\nDownload links හමු නොවීය.` }, { quoted: selMsg.msg });
  }

  let infoText = `🎬 *${cleanTitle(details.title)}*\n\n`;
  if (details.details?.release_year) infoText += `📅 *Year:* ${details.details.release_year}\n`;
  if (details.details?.director)     infoText += `🎬 *Director:* ${details.details.director}\n`;
  if (details.details?.imdb_rating)  infoText += `⭐ *IMDB:* ${details.details.imdb_rating}\n`;
  if (details.details?.quality)      infoText += `💿 *Quality:* ${details.details.quality}\n`;
  if (details.description)           infoText += `📝 *Description:* ${details.description.substring(0, 200)}\n`;

  infoText += `\n*💎 Download Options:*\n`;
  links.forEach((d, i) => {
    infoText += `*${i + 1}.* ${shortLabel(d.label, d.type)}\n`;
  });
  infoText += `\n📌 අංකයෙන් Reply කරන්න.\n${FOOTER}`;

  const infoMsg = await conn.sendMessage(from, {
    image: { url: bestPoster(details, selected) || hardThumb },
    caption: infoText
  }, { quoted: selMsg.msg });

  // ── Download option select loop ──
  const startDlFlow = async () => {
    while (true) {
      const dlSel = await waitForReply(conn, from, sender, infoMsg.key.id);
      if (!dlSel) break;

      (async () => {
        const dIndex = parseInt(dlSel.text) - 1;
        const picked = links[dIndex];
        if (isNaN(dIndex) || !picked) {
          return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: dlSel.msg });
        }

        if (picked.type === "direct" && picked.actual_url) {
          const urls = extractUrls(picked.actual_url);

          if (urls.length <= 1) {
            // ✅ Single movie file - stream & send directly
            const fileUrl = urls[0] || picked.actual_url;
            const fileName = `${cleanTitle(details.title)}.mp4`;
            const caption = `✅ *Download Complete*\n\n🎬 *${cleanTitle(details.title)}*\n💿 *Quality:* ${details.details?.quality || "?"}\n\n${FOOTER}`;
            await sendDirectFile(conn, from, fileUrl, fileName, caption, dlSel.msg, bestPoster(details, selected), sessionId);

          } else {
            // 📺 Series/season bundle - multiple episode files under one option.
            // Show an episode picker instead of sending a broken multi-url document.
            await react(conn, from, dlSel.msg.key, "📺");

            let epText = `📺 *${cleanTitle(details.title)}*\n\n*0.* 📦 All Episodes (download one by one)\n*Episodes:*\n`;
            urls.forEach((u, i) => { epText += `*${i + 1}.* ${episodeLabel(u, i)}\n`; });
            epText += `\n📌 Episode අංකයෙන් Reply කරන්න (සියල්ලම ඕන නම් *0* Reply කරන්න).\n${FOOTER}`;

            const epMsg = await conn.sendMessage(from, { text: epText }, { quoted: dlSel.msg });

            const startEpFlow = async () => {
              while (true) {
                const epSel = await waitForReply(conn, from, sender, epMsg.key.id);
                if (!epSel) break;

                (async () => {
                  // 0 = download ALL episodes, one after another
                  if (epSel.text.trim() === "0") {
                    await react(conn, from, epSel.msg.key, "📦");
                    await conn.sendMessage(from, {
                      text: `📦 *${cleanTitle(details.title)}*\n\nEpisodes ${urls.length}ම එකින් එක download කරමින්... ⏳\n\n${FOOTER}`
                    }, { quoted: epSel.msg });

                    for (let i = 0; i < urls.length; i++) {
                      const epUrl = urls[i];
                      const epName = episodeLabel(epUrl, i);
                      const fileName = `${cleanTitle(details.title)} - ${epName}`.replace(/\.mp4$/i, "") + ".mp4";
                      const caption = `✅ *Download Complete* (${i + 1}/${urls.length})\n\n🎬 *${cleanTitle(details.title)}*\n📺 *${epName}*\n\n${FOOTER}`;
                      await sendDirectFile(conn, from, epUrl, fileName, caption, epSel.msg, bestPoster(details, selected), sessionId);
                    }
                    return;
                  }

                  const epIndex = parseInt(epSel.text) - 1;
                  const epUrl = urls[epIndex];
                  if (isNaN(epIndex) || !epUrl) {
                    return conn.sendMessage(from, { text: "❌ වලංගු episode අංකයක් ඇතුලත් කරන්න (0 = සියල්ලම)." }, { quoted: epSel.msg });
                  }

                  const epName = episodeLabel(epUrl, epIndex);
                  const fileName = `${cleanTitle(details.title)} - ${epName}`.replace(/\.mp4$/i, "") + ".mp4";
                  const caption = `✅ *Download Complete*\n\n🎬 *${cleanTitle(details.title)}*\n📺 *${epName}*\n\n${FOOTER}`;
                  await sendDirectFile(conn, from, epUrl, fileName, caption, epSel.msg, bestPoster(details, selected), sessionId);
                })();
              }
            };
            startEpFlow();
          }

        } else if (picked.type === "telegram" && picked.actual_url) {
          // Telegram bot delivery - can't stream through WhatsApp, hand off the bot link
          await react(conn, from, dlSel.msg.key, "📥");
          await conn.sendMessage(from, {
            text: `📨 *Telegram Download*\n\n🎬 *${cleanTitle(details.title)}*\n\n🔗 Telegram bot එක open කර movie එක ලබාගන්න:\n${picked.actual_url}\n\n${FOOTER}`
          }, { quoted: dlSel.msg });

        } else {
          // Unknown type - fall back to whatever url we have
          const fallbackUrl = picked.actual_url || picked.page_url;
          await conn.sendMessage(from, {
            text: `🔗 *${cleanTitle(details.title)}*\n\n${fallbackUrl}\n\n${FOOTER}`
          }, { quoted: dlSel.msg });
        }
      })();
    }
  };
  startDlFlow();
}

// ═══════════════════════════════════════════════════
//  SINHALA CARTOON COMMAND (search / latest)
// ═══════════════════════════════════════════════════
cmd({
  pattern: "sinhalacartoon",
  alias: ["cartoon", "scartoon"],
  desc: "SinhalaCartoons.com Search / Latest / Download",
  category: "downloader",
  react: "🔍",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender, sessionId }) => {
  try {
    const FOOTER     = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);

    await react(conn, from, m.key, "🔍");

    let items;
    let headerTitle;

    if (q && q.trim()) {
      // SEARCH
      try {
        const searchRes = await axios.get(SEARCH_URL(q), { timeout: 20000 });
        if (searchRes.data?.status !== "success") throw new Error(searchRes.data?.message || "search failed");
        items = searchRes.data?.results;
      } catch (e) {
        return reply("❌ Search API error: " + e.message);
      }
      headerTitle = `🧸 *SinhalaCartoons.com Search Results*`;
    } else {
      // LATEST (no query given)
      try {
        const latestRes = await axios.get(LATEST_URL(), { timeout: 20000 });
        if (latestRes.data?.status !== "success") throw new Error(latestRes.data?.message || "latest failed");
        items = latestRes.data?.results;
      } catch (e) {
        return reply("❌ Latest API error: " + e.message);
      }
      headerTitle = `🧸 *SinhalaCartoons.com Latest Uploads*`;
    }

    if (!items?.length) return reply("❌ ප්‍රතිඵල හමු නොවීය. වෙනත් නමකින් සොයන්න.");

    let listText = `${headerTitle}\n\n`;
    items.slice(0, 10).forEach((v, i) => {
      listText += `*${i + 1}.* ${cleanTitle(v.title)}${v.year ? ` (${v.year})` : ""}\n`;
    });
    listText += `\n📌 අංකයෙන් Reply කරන්න.\n\n${FOOTER}`;

    const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: mek });

    // ── Select loop ──
    const startSelectFlow = async () => {
      while (true) {
        const sel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!sel) break;

        (async () => {
          const index = parseInt(sel.text) - 1;
          const selected = items[index];
          if (isNaN(index) || !selected) {
            return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: sel.msg });
          }

          await runDetailsFlow(conn, from, sender, sel, selected, hardThumb, movieDocOn, sessionId, FOOTER);
        })();
      }
    };

    startSelectFlow();

  } catch (e) {
    console.error("📛 SINHALACARTOON ERROR:", e);
    reply("⚠️ Error: " + e.message);
  }
});

// ═══════════════════════════════════════════════════
//  Dedicated LATEST command (shortcut, same flow)
// ═══════════════════════════════════════════════════
cmd({
  pattern: "cartoonlatest",
  alias: ["latestcartoon"],
  desc: "SinhalaCartoons.com Latest Uploads",
  category: "downloader",
  react: "🆕",
  filename: __filename
}, async (conn, mek, m, { from, reply, sender, sessionId }) => {
  try {
    const FOOTER     = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);

    await react(conn, from, m.key, "🆕");

    let items;
    try {
      const latestRes = await axios.get(LATEST_URL(), { timeout: 20000 });
      if (latestRes.data?.status !== "success") throw new Error(latestRes.data?.message || "latest failed");
      items = latestRes.data?.results;
    } catch (e) {
      return reply("❌ Latest API error: " + e.message);
    }

    if (!items?.length) return reply("❌ Latest uploads හමු නොවීය.");

    let listText = `🧸 *SinhalaCartoons.com Latest Uploads*\n\n`;
    items.slice(0, 10).forEach((v, i) => {
      listText += `*${i + 1}.* ${cleanTitle(v.title)}${v.year ? ` (${v.year})` : ""}\n`;
    });
    listText += `\n📌 අංකයෙන් Reply කරන්න.\n\n${FOOTER}`;

    const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: mek });

    const startSelectFlow = async () => {
      while (true) {
        const sel = await waitForReply(conn, from, sender, listMsg.key.id);
        if (!sel) break;

        (async () => {
          const index = parseInt(sel.text) - 1;
          const selected = items[index];
          if (isNaN(index) || !selected) {
            return conn.sendMessage(from, { text: "❌ වලංගු අංකයක් ඇතුලත් කරන්න." }, { quoted: sel.msg });
          }

          await runDetailsFlow(conn, from, sender, sel, selected, hardThumb, movieDocOn, sessionId, FOOTER);
        })();
      }
    };

    startSelectFlow();

  } catch (e) {
    console.error("📛 CARTOONLATEST ERROR:", e);
    reply("⚠️ Error: " + e.message);
  }
});
