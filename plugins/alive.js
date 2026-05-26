// ============================================================
//  alive.js — SHAVIYA-XMD V2
//  © Mr Savendra
// ============================================================

const config = require('../config');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const os = require('os');

const VIDEO_NOTE_URL = 'https://github.com/cybernoxx-cdt/SHAVIYA-FILE-S/raw/refs/heads/main/InShot_20260503_121322042.mp4';
const VOICE_NOTE_URL = 'https://github.com/cybernoxx-cdt/SHAVIYA-FILE-S/raw/refs/heads/main/ssstik.io_1778048420109.opus';

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra · SHAVIYA-XMD V2',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

cmd({
    pattern:  'alive',
    alias:    ['hyshavi', 'shavi', 'a'],
    react:    '🌝',
    desc:     'Check bot online status',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, pushname, sender, reply }) => {
    try {
        await conn.sendPresenceUpdate('recording', from);

        const date   = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
        const time   = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' });
        const ram    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const ramMax = (os.totalmem() / 1024 / 1024).toFixed(0);

        const caption =
`👋 *𝐇𝐞𝐥𝐥𝐨 ${pushname}* — 𝐈 𝐚𝐦 𝐚𝐥𝐢𝐯𝐞 !!

✦ ─────────────────── ✦
  🔮 *𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮* — 𝗔𝗟𝗜𝗩𝗘 ✅
✦ ─────────────────── ✦

⊹ 📅 *Date*       ➤  ${date}
⊹ 🕐 *Time*       ➤  ${time}
⊹ 🤖 *Bot*        ➤  SHAVIYA-XMD V2
⊹ 👤 *Owner*      ➤  Savendra Dampriya
⊹ 👋 *User*       ➤  ${pushname}
⊹ ⏱️ *Uptime*     ➤  ${runtime(process.uptime())}
⊹ 💾 *RAM*        ➤  ${ram}MB / ${ramMax}MB
⊹ 🔑 *Prefix*     ➤  [ ${config.PREFIX || '.'} ]
⊹ 🌐 *Mode*       ➤  ${(config.MODE || 'public').toUpperCase()}
⊹ 🌀 *Version*    ➤  ${config.BOT_VERSION || 'V2'}

✦ ─────────────────── ✦
> ☘️ *Menu* → .menu  |  ⚡ *Speed* → .ping
✦ ─────────────────── ✦
> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 💎`;

        // ── 1. Image + caption ──
        try {
            await conn.sendMessage(from, {
                image: { url: 'https://whiteshadow-uploader.vercel.app/files/hmy.jpg' },
                caption,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@newsletter',
                        newsletterName: '© Mr Savendra · SHAVIYA-XMD V2',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        } catch (_) {
            await reply(caption);
        }

        // ── 2. Video Note (ptv circle) ──
        try {
            console.log('[ALIVE] Sending video note...');
            await conn.sendMessage(from, {
                video:       { url: VIDEO_NOTE_URL },
                mimetype:    'video/mp4',
                ptv:         true,
                gifPlayback: false
            }, { quoted: FakeVCard });
            console.log('[ALIVE] Video note sent ✅');
        } catch (e1) {
            console.error('[ALIVE] Video note error:', e1.message);
        }

        // ── 3. Voice Note (ptt) ──
        try {
            await conn.sendPresenceUpdate('recording', from);
            console.log('[ALIVE] Sending voice note...');
            await conn.sendMessage(from, {
                audio:    { url: VOICE_NOTE_URL },
                mimetype: 'audio/ogg; codecs=opus',  // ✅ FIXED: audio/mpeg වෙනුවට ogg opus
                ptt:      true
            }, { quoted: FakeVCard });
            console.log('[ALIVE] Voice note sent ✅');
        } catch (e2) {
            console.error('[ALIVE] Voice note error:', e2.message);
        }

        await conn.sendPresenceUpdate('available', from);

    } catch (e) {
        console.error('[ALIVE ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});
