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
TEL;type=CELL;type=VOICE;waid=94762095304:+94762095304
END:VCARD`
        }
    }
};

cmd({
  pattern: "song",
  alias: ["play", "song1"],
  desc: "YouTube Song Downloader (Multi Reply + Voice Note Fixed)",
  category: "download",
  filename: __filename,
}, async (conn, m, store, { from, quoted, q, reply }) => {
  try {
    /* ===== QUERY ===== */
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

    /* ===== API ===== */
    const api = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(
      video.url
    )}`;
    const { data } = await axios.get(api);
    if (!data?.status || !data?.data?.url)
      return reply("*❌ Download error*");

    const songUrl = data.data.url;

    /* ===== MENU ===== */
    const sentMsg = await conn.sendMessage(
      from,
      {
        image: { url: video.thumbnail },
        caption: `
🎶 *𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 SONG DOWNLOADER* 🎶

📑 *Title:* ${video.title}
⏱ *Duration:* ${video.timestamp}
📆 *Uploaded:* ${video.ago}
👁 *Views:* ${video.views}
🔗 *Url:* ${video.url}

🔽 *Reply with your choice:*

1️⃣ Audio Type 🎵  
2️⃣ Document Type 📁  
3️⃣ Voice Note Type 🎤  

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝘃2 🌛`,
      },
      { quoted: fakevCard }
    );

    const messageID = sentMsg.key.id;

    // 🧠 Reply listener
    conn.ev.on("messages.upsert", async (msgData) => {
      const receivedMsg = msgData.messages[0];
      if (!receivedMsg?.message) return;

      const receivedText = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
      const senderID = receivedMsg.key.remoteJid;
      const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

      if (isReplyToBot) {
        await conn.sendMessage(senderID, { react: { text: '⬇️', key: receivedMsg.key } });

        let mediaMsg;

        switch (receivedText.trim()) {
          case "1":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            mediaMsg = await conn.sendMessage(senderID, {
              audio: { url: songUrl },
              mimetype: "audio/mpeg",
            }, { quoted: receivedMsg });
            await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
            break;

          case "2":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            
            const buffer = await axios.get(songUrl, {
              responseType: "arraybuffer",
            });

            mediaMsg = await conn.sendMessage(senderID, {
              document: buffer.data,
              mimetype: "audio/mpeg",
              fileName: `${video.title.replace(/[\\/:*?"<>|]/g, "")}.mp3`,
            }, { quoted: receivedMsg });
            
            await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
            break;

          case "3":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            
            const mp3Path = path.join(__dirname, `${Date.now()}.mp3`);
            const opusPath = path.join(__dirname, `${Date.now()}.opus`);

            // Download mp3
            const stream = await axios.get(songUrl, { responseType: "stream" });
            const writer = fs.createWriteStream(mp3Path);
            stream.data.pipe(writer);
            await new Promise(r => writer.on("finish", r));

            // Convert to opus
            await new Promise((resolve, reject) => {
              ffmpeg(mp3Path)
                .audioCodec("libopus")
                .format("opus")
                .save(opusPath)
                .on("end", resolve)
                .on("error", reject);
            });

            mediaMsg = await conn.sendMessage(senderID, {
              audio: fs.readFileSync(opusPath),
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            }, { quoted: receivedMsg });

            // Cleanup temp files
            fs.unlinkSync(mp3Path);
            fs.unlinkSync(opusPath);
            
            await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
            break;

          default:
            await conn.sendMessage(senderID, { react: { text: '😒', key: receivedMsg.key } });
            reply("*❌ Invalid option!*");
        }
      }
    });

  } catch (error) {
    console.error("*Song2 Plugin Error*:", error);
    reply("*Error downloading or sending audio.*");
  }
});
