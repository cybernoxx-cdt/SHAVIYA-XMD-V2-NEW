// ============================================
//   plugins/antidelete.js — SHAVIYA-XMD V2
// ============================================
//   ✅ FIX 1: LID JID (@lid) resolved to real number via contacts map
//   ✅ FIX 2: fromMe messages also cached (owner's sent msgs can be deleted too)
//   ✅ FIX 3: deletedId correctly taken from protocolMessage.key.id only
//   ✅ FIX 4: messageStubType=1 fallback uses update.key directly (different path)
//   ✅ FIX 5: Group sender — participant extracted correctly even in Baileys 7.x
//   ✅ FIX 6: Number shown as @mention (blue chip) + plain (+number)
//   ✅ FIX 7: All media types handled — image, video, audio, sticker, doc, contact, location
//   ✅ FIX 8: Cache keyed by message ID — no wrong-ID lookups
//   ✅ FIX 9: Cache size enforced + hourly cleanup
//   ✅ FIX 10: Debug logs removed from production (clean console)
// ============================================

'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting } = require('../lib/settings');

// ── Message cache ─────────────────────────────────────────
const msgCache = new Map();
const MAX_CACHE = 2000;

// Clean cache every 30 min — remove msgs older than 2 hours
setInterval(() => {
    const cutoff = Date.now() - 7_200_000;
    for (const [k, v] of msgCache.entries()) {
        if (v.timestamp < cutoff) msgCache.delete(k);
    }
}, 1_800_000);

// ── Resolve real JID from LID if needed ──────────────────
// WhatsApp multi-device sends @lid JIDs for some users.
// We must resolve via conn.contacts to get the real @s.whatsapp.net JID.
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

    // Could not resolve LID — return as-is, number will show as unknown
    return rawJid;
}

// ── Extract clean phone number from any JID ───────────────
// Handles: 94711234567@s.whatsapp.net
//          94711234567:5@s.whatsapp.net
//          94711234567:5@g.us
function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

// ── Download media buffer ─────────────────────────────────
async function downloadMedia(msgContent) {
    let mediaType, mediaMsg;

    if      (msgContent.imageMessage)    { mediaType = 'image';    mediaMsg = msgContent.imageMessage; }
    else if (msgContent.videoMessage)    { mediaType = 'video';    mediaMsg = msgContent.videoMessage; }
    else if (msgContent.audioMessage)    { mediaType = 'audio';    mediaMsg = msgContent.audioMessage; }
    else if (msgContent.stickerMessage)  { mediaType = 'sticker';  mediaMsg = msgContent.stickerMessage; }
    else if (msgContent.documentMessage) { mediaType = 'document'; mediaMsg = msgContent.documentMessage; }
    else return null;

    try {
        const stream = await downloadContentFromMessage(mediaMsg, mediaType);
        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    } catch (e) {
        console.log(`[ANTIDELETE] Media download failed (${mediaType}):`, e.message);
        return null;
    }
}

// ══════════════════════════════════════════════════════════
//   onMessage — cache EVERY incoming message (including fromMe)
//   Called from index.js → messages.upsert
// ══════════════════════════════════════════════════════════
async function onMessage(conn, mek, sessionId) {
    try {
        if (!mek?.message) return;

        // Unwrap ephemeral / viewOnce wrappers
        const msgContent =
            mek.message?.ephemeralMessage?.message ||
            mek.message?.viewOnceMessage?.message  ||
            mek.message;
        if (!msgContent) return;

        // Skip pure protocol/stub messages — nothing useful to cache
        const keys = Object.keys(msgContent);
        if (
            keys.includes('protocolMessage') ||
            keys.includes('senderKeyDistributionMessage') ||
            (keys.length === 1 && keys[0] === 'messageContextInfo')
        ) return;

        const id      = mek.key.id;
        const chat    = mek.key.remoteJid;
        const isGroup = chat?.endsWith('@g.us');

        // ── Determine real sender JID ──────────────────────
        let rawSenderJid;

        if (mek.key.fromMe) {
            // Bot itself sent this message
            rawSenderJid = conn.user?.id || '';
        } else if (isGroup) {
            // Group: real sender is in participant field
            rawSenderJid = mek.key.participant || mek.participant || '';
        } else {
            // DM: remoteJid IS the other person
            rawSenderJid = chat;
        }

        // ✅ FIX 1: Resolve @lid → real @s.whatsapp.net
        const senderJid    = resolveSenderJid(rawSenderJid, conn);
        const senderNumber = extractNumber(senderJid);
        const pushName     = mek.pushName || (mek.key.fromMe ? 'Me' : senderNumber) || 'Unknown';

        msgCache.set(id, {
            msgContent,
            chat,
            senderJid,
            senderNumber,
            pushName,
            isGroup,
            fromMe: mek.key.fromMe || false,
            timestamp: Date.now(),
            sessionId,
        });

        // Enforce cache size limit (FIFO)
        if (msgCache.size > MAX_CACHE) {
            msgCache.delete(msgCache.keys().next().value);
        }

    } catch (e) {
        console.log('[ANTIDELETE onMessage]:', e.message);
    }
}

