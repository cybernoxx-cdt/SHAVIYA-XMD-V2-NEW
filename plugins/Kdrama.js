const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ─────────────── CONFIG ───────────────
const KDRAMA_API_KEY = "zanta_87yquZmSeGcxpySYN26qiF1x";
const KDRAMA_SEARCH  = "https://api.zanta-mini.store/api/kdrama/search";
const KDRAMA_DL      = "https://api.zanta-mini.store/api/kdrama/dl";
const FOOTER         = "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ ©";
const TEMP_DIR       = path.resolve(__dirname, "../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─────────────── HELPERS ───────────────
function safeName(name, max = 60) {
  return String(name || "KDrama").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, max);
}

async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

function listenForReply(conn, from, sender, targetId, timeoutMs, callback) {
  const handler = (update) => {
    const msg = update.messages?.[0];
    if (!msg?.message) return;
    const text    = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const msgSender = msg.key.participant || msg.key.remoteJid;
    const isReply = context?.stanzaId === targetId;
    const isUser  = msgSender.includes(sender.split("@")[0]) || msgSender.includes("@lid");
    if (msg.key.remoteJid === from && isUser && isReply) {
      conn.ev.off("messages.upsert", handler);
      clearTimeout(timer);
      callback({ msg, text: text.trim() });
    }
  };
  const timer = setTimeout(() => conn.ev.off("messages.upsert", handler), timeoutMs);
  conn.ev.on("messages.upsert", handler);
}

async function fetchThumb(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 12000 });
    return await sharp(Buffer.from(res.data)).resize(300).jpeg({ quality: 70 }).toBuffer();
  } catch { return null; }
}

// ═══════════════════════════════════════════════════
//  COMMAND: .kdrama <search term>
// ═══════════════════════════════════════════════════
cmd(
  {
    pattern:   "kdrama",
    alias:     ["kdramasearch", "kd"],
    react:     "🎭",
    desc:      "Search and Download Korean Dramas",
    category:  "download",
    filename:  __filename,
  },
  async (bot, mek, m, { from, q, reply, sender, sessionId }) => {
    try {
      const query = typeof q === "string" ? q.trim() : "";
      if (!query) return reply(
        `╔══════════════════════╗\n` +
        `║  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* ⚡  ║\n` +
        `╚══════════════════════╝\n\n` +
        `🎭 *KDrama Downloader*\n\n` +
        `*Usage:* .kdrama <drama name>\n` +
        `*Example:* .kdrama Crash Landing on You\n\n` +
        `> ${FOOTER}`
      );

      await react(bot, from, mek.key, "🔍");

      // ── Search API ──
      let results;
      try {
        const res = await axios.get(KDRAMA_SEARCH, {
          params: { apiKey: KDRAMA_API_KEY, text: query },
          timeout: 20000,
        });
        results = res.data?.results || res.data?.data || res.data;
        if (!Array.isArray(results) || results.length === 0)
          return reply("❌ *No KDramas found for:* " + query);
      } catch (e) {
        return reply("❌ *Search API error:* " + e.message);
      }

      // ── Build search result list ──
      const list = results.slice(0, 10);
      let listText =
        `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n` +
        `  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 🎭 *KDrama*\n` +
        `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\n` +
        `🔍 *Results for:* ${query}\n\n`;

      list.forEach((item, i) => {
        const title  = item.title || item.name || "Unknown";
        const year   = item.year  || item.release_year || "";
        const ep     = item.episodes ? `📺 ${item.episodes} eps` : "";
        listText += `*${i + 1}.* 🎬 *${title}*${year ? ` _(${year})_` : ""}${ep ? ` · ${ep}` : ""}\n\n`;
      });
      listText += `🔢 *Reply number to select*\n\n> ${FOOTER}`;

      const buttons = list.map((item, i) => ({
        id:   String(i + 1),
        text: `${i + 1}. ${(item.title || item.name || "Drama").slice(0, 45)}`,
      }));

      const sentSearch = await global.sendInteractiveButtons(bot, from, {
        header:     "🎭 SHAVIYA-XMD · KDRAMA SEARCH",
        body:       listText,
        footer:     "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ · KDrama Downloader",
        buttons,
        _sessionId: sessionId,
      }, mek);

      // ── Wait for drama selection ──
      listenForReply(bot, from, sender, sentSearch.key.id, 600_000, async ({ msg, text }) => {
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || !list[idx]) return;

        const drama = list[idx];
        const title = drama.title || drama.name || "KDrama";
        const dramaUrl = drama.url || drama.link || drama.href || "";

        await react(bot, from, msg.key, "⏳");

        // ── Check if drama has multiple seasons/episodes ──
        // Show episode/season menu
        await showDramaMenu(bot, from, sender, drama, dramaUrl, title, msg, sessionId);
      });

    } catch (err) {
      console.error("[KDRAMA CMD]", err.message);
      reply("❌ *Error:* " + err.message);
    }
  }
);

