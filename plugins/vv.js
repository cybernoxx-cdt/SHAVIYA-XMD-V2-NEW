'use strict';

const { cmd }              = require("../command");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ─────────────────────────────────────────────────────────────────
//  Auto View-Once Interceptor  (called from index.js BEFORE unwrap)
// ─────────────────────────────────────────────────────────────────
async function onMessage(conn, mek) {
    try {
        const enabled = require('../lib/settings').getSetting('autoViewOnce');
        if (!enabled && enabled !== 'true') return;

        const msg = mek.message;
        if (!msg) return;

        const vvType = msg.viewOnceMessage
            ? 'viewOnceMessage'
            : msg.viewOnceMessageV2
            ? 'viewOnceMessageV2'
            : msg.viewOnceMessageV2Extension
            ? 'viewOnceMessageV2Extension'
            : null;
        if (!vvType) return;

        const inner = msg[vvType]?.message;
        if (!inner) return;

        const mediaType = inner.imageMessage
            ? 'imageMessage'
            : inner.videoMessage
            ? 'videoMessage'
            : inner.audioMessage
            ? 'audioMessage'
            : null;
        if (!mediaType) return;

        // Build fake mek with inner message for download
        const fakeMek = { key: mek.key, message: inner };
        const buffer  = await downloadMediaMessage(fakeMek, 'buffer', {});
        if (!buffer?.length) return;

        // LID-safe sender
        const isGroup = mek.key.remoteJid?.endsWith('@g.us');
        let sender = mek.key.fromMe
            ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
            : isGroup
                ? (mek.key.participant || mek.participant || mek.key.remoteJid)
                : mek.key.remoteJid;

        // Normalise to @s.whatsapp.net
        if (sender && !sender.endsWith('@s.whatsapp.net')) {
            sender = sender.split('@')[0] + '@s.whatsapp.net';
        }

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(sender, {
                image:   buffer,
                caption: inner.imageMessage?.caption || '🔓 *View Once Image*\n> _SHAVIYA-XMD V2_',
            });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(sender, {
                video:   buffer,
                caption: inner.videoMessage?.caption || '🔓 *View Once Video*\n> _SHAVIYA-XMD V2_',
            });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(sender, {
                audio:    buffer,
                mimetype: 'audio/mpeg',
                ptt:      inner.audioMessage?.ptt || false,
            });
        }

    } catch (err) {
        console.error('[VV AUTO]', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────
//  Manual Command  —  prefix නැතිව "vv" type කළත් work කරයි
// ─────────────────────────────────────────────────────────────────
cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'retrieve'],
    desc:     'Retrieve a view once message (reply to it)',
    category: 'tools',
    noPrefix: true,
    filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
    try {
        if (!m.quoted) return reply('🍁 *View-once message එකට reply කරන්න!*');

        // Detect the raw quoted message type
        const rawQuoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage
                       || mek.message?.imageMessage?.contextInfo?.quotedMessage
                       || null;

        // Find view-once wrapper in quoted
        let innerMsg  = null;
        let mediaType = null;

        if (rawQuoted) {
            const vvKey = rawQuoted.viewOnceMessage
                ? 'viewOnceMessage'
                : rawQuoted.viewOnceMessageV2
                ? 'viewOnceMessageV2'
                : rawQuoted.viewOnceMessageV2Extension
                ? 'viewOnceMessageV2Extension'
                : null;

            if (vvKey) {
                innerMsg = rawQuoted[vvKey]?.message;
            } else {
                innerMsg = rawQuoted;
            }

            if (innerMsg) {
                mediaType = innerMsg.imageMessage
                    ? 'imageMessage'
                    : innerMsg.videoMessage
                    ? 'videoMessage'
                    : innerMsg.audioMessage
                    ? 'audioMessage'
                    : null;
            }
        }

        // Fallback: use m.quoted helpers
        if (!mediaType) {
            const qt = m.quoted.type || '';
            mediaType = qt === 'imageMessage' || qt === 'image' ? 'imageMessage'
                      : qt === 'videoMessage' || qt === 'video' ? 'videoMessage'
                      : qt === 'audioMessage' || qt === 'audio' ? 'audioMessage'
                      : null;
        }

        if (!mediaType) return reply('❌ View-once image/video/audio message එකට reply කරන්න!');

        // Build quoted key for download
        const stanzaId   = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant= mek.message?.extendedTextMessage?.contextInfo?.participant;
        const quotedKey  = {
            remoteJid: from,
            id:        stanzaId || m.quoted.id,
            participant: participant || undefined,
            fromMe:    false,
        };

        const fakeQuotedMek = {
            key:     quotedKey,
            message: innerMsg || {},
        };

        let buffer;
        try {
            buffer = await downloadMediaMessage(fakeQuotedMek, 'buffer', {});
        } catch {
            // Final fallback — try m.quoted.download()
            buffer = await m.quoted.download().catch(() => null);
        }

        if (!buffer?.length) return reply('❌ Media download failed! View-once message expire වෙලා ඇති.');

        const target = m.sender;

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(target, {
                image:   buffer,
                caption: innerMsg?.imageMessage?.caption || '🔓 *View Once Image*\n> _SHAVIYA-XMD V2_',
            });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(target, {
                video:   buffer,
                caption: innerMsg?.videoMessage?.caption || '🔓 *View Once Video*\n> _SHAVIYA-XMD V2_',
            });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(target, {
                audio:    buffer,
                mimetype: 'audio/mpeg',
                ptt:      false,
            });
        }

        await conn.sendMessage(from, { react: { text: '🔓', key: mek.key } }).catch(() => {});

    } catch (err) {
        console.error('[VV CMD]', err);
        reply('❌ Failed to retrieve message.');
    }
});

module.exports = { onMessage };
