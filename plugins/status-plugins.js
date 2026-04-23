// ============================================================
//   plugins/status-plugins.js — SHAVIYA-XMD V2
//   ✅ Auto Status View   (.autoreadstatus on/off)
//   ✅ Auto Status Like   (.autolikestatus on/off)
//   ✅ Auto Status Reply  (.autoreply on/off | .autoreply <text>)
//   ✅ Custom Emoji       (.statusemoji ❤️ 🔥 😍)
//   ✅ Status Info        (.statusinfo)
//   — Exact retry logic from sessionConfig-based handler —
// ============================================================

'use strict';

const { cmd }                    = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RETRIES = 3;

// ── .autoreadstatus ────────────────────────────────────────
cmd({
    pattern:  'autoreadstatus',
    alias:    ['autoread', 'readstatus'],
    desc:     'Auto view all WhatsApp statuses — on/off',
    category: 'owner',
    react:    '👁️',
    filename: __filename,
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoReadStatus') ?? true;
        return reply(`👁️ *Auto View Status:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: \`.autoreadstatus on\` / \`.autoreadstatus off\``);
    }
    setSetting('autoReadStatus', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Auto View Status ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});

// ── .autolikestatus ────────────────────────────────────────
cmd({
    pattern:  'autolikestatus',
    alias:    ['autoreactstatus', 'statusreact', 'reactstatus', 'likestat'],
    desc:     'Auto like/react to all statuses — on/off',
    category: 'owner',
    react:    '❤️',
    filename: __filename,
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoLikeStatus') ?? true;
        return reply(`❤️ *Auto Like Status:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: \`.autolikestatus on\` / \`.autolikestatus off\``);
    }
    setSetting('autoLikeStatus', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Auto Like Status ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});

// ── .autoreply ─────────────────────────────────────────────
// ── .statusemoji ───────────────────────────────────────────
cmd({
    pattern:  'statusemoji',
    alias:    ['likeemoji', 'setemoji'],
    desc:     'Set emoji list for auto like status',
    category: 'owner',
    react:    '😍',
    filename: __filename,
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q || !q.trim()) {
        const cur = getSetting('autoLikeEmoji') || ['🥺', '❤️', '🔥'];
        return reply(
            `😍 *Current Status Emojis:*\n${Array.isArray(cur) ? cur.join('  ') : cur}\n\n` +
            `Usage: \`.statusemoji ❤️ 🔥 😍 👍\`\n_(separate with spaces)_`
        );
    }
    const emojis = q.trim().split(/\s+/).filter(e => e.length > 0);
    setSetting('autoLikeEmoji', emojis);
    reply(`✅ *Status Emojis Updated:*\n${emojis.join('  ')}`);
});

// ── .statusinfo ────────────────────────────────────────────
cmd({
    pattern:  'statusinfo',
    alias:    ['statusset', 'statusconfig'],
    desc:     'Show all status plugin settings',
    category: 'owner',
    react:    'ℹ️',
    filename: __filename,
},
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const read   = getSetting('autoReadStatus')  ?? true;
    const like   = getSetting('autoLikeStatus')  ?? true;
    const rep    = getSetting('autoReplyStatus') ?? false;
    const repTxt = getSetting('autoReplyText')   || '👀 Saw your status!';
    const emojis = getSetting('autoLikeEmoji')   || ['🥺', '❤️', '🔥'];
    reply(
        `╔══════════════════════╗\n` +
        `║  📊 STATUS SETTINGS  ║\n` +
        `╚══════════════════════╝\n\n` +
        `👁️ Auto View Status  : ${read ? '✅ ON' : '❌ OFF'}\n` +
        `❤️ Auto Like Status  : ${like ? '✅ ON' : '❌ OFF'}\n` +
        `💬 Auto Reply Status : ${rep  ? '✅ ON' : '❌ OFF'}\n` +
        `📝 Reply Text        : _${repTxt}_\n` +
        `😍 Like Emojis       : ${Array.isArray(emojis) ? emojis.join(' ') : emojis}\n\n` +
        `_Commands:_\n` +
        `• \`.autoreadstatus on/off\`\n` +
        `• \`.autolikestatus on/off\`\n` +
        `• \`.autoreply on/off\` | \`.autoreply <text>\`\n` +
        `• \`.statusemoji ❤️ 🔥 😍\``
    );
});

// ── STATUS EVENT LISTENER ──────────────────────────────────
// Exact logic from sessionConfig-based handler,
// adapted to bot's conn / mek / getSetting() pattern.
cmd({ on: 'body' },
async (conn, mek, m, { from }) => {
    try {
        if (from !== 'status@broadcast') return;

        // Read settings (mirrors: sessionConfig.AUTO_VIEW_STATUS === 'true')
        const AUTO_VIEW_STATUS  = getSetting('autoReadStatus')  ?? true;
        const AUTO_LIKE_STATUS  = getSetting('autoLikeStatus')  ?? true;
        const AUTO_REPLY_STATUS = getSetting('autoReplyStatus') ?? false;
        const AUTO_REPLY_TEXT   = getSetting('autoReplyText')   || '👀 Saw your status!';
        const AUTO_LIKE_EMOJI   = getSetting('autoLikeEmoji')   || ['🥺'];

        let statusViewed = false;

        // ── AUTO VIEW ─────────────────────────────────────
        if (AUTO_VIEW_STATUS) {
            let retries = MAX_RETRIES;
            while (retries > 0) {
                try {
                    await conn.readMessages([mek.key]);
                    statusViewed = true;
                    break;
                } catch (error) {
                    retries--;
                    console.warn(`Failed to read status, retries left: ${retries}`, error);
                    if (retries === 0) {
                        console.error('Permanently failed to view status:', error);
                        return;
                    }
                    await delay(1000 * (MAX_RETRIES - retries + 1));
                }
            }
        } else {
            statusViewed = true;
        }

        // ── AUTO REPLY ────────────────────────────────────

        // ── AUTO LIKE (REACT) ─────────────────────────────
        if (statusViewed && AUTO_LIKE_STATUS) {
            const emojis      = Array.isArray(AUTO_LIKE_EMOJI) ? AUTO_LIKE_EMOJI : ['🥺'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            let retries = MAX_RETRIES;
            while (retries > 0) {
                try {
                    await conn.sendMessage(
                        mek.key.remoteJid,
                        {
                            react: {
                                text: randomEmoji,
                                key:  mek.key
                            }
                        },
                        {
                            statusJidList: [mek.key.participant]
                        }
                    );
                    break;
                } catch (error) {
                    retries--;
                    console.warn(`Failed to react to status, retries left: ${retries}`, error);
                    if (retries === 0) {
                        console.error('Permanently failed to react to status:', error);
                    }
                    await delay(1000 * (MAX_RETRIES - retries + 1));
                }
            }
        }

    } catch (error) {
        console.error('Unexpected error in status handler:', error);
    }
});
