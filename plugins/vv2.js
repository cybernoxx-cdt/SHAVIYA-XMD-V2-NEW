// ============================================================
//  vv2.js — SHAVIYA-XMD V2
//  View-Once Message Retriever (Owner Only)
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');

cmd({
    pattern:  'vv2',
    alias:    ['wah', 'ohh', 'oho', 'nice', 'ok'],
    desc:     'Retrieve view-once message back to user (Owner Only)',
    category: 'owner',
    filename: __filename
},
async (conn, mek, m, { from, isCreator }) => {
    try {
        if (!isCreator) return; // Silent — no response for non-owner

        if (!m.quoted) {
            return await conn.sendMessage(from, {
                text: '*🍁 Please reply to a view once message!*'
            }, { quoted: mek });
        }

        const buffer = await m.quoted.download();
        const mtype  = m.quoted.mtype;

        let messageContent = {};

        switch (mtype) {
            case 'imageMessage':
                messageContent = {
                    image:    buffer,
                    caption:  m.quoted.text || '',
                    mimetype: m.quoted.mimetype || 'image/jpeg'
                };
                break;

            case 'videoMessage':
                messageContent = {
                    video:    buffer,
                    caption:  m.quoted.text || '',
                    mimetype: m.quoted.mimetype || 'video/mp4'
                };
                break;

            case 'audioMessage':
                messageContent = {
                    audio:    buffer,
                    mimetype: 'audio/mp4',
                    ptt:      m.quoted.ptt || false
                };
                break;

            default:
                return await conn.sendMessage(from, {
                    text: '❌ *Only image, video, and audio messages are supported.*'
                }, { quoted: mek });
        }

        // Forward to sender's DM
        await conn.sendMessage(mek.sender, messageContent, { quoted: mek });

    } catch (error) {
        console.error('[VV2 ERROR]', error.message);
        await conn.sendMessage(from, {
            text: '❌ *Error fetching message:*\n' + error.message
        }, { quoted: mek });
    }
});