// ── Build header info block ───────────────────────────────
async function buildInfo(conn, cached) {
    const { senderNumber, pushName, chat, isGroup, fromMe } = cached;

    const mentionJid = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;

    const time = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
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
        locationLine = fromMe
            ? `💬 *Chat:*    Sent by Me (Bot)`
            : `💬 *Chat:*    Private DM`;
    }

    // ✅ @mention = blue clickable chip in WhatsApp
    const numberDisplay = mentionJid
        ? `@${senderNumber} (+${senderNumber})`
        : 'Unknown';

    const text =
`🗑️ *DELETED MESSAGE DETECTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*    ${pushName}
📱 *Number:*  ${numberDisplay}
${locationLine}
🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━`;

    return {
        text,
        mentions: mentionJid ? [mentionJid] : [],
    };
}

// ══════════════════════════════════════════════════════════
//   onDelete — detect revoke & forward to owner DM
//   Called from index.js → messages.update
// ══════════════════════════════════════════════════════════
async function onDelete(conn, updates, sessionId) {
    try {
        if (!getSetting('antidelete')) return;

        const rawOwner = conn.user?.id?.split(':')[0]?.split('@')[0];
        if (!rawOwner) return;
        const ownerJid = `${rawOwner}@s.whatsapp.net`;

        for (const update of updates) {
            try {
                const updateMsg = update.update?.message;

                // ── Detect revoke / delete ─────────────────
                const proto = updateMsg?.protocolMessage;
                const isProtocolRevoke =
                    proto?.type === 0 ||
                    proto?.type === 'REVOKE';

                const isStubRevoke =
                    update.update?.messageStubType === 1;

                if (!isProtocolRevoke && !isStubRevoke) continue;

                // ✅ FIX 3 & 4:
                // CASE A — protocolMessage revoke: deleted msg ID is inside proto.key.id
                //           update.key.id = the DELETE ACTION itself (wrong — don't use)
                // CASE B — messageStubType=1: update.key.id IS the deleted msg ID
                let deletedId;
                if (isProtocolRevoke) {
                    deletedId = proto?.key?.id;
                } else {
                    // stub revoke — key is the deleted message itself
                    deletedId = update.key?.id;
                }

                if (!deletedId) continue;

                const cached = msgCache.get(deletedId);
                if (!cached) continue;

                const { msgContent } = cached;
                const { text: info, mentions } = await buildInfo(conn, cached);

                const sendText = (body) =>
                    conn.sendMessage(ownerJid, { text: body, mentions });

                // ── TEXT ──────────────────────────────────
                if (msgContent.conversation || msgContent.extendedTextMessage) {
                    const txt =
                        msgContent.conversation ||
                        msgContent.extendedTextMessage?.text || '';
                    await sendText(`${info}\n\n💬 *Content:*\n${txt}`);
                }

                // ── IMAGE ─────────────────────────────────
                else if (msgContent.imageMessage) {
                    const caption = msgContent.imageMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            image:   buffer,
                            caption: `${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired_`);
                    }
                }

                // ── VIDEO ─────────────────────────────────
                else if (msgContent.videoMessage) {
                    const caption = msgContent.videoMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            video:   buffer,
                            caption: `${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired_`);
                    }
                }

                // ── AUDIO / VOICE NOTE ────────────────────
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

                // ── STICKER ───────────────────────────────
                else if (msgContent.stickerMessage) {
                    const buffer = await downloadMedia(msgContent);
                    await sendText(`${info}\n\n🎭 *Sticker deleted*`);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, { sticker: buffer });
                    }
                }

                // ── DOCUMENT ──────────────────────────────
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

                // ── CONTACT ───────────────────────────────
                else if (msgContent.contactMessage) {
                    const cname = msgContent.contactMessage.displayName || 'Unknown';
                    await sendText(`${info}\n\n👤 *Contact deleted*\n📛 *Name:* ${cname}`);
                }

                // ── CONTACT LIST (multiple contacts) ──────
                else if (msgContent.contactsArrayMessage) {
                    const count = msgContent.contactsArrayMessage.contacts?.length || 0;
                    await sendText(`${info}\n\n👥 *Contacts deleted* (${count} contacts)`);
                }

                // ── LOCATION ──────────────────────────────
                else if (msgContent.locationMessage) {
                    const lat = msgContent.locationMessage.degreesLatitude;
                    const lng = msgContent.locationMessage.degreesLongitude;
                    await sendText(`${info}\n\n📍 *Location deleted*\n🌐 https://maps.google.com/?q=${lat},${lng}`);
                }

                // ── LIVE LOCATION ─────────────────────────
                else if (msgContent.liveLocationMessage) {
                    const lat = msgContent.liveLocationMessage.degreesLatitude;
                    const lng = msgContent.liveLocationMessage.degreesLongitude;
                    await sendText(`${info}\n\n📡 *Live location deleted*\n🌐 https://maps.google.com/?q=${lat},${lng}`);
                }

                // ── POLL ──────────────────────────────────
                else if (msgContent.pollCreationMessage) {
                    const question = msgContent.pollCreationMessage.name || 'Unknown';
                    await sendText(`${info}\n\n📊 *Poll deleted*\n❓ *Question:* ${question}`);
                }

                // ── UNKNOWN / OTHER ───────────────────────
                else {
                    const msgType = Object.keys(msgContent)[0] || 'unknown';
                    await sendText(`${info}\n\n❓ *Deleted* (${msgType})`);
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
