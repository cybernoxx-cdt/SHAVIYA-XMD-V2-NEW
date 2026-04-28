// ============================================================
//  Ping.js — SHAVIYA-XMD V2
//  Premium Animated Ping — Circle Loader, No Delete
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');
const config  = require('../config');
const os      = require('os');

// ── Set your working video note URL here ──
// Must be a direct MP4 link accessible from your bot server
// e.g. catbox.moe link: https://files.catbox.moe/xxxxxx.mp4
const VIDEO_NOTE_URL = 'https://whiteshadow-uploader.vercel.app/files/iwd6.jpg';

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Circle bubble loader frames ──
const FRAMES = [
    '○○○○○',
    '◍○○○○',
    '◍◍○○○',
    '◍◍◍○○',
    '◍◍◍◍○',
    '◍◍◍◍◍',
    '●●●●●',
];

function getSpeedBadge(ms) {
    if (ms <= 100)  return { emoji: '⚡', label: 'ʟɪɢʜᴛɴɪɴɢ', dot: '🟢' };
    if (ms <= 250)  return { emoji: '🚀', label: 'ꜱᴜᴘᴇʀ ꜰᴀꜱᴛ', dot: '🟢' };
    if (ms <= 500)  return { emoji: '💨', label: 'ꜰᴀꜱᴛ',       dot: '🟡' };
    if (ms <= 900)  return { emoji: '🌀', label: 'ᴍᴇᴅɪᴜᴍ',     dot: '🟠' };
    return              { emoji: '🐢', label: 'ꜱʟᴏᴡ',       dot: '🔴' };
}

function getRam() {
    const used  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const total = (os.totalmem() / 1024 / 1024).toFixed(0);
    return `${used}MB / ${total}MB`;
}

// ══════════════════════════════════════════════════════════════
//  .ping — Circle loader → full edit to result (no delete)
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'ping',
    alias:    ['speed', 'pong'],
    desc:     'Animated ping with circle loader',
    category: 'main',
    react:    '⚡',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const t0 = Date.now();

        // ── React ──
        await conn.sendMessage(from, {
            react: { text: '⚡', key: mek.key }
        });

        // ── Typing bubble ──
        await conn.sendPresenceUpdate('composing', from);

        // ── Send initial loader message ──
        const loaderMsg = await conn.sendMessage(from, {
            text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  ○○○○○\n│  _ᴄʜᴇᴄᴋɪɴɢ..._\n╰────────────⊷',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '© Mr Savendra',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

        // ── Animate circle frames via edit ──
        for (let i = 1; i < FRAMES.length; i++) {
            await sleep(300);
            const isLast = i === FRAMES.length - 1;
            const label  = isLast ? '_ᴄᴏᴍᴘʟᴇᴛᴇ!_' : '_ᴄʜᴇᴄᴋɪɴɢ..._';
            try {
                await conn.sendMessage(from, {
                    text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  ' + FRAMES[i] + '\n│  ' + label + '\n╰────────────⊷',
                    edit: loaderMsg.key
                });
            } catch (_) {}
        }

        const ping  = Date.now() - t0;
        const speed = getSpeedBadge(ping);
        const ram   = getRam();

        await conn.sendPresenceUpdate('available', from);
        await sleep(400);

        // ── Edit loader → final result (NO delete) ──
        const resultText =
`╭─「 ${speed.dot} *ᴘɪɴɢ ʀᴇꜱᴜʟᴛ* 」
│
│  ${speed.emoji}  *${ping} ms*
│  ⚡  *${speed.label}*
│  💾  *${ram}*
│  🔖  *${config.BOT_VERSION || 'V2'}*
│  ⚙️  *${(config.MODE || 'public').toUpperCase()}*
│
╰────────────⊷
> © Mr Savendra`;

        try {
            await conn.sendMessage(from, {
                text: resultText,
                edit: loaderMsg.key
            });
        } catch (_) {
            // edit failed — send new message
            await conn.sendMessage(from, {
                text: resultText,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@newsletter',
                        newsletterName: '© Mr Savendra',
                        serverMessageId: 143
                    }
                }
            }, { quoted: FakeVCard });
        }

        // ── Video Note — only if URL is set ──
        if (VIDEO_NOTE_URL && VIDEO_NOTE_URL !== 'https://whiteshadow-uploader.vercel.app/files/iwd6.jpg') {
            try {
                await conn.sendMessage(from, {
                    video:       { url: VIDEO_NOTE_URL },
                    mimetype:    'video/mp4',
                    ptv:         true,
                    gifPlayback: false
                }, { quoted: FakeVCard });
                console.log('[PING] Video note sent ✅');
            } catch (vnErr) {
                console.error('[PING] Video note error:', vnErr.message);
            }
        }

    } catch (e) {
        console.error('[PING ERROR]', e);
        reply('⚠️ Ping error: ' + e.message);
    }
});

// ══════════════════════════════════════════════════════════════
//  .ping2 — Reaction animation → one-liner result
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'ping2',
    alias:    ['p2', 'latency'],
    desc:     'Ultra minimal ping',
    category: 'main',
    react:    '💠',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const loadEmojis = ['🔘', '🔵', '💠', '🔷', '⚡'];
        for (const emoji of loadEmojis) {
            try {
                await conn.sendMessage(from, { react: { text: emoji, key: mek.key } });
                await sleep(220);
            } catch (_) {}
        }

        const t0 = Date.now();
        await conn.sendPresenceUpdate('composing', from);
        await sleep(600);
        const ping  = Date.now() - t0;
        const speed = getSpeedBadge(ping);
        await conn.sendPresenceUpdate('available', from);

        await conn.sendMessage(from, {
            text: `${speed.dot} *${ping}ms* ${speed.emoji} · *${speed.label}* — 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 · © Mr Savendra`,
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
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error('[PING2 ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});
