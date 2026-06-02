const { cmd } = require('../command');

// Fixed & Created By JawadTechX
cmd({
  pattern: "hidetag",
  alias: ["tag", "htag"],  
  react: "🔊",
  desc: "To Tag all Members for Any Message/Media",
  category: "group",
  use: '.hidetag Hello',
  filename: __filename
},
async (conn, mek, m, {
  from, q, isOwner, reply
}) => {
  try {
    const isUrl = (url) => {
      return /https?:\/\/(www\.)?[\w\-@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([\w\-@:%_\+.~#?&//=]*)/.test(url);
    };

    if (!from.endsWith('@g.us')) return reply("❌ This command can only be used in groups.");
    if (!isOwner) return reply("❌ This command is only for the bot owner.");

    const groupMeta = await conn.groupMetadata(from);
    const participants = groupMeta.participants;
    const mentionAll = { mentions: participants.map(u => u.id) };

    if (!q && !m.quoted) {
      return reply("❌ Please provide a message or reply to a message to tag all members.");
    }

    // ====== REPLY MODE: quoted message ekak reply karanakota ======
    if (m.quoted) {
      // m.quoted.fakeObj use karanawa - eka thama correct quoted key eka carry karanawa
      const quotedMsg = m.quoted.fakeObj;
      const type = m.quoted.type || '';

      if (type === 'extendedTextMessage' || type === 'conversation') {
        return await conn.sendMessage(from, {
          text: m.quoted.msg?.text || m.quoted.msg || 'No message content found.',
          ...mentionAll
        }, { quoted: quotedMsg });
      }

      if (['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(type)) {
        try {
          const buffer = await m.quoted.download?.();
          if (!buffer) return reply("❌ Failed to download the quoted media.");

          let content;
          switch (type) {
            case "imageMessage":
              content = { image: buffer, caption: m.quoted.msg?.caption || "", ...mentionAll };
              break;
            case "videoMessage":
              content = { 
                video: buffer, 
                caption: m.quoted.msg?.caption || "", 
                gifPlayback: m.quoted.msg?.gifPlayback || false, 
                ...mentionAll 
              };
              break;
            case "audioMessage":
              content = { 
                audio: buffer, 
                mimetype: "audio/mp4", 
                ptt: m.quoted.msg?.ptt || false, 
                ...mentionAll 
              };
              break;
            case "stickerMessage":
              content = { sticker: buffer, ...mentionAll };
              break;
            case "documentMessage":
              content = {
                document: buffer,
                mimetype: m.quoted.msg?.mimetype || "application/octet-stream",
                fileName: m.quoted.msg?.fileName || "file",
                caption: m.quoted.msg?.caption || "",
                ...mentionAll
              };
              break;
          }

          if (content) {
            return await conn.sendMessage(from, content, { quoted: quotedMsg });
          }
        } catch (e) {
          console.error("Media download/send error:", e);
          return reply("❌ Failed to process the media.");
        }
      }

      return await conn.sendMessage(from, {
        text: "📨 Message",
        ...mentionAll
      }, { quoted: quotedMsg });
    }

    // ====== NORMAL MODE: .htag Hello - nikaa message widihata ======
    if (q) {
      await conn.sendMessage(from, {
        text: q,
        ...mentionAll
      }); // quoted naha - nikaa message
    }

  } catch (e) {
    console.error(e);
    reply(`❌ *Error Occurred !!*\n\n${e.message}`);
  }
});