// ══════════════════════════════════════════════════════════
//   showDramaMenu — Show drama info + episode options
// ══════════════════════════════════════════════════════════
async function showDramaMenu(conn, from, sender, drama, dramaUrl, title, quotedMek, sessionId) {
  try {
    // Try to get download info first
    let dlData;
    try {
      const res = await axios.get(KDRAMA_DL, {
        params: { apiKey: KDRAMA_API_KEY, text: dramaUrl },
        timeout: 25000,
      });
      dlData = res.data?.result || res.data?.data || res.data;
    } catch (e) {
      await conn.sendMessage(from, { text: "❌ *Failed to fetch drama info:* " + e.message }, { quoted: quotedMek });
      return;
    }

    // ── Detect if multi-episode / season ──
    const episodes = dlData?.episodes || dlData?.episode_list || dlData?.eps || [];
    const isMultiEp = Array.isArray(episodes) && episodes.length > 0;

    const poster  = drama.image || drama.poster || drama.thumbnail || dlData?.image || "";
    const year    = drama.year  || drama.release_year || dlData?.year || "";
    const genre   = drama.genre || dlData?.genre || "";
    const status  = drama.status || dlData?.status || "";
    const desc    = drama.description || dlData?.description || dlData?.synopsis || "";
    const totalEp = episodes.length || dlData?.total_episodes || drama.episodes || "?";

    let infoText =
      `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n` +
      `  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 🎭 *KDrama*\n` +
      `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\n` +
      `🎬 *${title}*\n`;
    if (year)   infoText += `📅 *Year:* ${year}\n`;
    if (genre)  infoText += `🎭 *Genre:* ${genre}\n`;
    if (status) infoText += `📺 *Status:* ${status}\n`;
    if (isMultiEp) infoText += `📋 *Episodes:* ${totalEp}\n`;
    if (desc)   infoText += `\n📝 ${desc.slice(0, 200)}${desc.length > 200 ? "..." : ""}\n`;
    infoText += `\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;

    const thumb = poster ? await fetchThumb(poster) : null;

    if (isMultiEp) {
      // ── Multi-episode drama — ask for episode number ──
      infoText +=
        `📌 *Reply episode number (1 - ${episodes.length})*\n` +
        `_Or reply *0* to download ALL episodes_\n` +
        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n` +
        `> ${FOOTER}`;

      const epButtons = [];
      // Show first 5 episodes + "All" button
      const previewEps = episodes.slice(0, 5);
      previewEps.forEach((ep, i) => {
        const epTitle = ep.title || ep.name || `Episode ${i + 1}`;
        epButtons.push({ id: String(i + 1), text: `Ep ${i + 1}: ${epTitle.slice(0, 35)}` });
      });
      epButtons.push({ id: "0", text: "📦 Download ALL Episodes" });

      const sentInfo = await global.sendInteractiveButtons(conn, from, {
        header:     `🎭 ${title.slice(0, 60)}`,
        body:       infoText,
        footer:     "⚡ Reply episode number or 0 for all",
        buttons:    epButtons,
        image:      thumb,
        _sessionId: sessionId,
      }, quotedMek);

      // Wait for episode selection
      listenForReply(conn, from, sender, sentInfo.key.id, 600_000, async ({ msg, text }) => {
        const epNum = parseInt(text);
        if (isNaN(epNum)) return;

        await react(conn, from, msg.key, "📥");

        if (epNum === 0) {
          // Download ALL episodes
          await conn.sendMessage(from, {
            text: `⏳ *Downloading all ${episodes.length} episodes...*\n_This may take a while!_`
          }, { quoted: msg });

          for (let i = 0; i < episodes.length; i++) {
            const ep = episodes[i];
            const epUrl = ep.url || ep.link || ep.href || "";
            const epTitle = ep.title || ep.name || `Episode ${i + 1}`;
            await conn.sendMessage(from, { text: `⬇️ *Fetching:* ${epTitle} (${i + 1}/${episodes.length})` });
            await downloadAndSendEpisode(conn, from, epUrl, `${title} - ${epTitle}`, poster, msg);
            // Small delay between episodes
            await new Promise(r => setTimeout(r, 2000));
          }

          await conn.sendMessage(from, {
            text: `✅ *All ${episodes.length} episodes sent!*\n\n> ${FOOTER}`
          }, { quoted: msg });

        } else {
          // Single episode
          const ep = episodes[epNum - 1];
          if (!ep) {
            return conn.sendMessage(from, {
              text: `❌ *Episode ${epNum} not found. Range: 1–${episodes.length}*`
            }, { quoted: msg });
          }
          const epUrl   = ep.url || ep.link || ep.href || "";
          const epTitle = ep.title || ep.name || `Episode ${epNum}`;

          await conn.sendMessage(from, {
            text: `⏳ *Downloading:* ${epTitle}...`
          }, { quoted: msg });

          await downloadAndSendEpisode(conn, from, epUrl, `${title} - ${epTitle}`, poster, msg);
        }
      });

    } else {
      // ── Single episode / movie ──
      const directUrl = dlData?.download_url || dlData?.url || dlData?.link || dramaUrl;

      infoText +=
        `📌 *Reply 1 to Download*\n` +
        `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n` +
        `> ${FOOTER}`;

      const sentInfo = await global.sendInteractiveButtons(conn, from, {
        header:     `🎭 ${title.slice(0, 60)}`,
        body:       infoText,
        footer:     "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ · Reply 1 to Download",
        buttons:    [{ id: "1", text: "⬇️ Download Now" }],
        image:      thumb,
        _sessionId: sessionId,
      }, quotedMek);

      listenForReply(conn, from, sender, sentInfo.key.id, 600_000, async ({ msg, text }) => {
        if (text !== "1") return;
        await react(conn, from, msg.key, "📥");
        await conn.sendMessage(from, { text: `⏳ *Downloading* ${title}...` }, { quoted: msg });
        await downloadAndSendEpisode(conn, from, directUrl, title, poster, msg);
      });
    }

  } catch (e) {
    console.error("[KDRAMA MENU]", e.message);
    await conn.sendMessage(from, { text: "❌ *Error loading drama:* " + e.message }, { quoted: quotedMek });
  }
}

