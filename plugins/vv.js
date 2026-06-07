// ============================================================
//   plugins/vv.js — SHAVIYA-XMD V2
//   ✅ viewOnceMessage + viewOnceMessageV2 + V2Extension
//   ✅ deviceSentMessage + ephemeralMessage unwrap
//   ✅ downloadContentFromMessage direct — no dependency on
//      conn.downloadMediaMessage or lib/msg.js
//   ✅ Default ON — no cmd needed
//   ✅ .vv on/off MongoDB toggle
//   © Mr Savendra · SHAVIYA-XMD V2
// ============================================================

'use strict';

const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const { getSetting, setSetting } = require('../lib/settings');

// ── @lid → real JID ──────────────────────────────────────────
function resolveLid(rawJid, conn) {
    if (!rawJid || !rawJid.endsWith('@lid')) return rawJid || '';
    try {
        const part = rawJid.split('@')[0];
        const found = Object.values(conn.contacts || {}).find(c =>
            c.lid?.split('@')[0] === part && c.id?.endsWith('@s.whatsapp.net')
        );
        if (found?.id) return found.id;
    } catch {}
    return rawJid;
}

function num(jid) {
    return jid?.split('@')[0]?.split(':')[0]?.replace(/\D/g, '') || '';
}

// ── Fully unwrap to find viewOnce inner message ───────────────
// Handles: deviceSentMessage > ephemeralMessage > viewOnceMessage/V2/V2Extension
function extractViewOnceInner(rawMsg) {
    if (!rawMsg) return null;
    let m = rawMsg;

    // deviceSentMessage (DM from linked device)
    if (m.deviceSentMessage?.message) m = m.deviceSentMessage.message;

    // ephemeralMessage
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;

    // All three viewOnce wrapper types
    return (
        m.viewOnceMessage?.message            ||
        m.viewOnceMessageV2?.message          ||
        m.viewOnceMessageV2Extension?.message ||
        null
    );
}

// ── Stream download using correct mediaType string ────────────
async function dlBuffer(msgObj, mediaTypeStr) {
    const stream = await downloadContentFromMessage(msgObj, mediaTypeStr);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// ── Time ──────────────────────────────────────────────────────
function getTime() {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo', day: '2-digit', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
        second: '2-digit', hour12: true,
    });
}

