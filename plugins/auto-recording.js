// ============================================
//   plugins/auto-recording.js - SHAVIYA-XMD V2
//   Always Recording presence : on/off toggle +
//   live presence updater
// ============================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── Recording presence interval tracker ─────────────────
let recordingInterval = null;

function startRecording(conn, jid) {
    stopRecording();
    recordingInterval = setInterval(async () => {
        try {
            await conn.sendPresenceUpdate('recording', jid);
        } catch {}
    }, 4000);
}

function stopRecording() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
}

// ── Toggle command : .autorecording on / off ─────────────
cmd({
    pattern:  'autorecording',
    alias:    ['autorecord', 'alwaysrecording', 'recording'],
    desc:     'Always show recording (voice note) indicator on/off',
    category: 'owner',
    react:    '🎙️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    const sub = (q || '').toLowerCase().trim();

    // Status check
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const current = getSetting('autoRecording') ?? false;
        return reply(
`🎙️ *Auto Recording Status*

📌 *Current:* ${current ? '✅ ON' : '❌ OFF'}

Usage:
• *.autorecording on*  → Always show recording indicator
• *.autorecording off* → Stop recording indicator`
        );
    }

    if (sub === 'on') {
        setSetting('autoRecording', true);
        startRecording(conn, from);
        return reply(
`✅ *Auto Recording Enabled!*

🎙️ Bot will always appear to be recording audio.`
        );
    }

    if (sub === 'off') {
        setSetting('autoRecording', false);
        stopRecording();
        try { await conn.sendPresenceUpdate('paused', from); } catch {}
        return reply(
`❌ *Auto Recording Disabled!*

⏸️ Recording indicator stopped.`
        );
    }
});

// ── Auto Recording listener (runs on every incoming message) ─
cmd({
    on: 'body'
},
async (conn, mek, m, { from }) => {
    try {
        const config = require('../config');
        const enabled = getSetting('autoRecording') ?? (config.ALWAYS_RECORDING === true || config.ALWAYS_RECORDING === 'true');
        if (!enabled) return;

        await conn.sendPresenceUpdate('recording', from);
    } catch {}
});