// ══════════════════════════════════════════════════════════
//   downloadAndSendEpisode — fetch dl link & send as doc
// ══════════════════════════════════════════════════════════
async function downloadAndSendEpisode(conn, from, epUrl, title, posterUrl, quotedMek) {
  const filePath = path.join(TEMP_DIR, `kdrama_${Date.now()}.mp4`);

  try {
    // Get direct download link from DL API
    let downloadUrl = epUrl;
    try {
      const dlRes = await axios.get(KDRAMA_DL, {
        params: { apiKey: KDRAMA_API_KEY, text: epUrl },
        timeout: 25000,
      });
      const dlData = dlRes.data?.result || dlRes.data?.data || dlRes.data;
      downloadUrl  = dlData?.download_url || dlData?.url || dlData?.link || epUrl;
    } catch (e) {
      // Use epUrl directly if DL API fails
    }

    if (!downloadUrl) {
      return conn.sendMessage(from, {
        text: `❌ *Download link not found for:* ${title}`
      }, { quoted: quotedMek });
    }

    // Fetch thumbnail
    let jpegThumb;
    if (posterUrl) jpegThumb = await fetchThumb(posterUrl);

    // Stream download
    const response = await axios({ method: "get", url: downloadUrl, responseType: "stream", timeout: 120000 });
    const writer   = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const sizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

    const caption =
      `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n` +
      `  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · ✅ *Done*\n` +
      `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\n` +
      `🎭 *${title}*\n` +
      `💾 *Size:* ${sizeMB} MB\n\n` +
      `> ${FOOTER}`;

    await conn.sendMessage(from, {
      document:      fs.readFileSync(filePath),
      mimetype:      "video/mp4",
      fileName:      `${safeName(title)}.mp4`,
      jpegThumbnail: jpegThumb,
      caption,
    }, { quoted: quotedMek });

    await react(conn, from, quotedMek.key, "✅");

  } catch (e) {
    console.error("[KDRAMA DL]", e.message);
    await conn.sendMessage(from, {
      text: `❌ *Download failed:* ${e.message}`
    }, { quoted: quotedMek });
    await react(conn, from, quotedMek.key, "❌");
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
