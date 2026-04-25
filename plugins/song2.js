const { cmd } = require("../command");
const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Shaviya",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94707085822:+94707085822
END:VCARD`
        }
    }
};

cmd({
  pattern: "song2",
  alias: ["song2", "so"],
  desc: "YouTube Song Downloader (Multi Reply + Voice Note Fixed)",
  category: "download",
  filename: __filename,
}, async (conn, m, store, { from, quoted, q, reply }) => {
  try {
    let query = q?.trim();

    if (!query && m?.quoted) {
      query =
        m.quoted.message?.conversation ||
        m.quoted.message?.extendedTextMessage?.text ||
        m.quoted.text;
    }

    if (!query) {
      return reply(
        "⚠️ Please provide a song name or YouTube link (or reply to a message)."
      );
    }

    if (query.includes("youtube.com/shorts/")) {
      const id = query.split("/shorts/")[1].split(/[?&]/)[0];
      query = `https://www.youtube.com/watch?v=${id}`;
    }

    await conn.sendMessage(from, { react: { text: '🎵', key: m.key } });

    /* ===== SEARCH ===== */
    const search = await yts(query);
    if (!search.videos.length)
      return reply("❌ Song not found or API error.");

    const video = search.videos[0];

    /* ===== ASITHA API + KEY ===== */
    const api = `https://back.asitha.top/api/ytapi?url=${encodeURIComponent(video.url)}&fo=2&qu=128&apiKey=390f34ac879d9cbad9192a073a9431d6fdc482d79bdd126acee7599905d8e904`;

    const { data } = await axios.get(api);

    if (!data || !data.downloadData || !data.downloadData.url)
      return reply("*❌ Download error*");

    const songUrl = data.downloadData.url;

    /* ===== MENU ===== */
    const sentMsg = await conn.sendMessage(
      from,
      {
        image: { url: video.thumbnail },
        caption: `
🎶 *Sʜᴀᴠɪʏᴀ Xᴍᴅ Sᴏɴɢ Dᴏᴡɴʟᴏᴀᴅᴇʀ* 🎶

📑 *Title:* ${video.title}
⏱ *Duration:* ${video.timestamp}
📆 *Uploaded:* ${video.ago}
👁 *Views:* ${video.views}
🔗 *Url:* ${video.url}

🔽 *Reply with your choice:*

1️⃣ Audio Type 🎵  
2️⃣ Document Type 📁  
3️⃣ Voice Note Type 🎤  

> © Powered by Sʜᴀᴠɪʏᴀ Xᴍᴅ 💐`,
      },
      { quoted: fakevCard }
    );

    const messageID = sentMsg.key.id;

    // Reply listener
    conn.ev.on("messages.upsert", async (msgData) => {
      const receivedMsg = msgData.messages[0];
      if (!receivedMsg?.message) return;

      const receivedText = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
      const senderID = receivedMsg.key.remoteJid;
      const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

      if (isReplyToBot) {
        await conn.sendMessage(senderID, { react: { text: '⬇️', key: receivedMsg.key } });

        switch (receivedText.trim()) {

          case "1":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            await conn.sendMessage(senderID, {
              audio: { url: songUrl },
              mimetype: "audio/mpeg",
            }, { quoted: receivedMsg });
            break;

          case "2":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });

            const buffer = await axios.get(songUrl, { responseType: "arraybuffer" });

            await conn.sendMessage(senderID, {
              document: buffer.data,
              mimetype: "audio/mpeg",
              fileName: `${video.title.replace(/[\\/:*?"<>|]/g, "")}.mp3`,
            }, { quoted: receivedMsg });
            break;

          case "3":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });

            const mp3Path = path.join(__dirname, `${Date.now()}.mp3`);
            const opusPath = path.join(__dirname, `${Date.now()}.opus`);

            const stream = await axios.get(songUrl, { responseType: "stream" });
            const writer = fs.createWriteStream(mp3Path);
            stream.data.pipe(writer);
            await new Promise(r => writer.on("finish", r));

            await new Promise((resolve, reject) => {
              ffmpeg(mp3Path)
                .audioCodec("libopus")
                .format("opus")
                .save(opusPath)
                .on("end", resolve)
                .on("error", reject);
            });

            await conn.sendMessage(senderID, {
              audio: fs.readFileSync(opusPath),
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            }, { quoted: receivedMsg });

            fs.unlinkSync(mp3Path);
            fs.unlinkSync(opusPath);
            break;

          default:
            reply("*❌ Invalid option!*");
        }

        await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
      }
    });

  } catch (error) {
    console.error("*Error*:", error);
    reply("*Error downloading or sending audio.*");
  }
});
