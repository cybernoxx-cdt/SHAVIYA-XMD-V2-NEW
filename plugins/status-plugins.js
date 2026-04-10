// ============================================
//   plugins/status-plugins.js - SHAVIYA-XMD V2
//   ✅ Auto Status Read
//   ✅ Auto Status React
//   ✅ Always Online presence
//   Commands: .autoreadstatus .autoreactstatus .alwaysonline
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── Always Online interval ───────────────────
let onlineInterval = null;

function startAlwaysOnline(conn) {
    stopAlwaysOnline();
    onlineInterval = setInterval(async () => {
        try {
            await conn.sendPresenceUpdate('available');
        } catch {}
    }, 10000);
}

function stopAlwaysOnline() {
    if (onlineInterval) { clearInterval(onlineInterval); onlineInterval = null; }
}

// ── .alwaysonline ──────────────────────────
cmd({
    pattern: 'alwaysonline',
    alias: ['onlinemode', 'alwayson'],
    desc: 'Always appear online on/off',
    category: 'owner',
    react: '🟢',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('alwaysOnline') ?? false;
        return reply(`🟢 *Always Online:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: .alwaysonline on/off`);
    }
    if (sub === 'on') {
        setSetting('alwaysOnline', true);
        startAlwaysOnline(conn);
        reply('✅ *Always Online Enabled!*\n🟢 Bot will always appear online.');
    } else {
        setSetting('alwaysOnline', false);
        stopAlwaysOnline();
        try { await conn.sendPresenceUpdate('unavailable'); } catch {}
        reply('❌ *Always Online Disabled!*');
    }
});

// ── .autoreadstatus ────────────────────────
cmd({
    pattern: 'autoreadstatus',
    alias: ['autoread', 'readstatus'],
    desc: 'Auto read all WhatsApp statuses on/off',
    category: 'owner',
    react: '👁️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoReadStatus') ?? false;
        return reply(`👁️ *Auto Read Status:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: .autoreadstatus on/off`);
    }
    setSetting('autoReadStatus', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Auto Read Status ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});

// ── .autoreactstatus ────────────────────────
cmd({
    pattern: 'autoreactstatus',
    alias: ['statusreact', 'reactstatus'],
    desc: 'Auto react to all statuses on/off',
    category: 'owner',
    react: '❤️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoReactStatus') ?? false;
        return reply(`❤️ *Auto React Status:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: .autoreactstatus on/off`);
    }
    setSetting('autoReactStatus', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Auto React Status ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});

// ── Status Listener ─────────────────────────
// Handles auto-read + auto-react for incoming statuses
cmd({ on: 'body' },
async (conn, mek, m, { from }) => {
    try {
        // Only process status updates
        if (from !== 'status@broadcast') return;

        const autoRead   = getSetting('autoReadStatus')  ?? false;
        const autoReact  = getSetting('autoReactStatus') ?? false;

        if (!autoRead && !autoReact) return;

        // Auto read: mark status as read
        if (autoRead) {
            try {
                await conn.readMessages([mek.key]);
            } catch {}
        }

        // Auto react: send a random emoji reaction
        if (autoReact) {
            const emojis = ['❤️', '🔥', '😍', '👍', '💯', '🎉', '✅', '💎'];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            try {
                await conn.sendMessage(from, {
                    react: { text: emoji, key: mek.key }
                });
            } catch {}
        }
    } catch {}
});

// ── Always Online on every message ──────────
cmd({ on: 'body' },
async (conn, mek, m, { from }) => {
    try {
        const enabled = getSetting('alwaysOnline') ?? false;
        if (!enabled) return;
        await conn.sendPresenceUpdate('available');
    } catch {}
});
