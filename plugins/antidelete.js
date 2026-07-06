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
//   ✅ NEW: Anti-ViewOnce — forwards view-once media to owner instantly
//           (controlled by the existing "autoViewOnce" setting, see
//           plugins/antidelete_toggle.js for antidelete itself and
//           plugins/settings.js -> .setting autovv on/off for this)
// ============================================

'use strict';

const fs   = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting } = require('../lib/settings');

// ── Temp media dir (for view-once forwarding) ─────────────
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    try { fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true }); } catch {}
}

function getFolderSizeInMB(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) totalSize += fs.statSync(filePath).size;
        }
        return totalSize / (1024 * 1024);
    } catch {
        return 0;
    }
}

function cleanTempFolderIfLarge() {
    try {
        if (getFolderSizeInMB(TEMP_MEDIA_DIR) > 200) {
            for (const file of fs.readdirSync(TEMP_MEDIA_DIR)) {
                try { fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file)); } catch {}
            }
        }
    } catch (err) {
        console.log('[ANTIDELETE temp cleanup]:', err.message);
    }
}
setInterval(cleanTempFolderIfLarge, 60_000);

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
//   Anti-ViewOnce — forward view-once media to owner instantly
//   Gated on the existing "autoViewOnce" setting
//   (toggle with: .setting autovv on   /   .setting autovv off)
// ══════════════════════════════════════════════════════════
async function handleViewOnce(conn, mek, sessionId, senderJid, senderNumber, pushName) {
    try {
        if (!getSetting('autoViewOnce', sessionId)) return;

        const vo =
            mek.message?.viewOnceMessageV2?.message ||
            mek.message?.viewOnceMessageV2Extension?.message ||
            mek.message?.viewOnceMessage?.message ||
            null;
        if (!vo) return;

        const mediaType = vo.imageMessage ? 'image' : (vo.videoMessage ? 'video' : null);
        if (!mediaType) return;

        const mediaMsg  = mediaType === 'image' ? vo.imageMessage : vo.videoMessage;
        const caption   = mediaMsg.caption || '';

        const buffer = await downloadMedia({ [`${mediaType}Message`]: mediaMsg });
        if (!buffer) return;

        const ownerJid = `${conn.user?.id?.split(':')[0]?.split('@')[0]}@s.whatsapp.net`;
        const mentionJid = senderNumber ? `${senderNumber}@s.whatsapp.net` : null;

        const time = new Date().toLocaleString('en-GB', {
            timeZone: 'Asia/Colombo',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });

        const info =
`🔓 *VIEW-ONCE MEDIA CAPTURED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Name:*      ${pushName}
📱 *Sender:*    ${senderNumber ? `@${senderNumber} (+${senderNumber})` : 'Unknown'}
🕐 *Time:*      ${time}
━━━━━━━━━━━━━━━━━━━━━${caption ? `\n💬 *Caption:* ${caption}` : ''}`;

        await conn.sendMessage(ownerJid, {
            [mediaType]: buffer,
            caption: info,
            mentions: mentionJid ? [mentionJid] : [],
        });

    } catch (e) {
        console.log('[ANTIDELETE viewOnce]:', e.message);
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

        // ── Anti-ViewOnce — fire-and-forget, never blocks caching ──
        if (!mek.key.fromMe) {
            handleViewOnce(conn, mek, sessionId, senderJid, senderNumber, pushName).catch(() => {});
        }

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
//   buildInfo — "ANTIDELETE REPORT" style header
//   Always shows Deleted By + Sender + Number (DM & group)
//   DeletedBy/Sender resolved via full LID resolution
// ══════════════════════════════════════════════════════════
async function buildInfo(conn, cached, update) {
    const { senderJid, senderNumber, pushName, chat, isGroup, fromMe } = cached;

    const senderMentionJid = senderNumber ? `${senderNumber}@s.whatsapp.net` : (senderJid || null);
    const senderNumDisplay = senderNumber || (senderJid ? senderJid.split('@')[0] : 'Unknown');

    const time = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric',
    });

    // ── Resolve deleter (works for both group & DM) ──────────
    // In a group, deleter comes from update.key.participant.
    // In a DM, the deleter is whoever's chat this is (the other party),
    // unless the bot/owner deleted it (handled by caller before calling this).
    const rawDeleterJid = isGroup
        ? (update?.key?.participant || '')
        : (update?.key?.participant || update?.key?.remoteJid || chat || '');

    const deleterJid = (rawDeleterJid && !rawDeleterJid.endsWith('@g.us'))
        ? resolveSenderJid(rawDeleterJid, conn)
        : '';
    const deleterNumber = extractNumber(deleterJid) || senderNumber;

    // ── Mentions: always include both deleter + sender ───────
    const mentions = [];
    const deleterMentionJid = deleterNumber ? `${deleterNumber}@s.whatsapp.net` : null;
    if (deleterMentionJid) mentions.push(deleterMentionJid);
    if (senderMentionJid && senderMentionJid !== deleterMentionJid) mentions.push(senderMentionJid);

    let groupLine = '';
    if (isGroup) {
        let groupName = '';
        try {
            const meta = await conn.groupMetadata(chat);
            groupName  = meta.subject;
        } catch {
            groupName = chat.split('@')[0];
        }
        groupLine = `*👥 Group:* ${groupName}\n`;
    }

    const text =
`*🔰 ANTIDELETE REPORT 🔰*

*🗑️ Deleted By:* @${deleterNumber || senderNumDisplay}
*👤 Sender:* @${senderNumDisplay}
*📱 Number:* +${senderNumDisplay}
*🕒 Time:* ${time}
${groupLine}`;

    return { text, mentions };
}

// ══════════════════════════════════════════════════════════
//   onDelete — detect revoke & forward to owner DM
// ══════════════════════════════════════════════════════════
async function onDelete(conn, updates, sessionId) {
    try {
        if (!getSetting('antidelete', sessionId)) return;

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
