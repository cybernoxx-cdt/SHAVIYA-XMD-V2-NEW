// ============================================
//   plugins/antidelete.js — SHAVIYA-XMD V2
//   FULLY FIXED:
//   ✅ BUG 1: Media (image/video/audio) downloads correctly
//   ✅ BUG 2: Sender number shown correctly (groups + DMs)
//   ✅ BUG 3: Clean, readable message format
//   ✅ BUG 4: Number shown as clickable @mention (not plain text)
//   ✅ BUG 5: senderNumber strips @s/@g domain correctly always
// ============================================

'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting } = require('../lib/settings');

// ── Message cache ─────────────────────────────────────────
const msgCache = new Map();
const MAX_CACHE = 1500;

// Clean cache every 30 min — remove msgs older than 1 hour
setInterval(() => {
    const cutoff = Date.now() - 3_600_000;
    for (const [k, v] of msgCache.entries()) {
        if (v.timestamp < cutoff) msgCache.delete(k);
    }
}, 1_800_000);

// ── Extract clean phone number from any JID format ────────
// Handles:
//   94711234567@s.whatsapp.net        → 94711234567
//   94711234567:5@s.whatsapp.net      → 94711234567
//   94711234567:5@g.us                → 94711234567
//   94711234567@g.us (rare)           → 94711234567
function extractNumber(jid) {
    if (!jid) return '';
    // Strip @domain first, then strip :device suffix
    return jid.split('@')[0].split(':')[0];
}

// ── Download helper using Baileys directly ────────────────
async function downloadMedia(msgContent) {
    let mediaType, mediaMsg;

    if (msgContent.imageMessage) {
        mediaType = 'image';
        mediaMsg  = msgContent.imageMessage;
    } else if (msgContent.videoMessage) {
        mediaType = 'video';
        mediaMsg  = msgContent.videoMessage;
    } else if (msgContent.audioMessage) {
        mediaType = 'audio';
        mediaMsg  = msgContent.audioMessage;
    } else if (msgContent.stickerMessage) {
        mediaType = 'sticker';
        mediaMsg  = msgContent.stickerMessage;
    } else if (msgContent.documentMessage) {
        mediaType = 'document';
        mediaMsg  = msgContent.documentMessage;
    } else {
        return null;
    }

    try {
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) {
        console.log(`[ANTIDELETE] Media download failed (${mediaType}):`, e.message);
        return null;
    }
}

// ══════════════════════════════════════════════════════════
//   onMessage — cache every incoming message
// ══════════════════════════════════════════════════════════
async function onMessage(conn, mek, sessionId) {
    try {
        if (!mek?.message) return;
        if (mek.key.fromMe) return;

        const msgContent =
            mek.message?.ephemeralMessage?.message ||
            mek.message?.viewOnceMessage?.message ||
            mek.message;

        if (!msgContent) return;

        const id      = mek.key.id;
        const chat    = mek.key.remoteJid;
        const isGroup = chat?.endsWith('@g.us');

        // Real sender JID
        let senderJid;
        if (isGroup) {
            senderJid = mek.key.participant || mek.participant || '';
        } else {
            senderJid = chat;
        }

        // ✅ FIX: Always extract clean number — strips @domain AND :device
        const senderNumber = extractNumber(senderJid);
        const pushName     = mek.pushName || senderNumber || 'Unknown';

        msgCache.set(id, {
            mek,
            msgContent,
            chat,
            senderJid,
            senderNumber,
            pushName,
            isGroup,
            timestamp: Date.now(),
            sessionId,
        });

        if (msgCache.size > MAX_CACHE) {
            msgCache.delete(msgCache.keys().next().value);
        }
    } catch (e) {
        console.log('[ANTIDELETE onMessage]:', e.message);
    }
}

// ══════════════════════════════════════════════════════════
//   buildInfo — header text + mention array
//   Returns { text, mentions }
//   Number appears as @mention (clickable chip in WhatsApp)
// ══════════════════════════════════════════════════════════
async function buildInfo(conn, cached) {
    const { senderNumber, senderJid, pushName, chat, isGroup } = cached;

    // ✅ FIX: mention JID must be @s.whatsapp.net — always
    const mentionJid = senderNumber
        ? `${senderNumber}@s.whatsapp.net`
        : null;

    const time = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        day:      '2-digit',
        month:    'short',
        year:     'numeric',
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
        hour12:   true,
    });

    let locationLine;
    if (isGroup) {
        let groupName = '';
        try {
            const meta = await conn.groupMetadata(chat);
            groupName  = meta.subject;
        } catch {
            groupName = chat.split('@')[0];
        }
        locationLine = `👥 *Group:*   ${groupName}`;
    } else {
        locationLine = `💬 *Chat:*    Private DM`;
    }

    // ✅ Number shown as @mention — WhatsApp renders it as blue clickable chip
    const numberDisplay = mentionJid ? `@${senderNumber}` : 'Unknown';

    const text =
