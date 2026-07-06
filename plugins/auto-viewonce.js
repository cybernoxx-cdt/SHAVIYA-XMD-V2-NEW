// ============================================================
//   plugins/auto-viewonce.js — SHAVIYA-XMD V2
//   ✅ Fully automatic — NO command needed
//   ✅ Every view-once image/video/audio sent to the bot
//      (DM or group) is instantly forwarded to the OWNER inbox
//   ✅ Uses lib/msg.js normalized m.type / m.msg / m.download()
//   ✅ Always-on — runs via on:'body' hook (fires on every msg)
//   © SHAVIYA-XMD V2
// ============================================================

'use strict';

const { cmd } = require('../command');

const VIEWONCE_TYPES = new Set([
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
]);

cmd({ on: 'body' },
async (conn, mek, m, { sessionId }) => {
    try {
        // Only real view-once wrappers — ignore everything else
        if (!VIEWONCE_TYPES.has(m.type)) return;
        if (!m.msg) return;

        // Never forward the bot's own outgoing view-once (if any)
        if (m.fromMe) return;

        const innerType = m.msg.type; // imageMessage / videoMessage / audioMessage
        if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(innerType)) return;

        // ── Download the media before it disappears ──────────
        let buffer;
        try {
            buffer = await m.download();
        } catch (e) {
            console.log('[AUTO-VIEWONCE] download failed:', e.message);
            return;
        }
        if (!buffer || !buffer.length) return;

        // ── Resolve sender + owner ────────────────────────────
        const senderNumber = (m.sender || '').split('@')[0].split(':')[0];
        const ownerJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        let groupName = '';
        if (m.isGroup) {
            try {
                const meta = await conn.groupMetadata(m.chat);
                groupName = meta.subject;
            } catch {
                groupName = m.chat.split('@')[0];
            }
        }

        const time = new Date().toLocaleString('en-GB', {
            timeZone: 'Asia/Colombo',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });

        const caption = m.msg.caption || '';

        const info =
`🔓 *VIEW-ONCE AUTO-CAPTURED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Sender:*  @${senderNumber}
${m.isGroup ? `👥 *Group:*   ${groupName}\n` : ''}🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━${caption ? `\n💬 *Caption:* ${caption}` : ''}`;

        const mentions = senderNumber ? [`${senderNumber}@s.whatsapp.net`] : [];

        if (innerType === 'imageMessage') {
            await conn.sendMessage(ownerJid, {
                image: buffer,
                caption: info,
                mentions,
            });
        } else if (innerType === 'videoMessage') {
            await conn.sendMessage(ownerJid, {
                video: buffer,
                caption: info,
                mentions,
            });
        } else if (innerType === 'audioMessage') {
            // Send info text first, then the audio (captions aren't supported on audio)
            await conn.sendMessage(ownerJid, { text: info, mentions });
            await conn.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: m.msg.ptt || false,
            });
        }

    } catch (e) {
        console.log('[AUTO-VIEWONCE ERROR]:', e.message);
    }
});
