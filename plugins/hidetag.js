const { cmd } = require('../command');

// Fixed & Created By JawadTechX
cmd({
  pattern: "hidetag",
  alias: ["tag", "h"],  
  react: "🔊",
  desc: "To Tag all Members for Any Message/Media",
  category: "group",
  use: '.hidetag Hello',
  filename: __filename
},
async (conn, mek, m, {
  from, q, isGroup, isAdmins,
  participants, reply
}) => {
  try {
    const isUrl = (url) => {
      return /https?:\/\/(www\.)?[\w\-@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([\w\-@:%_\+.~#?&//=]*)/.test(url);
    };

    // Group check
    const isGrp = from.endsWith('@g.us');
    if (!isGrp) return reply("❌ This command can only be used in groups.");

    // Owner check using OWNER_NUMBER from config
    const ownerNumber = process.env.OWNER_NUMBER + '@s.whatsapp.net';
    const sender = m.key?.participant || m.key?.remoteJid;
    if (sender !== ownerNumber) return reply("❌ This command is only for the bot owner.");

    const mentionAll = { mentions: participants.map(u => u.id) };

    if (!q && !m.quoted) {
      return reply("❌ Please provide a message or reply to a message to tag all members.");
    }

    if (m.quoted) {
      const type = m.quoted.mtype || '';
      
      if (type === 'extendedTextMessage') {
        return await conn.sendMessage(from, {
          text: m.quoted.text || 'No message content found.',
          ...mentionAll
        }, { quoted: mek });
      }

      if (['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(type)) {
        try {
          const buffer = await m.quoted.download?.();
          if (!buffer) return reply("❌ Failed to download the quoted media.");

          let content;
          switch (type) {
            case "imageMessage":
              content = { image: buffer, caption: m.quoted.text || "📷 Image", ...mentionAll };
              break;
            case "videoMessage":
              content = { 
                video: buffer, 
                caption: m.quoted.text || "🎥 Video", 
                gifPlayback: m.quoted.message?.videoMessage?.gifPlayback || false, 
                ...mentionAll 
              };
              break;
            case "audioMessage":
              content = { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: m.quoted.message?.audioMessage?.ptt || false, 
                ...mentionAll 
              };
              break;
            case "stickerMessage":
              content = { sticker: buffer, ...mentionAll };
              break;
            case "documentMessage":
              content = {
                document: buffer,
                mimetype: m.quoted.message?.documentMessage?.mimetype || "application/octet-stream",
                fileName: m.quoted.message?.documentMessage?.fileName || "file",
                caption: m.quoted.text || "",
                ...mentionAll
              };
              break;
          }

          if (content) {
            return await conn.sendMessage(from, content, { quoted: mek });
          }
        } catch (e) {
          console.error("Media download/send error:", e);
          return reply("❌ Failed to process the media. Sending as text instead.");
        }
      }

      return await conn.sendMessage(from, {
        text: m.quoted.text || "📨 Message",
        ...mentionAll
      }, { quoted: mek });
    }

    if (q) {
      if (isUrl(q)) {
        return await conn.sendMessage(from, {
          text: q,
          ...mentionAll
        }, { quoted: mek });
      }

      await conn.sendMessage(from, {
        text: q,
        ...mentionAll
      }, { quoted: mek });
    }

  } catch (e) {
    console.error(e);
    reply(`❌ *Error Occurred !!*\n\n${e.message}`);
  }
});
