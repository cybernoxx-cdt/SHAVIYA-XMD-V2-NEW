const config = require('../config');
const { cmd, commands } = require('../command');

cmd({
    pattern: "ping",
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        const startTime = Date.now();

        const emojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹', '💎', '🏆', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        await conn.sendMessage(from, {
            react: { text: randomEmoji, key: mek.key }
        });

        const ping = Date.now() - startTime;

        let badge = '🐢 Slow', color = '🔴';
        if (ping <= 150) {
            badge = '🚀 Super Fast';
            color = '🟢';
        } else if (ping <= 300) {
            badge = '⚡ Fast';
            color = '🟡';
        } else if (ping <= 600) {
            badge = '⚠️ Medium';
            color = '🟠';
        }

        const FakeVCard = {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
      },
      message: {
        contactMessage: {
          displayName: "💎 𝗦𝗛𝗔𝗩𝗜𝗬𝗔 𝗧𝗘𝗖𝗛 · 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 © 𝟮𝟬𝟮𝟲 💎",
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
        }
      }
    };

        await conn.sendMessage(from, {
            text: `> *𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 ʀᴇsᴘᴏɴsᴇ: ${ping} ms ${randomEmoji}*\n> *sᴛᴀᴛᴜs: ${color} ${badge}*\n> *ᴠᴇʀsɪᴏɴ: 2.0.0*`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: "💎 𝗦𝗛𝗔𝗩𝗜𝗬𝗔 𝗧𝗘𝗖𝗛 · 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 © 𝟮𝟬𝟮𝟲 💎",
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error("❌ Error in ping command:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});


cmd({
    pattern: "ping2",
    use: '.ping2',
    desc: "Check bot's response time.",
    category: "main",
    react: "💠",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        const start = new Date().getTime();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        await conn.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = (end - start) / 1000;

        const text = `> *SHAVIYA-XMD V2 SPEED: ${responseTime.toFixed(2)}ms ${reactionEmoji}*`;

        const FakeVCard = {
      key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        remoteJid: "status@broadcast"
      },
      message: {
        contactMessage: {
          displayName: "💎 𝗦𝗛𝗔𝗩𝗜𝗬𝗔 𝗧𝗘𝗖𝗛 · 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 © 𝟮𝟬𝟮𝟲 💎",
          vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=254700000000:+254 700 000000\nEND:VCARD",
          jpegThumbnail: Buffer.from([])
        }
      }
    };

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: "💎 SHAVIYA TECH",
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error("Error in ping2 command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
