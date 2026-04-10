const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const secretvCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Shaviya",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ── Convert MP3 buffer → OGG/OPUS ──────────────────────────────────
async function convertToOpus(inputBuf) {
    const tmpDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const id = Date.now();
    const mp3Path = path.join(tmpDir, `owner_in_${id}.mp3`);
    const oggPath = path.join(tmpDir, `owner_out_${id}.ogg`);
    fs.writeFileSync(mp3Path, inputBuf);
    try {
        try {
            await execAsync(`ffmpeg -y -i "${mp3Path}" -c:a libopus -ar 48000 -ac 1 -b:a 64k "${oggPath}"`);
            if (fs.existsSync(oggPath) && fs.statSync(oggPath).size > 100) {
                const buf = fs.readFileSync(oggPath);
                return { buf, mime: 'audio/ogg; codecs=opus' };
            }
        } catch {
            try {
                const ffmpeg = require('fluent-ffmpeg');
                try { ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path); } catch {}
                await new Promise((res, rej) => {
                    ffmpeg(mp3Path).audioCodec('libopus').audioChannels(1).audioFrequency(48000).format('ogg')
                        .on('end', res).on('error', rej).save(oggPath);
                });
                if (fs.existsSync(oggPath) && fs.statSync(oggPath).size > 100) {
                    const buf = fs.readFileSync(oggPath);
                    return { buf, mime: 'audio/ogg; codecs=opus' };
                }
            } catch {}
        }
        return { buf: inputBuf, mime: 'audio/mpeg' };
    } finally {
        try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch {}
        try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
    }
}

cmd({
    pattern: "owner",
    react: "🤵‍♂️",
    desc: "Get owner contact details",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        const ownerNumber = config.OWNER_NUMBER || "94707085822";
        const ownerName   = config.OWNER_NAME || "Savendra Dampriya";
        const cleanNumber = ownerNumber.replace('+', '');

        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\nEND:VCARD`;

        // 1. Send vCard contact
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

        // 2. Send owner info image
        await conn.sendMessage(from, {
            image: { url: 'https://files.catbox.moe/eqmiio.jpg' },
            caption: `╭━━━〔 *🤵‍♂ OWNER INFO* 〕━━━⬣
┃
┃ 👤 *Name* : ${ownerName}
┃ 📱 *Number* : +${cleanNumber}
┃ 🤖 *Bot* : SHAVIYA-XMD
┃ 🌀 *Version* : V2.0.0
┃
╰━━━━━━━━━━━━━━━━━━━━━⬣
> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩2 🔰`,
            contextInfo: {
                mentionedJid: [`${cleanNumber}@s.whatsapp.net`],
                forwardingScore: 999,
                isForwarded: false,
            }
        }, { quoted: secretvCard });

        // 3. Send voice note — ✅ FIX: no leading space, proper opus conversion
        const voiceUrl = "https://files.catbox.moe/0l6o8f.mp3";
        try {
            const res = await axios.get(voiceUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const inputBuf = Buffer.from(res.data);
            const { buf: voiceBuf, mime } = await convertToOpus(inputBuf);
            await conn.sendMessage(from, {
                audio:    voiceBuf,
                mimetype: mime,
                ptt:      true
            }, { quoted: mek });
        } catch (voiceErr) {
            console.log("[OWNER] Voice note failed:", voiceErr.message);
        }

    } catch (error) {
        console.error("Owner cmd error:", error);
    }
});
