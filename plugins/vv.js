// ============================================================
//   plugins/vv.js — SHAVIYA-XMD V2
//   ✅ Auto-intercept ALL view-once (groups + DMs)
//   ✅ Forward to bot owner inbox
//   ✅ Shows: Name, @Mention, Number, Time, Caption
//   ✅ Default: ON (autoViewOnce = true)
//   ✅ MongoDB on/off toggle
//   ✅ Handles all Baileys wrappers correctly
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
            c.id?.endsWith('@s.whatsapp.net')
        );
        if (resolved?.id) return resolved.id;
    } catch {}
    return rawJid;
}

function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

// ── Unwrap ALL Baileys message wrappers ───────────────────────
// Returns the innermost view-once content or null
function extractViewOnce(rawMessage) {
    if (!rawMessage) return null;

    // Layer 1: deviceSentMessage (DM from linked device)
    let msg = rawMessage;
    if (msg.deviceSentMessage?.message) {
        msg = msg.deviceSentMessage.message;
    }

    // Layer 2: ephemeralMessage
    if (msg.ephemeralMessage?.message) {
        msg = msg.ephemeralMessage.message;
    }

    // Layer 3: actual viewOnce wrappers
    const vow =
        msg.viewOnceMessage?.message          ||
        msg.viewOnceMessageV2?.message        ||
        msg.viewOnceMessageV2Extension?.message ||
        null;

    return vow;
}

// ── Download media from viewOnce inner content ────────────────
async function downloadVVMedia(innerMsg) {
    let mediaType, mediaMsg;

    if      (innerMsg.imageMessage)  { mediaType = 'image'; mediaMsg = innerMsg.imageMessage; }
    else if (innerMsg.videoMessage)  { mediaType = 'video'; mediaMsg = innerMsg.videoMessage; }
    else if (innerMsg.audioMessage)  { mediaType = 'audio'; mediaMsg = innerMsg.audioMessage; }
    else return null;

    try {
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), mediaType };
    } catch (e) {
        console.log('[VV] Download failed:', e.message);
        return null;
    }
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
//   onMessage — called from index.js messages.upsert
//   Raw mek passed (before ephemeral unwrap) — we handle all
//   wrappers ourselves here
// ══════════════════════════════════════════════════════════════
async function onMessage(conn, mek) {
    try {
        // ── Setting check (default: true) ─────────────────────
        const setting = getSetting('autoViewOnce');
        // Only skip if EXPLICITLY set to false
        if (setting === false || setting === 'false') return;

        const rawMessage = mek?.message;
        if (!rawMessage) return;

        // Skip own messages
        if (mek.key?.fromMe) return;

        const chat    = mek.key?.remoteJid;
        if (!chat || chat === 'status@broadcast') return;

        // ── Extract view-once inner content ───────────────────
        const vow = extractViewOnce(rawMessage);
        if (!vow) return; // not a view-once message

        // ── Owner JID ─────────────────────────────────────────
        const rawOwner = conn.user?.id?.split(':')[0]?.split('@')[0];
        if (!rawOwner) return;
        const ownerJid = `${rawOwner}@s.whatsapp.net`;

        // ── Resolve sender ────────────────────────────────────
        const isGroup = chat.endsWith('@g.us');
        let rawSenderJid;
        if (isGroup) {
            rawSenderJid = mek.key?.participant || mek.participant || '';
        } else {
            rawSenderJid = chat;
        }
        const senderJid    = resolveSenderJid(rawSenderJid, conn);
        const senderNumber = extractNumber(senderJid);
        const mentionJid   = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;
        const pushName     = mek.pushName || senderNumber || 'Unknown';

        const time = getTime();

        // ── Location line ─────────────────────────────────────
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

        // ── Download + send ───────────────────────────────────
        const dl = await downloadVVMedia(vow);

        if (!dl) {
            // text view-once or download failed
            const txt =
                vow.conversation ||
                vow.extendedTextMessage?.text ||
                '(media expired or unavailable)';
            await conn.sendMessage(ownerJid, {
                text: `${header}\n\n💬 *Content:*\n${txt}`,
                mentions,
            });
            return;
        }

        const { buffer, mediaType } = dl;
        const caption =
            vow.imageMessage?.caption ||
            vow.videoMessage?.caption || '';
        const captionLine = caption ? `\n\n💬 *Caption:* ${caption}` : '';

        if (mediaType === 'image') {
            await conn.sendMessage(ownerJid, {
                image:   buffer,
                caption: `${header}${captionLine}`,
                mentions,
            });
        } else if (mediaType === 'video') {
            await conn.sendMessage(ownerJid, {
                video:   buffer,
                caption: `${header}${captionLine}`,
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
                ptt:      vow.audioMessage?.ptt || false,
            });
        }

    } catch (e) {
        console.log('[VV onMessage error]:', e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//   cmd: .vv on / .vv off / .vv (status)
// ══════════════════════════════════════════════════════════════
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

    const raw   = getSetting('autoViewOnce');
    const isOn  = raw !== false && raw !== 'false'; // default true

    if (!args[0]) {
        return reply(
`👁️ *Auto View-Once Intercept*

Status: ${isOn ? '✅ *ON*' : '❌ *OFF*'}

📌 *Usage:*
• \`.vv on\`  — Enable
• \`.vv off\` — Disable
• \`.vv\`     — Status

_All view-once from groups + DMs → your inbox._`
        );
    }

    const arg = args[0].toLowerCase();
    if (arg !== 'on' && arg !== 'off') return reply('❌ Use `.vv on` or `.vv off`');

    const newVal = arg === 'on';
    await setSetting('autoViewOnce', newVal);

    await conn.sendMessage(from, { react: { text: newVal ? '✅' : '❌', key: mek.key } });
    return reply(
        newVal
            ? `✅ *Auto View-Once: ON*\n_All VV media → your inbox_\n💾 _MongoDB saved_`
            : `❌ *Auto View-Once: OFF*\n_VV intercept disabled_\n💾 _MongoDB saved_`
    );
});

module.exports = { onMessage };
