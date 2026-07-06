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
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const VIEWONCE_TYPES = new Set([
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
]);

// ── Raw extraction — works directly off mek.message, independent of
//    lib/msg.js's sms() normalization. This means the plugin still
//    works even if sms() fails/throws for an unrelated reason. ──
function extractViewOnce(mek) {
    const msg = mek?.message;
    if (!msg) return null;

    const topType = Object.keys(msg).find(k => VIEWONCE_TYPES.has(k));
    if (!topType) return null;

    const inner = msg[topType]?.message;
    if (!inner) return null;

    const innerType = Object.keys(inner).find(k =>
        k === 'imageMessage' || k === 'videoMessage' || k === 'audioMessage'
    );
    if (!innerType) return null;

    return { innerType, mediaMsg: inner[innerType] };
}

async function downloadRaw(mediaMsg, mediaType) {
    const stream = await downloadContentFromMessage(mediaMsg, mediaType);
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

cmd({ on: 'body', filename: __filename },
async (conn, mek, m, { sessionId }) => {
    try {
        // Never forward the bot's own outgoing view-once (if any)
        if (mek?.key?.fromMe) return;

        // ── Primary path: use lib/msg.js normalized m (when available) ──
        let innerType, mediaMsg;
        if (m && VIEWONCE_TYPES.has(m.type) && m.msg &&
            ['imageMessage', 'videoMessage', 'audioMessage'].includes(m.msg.type)) {
            innerType = m.msg.type;
            mediaMsg  = m.msg;
        } else {
            // ── Fallback: extract directly from raw mek.message ──
            const extracted = extractViewOnce(mek);
            if (!extracted) return;
            innerType = extracted.innerType;
            mediaMsg  = extracted.mediaMsg;
        }

        // ── Download the media before it disappears ──────────
        let buffer;
        try {
            buffer = m && mediaMsg === m.msg
                ? await m.download()
                : await downloadRaw(mediaMsg, innerType.replace('Message', ''));
        } catch (e) {
            console.log('[AUTO-VIEWONCE] download failed:', e.message);
            return;
        }
        if (!buffer || !buffer.length) return;

        // ── Resolve sender + chat + owner (fallback to raw key if m missing) ──
        const chat        = m?.chat || mek.key?.remoteJid || '';
        const isGroup      = m?.isGroup ?? chat.endsWith('@g.us');
        const rawSender    = m?.sender || (mek.key?.fromMe
            ? conn.user?.id
            : (mek.key?.participant || mek.key?.remoteJid || ''));
        const senderNumber = (rawSender || '').split('@')[0].split(':')[0];
        const ownerJid      = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        let groupName = '';
        if (isGroup) {
            try {
                const meta = await conn.groupMetadata(chat);
                groupName = meta.subject;
            } catch {
                groupName = chat.split('@')[0];
            }
        }

        const time = new Date().toLocaleString('en-GB', {
            timeZone: 'Asia/Colombo',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });

        const caption = mediaMsg.caption || '';

        const info =
`🔓 *VIEW-ONCE AUTO-CAPTURED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Sender:*  @${senderNumber}
${isGroup ? `👥 *Group:*   ${groupName}\n` : ''}🕐 *Time:*    ${time}
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
                ptt: mediaMsg.ptt || false,
            });
        }

    } catch (e) {
        console.log('[AUTO-VIEWONCE ERROR]:', e.message);
    }
});