`🗑️ *DELETED MESSAGE DETECTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*    ${pushName}
📱 *Number:*  ${numberDisplay}
${locationLine}
🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━`;

    const mentions = mentionJid ? [mentionJid] : [];
    return { text, mentions };
}

// ══════════════════════════════════════════════════════════
//   onDelete — detect revoke & forward to owner DM
// ══════════════════════════════════════════════════════════
async function onDelete(conn, updates, sessionId) {
    try {
        if (!getSetting('antidelete')) return;

        const rawOwner = conn.user?.id?.split(':')[0]?.split('@')[0];
        if (!rawOwner) return;
        const ownerJid = rawOwner + '@s.whatsapp.net';

        for (const update of updates) {
            try {
                const updateMsg = update.update?.message;

                const isRevoke =
                    updateMsg?.protocolMessage?.type === 0 ||
                    updateMsg?.protocolMessage?.type === 'REVOKE' ||
                    update.update?.messageStubType === 1;

                if (!isRevoke) continue;

                const deletedId =
                    updateMsg?.protocolMessage?.key?.id ||
                    update.key?.id;

                if (!deletedId) continue;

                const cached = msgCache.get(deletedId);
                if (!cached) continue;

                const { msgContent } = cached;
                const { text: info, mentions } = await buildInfo(conn, cached);

                // Helper to send text with mention
                const sendText = (body) =>
                    conn.sendMessage(ownerJid, { text: body, mentions });

                // ── Text ──
                if (msgContent.conversation || msgContent.extendedTextMessage) {
                    const txt =
                        msgContent.conversation ||
                        msgContent.extendedTextMessage?.text || '';
                    await sendText(`${info}\n\n💬 *Content:*\n${txt}`);
                }

                // ── Image ──
                else if (msgContent.imageMessage) {
                    const caption = msgContent.imageMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            image:    buffer,
                            caption:  `${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired — could not download_`);
                    }
                }

                // ── Video ──
                else if (msgContent.videoMessage) {
                    const caption = msgContent.videoMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            video:    buffer,
                            caption:  `${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired — could not download_`);
                    }
                }

                // ── Audio / Voice note ──
                else if (msgContent.audioMessage) {
                    const isPtt  = msgContent.audioMessage.ptt;
                    const buffer = await downloadMedia(msgContent);
                    await sendText(`${info}\n\n${isPtt ? '🎤 *Voice note deleted*' : '🎵 *Audio deleted*'}`);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            audio:    buffer,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt:      isPtt,
                        });
                    } else {
                        await sendText('⚠️ _Media expired — could not download audio_');
                    }
                }

                // ── Sticker ──
                else if (msgContent.stickerMessage) {
                    const buffer = await downloadMedia(msgContent);
                    await sendText(`${info}\n\n🎭 *Sticker deleted*`);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, { sticker: buffer });
                    }
                }

                // ── Document ──
                else if (msgContent.documentMessage) {
                    const fname    = msgContent.documentMessage.fileName || 'Unknown file';
                    const mimetype = msgContent.documentMessage.mimetype || 'application/octet-stream';
                    const buffer   = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            document: buffer,
                            mimetype,
                            fileName: fname,
                            caption:  `${info}\n\n📄 *Document deleted*\n📎 *File:* ${fname}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n📄 *Document deleted*\n📎 *File:* ${fname}\n\n⚠️ _Media expired_`);
                    }
                }

                // ── Contact ──
                else if (msgContent.contactMessage) {
                    const cname = msgContent.contactMessage.displayName || 'Unknown';
                    await sendText(`${info}\n\n👤 *Contact deleted*\n📛 *Name:* ${cname}`);
                }

                // ── Location ──
                else if (msgContent.locationMessage) {
                    const lat = msgContent.locationMessage.degreesLatitude;
                    const lng = msgContent.locationMessage.degreesLongitude;
                    await sendText(`${info}\n\n📍 *Location deleted*\n🌐 https://maps.google.com/?q=${lat},${lng}`);
                }

                // ── Unknown ──
                else {
                    const msgType = Object.keys(msgContent)[0] || 'unknown';
                    await sendText(`${info}\n\n❓ *Deleted* (${msgType})`);
                }

                msgCache.delete(deletedId);

            } catch (innerErr) {
                console.log('[ANTIDELETE inner error]:', innerErr.message);
            }
        }
    } catch (e) {
        console.log('[ANTIDELETE onDelete]:', e.message);
    }
}

module.exports = { onMessage, onDelete };
