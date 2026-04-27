// ============================================================
//  Ping.js — SHAVIYA-XMD V2
//  Premium Animated Ping — Bubble Load Effect
//  CDT — Crash Delta Team
//  FIX: Loader msg delete removed — edits directly into final result
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
//  .ping — Animated bubble loader → edits into final result
//  FIX: NO delete — loader msg is edited directly to final card
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

        // Step 4: Animate frames via message edit (skip last frame — reserved for final)
        for (let i = 1; i < FRAMES.length - 1; i++) {
            await sleep(FRAME_DELAY);
            try {
                await conn.sendMessage(from, {
                    text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  ' + FRAMES[i] + '\n│  _ᴄʜᴇᴄᴋɪɴɢ..._\n╰────────────⊷',
                    edit: loaderMsg.key
                });
            } catch (_) {}
        }

        // Step 5: Show final frame (✅✅✅✅✅) briefly
        await sleep(FRAME_DELAY);
        try {
            await conn.sendMessage(from, {
                text: '╭─「 🔍 *ᴘɪɴɢ ᴛᴇꜱᴛ* 」\n│\n│  ✅✅✅✅✅\n│  _ᴄᴏᴍᴘʟᴇᴛᴇ!_\n╰────────────⊷',
                edit: loaderMsg.key
            });
        } catch (_) {}

        // Step 6: Measure ping & stop presence
        const ping  = Date.now() - t0;
        const speed = getSpeedBadge(ping);
        const ram   = getRam();
        const ver   = config.BOT_VERSION || 'V2';

        await conn.sendPresenceUpdate('available', from);
        await sleep(400);

        // Step 7: Edit loader msg into final premium result (NO delete)
        const finalText =
`╭─「 ${speed.dot} *𝗣𝗜𝗡𝗚 𝗥𝗘𝗦𝗨𝗟𝗧* ${speed.dot} 」
│
│  ${speed.emoji}  *${ping} ms* · ${speed.label}
│  💾  *RAM:* ${ram}
│  🔖  *Ver:* SHAVIYA-XMD ${ver}
│  ⚙️  *Mode:* ${(config.MODE || 'public').toUpperCase()}
│
╰────────────⊷`;

        try {
            await conn.sendMessage(from, {
                text: finalText,
                edit: loaderMsg.key
            });
        } catch (_) {
            // Edit failed (e.g. too old) — send as new msg
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
        }

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
