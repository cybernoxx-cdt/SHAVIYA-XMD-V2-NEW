const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "setting",
    alias: ["settings", "config"],
    desc: "Show all bot configuration variables (Owner Only)",
    category: "system",
    react: "⚙️",
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner, senderNumber }) => {
    try {
        if (!isOwner) {
            return reply("🚫 *Owner Only Command!* You're not authorized to view bot configurations.");
        }

        const isEnabled = (value) => value === true || value?.toString().toLowerCase() === "true";

        const envSettings = `
╭──『 *${config.START_MSG || "SHAVIYA-XMD V2"}* 』──❏
│
│  ⚙️ SHAVIYA-XMD V2 SETTINGS
│─────────────────────────
│
├─❏ *🤖 BOT INFO*
│  ├─∘ *Prefix:* ${config.PREFIX || "."}
│  ├─∘ *Owner:* ${config.OWNER_NUMBER}
│  └─∘ *Mode:* ${(config.MODE || "public").toUpperCase()}
│
├─❏ *⚙️ CORE SETTINGS*
│  ├─∘ *Always Online:* ${isEnabled(config.ALWAYS_ONLINE) ? "✅" : "❌"}
│  ├─∘ *Auto Read Status:* ${isEnabled(config.AUTO_READ_STATUS) ? "✅" : "❌"}
│  └─∘ *Auto Read CMD:* ${isEnabled(config.AUTO_READ_CMD) ? "✅" : "❌"}
│
├─❏ *🔌 AUTOMATION*
│  ├─∘ *Auto Voice:* ${isEnabled(config.AUTO_VOICE) ? "✅" : "❌"}
│  ├─∘ *Auto AI:* ${isEnabled(config.AUTO_AI) ? "✅" : "❌"}
│  ├─∘ *Always Typing:* ${isEnabled(config.ALWAYS_TYPING) ? "✅" : "❌"}
│  └─∘ *Always Recording:* ${isEnabled(config.ALWAYS_RECORDING) ? "✅" : "❌"}
│
├─❏ *🛡️ SECURITY*
│  ├─∘ *Anti-Link:* ${isEnabled(config.ANTILINK) ? "✅" : "❌"}
│  ├─∘ *Anti-Bad Words:* ${isEnabled(config.ANTI_BAD_WORDS_ENABLED) ? "✅" : "❌"}
│  ├─∘ *Bad Word List:* ${(config.ANTI_BAD_WORDS || []).join(", ") || "none"}
│  ├─∘ *Anti-Bot:* ${isEnabled(config.ANTI_BOT) ? "✅" : "❌"}
│  └─∘ *Anti-Delete:* ${isEnabled(config.ANTI_DELETE) ? "✅" : "❌"}
│
├─❏ *🎨 STICKER INFO*
│  ├─∘ *Pack Name:* ${config.PACKNAME || "SHAVIYA-XMD V2"}
│  └─∘ *Author:* ${config.AUTHOR || "SHAVIYA TECH 💎"}
│
│─────────────────────────
│
├─❏ *⚙️ CHANGE SETTINGS*
│
├─❏ 🔧 *1. Mode*
│       - Current: ${config.MODE || "public"}
│       - Usage: ${config.PREFIX || "."}mode private/public
│
├─❏ 🎯 *2. Always Typing*
│       - Current: ${config.ALWAYS_TYPING || "false"}
│       - Usage: ${config.PREFIX || "."}autotyping on/off
│
├─❏ 🌐 *3. Always Online*
│       - Current: ${config.ALWAYS_ONLINE || "false"}
│       - Usage: ${config.PREFIX || "."}alwaysonline on/off
│
├─❏ 🎙️ *4. Auto Recording*
│       - Current: ${config.ALWAYS_RECORDING || "false"}
│       - Usage: ${config.PREFIX || "."}autorecording on/off
│
├─❏ 📖 *5. Auto Read Status*
│       - Current: ${config.AUTO_READ_STATUS || "false"}
│       - Usage: ${config.PREFIX || "."}autoreadstatus on/off
│
├─❏ 🚫 *6. Anti Bad Word*
│       - Current: ${config.ANTI_BAD_WORDS_ENABLED || "false"}
│       - Usage: ${config.PREFIX || "."}antibad on/off
│
├─❏ 🗑️ *7. Anti Delete*
│       - Current: ${config.ANTI_DELETE || "false"}
│       - Usage: ${config.PREFIX || "."}antidelete on/off
│
├─❏ 🤖 *8. Auto AI*
│       - Current: ${config.AUTO_AI || "false"}
│       - Usage: ${config.PREFIX || "."}autoai on/off
│
├─❏ 🔊 *9. Auto Voice*
│       - Current: ${config.AUTO_VOICE || "false"}
│       - Usage: ${config.PREFIX || "."}autovoice on/off
│
├─❏ 🔗 *10. Anti Link*
│       - Current: ${config.ANTILINK || "false"}
│       - Usage: ${config.PREFIX || "."}antilink on/off
│
├─❏ 🤖 *11. Anti Bot*
│       - Current: ${config.ANTI_BOT || "false"}
│       - Usage: ${config.PREFIX || "."}antibot on/off
│
├─❏ 🔧 *12. Set Prefix*
│       - Current: ${config.PREFIX || "."}
│       - Usage: ${config.PREFIX || "."}setprefix <new_prefix>
│
├─∘ 📌 *Note*: Use on/off to toggle each feature.
│
╰──『 SHAVIYA-XMD V2 | SHAVIYA TECH 💎 』──❏
`;

        const FakeVCard = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: "💎 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮",
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
                }
            }
        };

        await conn.sendMessage(
            from,
            {
                image: { url: config.MENU_IMG || config.ALIVE_IMG || "https://files.catbox.moe/f18ceb.jpg" },
                caption: envSettings,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true
                }
            },
            { quoted: FakeVCard }
        );

    } catch (error) {
        console.error('Setting command error:', error);
        reply(`❌ Error displaying config: ${error.message}`);
    }
});
