const { cmd } = require('../command');
const baileys = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const fs = require('fs');

/**
 * Send Group Status (with optional media + auto expire)
 * @param {import('@whiskeysockets/baileys').WASocket} client
 * @param {string} jid Group JID
 * @param {import('@whiskeysockets/baileys').AnyMessageContent} content
 */
async function groupStatus(client, jid, content) {
  try {
    const { backgroundColor } = content;
    delete content.backgroundColor;

    const inside = await baileys.generateWAMessageContent(content, {
      upload: client.waUploadToServer,
      backgroundColor
    });

    const messageSecret = crypto.randomBytes(32);
    const m = baileys.generateWAMessageFromContent(
      jid,
      {
        messageContextInfo: { messageSecret },
        groupStatusMessageV2: {
          message: {
            ...inside,
            messageContextInfo: { messageSecret }
          }
        }
      },
      {}
    );

    await client.relayMessage(jid, m.message, { messageId: m.key.id });
    return m;
  } catch (err) {
    console.error("❌ GroupStatus Error:", err);
  }
}

cmd({
  pattern: "gst",
  alias: ["gstatus", "gsx"],
  desc: "Send a text or media status visible to all group members.",
  category: "group",
  use: ".gst <text> or reply with image/video + caption",
  react: "🟢",
  filename: __filename
}, async (conn, mek, m, { from, reply, q, mime, isOwner, isMedia }) => {
  try {
    if (!isOwner) return reply("*Owner only*");
    if (!m.isGroup) return reply("⚠️ This command only works in groups!");

    // Check if user replied to media
    let content = {};
    if ((isMedia && /image|video/.test(mime)) || m.quoted?.mimetype) {
      const quoted = m.quoted ? m.quoted : m;
      const buffer = await quoted.download();
      const type = quoted.mimetype.split("/")[0];

      if (type === "image") {
        content = {
          image: buffer,
          caption: q || "📸 Group status Updated by SHAVIYA-XMD",
        };
      } else if (type === "video") {
        content = {
          video: buffer,
          caption: q || "🎬 Group Video Updated by SHAVIYA-XMD",
        };
      }
    } else {
      if (!q) return reply("📜 Use: .gst <text>");
      content = {
        text: q,
        backgroundColor: "#25D366",
      };
    }

    // Send group status
    const statusMsg = await groupStatus(conn, from, content);
    reply("✅ Group status posted successfully! (expires in 24h)");

    // Auto delete after 24 hours (simulate status expire)
    setTimeout(async () => {
      try {
        await conn.sendMessage(from, { delete: statusMsg.key });
        console.log(`🕒 Auto-deleted group status in ${from}`);
      } catch (e) {
        console.error("⚠️ Auto-delete failed:", e);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  } catch (err) {
    console.error(err);
    reply("❌ Failed to send group status.");
  }
});
