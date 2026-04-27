// ============================================================
//  Ping.js — SHAVIYA-XMD V2
//  Premium Animated Ping — Bubble Load Effect
//  CDT — Crash Delta Team
// ============================================================

const { cmd } = require('../command');
const config  = require('../config');
const os      = require('os');

const FakeVCard = {
    key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast'
    },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const FRAMES = [
    '⬜⬜⬜⬜⬜',
    '🟦⬜⬜⬜⬜',
    '🟦🟦⬜⬜⬜',
    '🟦🟦🟦⬜⬜',
    '🟦🟦🟦🟦⬜',
    '🟦🟦🟦🟦🟦',
    '✅✅✅✅✅',
];

const FRAME_DELAY = 280;

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
//  .ping — Animated bubble loader → small premium result
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'ping',
    alias:    ['speed', 'pong'],
    desc:     'Check bot response time with animated loader',
    category: 'main',
    react:    '⚡',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const t0 = Date.now();

        // Step 1: React immediately
        await conn.sendMessage(from, {
            react: { text: '⚡', key: mek.key }
        });

        // Step 2: Show typing bubble
        await conn.sendPresenceUpdate('composing', from);

        // Step 3: Send first loader frame
        const loaderMsg = await conn.sendMessage(from, {
            text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  ⬜⬜⬜⬜⬜\n│  _ᴄʜᴇᴄᴋɪɴɢ..._\n╰────────────⊷',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '💎 SHAVIYA-XMD V2',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

        // Step 4: Animate frames via message edit
        for (let i = 1; i < FRAMES.length; i++) {
            await sleep(FRAME_DELAY);
            const isLast = i === FRAMES.length - 1;
            const label  = isLast ? '_ᴄᴏᴍᴘʟᴇᴛᴇ!_' : '_ᴄʜᴇᴄᴋɪɴɢ..._';
            try {
                await conn.sendMessage(from, {
                    text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  ' + FRAMES[i] + '\n│  ' + label + '\n╰────────────⊷',
                    edit: loaderMsg.key
                });
            } catch (_) {}
        }

        // Step 5: Measure ping & stop presence
        const ping  = Date.now() - t0;
        const speed = getSpeedBadge(ping);
        const ram   = getRam();
        const ver   = config.BOT_VERSION || 'V2';

        await conn.sendPresenceUpdate('available', from);
        await sleep(300);

        // Step 6: Delete loader
        try {
            await conn.sendMessage(from, { delete: loaderMsg.key });
        } catch (_) {}

        await sleep(200);

        // Step 7: Small premium final result
        const finalText =
`${speed.dot} *𝗣𝗜𝗡𝗚* ${speed.emoji} ${speed.dot}
> *${ping} ms* · ${speed.label}
> 💾 *RAM:* ${ram}
> 🔖 *Ver:* ${ver}
> ⚙️ *Mode:* ${(config.MODE || 'public').toUpperCase()}`;

        await conn.sendMessage(from, {
            text: finalText,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '💠 𝗦𝗛𝗔𝗩𝗜𝗬𝗔 𝗧𝗘𝗖𝗛',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error('[PING ERROR]', e);
        reply('⚠️ Ping error: ' + e.message);
    }
});

// ══════════════════════════════════════════════════════════════
//  .ping2 — Ultra minimal one-liner with reaction animation
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'ping2',
    alias:    ['p2', 'latency'],
    desc:     'Ultra minimal ping — one-liner result',
    category: 'main',
    react:    '💠',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // Animated reaction sequence — bubble feel
        const loadEmojis = ['🔘', '🔵', '💠', '🔷', '⚡'];
        for (const emoji of loadEmojis) {
            try {
                await conn.sendMessage(from, {
                    react: { text: emoji, key: mek.key }
                });
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
            text: `${speed.dot} *${ping}ms* ${speed.emoji} · *${speed.label}* — 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '💎 SHAVIYA-XMD V2',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error('[PING2 ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});
