const { cmd } = require("../command");
const fs   = require("fs");
const path = require("path");
const axios = require("axios");
const yts   = require("yt-search");
const sharp = require("sharp");

// ───────── CONFIGURATION ─────────
const API_KEY   = "darkshan-75704c1b";
const AC2_FOOTER = "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ ©";
const TEMP_DIR  = path.resolve(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function safeName(name, max = 60) {
    return String(name || "Video").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, max);
}

// ── Infinity reply listener ───────────────────────────────
function listenForReplies(conn, from, sender, targetId, callback) {
    const handler = (update) => {
        const msg = update.messages?.[0];
        if (!msg?.message) return;

        const text    = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
        const context = msg.message?.extendedTextMessage?.contextInfo;
        const msgSender = msg.key.participant || msg.key.remoteJid;

        const isTargetReply = context?.stanzaId === targetId;
        const isCorrectUser =
            msgSender.includes(sender.split("@")[0]) ||
            msgSender.includes("@lid");

        if (msg.key.remoteJid === from && isCorrectUser && isTargetReply) {
            callback({ msg, text: text.trim() });
        }
    };

    conn.ev.on("messages.upsert", handler);
    // Auto-remove after 15 minutes
    setTimeout(() => conn.ev.off("messages.upsert", handler), 900_000);
    return handler;
}

cmd(
  {
    pattern:  "video",
    alias:    ["ytdown"],
    ownerOnly: true,
    react:    "🎬",
    desc:     "YouTube Video Downloader — fast menu, API called only on download",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, sender, sessionId }) => {
    try {
      let query = typeof q === "string" ? q.trim() : "";
      if (!query) return reply(
          `╔══════════════════════╗\n` +
          `║  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* ⚡  ║\n` +
          `╚══════════════════════╝\n\n` +
          `⚠️ *Usage:* .video <title or YouTube link>`
      );

      await bot.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      // ═══════════════════════════════════════
      //  DIRECT LINK — skip search, go to menu
      // ═══════════════════════════════════════
      if (query.includes("youtu.be") || query.includes("youtube.com")) {
          // Shorts → normal
          if (query.includes("youtube.com/shorts/")) {
              const vid = query.split("/shorts/")[1].split(/[?&]/)[0];
              query = `https://www.youtube.com/watch?v=${vid}`;
          }
          // ✅ FIX: Show quality menu IMMEDIATELY with yts info (no API call yet)
          const search = await yts({ videoId: query.split("v=")[1]?.split("&")[0] || query });
          const info   = search.videos?.[0] || { title: "YouTube Video", url: query, thumbnail: "" };
          await showQualityMenu(bot, from, sender, info.url, info, mek, sessionId);
          return;
      }

      // ═══════════════════════════════════════
      //  SEARCH — show results list instantly
      // ═══════════════════════════════════════
      const search  = await yts(query);
      const results = search.videos.slice(0, 10);
      if (!results.length) return reply("❌ *No results found.*");

      // Build search list text
      let listText = `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 🔍 *Sᴇᴀʀᴄʜ*\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\n`;
      results.forEach((v, i) => {
          listText += `*${i + 1}.* ${v.title}\n⏱️ ${v.timestamp}\n\n`;
      });
      listText += `🔢 *Reply with number to select*\n\n> ${AC2_FOOTER}`;

      const vidSearchButtons = results.map((v, i) => ({
          id:   String(i + 1),
          text: `${i + 1}. ${v.title.slice(0, 40)}`
      }));

      // ✅ Send search list menu — this is INSTANT (no API call)
      const sentSearch = await global.sendInteractiveButtons(bot, from, {
          header:     "🎬 SHAVIYA-XMD V2 · VIDEO SEARCH",
          body:       listText,
          footer:     "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ · Lɪᴍɪᴛᴇᴅ Eᴅɪᴛɪᴏɴ",
          buttons:    vidSearchButtons,
          _sessionId: sessionId
      }, mek);

      // Listen for search selection
      listenForReplies(bot, from, sender, sentSearch.key.id, async ({ msg, text }) => {
          const idx = parseInt(text) - 1;
          if (isNaN(idx) || !results[idx]) return;

          await bot.sendMessage(from, { react: { text: "⏳", key: msg.key } });

          // ✅ FIX: Show quality menu IMMEDIATELY using yts data (no API call)
          await showQualityMenu(bot, from, sender, results[idx].url, results[idx], msg, sessionId);
      });

    } catch (err) {
      console.error("[VIDEO CMD]", err.message);
      reply(`❌ Error: ${err.message}`);
    }
  }
);