// ══════════════════════════════════════════════════════════════
//   onMessage — called from index.js BEFORE mek.message mutated
// ══════════════════════════════════════════════════════════════
async function onMessage(conn, mek) {
    try {
        // Default ON — only skip if explicitly false
        const s = getSetting('autoViewOnce');
        if (s === false || s === 'false') return;

        if (!mek?.message || mek.key?.fromMe) return;

        const chat = mek.key?.remoteJid;
        if (!chat || chat === 'status@broadcast') return;

        // ── Unwrap to inner viewOnce content ──────────────
        const inner = extractViewOnceInner(mek.message);
        if (!inner) return;

        // ── Detect what's inside ──────────────────────────
        const innerType = getContentType(inner); // e.g. 'imageMessage'
        if (!innerType) return;

        const mediaMap = {
            imageMessage:    'image',
            videoMessage:    'video',
            audioMessage:    'audio',
        };
        const dlType = mediaMap[innerType]; // undefined for text

        // ── Owner ─────────────────────────────────────────
        const ownerNum = num(conn.user?.id);
        if (!ownerNum) return;
        const ownerJid = `${ownerNum}@s.whatsapp.net`;

        // ── Sender ────────────────────────────────────────
        const isGroup = chat.endsWith('@g.us');
        const rawSender = isGroup
            ? (mek.key?.participant || mek.participant || '')
            : chat;
        const senderJid = resolveLid(rawSender, conn);
        const senderNum = num(senderJid);
        const mentionJid = senderNum ? `${senderNum}@s.whatsapp.net` : null;
        const pushName  = mek.pushName || senderNum || 'Unknown';
        const mentions  = mentionJid ? [mentionJid] : [];

        // ── Location ──────────────────────────────────────
        let locLine;
        if (isGroup) {
            let gName = chat.split('@')[0];
            try { gName = (await conn.groupMetadata(chat)).subject; } catch {}
            locLine = `👥 *Group:*    ${gName}`;
        } else {
            locLine = `💬 *Chat:*     Private DM`;
        }

        const header =
`🔓 *VIEW ONCE INTERCEPTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*    ${pushName}
📱 *Number:*  @${senderNum} (+${senderNum})
${locLine}
🕐 *Time:*    ${getTime()}
━━━━━━━━━━━━━━━━━━━━━`;

        // ── Text-only view-once ───────────────────────────
        if (!dlType) {
            const txt = inner.conversation
                || inner.extendedTextMessage?.text
                || `(${innerType})`;
            return conn.sendMessage(ownerJid, {
                text: `${header}\n\n💬 *Content:*\n${txt}`, mentions,
            });
        }

        // ── Download media ────────────────────────────────
        // inner[innerType] = the actual imageMessage / videoMessage / audioMessage
        let buffer;
        try {
            buffer = await dlBuffer(inner[innerType], dlType);
        } catch (e) {
            console.log('[VV] dlBuffer failed:', e.message);
            return conn.sendMessage(ownerJid, {
                text: `${header}\n\n${dlType === 'image' ? '📷' : dlType === 'video' ? '🎥' : '🎤'} *View-once ${dlType}*\n\n⚠️ _Download failed: ${e.message}_`,
                mentions,
            });
        }

        if (!buffer?.length) {
            return conn.sendMessage(ownerJid, {
                text: `${header}\n\n⚠️ _Empty buffer — media may have expired_`, mentions,
            });
        }

        const caption  = inner[innerType]?.caption || '';
        const capLine  = caption ? `\n\n💬 *Caption:* ${caption}` : '';
        const fullCap  = `${header}${capLine}`;

        if (dlType === 'image') {
            await conn.sendMessage(ownerJid, { image: buffer, caption: fullCap, mentions });

        } else if (dlType === 'video') {
            await conn.sendMessage(ownerJid, { video: buffer, caption: fullCap, mentions });

        } else if (dlType === 'audio') {
            await conn.sendMessage(ownerJid, { text: `${header}\n\n🎤 *Voice Note*`, mentions });
            await conn.sendMessage(ownerJid, {
                audio:    buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt:      inner[innerType]?.ptt ?? true,
            });
        }

    } catch (e) {
        console.log('[VV] Error:', e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//   .vv on/off
// ══════════════════════════════════════════════════════════════
const { cmd } = require('../command');

cmd({
    pattern:  'vv',
    alias:    ['autovv', 'viewonce'],
    react:    '👁️',
    desc:     'Auto view-once intercept toggle',
    category: 'owner',
    filename: __filename,
}, async (conn, mek, m, { isOwner, args, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    const s    = getSetting('autoViewOnce');
    const isOn = s !== false && s !== 'false';

    if (!args[0]) {
        return reply(`👁️ *Auto View-Once Intercept*\n\nStatus: ${isOn ? '✅ *ON*' : '❌ *OFF*'}\n\n• \`.vv on\`  — Enable\n• \`.vv off\` — Disable`);
    }

    const arg = args[0].toLowerCase();
    if (arg !== 'on' && arg !== 'off') return reply('❌ Use `.vv on` or `.vv off`');

    const newVal = arg === 'on';
    await setSetting('autoViewOnce', newVal);
    await conn.sendMessage(from, { react: { text: newVal ? '✅' : '❌', key: mek.key } });
    return reply(newVal
        ? '✅ *Auto View-Once: ON*\n💾 _MongoDB saved_'
        : '❌ *Auto View-Once: OFF*\n💾 _MongoDB saved_');
});

module.exports = { onMessage };
