// ============================================
//   plugins/antidelete.js — SHAVIYA-XMD V2
// ============================================
//   ✅ LID JID resolved to real number via contacts map
//   ✅ Aggressive multi-field sender resolution
//   ✅ fromMe messages cached (owner sent msgs)
//   ✅ deletedId from protocolMessage.key.id (correct)
//   ✅ messageStubType fallback handled separately
//   ✅ GROUP: shows SENDER + DELETED BY separately (@mention both)
//   ✅ DM: shows SENDER @mention
//   ✅ All media types handled
//   ✅ Cache size enforced + 2hr cleanup
// ============================================

'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting } = require('../lib/settings');

// ── Message cache ─────────────────────────────────────────
const msgCache = new Map();
const MAX_CACHE = 2000;

setInterval(() => {
    const cutoff = Date.now() - 7_200_000;
    for (const [k, v] of msgCache.entries()) {
        if (v.timestamp < cutoff) msgCache.delete(k);
    }
}, 1_800_000);

// ── Resolve @lid → real @s.whatsapp.net ──────────────────
function resolveSenderJid(rawJid, conn) {
    if (!rawJid) return '';
    if (!rawJid.endsWith('@lid')) return rawJid;
    try {
        const contacts = conn.contacts || {};
        const lidPart  = rawJid.split('@')[0];

        // Try full lid match first
        const byLid = Object.values(contacts).find(c =>
            c.lid &&
            c.lid.split('@')[0] === lidPart &&
            c.id?.endsWith('@s.whatsapp.net')
        );
        if (byLid?.id) return byLid.id;

        // Partial match fallback: lid number prefix
        const byPartial = Object.values(contacts).find(c =>
            c.lid && c.lid.includes(lidPart.slice(0, 8)) &&
            c.id?.endsWith('@s.whatsapp.net')
        );
        if (byPartial?.id) return byPartial.id;
    } catch {}
    return rawJid;
}

// ── Extract clean digits-only number from any JID ────────
function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

// ── Resolve sender across all possible fields ─────────────
function resolveSender(mek, conn) {
    const chat    = mek.key?.remoteJid || '';
    const isGroup = chat.endsWith('@g.us');

    if (mek.key?.fromMe) {
        return resolveSenderJid(conn.user?.id || '', conn);
    }

    if (isGroup) {
        // Check all participant fields — never fall back to group JID
        const raw =
            mek.key?.participant ||
            mek.participant      ||
            '';
        if (!raw || raw === chat) return ''; // group JID is not a sender
        return resolveSenderJid(raw, conn);
    }

    // DM — remoteJid IS the sender
    return resolveSenderJid(chat, conn);
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
//   onMessage — cache every incoming message
// ══════════════════════════════════════════════════════════
async function onMessage(conn, mek, sessionId) {
    try {
        if (!mek?.message) return;

        const msgContent =
            mek.message?.ephemeralMessage?.message ||
            mek.message?.viewOnceMessage?.message  ||
            mek.message;
        if (!msgContent) return;

        const keys = Object.keys(msgContent);
        if (
            keys.includes('protocolMessage') ||
            keys.includes('senderKeyDistributionMessage') ||
            (keys.length === 1 && keys[0] === 'messageContextInfo')
        ) return;

        const id      = mek.key.id;
        const chat    = mek.key.remoteJid;
        const isGroup = chat?.endsWith('@g.us');

        // ── IMPROVED: use pre-resolved sender from index.js if available ──
        // index.js injects _resolvedSender after full LID resolution,
        // so @lid JIDs are already converted to real @s.whatsapp.net JIDs.
        let senderJid;
        if (mek._resolvedSender) {
            senderJid = mek._resolvedSender;
        } else {
            senderJid = resolveSender(mek, conn);
        }
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

        if (msgCache.size > MAX_CACHE) {
            msgCache.delete(msgCache.keys().next().value);
        }

    } catch (e) {
        console.log('[ANTIDELETE onMessage]:', e.message);
    }
}

// ══════════════════════════════════════════════════════════
//   buildInfo — header with SENDER + DELETED BY
// ══════════════════════════════════════════════════════════
async function buildInfo(conn, cached, update) {
    const { senderNumber, pushName, chat, isGroup, fromMe } = cached;

    const senderMentionJid  = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;
    const senderDisplay     = senderMentionJid ? `@${senderNumber} (+${senderNumber})` : 'Unknown';

    const time = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
    });

    let locationLine;
    let mentions = senderMentionJid ? [senderMentionJid] : [];
    let deletedByLine = '';

    if (isGroup) {
        let groupName = '';
        try {
            const meta = await conn.groupMetadata(chat);
            groupName  = meta.subject;
        } catch {
            groupName = chat.split('@')[0];
        }
        locationLine = `👥 *Group:*      ${groupName}`;

        const rawDeleterJid  = update?.key?.participant || '';
        // Never treat group JID as deleter
        const deleterJid     = (rawDeleterJid && !rawDeleterJid.endsWith('@g.us'))
            ? resolveSenderJid(rawDeleterJid, conn)
            : '';
        const deleterNumber  = extractNumber(deleterJid);

        if (deleterNumber && deleterNumber !== senderNumber) {
            const deleterMentionJid = `${deleterNumber}@s.whatsapp.net`;
            mentions.push(deleterMentionJid);
            deletedByLine = `\n🗑️ *Deleted By:* @${deleterNumber} (+${deleterNumber})`;
        } else if (deleterNumber === senderNumber) {
            deletedByLine = `\n🗑️ *Deleted By:* Self`;
        }

    } else {
        locationLine = fromMe
            ? `💬 *Chat:*       Sent by Me (Bot)`
            : `💬 *Chat:*       Private DM`;
    }

    const text =
`🗑️ *DELETED MESSAGE DETECTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*      ${pushName}
📱 *Sender:*    ${senderDisplay}${deletedByLine}
${locationLine}
🕐 *Time:*      ${time}
━━━━━━━━━━━━━━━━━━━━━`;

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
        const ownerJid = `${rawOwner}@s.whatsapp.net`;

        for (const update of updates) {
            try {
                const updateMsg = update.update?.message;

                const proto = updateMsg?.protocolMessage;
                const isProtocolRevoke =
                    proto?.type === 0 ||
                    proto?.type === 'REVOKE';

                const isNullRevoke  = update.update?.message === null;
                const isStubRevoke  = update.update?.messageStubType === 1;

                if (!isProtocolRevoke && !isNullRevoke && !isStubRevoke) continue;

                let deletedId;
                if (isProtocolRevoke) {
                    deletedId = proto?.key?.id;
                } else {
                    deletedId = update.key?.id;
                }

                if (!deletedId) continue;

                const cached = msgCache.get(deletedId);
                if (!cached) continue;

                if (cached.fromMe) continue;

                const deleterRaw = update?.key?.participant || update?.key?.remoteJid || '';
                const deleterNum = deleterRaw.split('@')[0].split(':')[0].replace(/\D/g, '');
                if (deleterNum && deleterNum === rawOwner) continue;

                const { msgContent } = cached;
                const { text: info, mentions } = await buildInfo(conn, cached, update);

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

                // ── CONTACT LIST ──────────────────────────
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

                // ── UNKNOWN ───────────────────────────────
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
