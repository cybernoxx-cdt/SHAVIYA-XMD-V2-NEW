const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');
const os = require("os");
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA TECH",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ── Convert MP3 buffer → OGG/OPUS buffer ──────────────────────────
async function convertToOpus(inputBuf) {
    const tmpDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const id = Date.now();
    const mp3Path = path.join(tmpDir, `alive_in_${id}.mp3`);
    const oggPath = path.join(tmpDir, `alive_out_${id}.ogg`);
    fs.writeFileSync(mp3Path, inputBuf);
    try {
        // Strategy 1: system ffmpeg with libopus
        try {
            await execAsync(`ffmpeg -y -i "${mp3Path}" -c:a libopus -ar 48000 -ac 1 -b:a 64k "${oggPath}"`);
            if (fs.existsSync(oggPath) && fs.statSync(oggPath).size > 100) {
                const buf = fs.readFileSync(oggPath);
                return { buf, mime: 'audio/ogg; codecs=opus' };
            }
        } catch (e1) {
            // Strategy 2: fluent-ffmpeg
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
            } catch (e2) {
                // Strategy 3: vorbis fallback
                try {
                    await execAsync(`ffmpeg -y -i "${mp3Path}" -acodec libvorbis -ar 44100 -ac 1 "${oggPath}"`);
                    if (fs.existsSync(oggPath) && fs.statSync(oggPath).size > 100) {
                        const buf = fs.readFileSync(oggPath);
                        return { buf, mime: 'audio/ogg; codecs=opus' };
                    }
                } catch {}
            }
        }
        // Fallback: send raw mp3 (some clients play this)
        return { buf: inputBuf, mime: 'audio/mpeg' };
    } finally {
        try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch {}
        try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
    }
}

// Voice note MP3 URL
const VOICE_NOTE_URL = "https://files.catbox.moe/2l1mj6.mp3";

cmd({
    pattern: "alive",
    alias: ["hyshavi", "shavi", "status", "a"],
    react: "🌝",
    desc: "Check bot online or no.",
    category: "main",
    filename: __filename
},
async (robin, mek, m, {
    from, pushname, quoted, reply, sender
}) => {
    try {
        await robin.sendPresenceUpdate('recording', from);

        const now  = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo', hour12: true });
        const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
        const time = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' });

        const status = `👋 𝐇𝐞𝐥𝐥𝐨 ${pushname}, 𝐈 𝐚𝐦 𝐚𝐥𝐢𝐯𝐞 𝐧𝐨𝐰 !!

*╭─〔 DATE & TIME INFO 〕─◉*
*│*📅 *\`Date:\`* ${date}
*│*⏰ *\`Time:\`* ${time}
*╰────────────⊷*

*╭─〔 ALIVE STATUS INFO 〕─◉*
*│*
*│*🐼 *\`Bot\`*: 𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃-𝐕2
*│*🤵‍♂ *\`Owner\`*: Savendra Dampriya
*│*👤 *\`User\`*: ${pushname}
*│*📟 *\`Uptime\`*: ${runtime(process.uptime())}
*│*⏳ *\`Ram\`*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)}MB
*│*🖊 *\`Prefix\`*: [ ${config.PREFIX} ]
*│*🛠 *\`Mode\`*: [ ${config.MODE} ]
*│*🖥 *\`Host\`*: ${os.hostname()}
*│*🌀 *\`Version\`*: ${config.BOT_VERSION || 'V2'}
*╰────────────────⊷*
     
      ☘ ʙᴏᴛ ᴍᴇɴᴜ  - .menu
      🔥 ʙᴏᴛ ꜱᴘᴇᴇᴅ - .ping

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩2 💲`;

        // Send Image + Caption
        await robin.sendMessage(from, {
            image: { url: "https://files.catbox.moe/2w9wht.jpg" },
            caption: status,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: false
            }
        }, { quoted: mek });

        // ── VOICE NOTE ──────────────────────────────────────────────
        try {
            console.log('[ALIVE] Downloading voice note...');
            const response = await axios.get(VOICE_NOTE_URL, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const inputBuf = Buffer.from(response.data);
            console.log(`[ALIVE] Downloaded: ${(inputBuf.length / 1024).toFixed(2)}KB — converting to opus...`);

            // ✅ FIX: convert to ogg/opus so mobile WhatsApp plays it
            const { buf: voiceBuf, mime } = await convertToOpus(inputBuf);

            await robin.sendMessage(from, {
                audio:    voiceBuf,
                mimetype: mime,
                ptt:      true
            }, { quoted: fakevCard });

            console.log('[ALIVE] Voice note sent ✅');

        } catch (voiceErr) {
            console.error('[ALIVE] Voice note error:', voiceErr.message);
        }

    } catch (e) {
        console.log("Alive Error:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
