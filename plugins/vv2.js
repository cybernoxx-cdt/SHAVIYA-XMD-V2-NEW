// ============================================================
//  vv2.js — SHAVIYA-XMD V2
//  View-Once Message Retriever
//  FIXED: uses correct sender from destructured params
//        + proper mtype detection for view-once messages
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');

cmd({
    pattern:  'vv2',
    alias:    ['wah', 'ohh', 'oho', 'nice', 'ok'],
    desc:     'Retrieve view-once message back to user',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { from, sender, isOwner, reply }) => {
    try {
        // ✅ vv2 only for owner (silent for others)
        if (!isOwner) return;

        if (!mek.quoted) {
            return await conn.sendMessage(from, {
                text: '*🍁 Please reply to a view once message!*'
            }, { quoted: mek });
        }

        // ✅ FIX: view-once messages have viewOnceMessage wrapper
        // mtype could be 'imageMessage', 'videoMessage', or wrapped in viewOnce
        const quotedMsg  = mek.quoted;
        const mtype      = quotedMsg.mtype || quotedMsg.type || '';

        // Detect actual media type (unwrap view-once if needed)
        let mediaType = mtype;
        if (mtype === 'viewOnceMessage' || mtype === 'viewOnceMessageV2') {
            const inner = quotedMsg.message?.viewOnceMessage?.message ||
                          quotedMsg.message?.viewOnceMessageV2?.message || {};
            mediaType = Object.keys(inner)[0] || mtype;
        }

        if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType)) {
            return await conn.sendMessage(from, {
                text: '❌ *Only image, video, and audio messages are supported.*'
            }, { quoted: mek });
        }

        // ✅ FIX: download the view-once media
        let buffer;
        try {
            buffer = await quotedMsg.download();
        } catch (dlErr) {
            return await conn.sendMessage(from, {
                text: `❌ *Failed to download media:* ${dlErr.message}`
            }, { quoted: mek });
        }

        if (!buffer || buffer.length === 0) {
            return await conn.sendMessage(from, {
                text: '❌ *Could not retrieve media. It may have expired.*'
            }, { quoted: mek });
        }

        // ✅ FIX: send to sender's DM using correct sender from params
        let messageContent = {};

        if (mediaType === 'imageMessage') {
            messageContent = {
                image:    buffer,
                caption:  quotedMsg.text || quotedMsg.caption || '🖼️ *View Once Image*',
                mimetype: quotedMsg.mimetype || 'image/jpeg'
            };
        } else if (mediaType === 'videoMessage') {
            messageContent = {
                video:    buffer,
                caption:  quotedMsg.text || quotedMsg.caption || '🎥 *View Once Video*',
                mimetype: quotedMsg.mimetype || 'video/mp4'
            };
        } else if (mediaType === 'audioMessage') {
            messageContent = {
                audio:    buffer,
                mimetype: 'audio/mp4',
                ptt:      quotedMsg.ptt || false
            };
        }

        // Send to owner DM
        await conn.sendMessage(sender, messageContent, { quoted: mek });

        // React success
        try { await conn.sendMessage(from, { react: { text: '', key: mek.key } }); } catch {}

    } catch (error) {
        console.error('[VV2 ERROR]', error.message);
        try {
            await conn.sendMessage(from, {
                text: `❌ *Error fetching message:* ${error.message}`
            }, { quoted: mek });
        } catch {}
    }
});
