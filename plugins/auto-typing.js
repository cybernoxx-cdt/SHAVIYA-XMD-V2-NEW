// ============================================
//   plugins/auto-typing.js - SHAVIYA-XMD V2
//   Always Typing presence : on/off toggle +
//   live presence updater
// ============================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── Typing presence interval tracker ────────────────────
let typingInterval = null;

function startTyping(conn, jid) {
    stopTyping();
    typingInterval = setInterval(async () => {
        try {
            await conn.sendPresenceUpdate('composing', jid);
        } catch {}
    }, 4000);
}

function stopTyping() {
    if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
    }
}

// ── Toggle command : .autotyping on / off ─────────────────
cmd({
    pattern:  'autotyping',
    alias:    ['autotyping', 'alwaystyping', 'typing'],
    desc:     'Always show typing indicator on/off',
    category: 'owner',
    react:    '⌨️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    const sub = (q || '').toLowerCase().trim();

    // Status check
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const current = getSetting('autoTyping') ?? false;
        return reply(
`⌨️ *Auto Typing Status*

📌 *Current:* ${current ? '✅ ON' : '❌ OFF'}

Usage:
• *.autotyping on*  → Always show typing indicator
• *.autotyping off* → Stop typing indicator`
        );
    }

    if (sub === 'on') {
        setSetting('autoTyping', true);
        startTyping(conn, from);
        return reply(
`✅ *Auto Typing Enabled!*

⌨️ Bot will always appear to be typing.`
        );
    }

    if (sub === 'off') {
        setSetting('autoTyping', false);
        stopTyping();
        try { await conn.sendPresenceUpdate('paused', from); } catch {}
        return reply(
`❌ *Auto Typing Disabled!*

⏸️ Typing indicator stopped.`
        );
    }
});

// ── Auto Typing listener (runs on every incoming message) ─
cmd({
    on: 'body'
},
async (conn, mek, m, { from }) => {
    try {
        const config = require('../config');
        const enabled = getSetting('autoTyping') ?? (config.ALWAYS_TYPING === true || config.ALWAYS_TYPING === 'true');
        if (!enabled) return;

        await conn.sendPresenceUpdate('composing', from);
    } catch {}
});
