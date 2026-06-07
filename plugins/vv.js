'use strict';

const { cmd }        = require("../command");
const { getSetting } = require("../lib/settings");

// ─────────────────────────────────────────────────────────────────
//  Auto View-Once Interceptor
//  • Runs BEFORE mek.message is unwrapped (called from index.js)
//  • Only fires when autoViewOnce setting is ON
//  • Sends media privately to sender (DM)
// ─────────────────────────────────────────────────────────────────

async function onMessage(conn, mek) {
    try {
        // Check setting (live from MongoDB)
        const enabled = getSetting('autoViewOnce');
        if (!enabled && enabled !== 'true') return;

        const msg = mek.message;
        if (!msg) return;

        // Detect view-once wrapper (all 3 variants)
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

        // Get inner media type
        const mediaType = inner.imageMessage
            ? 'imageMessage'
            : inner.videoMessage
            ? 'videoMessage'
            : inner.audioMessage
            ? 'audioMessage'
            : null;

        if (!mediaType) return;

        // Build a fake mek pointing at the inner message
        const fakeMek = {
            key:     mek.key,
            message: inner,
        };

        const buffer = await conn.downloadMediaMessage(fakeMek);
        if (!buffer || !buffer.length) return;

        // Resolve sender (LID-safe)
        const isGroup  = mek.key.remoteJid?.endsWith('@g.us');
        const sender   = mek.key.fromMe
            ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
            : isGroup
                ? (mek.key.participant || mek.participant || mek.key.remoteJid)
                : mek.key.remoteJid;

        // Normalise sender — strip @lid / @s.whatsapp.net variants
        const senderJid = sender?.includes('@')
            ? (sender.endsWith('@s.whatsapp.net') ? sender : sender.split('@')[0] + '@s.whatsapp.net')
            : sender + '@s.whatsapp.net';

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(senderJid, {
                image:   buffer,
                caption: inner.imageMessage?.caption || '🔓 *View Once Image*\n> _SHAVIYA-XMD V2_',
            });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(senderJid, {
                video:   buffer,
                caption: inner.videoMessage?.caption || '🔓 *View Once Video*\n> _SHAVIYA-XMD V2_',
            });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(senderJid, {
                audio:    buffer,
                mimetype: 'audio/mpeg',
                ptt:      inner.audioMessage?.ptt || false,
            });
        }

    } catch (err) {
        // Silent fail — don't break message pipeline
        if (process.env.DEBUG_VV) console.error('[VV AUTO]', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────
//  Manual Command — no prefix needed (.vv / vv both work)
//  Reply to a view-once message to retrieve it privately
// ─────────────────────────────────────────────────────────────────

cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'retrieve'],
    desc:     'Retrieve a view once message (reply to it)',
    category: 'tools',
    noPrefix: true,       // prefix නැතිව හෝ prefix සහිතව දෙකම work කරයි
    filename: __filename,
}, async (conn, mek, m, { reply }) => {
    try {
        if (!m.quoted) return reply('🍁 *View-once message එකට reply කරන්න!*');

        const qMsg = m.quoted;

        // Support quoted view-once still wrapped
        let inner     = qMsg.msg;
        let mediaType = qMsg.type;

        // If quoted type is still a vv wrapper, unwrap
        const vvWraps = ['viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension'];
        if (vvWraps.includes(mediaType)) {
            inner     = qMsg.msg?.message || qMsg.msg;
            const innerKey = Object.keys(inner || {})[0];
            mediaType = innerKey || mediaType;
        }

        const buffer = await m.quoted.download();
        if (!buffer || !buffer.length) return reply('❌ Media download failed!');

        // Send to sender's DM
        const target = m.sender;

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(target, {
                image:   buffer,
                caption: inner?.imageMessage?.caption || inner?.caption || '🔓 View Once Image',
            });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(target, {
                video:   buffer,
                caption: inner?.videoMessage?.caption || inner?.caption || '🔓 View Once Video',
            });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(target, {
                audio:    buffer,
                mimetype: 'audio/mpeg',
                ptt:      false,
            });
        } else {
            return reply(`❌ Unsupported type: \`${mediaType}\``);
        }

        await conn.sendMessage(m.from, {
            react: { text: '🔓', key: mek.key },
        });

    } catch (err) {
        console.error('[VV CMD]', err);
        reply('❌ Failed to retrieve message.');
    }
});

// Export for index.js auto-interceptor
module.exports = { onMessage };
