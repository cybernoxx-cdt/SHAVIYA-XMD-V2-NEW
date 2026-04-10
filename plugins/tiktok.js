const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ───────── CONFIGURATION ─────────
const API_KEY = "darkshan-75704c1b";
const AC2_FOOTER = "◐ 𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐀𝐕𝐄𝐑 ◐";
const TEMP_DIR = path.resolve(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function safeName(name, max = 60) {
    return String(name || "TikTok").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, max);
}

/**
 * Infinity Multi-Reply Listener
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
    setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 900000);
}

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    ownerOnly: true,
    react: "🛟",
    desc: "HD/SD Multi-Reply TikTok Downloader",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, sender }) => {
    try {
      let url = typeof q === "string" ? q.trim() : "";
      if (!url) return reply("❌ TikTok Link එකක් ලබා දෙන්න.");

      await bot.sendMessage(from, { react: { text: "🔍", key: mek.key } });

      const res = await axios.get(`https://sayuradark-api-two.vercel.app/api/download/tiktok?apikey=${API_KEY}&url=${encodeURIComponent(url)}`);
      const data = res.data?.result;

      if (!data) return reply("❌ දත්ත ලබා ගැනීමට නොහැකි විය.");

      let selectMsg = `⫷⦁[ *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐓𝐢𝐤𝐓𝐨𝐤* ]⦁⫸\n\n` +
                      `📝 *Title:* ${data.title}\n\n` +
                      `*තේරීම Reply කරන්න:* \n\n` +
                      `1 ┃ Video HD (No WM) 🎥\n` +
                      `2 ┃ Video SD (Normal) 📺\n` +
                      `3 ┃ Audio MP3 🎵\n` +
                      `4 ┃ Video Document 📁`;

      const sentMsg = await bot.sendMessage(from, { 
          image: { url: data.thumbnail }, 
          caption: selectMsg 
      }, { quoted: mek });

      // Infinity Multi-Reply Support
      listenForReplies(bot, from, sender, sentMsg.key.id, async (qSel) => {
          const choice = qSel.text;
          const options = {
              "1": { url: data.video_hd, ext: "mp4", type: "video" },
              "2": { url: data.video_sd, ext: "mp4", type: "video" },
              "3": { url: data.mp3, ext: "mp3", type: "audio" },
              "4": { url: data.video_hd, ext: "mp4", type: "document" }
          };

          if (!options[choice]) return;
          const { url: dlUrl, ext, type } = options[choice];

          await bot.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });

          const filePath = path.join(TEMP_DIR, `tiktok_${Date.now()}.${ext}`);
          const response = await axios({ method: 'get', url: dlUrl, responseType: 'stream' });
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);

          writer.on('finish', async () => {
              let mediaConfig = {};
              if (type === "video") {
                  mediaConfig = { video: fs.readFileSync(filePath), mimetype: "video/mp4", caption: AC2_FOOTER };
              } else if (type === "audio") {
                  mediaConfig = { audio: fs.readFileSync(filePath), mimetype: "audio/mpeg" };
              } else if (type === "document") {
                  mediaConfig = { 
                      document: fs.readFileSync(filePath), 
                      mimetype: "video/mp4", 
                      fileName: `${safeName(data.title)}.mp4`,
                      caption: AC2_FOOTER 
                  };
              }

              await bot.sendMessage(from, mediaConfig, { quoted: qSel.msg });
              await bot.sendMessage(from, { react: { text: "✅", key: qSel.msg.key } });
              
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          });
      });

    } catch (err) {
      console.error(err);
      reply("❌ Error occurred!");
    }
  }
);
