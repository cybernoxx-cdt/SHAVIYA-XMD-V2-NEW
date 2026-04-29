// ============================================================
//  vv.js — SHAVIYA-XMD V2
//  View Once Auto Retriever — No Prefix, Non-Detect
//  © Mr Savendra
// ============================================================

const { cmd }        = require('../command');
const { getContentType } = require('@whiskeysockets/baileys');

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra · SHAVIYA-XMD V2',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

// ── Helper: viewOnce message eka extract karanna ──
function extractViewOnce(message) {
    if (!message) return null;

    // Direct viewOnce
    if (message.viewOnceMessage?.message) {
        const inner = message.viewOnceMessage.message;
        const type  = getContentType(inner);
        return { message: inner, type };
    }

    // viewOnceMessageV2
    if (message.viewOnceMessageV2?.message) {
        const inner = message.viewOnceMessageV2.message;
        const type  = getContentType(inner);
        return { message: inner, type };
    }

    // viewOnceMessageV2Extension
    if (message.viewOnceMessageV2Extension?.message) {
        const inner = message.viewOnceMessageV2Extension.message;
        const type  = getContentType(inner);
        return { message: inner, type };
    }

    return null;
}

// ══════════════════════════════════════════════════════════════
//  .vv — Manual: reply to any view once msg
//  alias: viewonce, retrieve, wtf
//  Prefix needed only for this manual trigger
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'retrieve', 'wtf'],
    desc:     'Retrieve view once message',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // React
        await conn.sendMessage(from, {
            react: { text: '👁️', key: mek.key }
        });

        if (!mek.message) return reply('❌ Reply to a view once message!');

        // Check quoted message
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply('📌 *Reply to a view once message!*');

        const vo = extractViewOnce(quoted);
        if (!vo) return reply('❌ This is not a view once message!');

        await sendViewOnce(conn, sender, vo, FakeVCard);

    } catch (e) {
        console.error('[VV CMD ERROR]', e.message);
        reply('❌ Failed: ' + e.message);
    }
});

// ══════════════════════════════════════════════════════════════
//  AUTO LISTENER — No prefix needed
//  Any view once message received → auto save to sender DM
// ══════════════════════════════════════════════════════════════
cmd({
    on: 'body',
    pattern: /^$/,     // never matches as command — only fires on:body
    desc:    'Auto view once retriever',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { from, sender }) => {
    try {
        if (!mek?.message) return;

        const msgType = getContentType(mek.message);

        // ephemeral unwrap
        let msg = mek.message;
        if (msgType === 'ephemeralMessage') {
            msg = mek.message.ephemeralMessage?.message || msg;
        }

        const vo = extractViewOnce(msg);
        if (!vo) return; // not a view once — ignore silently

        // Non-detect: send quietly to the person who sent it (or receiver DM)
        // Send to the person who received it (from JID if private, or sender DM if group)
        const dest = from.endsWith('@g.us')
            ? sender                          // group: send to sender's DM
            : from;                           // private: send to same chat

        // Small delay — non-detect
        await new Promise(r => setTimeout(r, 800));

        await sendViewOnce(conn, dest, vo, FakeVCard);

    } catch (e) {
        // Silent fail — never crash bot
        if (!e.message?.includes('Bad MAC')) {
            console.error('[VV AUTO ERROR]', e.message);
        }
    }
});

// ══════════════════════════════════════════════════════════════
//  SEND HELPER
// ══════════════════════════════════════════════════════════════
async function sendViewOnce(conn, dest, vo, quoted) {
    const { message, type } = vo;

    // ── Image ──
    if (type === 'imageMessage') {
        const img = message.imageMessage;
        await conn.sendMessage(dest, {
            image:   { url: img.url },
            caption: img.caption || '👁️ *View Once — SHAVIYA-XMD V2*',
            mimetype: img.mimetype || 'image/jpeg',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '© Mr Savendra · SHAVIYA-XMD V2',
                    serverMessageId: 143
                }
            }
        }, { quoted });
        return;
    }

    // ── Video ──
    if (type === 'videoMessage') {
        const vid = message.videoMessage;
        await conn.sendMessage(dest, {
            video:   { url: vid.url },
            caption: vid.caption || '👁️ *View Once — SHAVIYA-XMD V2*',
            mimetype: vid.mimetype || 'video/mp4',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '© Mr Savendra · SHAVIYA-XMD V2',
                    serverMessageId: 143
                }
            }
        }, { quoted });
        return;
    }

    // ── Audio ──
    if (type === 'audioMessage') {
        const aud = message.audioMessage;
        await conn.sendMessage(dest, {
            audio:    { url: aud.url },
            mimetype: aud.mimetype || 'audio/mpeg',
            ptt:      false
        }, { quoted });
        return;
    }

    // Unknown type
    console.log('[VV] Unknown view once type:', type);
}
