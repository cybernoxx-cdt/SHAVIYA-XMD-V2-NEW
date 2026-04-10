const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yts = require("yt-search");
const sharp = require("sharp");

// ───────── CONFIGURATION ─────────
const API_KEY = "darkshan-75704c1b";
const AC2_FOOTER = "✫☘️ 𝐇𝐀𝐒𝐈𝐘𝐀-𝐌𝐃 𝐘𝐎𝐔𝐓𝐔𝐁𝐄 ☘️✫";
const TEMP_DIR = path.resolve(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function safeName(name, max = 60) {
    return String(name || "Video").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, max);
}

/**
 * Infinity Multi-Reply Listener
 * Callback පාවිච්චි කරන නිසා එකම පණිවිඩයට ඕනෑම වාර ගණනක් රිප්ලයි කළ හැක.
 */
function listenForReplies(conn, from, sender, targetId, callback) {
    const handler = (update) => {
        const msg = update.messages?.[0];
        if (!msg?.message) return;

        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
        const context = msg.message?.extendedTextMessage?.contextInfo;
        const msgSender = msg.key.participant || msg.key.remoteJid;
        
        const isTargetReply = context?.stanzaId === targetId;
        const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");

        if (msg.key.remoteJid === from && isCorrectUser && isTargetReply) {
            callback({ msg, text: text.trim() });
        }
    };

    conn.ev.on("messages.upsert", handler);
    // විනාඩි 15කින් Listener එක අක්‍රිය වේ.
    setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 900000);
}

