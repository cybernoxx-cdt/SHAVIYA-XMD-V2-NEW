// ============================================
//   plugins/antidelete.js — SHAVIYA-XMD V2
//   FULLY FIXED:
//   ✅ BUG 1: Media (image/video/audio) now downloads correctly
//   ✅ BUG 2: Sender number shown correctly (groups + DMs)
//   ✅ BUG 3: Clean, readable message format
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

// ── Download helper using Baileys directly ────────────────
// BUG 1 FIX: conn.downloadMediaMessage() doesn't exist in V2.
// Must use downloadContentFromMessage() from @whiskeysockets/baileys.
async function downloadMedia(msgContent) {
    // Determine media type and the correct message object
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
//   Called from index.js  →  messages.upsert
// ══════════════════════════════════════════════════════════
async function onMessage(conn, mek, sessionId) {
    try {
        if (!mek?.message) return;
        if (mek.key.fromMe) return;

        // Unwrap ephemeral/viewOnce wrapper
        const msgContent =
            mek.message?.ephemeralMessage?.message ||
            mek.message?.viewOnceMessage?.message ||
            mek.message;

        if (!msgContent) return;

        const id      = mek.key.id;
        const chat    = mek.key.remoteJid;
        const isGroup = chat?.endsWith('@g.us');

        // BUG 2 FIX: correct sender extraction
        // Group  → participant field holds the actual sender JID
        // DM     → remoteJid IS the sender
        const sender = isGroup
            ? (mek.key.participant || mek.participant || '')
            : chat;

        // Clean number: strip @s.whatsapp.net and device suffix (e.g. 94711:5)
        const senderNumber = sender.split('@')[0].split(':')[0];
        const pushName     = mek.pushName || senderNumber;

        msgCache.set(id, {
            mek,
            msgContent,
            chat,
            sender,
            senderNumber,
            pushName,
            isGroup,
            timestamp: Date.now(),
            sessionId,
        });

        // Enforce cache limit
        if (msgCache.size > MAX_CACHE) {
            msgCache.delete(msgCache.keys().next().value);
        }
    } catch (e) {
        console.log('[ANTIDELETE onMessage]:', e.message);
    }
}

// ══════════════════════════════════════════════════════════
//   onDelete — detect revoke & forward to owner DM
//   Called from index.js  →  messages.update
// ══════════════════════════════════════════════════════════
async function onDelete(conn, updates, sessionId) {
    try {
        if (!getSetting('antidelete')) return;

        // Owner JID — send all deleted msgs here
        const rawOwner = conn.user?.id?.split(':')[0]?.split('@')[0];
        if (!rawOwner) return;
        const ownerJid = rawOwner + '@s.whatsapp.net';

        for (const update of updates) {
            try {
                const updateMsg = update.update?.message;

                // Detect message revoke
                const isRevoke =
                    updateMsg?.protocolMessage?.type === 0 ||
                    updateMsg?.protocolMessage?.type === 'REVOKE' ||
                    update.update?.messageStubType === 1;

                if (!isRevoke) continue;

                // ID of the deleted message
                const deletedId =
                    updateMsg?.protocolMessage?.key?.id ||
                    update.key?.id;

                if (!deletedId) continue;

                const cached = msgCache.get(deletedId);
                if (!cached) {
                    // Message wasn't cached (bot missed it or too old)
                    continue;
                }

                const { mek, msgContent, chat, senderNumber, pushName, isGroup } = cached;

                // Group name
                let groupName = '';
                if (isGroup) {
                    try {
                        const meta = await conn.groupMetadata(chat);
                        groupName = meta.subject;
                    } catch {
                        groupName = chat.split('@')[0];
                    }
                }

                // BUG 3 FIX: Clean readable format, no broken box characters
                // Sri Lanka time
                const time = new Date().toLocaleString('en-GB', {
                    timeZone:  'Asia/Colombo',
                    day:       '2-digit',
                    month:     'short',
                    year:      'numeric',
                    hour:      '2-digit',
                    minute:    '2-digit',
                    second:    '2-digit',
                    hour12:    true,
                });

                const info =
`🗑️ *DELETED MESSAGE DETECTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*    ${pushName}
📱 *Number:*  +${senderNumber}
${isGroup
    ? `👥 *Group:*   ${groupName}`
    : `💬 *Chat:*    Private DM`}
🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━`;

                // ── Text message ──
                if (msgContent.conversation || msgContent.extendedTextMessage) {
                    const text =
                        msgContent.conversation ||
                        msgContent.extendedTextMessage?.text || '';
                    await conn.sendMessage(ownerJid, {
                        text: `${info}\n\n💬 *Content:*\n${text}`,
                    });
                }

                // ── Image ──
                else if (msgContent.imageMessage) {
                    const caption = msgContent.imageMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            image:   buffer,
                            caption: `${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                        });
                    } else {
                        await conn.sendMessage(ownerJid, {
                            text: `${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired — could not download_`,
                        });
                    }
                }

                // ── Video ──
                else if (msgContent.videoMessage) {
                    const caption = msgContent.videoMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            video:   buffer,
                            caption: `${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                        });
                    } else {
                        await conn.sendMessage(ownerJid, {
                            text: `${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired — could not download_`,
                        });
                    }
                }

                // ── Audio / Voice note ──
                else if (msgContent.audioMessage) {
                    const isPtt  = msgContent.audioMessage.ptt;
                    const buffer = await downloadMedia(msgContent);
                    // Send info header first
                    await conn.sendMessage(ownerJid, {
                        text: `${info}\n\n${isPtt ? '🎤 *Voice note deleted*' : '🎵 *Audio deleted*'}`,
                    });
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            audio:    buffer,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt:      isPtt,
                        });
                    } else {
                        await conn.sendMessage(ownerJid, {
                            text: '⚠️ _Media expired — could not download audio_',
                        });
                    }
                }

                // ── Sticker ──
                else if (msgContent.stickerMessage) {
                    const buffer = await downloadMedia(msgContent);
                    await conn.sendMessage(ownerJid, {
                        text: `${info}\n\n🎭 *Sticker deleted*`,
                    });
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
                        });
                    } else {
                        await conn.sendMessage(ownerJid, {
                            text: `${info}\n\n📄 *Document deleted*\n📎 *File:* ${fname}\n\n⚠️ _Media expired_`,
                        });
                    }
                }

                // ── Contact ──
                else if (msgContent.contactMessage) {
                    const cname = msgContent.contactMessage.displayName || 'Unknown';
                    await conn.sendMessage(ownerJid, {
                        text: `${info}\n\n👤 *Contact deleted*\n📛 *Name:* ${cname}`,
                    });
                }

                // ── Location ──
                else if (msgContent.locationMessage) {
                    const lat = msgContent.locationMessage.degreesLatitude;
                    const lng = msgContent.locationMessage.degreesLongitude;
                    await conn.sendMessage(ownerJid, {
                        text: `${info}\n\n📍 *Location deleted*\n🌐 https://maps.google.com/?q=${lat},${lng}`,
                    });
                }

                // ── Unknown / other ──
                else {
                    const msgType = Object.keys(msgContent)[0] || 'unknown';
                    await conn.sendMessage(ownerJid, {
                        text: `${info}\n\n❓ *Deleted* (${msgType})`,
                    });
                }

                // Remove from cache after handling
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
