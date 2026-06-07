// ============================================================
//   plugins/vv.js — SHAVIYA-XMD V2
//   ✅ Auto-intercept ALL view-once (groups + DMs)
//   ✅ Uses conn.downloadMediaMessage() — handles decrypt
//   ✅ Forward to owner inbox with sender info
//   ✅ Default: ON always
//   ✅ .vv on/off MongoDB toggle
//   © Mr Savendra · SHAVIYA-XMD V2
// ============================================================

'use strict';

const { getSetting, setSetting } = require('../lib/settings');

// ── Resolve @lid → real number ────────────────────────────────
function resolveSenderJid(rawJid, conn) {
    if (!rawJid) return '';
    if (!rawJid.endsWith('@lid')) return rawJid;
    try {
        const lidPart = rawJid.split('@')[0];
        const contacts = conn.contacts || {};
        const found = Object.values(contacts).find(c =>
            c.lid?.split('@')[0] === lidPart && c.id?.endsWith('@s.whatsapp.net')
        );
        if (found?.id) return found.id;
    } catch {}
    return rawJid;
}

function extractNumber(jid) {
    return jid?.split('@')[0]?.split(':')[0]?.replace(/\D/g, '') || '';
}

// ── Unwrap all Baileys wrappers to find viewOnce ──────────────
function getViewOnceInner(message) {
    if (!message) return null;

    // deviceSentMessage outer layer
    let msg = message;
    if (msg.deviceSentMessage?.message) msg = msg.deviceSentMessage.message;

    // ephemeralMessage layer
    if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;

    // viewOnce wrappers
    return (
        msg.viewOnceMessage?.message           ||
        msg.viewOnceMessageV2?.message         ||
        msg.viewOnceMessageV2Extension?.message ||
        null
    );
}

// ── Detect media type from inner viewOnce content ─────────────
function getMediaType(inner) {
    if (inner.imageMessage) return 'image';
    if (inner.videoMessage) return 'video';
    if (inner.audioMessage) return 'audio';
    return null;
}

// ── Time (Sri Lanka) ──────────────────────────────────────────
function getTime() {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
    });
}

// ══════════════════════════════════════════════════════════════
//  onMessage — hook from index.js (called with RAW mek,
//  BEFORE mek.message is mutated by unwrapping)
// ══════════════════════════════════════════════════════════════
async function onMessage(conn, mek) {
    try {
        // ── Check setting (default ON) ─────────────────────
        const s = getSetting('autoViewOnce');
        if (s === false || s === 'false') return;

        if (!mek?.message) return;
        if (mek.key?.fromMe) return;

        const chat = mek.key?.remoteJid;
        if (!chat || chat === 'status@broadcast') return;

        // ── Detect view-once ───────────────────────────────
        const inner = getViewOnceInner(mek.message);
        if (!inner) return;

        const mediaType = getMediaType(inner);
        // text-only view-once: handle separately
        if (!mediaType && !inner.conversation && !inner.extendedTextMessage) return;

        // ── Owner JID ──────────────────────────────────────
        const ownerNum = conn.user?.id?.split(':')[0]?.split('@')[0];
        if (!ownerNum) return;
        const ownerJid = `${ownerNum}@s.whatsapp.net`;

        // ── Sender resolution ──────────────────────────────
        const isGroup = chat.endsWith('@g.us');
        const rawSender = isGroup
            ? (mek.key?.participant || mek.participant || '')
            : chat;
        const senderJid    = resolveSenderJid(rawSender, conn);
        const senderNumber = extractNumber(senderJid);
        const mentionJid   = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;
        const pushName     = mek.pushName || senderNumber || 'Unknown';

        // ── Location ───────────────────────────────────────
        let locationLine;
        if (isGroup) {
            let groupName = chat.split('@')[0];
            try { groupName = (await conn.groupMetadata(chat)).subject; } catch {}
            locationLine = `👥 *Group:*    ${groupName}`;
        } else {
            locationLine = `💬 *Chat:*     Private DM`;
        }

        const mentions = mentionJid ? [mentionJid] : [];
        const time = getTime();

        const header =
`🔓 *VIEW ONCE INTERCEPTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*    ${pushName}
📱 *Number:*  @${senderNumber} (+${senderNumber})
${locationLine}
🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━`;

        // ── Text-only view-once ────────────────────────────
        if (!mediaType) {
            const txt = inner.conversation || inner.extendedTextMessage?.text || '(empty)';
            return conn.sendMessage(ownerJid, {
                text: `${header}\n\n💬 *Content:*\n${txt}`,
                mentions,
            });
        }

        // ── Download via conn.downloadMediaMessage ─────────
        // This is the CORRECT way — handles all Baileys encryption
        // including view-once specific mediaKey decryption
        let buffer;
        try {
            buffer = await conn.downloadMediaMessage(mek);
        } catch (dlErr) {
            console.log('[VV] Download error:', dlErr.message);
            // Fallback: send header only with error note
            return conn.sendMessage(ownerJid, {
                text: `${header}\n\n${mediaType === 'image' ? '📷' : mediaType === 'video' ? '🎥' : '🎤'} *View-once ${mediaType}*\n\n⚠️ _Download failed: ${dlErr.message}_`,
                mentions,
            });
        }

        if (!buffer || !buffer.length) {
            return conn.sendMessage(ownerJid, {
                text: `${header}\n\n⚠️ *Empty media buffer — may have expired*`,
                mentions,
            });
        }

        const caption = inner.imageMessage?.caption || inner.videoMessage?.caption || '';
        const captionLine = caption ? `\n\n💬 *Caption:* ${caption}` : '';
        const fullCaption = `${header}${captionLine}`;

        if (mediaType === 'image') {
            await conn.sendMessage(ownerJid, {
                image: buffer, caption: fullCaption, mentions,
            });
        } else if (mediaType === 'video') {
            await conn.sendMessage(ownerJid, {
                video: buffer, caption: fullCaption, mentions,
            });
        } else if (mediaType === 'audio') {
            await conn.sendMessage(ownerJid, {
                text: `${header}\n\n🎤 *Voice Note*`,
                mentions,
            });
            await conn.sendMessage(ownerJid, {
                audio:    buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt:      inner.audioMessage?.ptt ?? true,
            });
        }

    } catch (e) {
        console.log('[VV] Error:', e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  .vv command — toggle on/off
// ══════════════════════════════════════════════════════════════
const { cmd } = require('../command');

cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'autovv'],
    react:    '👁️',
    desc:     'Auto view-once intercept toggle',
    category: 'owner',
    filename: __filename,
},
async (conn, mek, m, { isOwner, args, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    const s    = getSetting('autoViewOnce');
    const isOn = s !== false && s !== 'false';

    if (!args[0]) {
        return reply(
`👁️ *Auto View-Once Intercept*

Status: ${isOn ? '✅ *ON*' : '❌ *OFF*'}

📌 *Usage:*
• \`.vv on\`  — Enable
• \`.vv off\` — Disable`
        );
    }

    const arg = args[0].toLowerCase();
    if (arg !== 'on' && arg !== 'off') return reply('❌ Use `.vv on` or `.vv off`');

    const newVal = arg === 'on';
    await setSetting('autoViewOnce', newVal);
    await conn.sendMessage(from, { react: { text: newVal ? '✅' : '❌', key: mek.key } });
    return reply(newVal
        ? '✅ *Auto View-Once: ON*\n💾 _MongoDB saved_'
        : '❌ *Auto View-Once: OFF*\n💾 _MongoDB saved_'
    );
});

module.exports = { onMessage };
