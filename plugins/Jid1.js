const { cmd } = require("../command");

cmd({
    pattern: "jid",
    desc: "Get the JID of the current chat",
    category: "owner",
    react: "🆔",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        // 'from' is the JID of the current chat (Group, Private, or Channel)
        const chatJid = from;

        // Simply send the JID string back
        await conn.sendMessage(from, { text: chatJid }, { quoted: mek });

    } catch (e) {
        console.error("jid cmd error:", e);
        reply("❌ Error fetching JID");
    }
});
