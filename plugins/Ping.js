// ============================================================
//  Ping.js — SHAVIYA-XMD V2
//  Premium Animated Ping — Bubble Load + Video Note
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');
const config  = require('../config');
const os      = require('os');

const VIDEO_NOTE_URL = 'https://www.image2url.com/r2/default/videos/1777342845157-21bb9426-b434-4975-add4-336104b62a9c.mp4';

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

const FRAMES = [
    '○○○○○',
    '◍○○○○',
    '◍◍○○○',
    '◍◍◍○○',
    '◍◍◍◍○',
    '◍◍◍◍◍',
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
//  .ping — Animated bubble loader → result + video note
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'ping',
    alias:    ['speed', 'pong'],
    desc:     'Animated ping with video note',
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

        // ── First loader frame ──
        const loaderMsg = await conn.sendMessage(from, {
            text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  \n│  _ᴄʜᴇᴄᴋɪɴɢ..._\n╰────────────⊷',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '© Mr Savendra · SHAVIYA-XMD V2',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

        // ── Animate frames via edit ──
        for (let i = 1; i < FRAMES.length; i++) {
            await sleep(280);
            const label = i === FRAMES.length - 1 ? '_ᴄᴏᴍᴘʟᴇᴛᴇ!_' : '_ᴄʜᴇᴄᴋɪɴɢ..._';
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
        await sleep(300);

        // ── Delete loader ──
        try { await conn.sendMessage(from, { delete: loaderMsg.key }); } catch (_) {}
        await sleep(150);

        // ── Small premium result ──
        const resultText =
`${speed.dot} *𝗣𝗜𝗡𝗚* ${speed.emoji} ${speed.dot}
> *${ping} ms* · ${speed.label}
> 💾 *RAM:* ${ram}
> 🔖 *Ver:* ${config.BOT_VERSION || 'V2'}
> ⚙️ *Mode:* ${(config.MODE || 'public').toUpperCase()}
> © Mr Savendra`;

        await conn.sendMessage(from, {
            text: resultText,
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

        // ── Video Note (ptv circle) ──
        try {
            console.log('[PING] Sending video note...');
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