// ══════════════════════════════════════════════════════════
//   showQualityMenu — INSTANT, no API call here
//   Uses yts data for title/thumbnail in the menu
//   API is called ONLY when user picks a quality
// ══════════════════════════════════════════════════════════
async function showQualityMenu(conn, from, sender, videoUrl, ytData, quotedMek, sessionId) {
    try {
        const title = ytData.title || "YouTube Video";
        const thumb = ytData.thumbnail || "";

        const menuText =
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 🎬 *Vɪᴅᴇᴏ*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

🎵 *${title}*
⏱️ ${ytData.timestamp || ""} ${ytData.ago ? `· ${ytData.ago}` : ""}

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
📌 *Reply number to download*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

🎞️ *Video File (Gallery)*
  ┣ *1* › 720p 🔥
  ┣ *2* › 480p 🖥️
  ┗ *3* › 360p 📺

📂 *Document File*
  ┣ *4* › 720p 🔥
  ┣ *5* › 480p 🖥️
  ┗ *6* › 360p 📺

> ${AC2_FOOTER}`;

        const qualButtons = [
            { id: "1", text: "1. Video 720p 🔥" },
            { id: "2", text: "2. Video 480p 🖥️" },
            { id: "3", text: "3. Video 360p 📺" },
            { id: "4", text: "4. Doc 720p 🔥"  },
            { id: "5", text: "5. Doc 480p 🖥️"  },
            { id: "6", text: "6. Doc 360p 📺"  },
        ];

        // ✅ INSTANT — no API call, uses yts thumbnail directly
        const sentSelect = await global.sendInteractiveButtons(conn, from, {
            header:     `🎬 ${title.slice(0, 60)}`,
            body:       menuText,
            footer:     "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ · Pʀᴇᴍɪᴜᴍ Eᴅɪᴛɪᴏɴ",
            buttons:    qualButtons,
            _sessionId: sessionId
        }, quotedMek);

        // Listen for quality selection
        listenForReplies(conn, from, sender, sentSelect.key.id, async ({ msg, text }) => {
            const qualMap = {
                "1": { q: "720p", doc: false },
                "2": { q: "480p", doc: false },
                "3": { q: "360p", doc: false },
                "4": { q: "720p", doc: true  },
                "5": { q: "480p", doc: true  },
                "6": { q: "360p", doc: true  },
            };

            const selected = qualMap[text];
            if (!selected) return;

            await conn.sendMessage(from, { react: { text: "📥", key: msg.key } });

            await conn.sendMessage(from, {
                text: `⏳ *Fetching ${selected.q} ${selected.doc ? "document" : "video"}...*`
            }, { quoted: msg });

            // ✅ API called HERE only — after user selected quality
            try {
                const res  = await axios.get(
                    `https://sayuradark-api-two.vercel.app/api/download/ytdl?apikey=${API_KEY}&url=${encodeURIComponent(videoUrl)}`
                );
                const data = res.data?.result;

                if (!data) {
                    await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
                    return conn.sendMessage(from, { text: "❌ *API failed. Try again.*" }, { quoted: msg });
                }

                const dlUrls = {
                    "720p": data.mp4?.p720,
                    "480p": data.mp4?.p480,
                    "360p": data.mp4?.p360,
                };
                const dlUrl = dlUrls[selected.q];

                if (!dlUrl) {
                    await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
                    return conn.sendMessage(from, {
                        text: `❌ *${selected.q} not available. Try another quality.*`
                    }, { quoted: msg });
                }

                await conn.sendMessage(from, { react: { text: "⬆️", key: msg.key } });

                await finalMediaSender(
                    conn, from, dlUrl,
                    data.title || title,
                    data.thumbnail || thumb,
                    selected.q, selected.doc, msg
                );

            } catch (e) {
                console.error("[VIDEO API]", e.message);
                await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
                conn.sendMessage(from, { text: `❌ *Download error:* ${e.message}` }, { quoted: msg });
            }
        });

    } catch (e) {
        console.error("[QUALITY MENU]", e.message);
    }
}

// ══════════════════════════════════════════════════════════
//   finalMediaSender — stream & send video/document
// ══════════════════════════════════════════════════════════
async function finalMediaSender(conn, from, dlUrl, title, thumbUrl, quality, isDoc, quotedMek) {
    const videoPath = path.join(TEMP_DIR, `yt_${Date.now()}.mp4`);
    const thumbPath = path.join(TEMP_DIR, `thumb_${Date.now()}.jpg`);

    try {
        let docThumb;
        if (isDoc && thumbUrl) {
            try {
                const tRes = await axios.get(thumbUrl, { responseType: "arraybuffer" });
                fs.writeFileSync(thumbPath, Buffer.from(tRes.data));
                docThumb = await sharp(thumbPath).resize(300).jpeg({ quality: 80 }).toBuffer();
            } catch {}
        }

        const response = await axios({ method: "get", url: dlUrl, responseType: "stream" });
        const writer   = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        const sizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);
        const captionText =
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · ✅ *Dᴏɴᴇ*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

🎬 *${title}*
💎 *Quality:* ${quality}
💾 *Size:* ${sizeMB} MB

> ${AC2_FOOTER}`;

        const mediaConfig = isDoc ? {
            document:      fs.readFileSync(videoPath),
            mimetype:      "video/mp4",
            fileName:      `${safeName(title)}_${quality}.mp4`,
            jpegThumbnail: docThumb,
            caption:       captionText,
        } : {
            video:   fs.readFileSync(videoPath),
            mimetype: "video/mp4",
            caption: captionText,
        };

        await conn.sendMessage(from, mediaConfig, { quoted: quotedMek });
        await conn.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });

    } catch (e) {
        console.error("[MEDIA SENDER]", e.message);
        await conn.sendMessage(from, { react: { text: "⚠️", key: quotedMek.key } });
    } finally {
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }
}
