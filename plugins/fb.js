const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const API_KEY = "darkshan-75704c1b";
const TEMP_DIR = path.resolve(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ───────── Reply Waiter (button + number reply දෙකම) ─────────
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;
            if (msg.key.remoteJid !== from) return;

            const msgSender = msg.key.participant || msg.key.remoteJid;
            const isCorrectUser =
                msgSender.includes(sender.split('@')[0]) ||
                msgSender.includes("@lid");
            if (!isCorrectUser) return;

            const msgType = Object.keys(msg.message)[0];

            // ── Method 1: Number reply (quoted) ──
            const ctx =
                msg.message?.extendedTextMessage?.contextInfo ||
                msg.message?.interactiveResponseMessage?.contextInfo;

            if (ctx?.stanzaId === targetId) {
                let text =
                    msg.message.conversation ||
                    msg.message?.extendedTextMessage?.text || "";

                if (!text && msgType === "interactiveResponseMessage") {
                    try {
                        const nativeReply = msg.message.interactiveResponseMessage?.nativeFlowResponseMessage;
                        if (nativeReply) {
                            const parsed = JSON.parse(nativeReply.paramsJson || "{}");
                            text = parsed.id || nativeReply.name || "";
                        }
                    } catch {}
                }

                if (text) {
                    conn.ev.off("messages.upsert", handler);
                    resolve({ msg, text: text.trim() });
                    return;
                }
            }

            // ── Method 2: Button click ──
            if (msgType === "interactiveResponseMessage") {
                try {
                    const nativeReply = msg.message.interactiveResponseMessage?.nativeFlowResponseMessage;
                    if (nativeReply) {
                        const parsed = JSON.parse(nativeReply.paramsJson || "{}");
                        const btnId = parsed.id || "";
                        const btnCtx = msg.message.interactiveResponseMessage?.contextInfo;
                        if (btnCtx?.stanzaId === targetId || btnId.includes(targetId)) {
                            conn.ev.off("messages.upsert", handler);
                            resolve({ msg, text: btnId.trim() });
                            return;
                        }
                    }
                } catch {}
            }
        };

        conn.ev.on("messages.upsert", handler);
        setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 600000);
    });
}

cmd(
  {
    pattern: "fb",
    alias: ["fbdl", "facebook"],
    ownerOnly: true,
    react: "🔵",
    desc: "FB Video Downloader (Direct Video Mode)",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, sender, sessionId }) => {
    try {
      let query = typeof q === "string" ? q.trim() : "";
      if (!query) return reply("❌ Please provide a Facebook link.");

      await bot.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      console.log(`\x1b[36m[FB-LOG]\x1b[0m Fetching data from API...`);

      const res = await axios.get(
        `https://sayuradark-api-two.vercel.app/api/download/facebook?apikey=${API_KEY}&url=${encodeURIComponent(query)}`
      );
      const data = res.data?.result;

      if (!res.data.status || !data) {
        await bot.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ Video not found or link is private.");
      }

      const title = data.title && data.title !== "No video title"
        ? data.title : "Facebook Video";

      // Quality buttons build
      const qualityButtons = [];
      let bodyText = `🔵 *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐅𝐁 𝐃𝐋*\n\n🎬 *Title:* ${title}\n\n*Quality එක තෝරන්න:*\n`;

      if (data.video_hd) {
        qualityButtons.push({ id: "1", text: "1️⃣ High Quality (HD)" });
        bodyText += `1️⃣ High Quality (HD)\n`;
      }
      if (data.video_sd) {
        qualityButtons.push({ id: "2", text: "2️⃣ Standard Quality (SD)" });
        bodyText += `2️⃣ Standard Quality (SD)\n`;
      }

      // ── sendInteractiveButtons ඇතුළේම button on/off handle වෙනවා ──
      const sentQual = await global.sendInteractiveButtons(bot, from, {
        header: "🔵 FB Downloader",
        body: bodyText,
        footer: "𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃",
        buttons: qualityButtons,
        _sessionId: sessionId
      }, mek);

      // Reply / button click ලැබෙනකම් බලා සිටීම
      const selection = await waitForReply(bot, from, sender, sentQual.key.id);

      if (selection) {
        const choice = selection.text;
        const dlUrl = (choice === "1" && data.video_hd) ? data.video_hd : data.video_sd;
        const qualLabel = (choice === "1" && data.video_hd) ? "HD" : "SD";

        await bot.sendMessage(from, { react: { text: "📥", key: selection.msg.key } });
        console.log(`\x1b[32m[FB-LOG]\x1b[0m Downloading ${qualLabel} video: ${title}`);

        await handleFBDownload(bot, from, dlUrl, title, qualLabel, selection.msg);
      }

    } catch (err) {
      console.error(`\x1b[31m[FB-ERROR]\x1b[0m`, err.message);
      reply(`❌ Error: ${err.message}`);
    }

    async function handleFBDownload(conn, from, dlUrl, title, quality, quotedMek) {
      const outputFile = path.join(TEMP_DIR, `fb_${Date.now()}.mp4`);
      try {
        const response = await axios({ method: 'get', url: dlUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(outputFile);
        response.data.pipe(writer);

        writer.on('finish', async () => {
          const sizeMB = (fs.statSync(outputFile).size / 1048576).toFixed(2);

          await conn.sendMessage(from, {
            video: fs.readFileSync(outputFile),
            mimetype: "video/mp4",
            caption: `✅ *FB Download Complete*\n🎬 *${title}*\n📦 Quality: ${quality}\n💾 Size: ${sizeMB} MB\n\n𝐇𝐀𝐒𝐈𝐘𝐀 𝐌𝐃`
          }, { quoted: quotedMek });

          await bot.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });
          console.log(`\x1b[32m[FB-LOG]\x1b[0m Video sent. Size: ${sizeMB}MB`);

          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        });
      } catch (e) {
        console.error(`\x1b[31m[FB-DL-ERROR]\x1b[0m`, e.message);
        reply("❌ Download failed.");
      }
    }
  }
);