cmd(
  {
    pattern: "video",
    alias: ["ytv", "ytdown"],
    ownerOnly: true,
    react: "🎬",
    desc: "Infinite Multi-Reply YT Downloader with Full React System",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, sender, sessionId }) => {
    try {
      let query = typeof q === "string" ? q.trim() : "";
      if (!query) return reply("❌ කරුණාකර නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.");

      await bot.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      // --- 1. SEARCH LOGIC ---
      if (!query.includes("youtu.be") && !query.includes("youtube.com")) {
          const search = await yts(query);
          const results = search.videos.slice(0, 10);
          if (results.length === 0) return reply("❌ කිසිවක් හමු නොවීය.");

          let listText = "🎬 *𝐇𝐀𝐒𝐈𝐘𝐀-𝐌𝐃 𝐘𝐎𝐔𝐓𝐔𝐁𝐄 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n";
          results.forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n⏱️ ${v.timestamp}\n\n`; });

          const vidSearchButtons = results.map((v, i) => ({ id: String(i+1), text: `${i+1}. ${v.title.slice(0,40)}` }));
          const sentSearch = await global.sendInteractiveButtons(bot, from, {
              header: "🎬 SHAVIYA-XMD V2 VIDEO SEARCH",
              body: listText + `🔢 *Reply Number (Infinity Support)*`,
              footer: "✨ SHAVIYA TECH · PREMIUM EDITION",
              buttons: vidSearchButtons,
              _sessionId: sessionId
          }, mek);

          // SEARCH LIST INFINITY REPLY
          listenForReplies(bot, from, sender, sentSearch.key.id, async (selection) => {
              const idx = parseInt(selection.text) - 1;
              if (!results[idx]) return;

              // REACTION: WAIT
              await bot.sendMessage(from, { react: { text: "⏳", key: selection.msg.key } });
              
              const videoUrl = results[idx].url;
              await processDownloadFlow(bot, from, sender, videoUrl, selection.msg);
          });
      } else {
          await processDownloadFlow(bot, from, sender, query, mek);
      }

    } catch (err) {
      console.error(err);
      reply(`❌ Error: ${err.message}`);
    }

    // --- 2. SELECTOR & DOWNLOAD FLOW ---
    async function processDownloadFlow(conn, from, sender, url, quotedMek) {
        try {
            const res = await axios.get(`https://sayuradark-api-two.vercel.app/api/download/ytdl?apikey=${API_KEY}&url=${encodeURIComponent(url)}`);
            const data = res.data?.result;
            if (!data) return;

            const thumbUrl = data.thumbnail;
            let selectMsg = `🎬 *${data.title}*\n\n` +
                            `*Download Mode එක තෝරන්න:* \n\n` +
                            `📺 *Video Mode (Gallery)*\n` +
                            `1. 720p | 2. 480p | 3. 360p\n\n` +
                            `📁 *Document Mode (Thumbnail සහිතව)*\n` +
                            `4. 720p | 5. 480p | 6. 360p`;

            const qualButtons = [
                { id: "1", text: "1. Video 720p 📺" },
                { id: "2", text: "2. Video 480p 📺" },
                { id: "3", text: "3. Video 360p 📺" },
                { id: "4", text: "4. Doc 720p 📁" },
                { id: "5", text: "5. Doc 480p 📁" },
                { id: "6", text: "6. Doc 360p 📁" }
            ];
            const sentSelect = await global.sendInteractiveButtons(conn, from, {
                header: "🎬 " + (data.title || "Video").slice(0, 60),
                body: selectMsg,
                footer: "✨ SHAVIYA TECH · PREMIUM EDITION",
                buttons: qualButtons,
                _sessionId: sessionId
            }, quotedMek);

            // QUALITY SELECTOR INFINITY REPLY
            listenForReplies(conn, from, sender, sentSelect.key.id, async (qSel) => {
                const choice = qSel.text;
                const options = {
                    "1": { url: data.mp4.p720, q: "720p", doc: false },
                    "2": { url: data.mp4.p480, q: "480p", doc: false },
                    "3": { url: data.mp4.p360, q: "360p", doc: false },
                    "4": { url: data.mp4.p720, q: "720p", doc: true },
                    "5": { url: data.mp4.p480, q: "480p", doc: true },
                    "6": { url: data.mp4.p360, q: "360p", doc: true }
                };

                if (!options[choice]) return;
                const { url: dlUrl, q: qual, doc: isDoc } = options[choice];
                
                if (!dlUrl) {
                    await conn.sendMessage(from, { react: { text: "❌", key: qSel.msg.key } });
                    return;
                }

                // REACTION: DOWNLOADING
                await conn.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });
                await finalMediaSender(conn, from, dlUrl, data.title, thumbUrl, qual, isDoc, qSel.msg);
            });
        } catch (e) { console.error(e); }
    }

    // --- 3. CORE MEDIA SENDER ---
    async function finalMediaSender(conn, from, dlUrl, title, thumbUrl, quality, isDoc, quotedMek) {
      const videoPath = path.join(TEMP_DIR, `yt_${Date.now()}.mp4`);
      const thumbPath = path.join(TEMP_DIR, `thumb_${Date.now()}.jpg`);
      
      try {
        let docThumb;
        if (isDoc && thumbUrl) {
            const tRes = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(thumbPath, Buffer.from(tRes.data));
            docThumb = await sharp(thumbPath).resize(300).jpeg({ quality: 80 }).toBuffer();
        }

        const response = await axios({ method: 'get', url: dlUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        writer.on('finish', async () => {
            const sizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);
            const captionText = `✅ *Download Complete*\n\n🎬 *Title:* ${title}\n💎 *Quality:* ${quality}\n💾 *Size:* ${sizeMB} MB\n\n${AC2_FOOTER}`;

            let mediaConfig = isDoc ? {
                document: fs.readFileSync(videoPath),
                mimetype: "video/mp4",
                fileName: `${safeName(title)}_${quality}.mp4`,
                jpegThumbnail: docThumb,
                caption: captionText
            } : {
                video: fs.readFileSync(videoPath),
                mimetype: "video/mp4",
                caption: captionText
            };

            await conn.sendMessage(from, mediaConfig, { quoted: quotedMek });
            
            // REACTION: SUCCESS
            await conn.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });
            
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        });
      } catch (e) { 
          console.error(e);
          await conn.sendMessage(from, { react: { text: "⚠️", key: quotedMek.key } });
      }
    }
  }
);
