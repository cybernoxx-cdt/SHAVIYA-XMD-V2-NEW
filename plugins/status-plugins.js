// ============================================================
//   plugins/status-plugins.js — SHAVIYA-XMD V2
//   ✅ Auto Status View  (default: ON)
//   ✅ Auto Status React (default: ON)
//   Commands: .autoreadstatus | .autoreactstatus | .statusinfo
// ============================================================

'use strict';

const { cmd }                    = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── .autoreadstatus ────────────────────────────────────────
cmd({
    pattern: 'autoreadstatus',
    alias:   ['autoread', 'readstatus'],
    desc:    'Auto view all WhatsApp statuses — on/off',
    category: 'owner',
    react:   '👁️',
    filename: __filename,
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');

    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoReadStatus') ?? true;
        return reply(
            `👁️ *Auto Read Status:* ${cur ? '✅ ON' : '❌ OFF'}\n\n` +
            `Usage: \`.autoreadstatus on\` / \`.autoreadstatus off\``
        );
    }

    setSetting('autoReadStatus', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Auto Read Status ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});

// ── .autoreactstatus ───────────────────────────────────────
cmd({
    pattern: 'autoreactstatus',
    alias:   ['statusreact', 'reactstatus'],
    desc:    'Auto react to all statuses — on/off',
    category: 'owner',
    react:   '❤️',
    filename: __filename,
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');

    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoReactStatus') ?? true;
        return reply(
            `❤️ *Auto React Status:* ${cur ? '✅ ON' : '❌ OFF'}\n\n` +
            `Usage: \`.autoreactstatus on\` / \`.autoreactstatus off\``
        );
    }

    setSetting('autoReactStatus', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Auto React Status ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});

// ── .statusinfo ────────────────────────────────────────────
cmd({
    pattern: 'statusinfo',
    alias:   ['statusset', 'statusconfig'],
    desc:    'Show current status plugin settings',
    category: 'owner',
    react:   'ℹ️',
    filename: __filename,
},
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');

    const read  = getSetting('autoReadStatus')  ?? true;
    const react = getSetting('autoReactStatus') ?? true;

    reply(
        `╔══════════════════════╗\n` +
        `║  📊 STATUS SETTINGS  ║\n` +
        `╚══════════════════════╝\n\n` +
        `👁️ Auto Read Status : ${read  ? '✅ ON' : '❌ OFF'}\n` +
        `❤️ Auto React Status: ${react ? '✅ ON' : '❌ OFF'}\n\n` +
        `_Commands: .autoreadstatus | .autoreactstatus_`
    );
});

// ── STATUS EVENT LISTENER ──────────────────────────────────
// Fires on every message — filters to status@broadcast only
cmd({ on: 'body' },
async (conn, mek, m, { from }) => {
    try {
        if (from !== 'status@broadcast') return;

        const autoRead  = getSetting('autoReadStatus')  ?? true;
        const autoReact = getSetting('autoReactStatus') ?? true;

        if (!autoRead && !autoReact) return;

        // Auto Read: mark status as seen
        if (autoRead) {
            try { await conn.readMessages([mek.key]); } catch {}
        }

        // Auto React: random emoji
        if (autoReact) {
            const emojis = ['❤️', '🔥', '😍', '👍', '💯', '🎉', '✨', '💎', '😎', '🥰'];
            const emoji  = emojis[Math.floor(Math.random() * emojis.length)];
            try {
                await conn.sendMessage(from, {
                    react: { text: emoji, key: mek.key }
                });
            } catch {}
        }
    } catch {}
});
