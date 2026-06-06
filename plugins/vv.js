// ============================================================
//   plugins/vv.js — SHAVIYA-XMD V2
//   ✅ Auto-intercept ALL view-once from groups + DMs
//   ✅ Forward to bot owner inbox
//   ✅ Shows: Name, @Mention, Number, Time, Caption
//   ✅ MongoDB on/off (autoViewOnce setting)
//   ✅ No cmd — pure event hook
//   © Mr Savendra · SHAVIYA-XMD V2
// ============================================================

'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting, setSetting }     = require('../lib/settings');

// ── Resolve @lid → real @s.whatsapp.net ──────────────────────
function resolveSenderJid(rawJid, conn) {
    if (!rawJid) return '';
    if (!rawJid.endsWith('@lid')) return rawJid;
    try {
        const contacts = conn.contacts || {};
        const lidPart  = rawJid.split('@')[0];
        const resolved = Object.values(contacts).find(c =>
            c.lid &&
            c.lid.split('@')[0] === lidPart &&
            c.id &&
            c.id.endsWith('@s.whatsapp.net')
        );
        if (resolved?.id) return resolved.id;
    } catch {}
    return rawJid;
}

function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

// ── Download any media type from viewOnceMessage ─────────────
async function downloadVVMedia(msgContent) {
    let mediaType, mediaMsg;
    if      (msgContent.imageMessage)  { mediaType = 'image'; mediaMsg = msgContent.imageMessage; }
    else if (msgContent.videoMessage)  { mediaType = 'video'; mediaMsg = msgContent.videoMessage; }
    else if (msgContent.audioMessage)  { mediaType = 'audio'; mediaMsg = msgContent.audioMessage; }
    else return null;

    try {
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return { buffer, mediaType };
    } catch (e) {
        console.log('[VV] Media download failed:', e.message);
        return null;
    }
}

// ── Core handler — called from index.js messages.upsert ──────
async function onMessage(conn, mek) {
    try {
        // Check setting
        const enabled = getSetting('autoViewOnce');
        if (enabled === false || enabled === 'false') return;

        const msg = mek.message;
        if (!msg) return;

        // Detect view-once wrapper
        const vow =
            msg.viewOnceMessage?.message          ||
            msg.viewOnceMessageV2?.message        ||
            msg.viewOnceMessageV2Extension?.message ||
            null;

        if (!vow) return;

        const chat    = mek.key.remoteJid;
        const isGroup = chat?.endsWith('@g.us');
        if (!chat) return;

        // Get raw owner JID
        const rawOwner = conn.user?.id?.split(':')[0]?.split('@')[0];
        if (!rawOwner) return;
        const ownerJid = `${rawOwner}@s.whatsapp.net`;

        // Don't re-forward owner's own view-once back to themselves
        if (mek.key.fromMe) return;

        // Resolve sender
        let rawSenderJid;
        if (isGroup) {
            rawSenderJid = mek.key.participant || mek.participant || '';
        } else {
            rawSenderJid = chat;
        }
        const senderJid    = resolveSenderJid(rawSenderJid, conn);
        const senderNumber = extractNumber(senderJid);
        const mentionJid   = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;
        const pushName     = mek.pushName || senderNumber || 'Unknown';

        // Time (SL)
        const time = new Date().toLocaleString('en-GB', {
            timeZone:  'Asia/Colombo',
            day:       '2-digit', month:  'short', year:   'numeric',
            hour:      '2-digit', minute: '2-digit', second: '2-digit',
            hour12:    true,
        });

        // Location line
        let locationLine;
        if (isGroup) {
            let groupName = chat.split('@')[0];
            try {
                const meta = await conn.groupMetadata(chat);
                groupName  = meta.subject;
            } catch {}
            locationLine = `👥 *Group:*    ${groupName}`;
        } else {
            locationLine = `💬 *Chat:*     Private DM`;
        }

        const mentions = mentionJid ? [mentionJid] : [];

        const header =
`🔓 *VIEW ONCE INTERCEPTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*    ${pushName}
📱 *Number:*  @${senderNumber} (+${senderNumber})
${locationLine}
🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━`;

        // Detect media inside view-once
        const innerContent = vow;
        const dl = await downloadVVMedia(innerContent);

        if (!dl) {
            // Text view-once (rare)
            const txt =
                innerContent.conversation ||
                innerContent.extendedTextMessage?.text || '(no text)';
            await conn.sendMessage(ownerJid, {
                text: `${header}\n\n💬 *Content:*\n${txt}`,
                mentions,
            });
            return;
        }

        const { buffer, mediaType } = dl;
        const caption =
            innerContent.imageMessage?.caption ||
            innerContent.videoMessage?.caption || '';

        const infoLine = `${header}${caption ? `\n\n💬 *Caption:* ${caption}` : ''}`;

        if (mediaType === 'image') {
            await conn.sendMessage(ownerJid, {
                image:   buffer,
                caption: infoLine,
                mentions,
            });
        } else if (mediaType === 'video') {
            await conn.sendMessage(ownerJid, {
                video:   buffer,
                caption: infoLine,
                mentions,
            });
        } else if (mediaType === 'audio') {
            await conn.sendMessage(ownerJid, {
                text: `${header}\n\n🎤 *Voice Note / Audio*`,
                mentions,
            });
            await conn.sendMessage(ownerJid, {
                audio:    buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt:      innerContent.audioMessage?.ptt || false,
            });
        }

    } catch (e) {
        console.log('[VV onMessage]:', e.message);
    }
}

// ── cmd: .vv on / .vv off ────────────────────────────────────
const { cmd } = require('../command');

cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'autovv', 'vvset'],
    react:    '👁️',
    desc:     'Auto view-once intercept — on/off toggle',
    category: 'owner',
    filename: __filename,
},
async (conn, mek, m, { isOwner, args, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    const current = getSetting('autoViewOnce');
    const isOn    = current === true || current === 'true';

    if (!args[0]) {
        return reply(
`👁️ *Auto View-Once Intercept*

Status: ${isOn ? '✅ *ON*' : '❌ *OFF*'}

📌 *Usage:*
• \`.vv on\`  — Enable (all VV → your inbox)
• \`.vv off\` — Disable
• \`.vv\`     — Check status

_All groups + DMs view-once media will be forwarded to your inbox automatically._`
        );
    }

    const arg = args[0].toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
        return reply('❌ Use `.vv on` or `.vv off`');
    }

    const newVal = arg === 'on';
    await setSetting('autoViewOnce', newVal);

    await conn.sendMessage(from, {
        react: { text: newVal ? '✅' : '❌', key: mek.key }
    });

    return reply(
        newVal
            ? `✅ *Auto View-Once: ON*\n\n_All view-once media will now be forwarded to your inbox automatically._\n💾 _Saved to MongoDB_`
            : `❌ *Auto View-Once: OFF*\n\n_View-once intercept disabled._\n💾 _Saved to MongoDB_`
    );
});

module.exports = { onMessage };
