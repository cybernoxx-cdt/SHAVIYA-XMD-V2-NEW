// ============================================================
//  owner.js — SHAVIYA-XMD V2
//  © Mr Savendra
// ============================================================

const { cmd }  = require('../command');
const config   = require('../config');
const os       = require('os');
const { runtime } = require('../lib/functions');

const VIDEO_NOTE_URL = 'https://whiteshadow-uploader.vercel.app/files/0hh.mp4';

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

cmd({
    pattern:  'owner',
    react:    '🤵‍♂️',
    desc:     'Get owner contact details',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const ownerNumber = (config.OWNER_NUMBER || '94707085822').replace('+', '');
        const ownerName   = config.OWNER_NAME || 'Savendra Dampriya';

        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\nEND:VCARD`;

        // ── 1. vCard contact ──
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: mek });

        // ── 2. Owner info image ──
        const ram     = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const ramMax  = (os.totalmem()  / 1024 / 1024).toFixed(2);
        const uptime  = runtime(process.uptime());
        const host    = os.hostname();

        const caption =
`*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ BOT INFO 」─*
*│ 📌 CREATOR : Sʜᴀᴠɪʏᴀ*
*│ 👤 OWNER : ${ownerName}*
*│ 📱 NUMBER : +${ownerNumber}*
*│ 📟 Version: ${config.BOT_VERSION || '2.0.0'}*
*│ 🧬 Uptime: ${uptime}*
*│ 📈 RAM Usage: ${ram}MB / ${ramMax}MB*
*│ 🕯️ Platform: heroku*
*│ ⚙️ Hostname: ${host}*
*╰──────────────●●►*
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ Xᴍᴅ`;

        try {
            await conn.sendMessage(from, {
                image: { url: 'https://files.catbox.moe/eqmiio.jpg' },
                caption,
                contextInfo: {
                    mentionedJid: [`${ownerNumber}@s.whatsapp.net`],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@newsletter',
                        newsletterName: '© Mr Savendra',
                        serverMessageId: 143
                    }
                }
            }, { quoted: FakeVCard });
        } catch (_) {
            await reply(caption);
        }

        // ── 3. Video Note (ptv circle) ──
        try {
            console.log('[OWNER] Sending video note...');
            await conn.sendMessage(from, {
                video:       { url: VIDEO_NOTE_URL },
                mimetype:    'video/mp4',
                ptv:         true,
                gifPlayback: false
            }, { quoted: FakeVCard });
            console.log('[OWNER] Video note sent ✅');
        } catch (vnErr) {
            console.error('[OWNER] Video note error:', vnErr.message);
        }

    } catch (e) {
        console.error('[OWNER ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});
