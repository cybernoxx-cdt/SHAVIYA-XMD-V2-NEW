// ============================================
//   plugins/antidelete.js — SHAVIYA-XMD V2
// ============================================

'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting } = require('../lib/settings');

const msgCache = new Map();
const MAX_CACHE = 1500;

setInterval(() => {
    const cutoff = Date.now() - 3_600_000;
    for (const [k, v] of msgCache.entries()) {
        if (v.timestamp < cutoff) msgCache.delete(k);
    }
}, 1_800_000);

// Strip to digits only from any JID format
function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

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
//   KEY: cache by BOTH mek.key.id AND remoteJid+id combo
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
            // DM: real sender is remoteJid (the other person's JID)
            senderJid = chat;
        }

        const senderNumber = extractNumber(senderJid);
        const pushName     = mek.pushName || senderNumber || 'Unknown';

        const entry = {
            mek,
            msgContent,
            chat,
            senderJid,
            senderNumber,
            pushName,
            isGroup,
            timestamp: Date.now(),
            sessionId,
        };

        // Cache by message ID
        msgCache.set(id, entry);

        if (msgCache.size > MAX_CACHE) {
            msgCache.delete(msgCache.keys().next().value);
        }

        console.log(`[ANTIDELETE CACHE] id=${id} sender=${senderNumber} name=${pushName} chat=${chat}`);
    } catch (e) {
        console.log('[ANTIDELETE onMessage]:', e.message);
    }
}

async function buildInfo(conn, cached) {
    const { senderNumber, pushName, chat, isGroup } = cached;

    const mentionJid = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;

    const time = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
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

    // @mention chip + plain number both shown
    const numberDisplay = mentionJid ? `@${senderNumber} (+${senderNumber})` : 'Unknown';

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

                // ✅ FIX: deleted msg ID is inside protocolMessage.key.id
                // update.key.id is the ID of the DELETE ACTION message, NOT the deleted message
                const deletedId = updateMsg?.protocolMessage?.key?.id;

                console.log(`[ANTIDELETE DELETE] deletedId=${deletedId} cacheSize=${msgCache.size}`);
                console.log(`[ANTIDELETE DELETE] update.key.id=${update.key?.id} (this is the ACTION id, not the deleted msg)`);

                if (!deletedId) {
                    console.log('[ANTIDELETE] Could not find deletedId — skipping');
                    continue;
                }

                const cached = msgCache.get(deletedId);
                if (!cached) {
                    console.log(`[ANTIDELETE] Cache miss for id=${deletedId}`);
                    continue;
                }

                console.log(`[ANTIDELETE] Cache HIT — sender=${cached.senderNumber} name=${cached.pushName}`);

                const { msgContent } = cached;
                const { text: info, mentions } = await buildInfo(conn, cached);

                const sendText = (body) =>
                    conn.sendMessage(ownerJid, { text: body, mentions });

                if (msgContent.conversation || msgContent.extendedTextMessage) {
                    const txt = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
                    await sendText(`${info}\n\n💬 *Content:*\n${txt}`);
                }
                else if (msgContent.imageMessage) {
                    const caption = msgContent.imageMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            image: buffer,
                            caption: `${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n📷 *Image deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired_`);
                    }
                }
                else if (msgContent.videoMessage) {
                    const caption = msgContent.videoMessage.caption || '';
                    const buffer  = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            video: buffer,
                            caption: `${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n🎥 *Video deleted*${caption ? `\n💬 *Caption:* ${caption}` : ''}\n\n⚠️ _Media expired_`);
                    }
                }
                else if (msgContent.audioMessage) {
                    const isPtt  = msgContent.audioMessage.ptt;
                    const buffer = await downloadMedia(msgContent);
                    await sendText(`${info}\n\n${isPtt ? '🎤 *Voice note deleted*' : '🎵 *Audio deleted*'}`);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            audio: buffer,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: isPtt,
                        });
                    } else {
                        await sendText('⚠️ _Media expired — could not download audio_');
                    }
                }
                else if (msgContent.stickerMessage) {
                    const buffer = await downloadMedia(msgContent);
                    await sendText(`${info}\n\n🎭 *Sticker deleted*`);
                    if (buffer) await conn.sendMessage(ownerJid, { sticker: buffer });
                }
                else if (msgContent.documentMessage) {
                    const fname    = msgContent.documentMessage.fileName || 'Unknown file';
                    const mimetype = msgContent.documentMessage.mimetype || 'application/octet-stream';
                    const buffer   = await downloadMedia(msgContent);
                    if (buffer) {
                        await conn.sendMessage(ownerJid, {
                            document: buffer, mimetype, fileName: fname,
                            caption: `${info}\n\n📄 *Document deleted*\n📎 *File:* ${fname}`,
                            mentions,
                        });
                    } else {
                        await sendText(`${info}\n\n📄 *Document deleted*\n📎 *File:* ${fname}\n\n⚠️ _Media expired_`);
                    }
                }
                else if (msgContent.contactMessage) {
                    const cname = msgContent.contactMessage.displayName || 'Unknown';
                    await sendText(`${info}\n\n👤 *Contact deleted*\n📛 *Name:* ${cname}`);
                }
                else if (msgContent.locationMessage) {
                    const lat = msgContent.locationMessage.degreesLatitude;
                    const lng = msgContent.locationMessage.degreesLongitude;
                    await sendText(`${info}\n\n📍 *Location deleted*\n🌐 https://maps.google.com/?q=${lat},${lng}`);
                }
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
