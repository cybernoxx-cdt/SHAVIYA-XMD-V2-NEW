// ============================================================
//   plugins/anticall.js — SHAVIYA-XMD V2
//   ✅ Auto-reject all incoming calls (voice + video)
//   ✅ Sends warning message to caller
//   ✅ MongoDB on/off (antiCall setting)
//   ✅ .anticall on/off/status command
//   © Mr Savendra · SHAVIYA-XMD V2
// ============================================================

'use strict';

const { cmd }                    = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── Core handler — called from index.js on call.upsert ───────
async function onCall(conn, calls) {
    try {
        const enabled = getSetting('antiCall');
        if (enabled === false || enabled === 'false') return;

        const rawOwner = conn.user?.id?.split(':')[0]?.split('@')[0];
        const ownerJid = rawOwner ? `${rawOwner}@s.whatsapp.net` : null;

        for (const call of calls) {
            // Only handle incoming calls that are offered (not ended/rejected)
            if (call.status !== 'offer') continue;
            if (call.isGroup) continue; // group calls — skip

            const callerJid    = call.from;
            const callerNumber = callerJid?.split('@')[0]?.split(':')[0]?.replace(/\D/g, '') || 'Unknown';
            const callType     = call.isVideo ? '📹 Video Call' : '📞 Voice Call';

            // Reject the call
            try {
                await conn.rejectCall(call.id, call.from);
            } catch {}

            // Notify caller
            const warningMsg =
`╭━━━━━━━━━━━━━━━━━━━━━╮
┃  🚫 *CALL REJECTED*
┃
┃  ${callType} blocked.
┃
┃  ⚠️ _This bot does not_
┃  _accept calls._
┃
┃  📩 Send a message instead.
╰━━━━━━━━━━━━━━━━━━━━━╯`;

            try {
                await conn.sendMessage(callerJid, { text: warningMsg });
            } catch {}

            // Notify owner
            if (ownerJid) {
                const time = new Date().toLocaleString('en-GB', {
                    timeZone: 'Asia/Colombo',
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: true,
                });

                try {
                    await conn.sendMessage(ownerJid, {
                        text:
`📵 *INCOMING CALL BLOCKED*
━━━━━━━━━━━━━━━━━━━━━
${callType}
📱 *From:*   @${callerNumber} (+${callerNumber})
🕐 *Time:*   ${time}
━━━━━━━━━━━━━━━━━━━━━
_Auto-rejected by AntiCall_`,
                        mentions: [`${callerNumber}@s.whatsapp.net`],
                    });
                } catch {}
            }
        }
    } catch (e) {
        console.log('[ANTICALL onCall]:', e.message);
    }
}

// ── cmd: .anticall on / off / status ─────────────────────────
cmd({
    pattern:  'anticall',
    alias:    ['callblock', 'blockcall', 'acall'],
    react:    '📵',
    desc:     'Block all incoming calls automatically',
    category: 'owner',
    filename: __filename,
},
async (conn, mek, m, { isOwner, args, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    const current = getSetting('antiCall');
    const isOn    = current === true || current === 'true';

    if (!args[0]) {
        return reply(
`📵 *Anti-Call System*

Status: ${isOn ? '✅ *ON*' : '❌ *OFF*'}

📌 *Usage:*
• \`.anticall on\`  — Block all calls
• \`.anticall off\` — Allow calls
• \`.anticall\`     — Check status

_When ON: All incoming calls are auto-rejected and caller gets a warning message._`
        );
    }

    const arg = args[0].toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
        return reply('❌ Use `.anticall on` or `.anticall off`');
    }

    const newVal = arg === 'on';
    await setSetting('antiCall', newVal);

    await conn.sendMessage(from, {
        react: { text: newVal ? '✅' : '❌', key: mek.key }
    });

    return reply(
        newVal
            ? `✅ *Anti-Call: ON*\n\n_All incoming calls will be auto-rejected._\n💾 _Saved to MongoDB_`
            : `❌ *Anti-Call: OFF*\n\n_Calls will no longer be blocked._\n💾 _Saved to MongoDB_`
    );
});

module.exports = { onCall };
