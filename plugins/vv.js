'use strict';

const { cmd }                  = require("../command");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ─────────────────────────────────────────────────────────────────
//  Resolve sender JID (LID-safe → always @s.whatsapp.net)
// ─────────────────────────────────────────────────────────────────
function resolveSender(conn, mek) {
    const isGroup = mek.key.remoteJid?.endsWith('@g.us');
    let sender = mek.key.fromMe
        ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
        : isGroup
            ? (mek.key.participant || mek.participant || mek.key.remoteJid)
            : mek.key.remoteJid;
    if (sender && !sender.endsWith('@s.whatsapp.net')) {
        sender = sender.split('@')[0] + '@s.whatsapp.net';
    }
    return sender;
}

// ─────────────────────────────────────────────────────────────────
//  Send media silently to inbox — NO react, NO group reply
// ─────────────────────────────────────────────────────────────────
async function sendToInbox(conn, senderJid, buffer, mediaType, innerMsg) {
    if (mediaType === 'imageMessage') {
        await conn.sendMessage(senderJid, {
            image:   buffer,
            caption: innerMsg?.imageMessage?.caption || '',
        });
    } else if (mediaType === 'videoMessage') {
        await conn.sendMessage(senderJid, {
            video:   buffer,
            caption: innerMsg?.videoMessage?.caption || '',
        });
    } else if (mediaType === 'audioMessage') {
        await conn.sendMessage(senderJid, {
            audio:    buffer,
            mimetype: 'audio/mpeg',
            ptt:      innerMsg?.audioMessage?.ptt || false,
        });
    }
}

// ─────────────────────────────────────────────────────────────────
//  Extract inner message + mediaType from a raw message object
// ─────────────────────────────────────────────────────────────────
function extractVV(msgObj) {
    if (!msgObj) return null;
    const vvKey = msgObj.viewOnceMessage
        ? 'viewOnceMessage'
        : msgObj.viewOnceMessageV2
        ? 'viewOnceMessageV2'
        : msgObj.viewOnceMessageV2Extension
        ? 'viewOnceMessageV2Extension'
        : null;

    const inner = vvKey ? msgObj[vvKey]?.message : msgObj;
    if (!inner) return null;

    const mediaType = inner.imageMessage ? 'imageMessage'
                    : inner.videoMessage ? 'videoMessage'
                    : inner.audioMessage ? 'audioMessage'
                    : null;

    return mediaType ? { inner, mediaType } : null;
}

// ─────────────────────────────────────────────────────────────────
//  Auto Interceptor  —  fired from index.js BEFORE mek.message unwrap
//  Works for BOTH group and DM view-once messages
//  100% silent — no react, no reply, no group message
// ─────────────────────────────────────────────────────────────────
async function onMessage(conn, mek) {
    try {
        const enabled = require('../lib/settings').getSetting('autoViewOnce');
        if (!enabled && enabled !== 'true') return;

        const msg = mek.message;
        if (!msg) return;

        const result = extractVV(msg);
        if (!result) return;

        const { inner, mediaType } = result;

        const fakeMek = { key: mek.key, message: inner };
        const buffer  = await downloadMediaMessage(fakeMek, 'buffer', {}).catch(() => null);
        if (!buffer?.length) return;

        // Send to bot's own inbox (owner's number)
        const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        // Silent send to bot's inbox only
        await sendToInbox(conn, botJid, buffer, mediaType, inner);

    } catch (_) {
        // total silence — no log, no crash
    }
}

// ─────────────────────────────────────────────────────────────────
//  Manual Command
//  • noPrefix: true  →  "vv" හෝ ".vv" දෙකම work කරයි
//  • Group ල use කළොත්: group ල කිසිම reply/react නෑ → inbox ලට only
//  • DM ල use කළොත්: DM ල reply නෑ → inbox ලට only
// ─────────────────────────────────────────────────────────────────
cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'retrieve'],
    desc:     'Retrieve a view once message silently',
    category: 'tools',
    noPrefix: true,
    filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
    try {
        if (!m.quoted) return; // silent — no reply

        // Extract from contextInfo quotedMessage
        const ctxQuoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage
                       || mek.message?.imageMessage?.contextInfo?.quotedMessage
                       || mek.message?.videoMessage?.contextInfo?.quotedMessage
                       || null;

        const result = ctxQuoted ? extractVV(ctxQuoted) : null;

        // Fallback: try m.quoted.type
        let mediaType = result?.mediaType;
        let innerMsg  = result?.inner;

        if (!mediaType) {
            const qt = (m.quoted.type || '').replace('Message','').toLowerCase();
            mediaType = qt === 'image' ? 'imageMessage'
                      : qt === 'video' ? 'videoMessage'
                      : qt === 'audio' ? 'audioMessage'
                      : null;
        }

        if (!mediaType) return; // silent — unsupported type, no reply

        // Build fake mek for download
        const stanzaId    = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = mek.message?.extendedTextMessage?.contextInfo?.participant;
        const fakeKey     = {
            remoteJid:   from,
            id:          stanzaId || m.quoted.id,
            participant: participant || undefined,
            fromMe:      false,
        };
        const fakeMek = { key: fakeKey, message: innerMsg || {} };

        let buffer = await downloadMediaMessage(fakeMek, 'buffer', {}).catch(() => null);
        if (!buffer?.length) {
            buffer = await m.quoted.download().catch(() => null);
        }
        if (!buffer?.length) return; // silent fail

        // Send to bot's own inbox
        const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        await sendToInbox(conn, botJid, buffer, mediaType, innerMsg);

        // NO react, NO reply to group/chat — completely undetectable

    } catch (_) {
        // total silence
    }
});

module.exports = { onMessage };
