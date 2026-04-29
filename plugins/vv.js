// ============================================================
//  vv.js — SHAVIYA-XMD V2
//  View Once Auto Retriever — No Prefix, No React, Non-Detect
//  © Mr Savendra
// ============================================================

const { cmd }            = require('../command');
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

// ── Extract view once from any message wrapper ──
function extractViewOnce(message) {
    if (!message) return null;

    // All known viewOnce wrappers
    const wrappers = [
        'viewOnceMessage',
        'viewOnceMessageV2',
        'viewOnceMessageV2Extension'
    ];

    for (const w of wrappers) {
        if (message[w]?.message) {
            const inner = message[w].message;
            const type  = getContentType(inner);
            if (type) return { inner, type };
        }
    }
    return null;
}

// ── Send the retrieved media ──
async function sendViewOnce(conn, dest, inner, type) {
    const CTX = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '@newsletter',
            newsletterName: '© Mr Savendra · SHAVIYA-XMD V2',
            serverMessageId: 143
        }
    };

    if (type === 'imageMessage') {
        await conn.sendMessage(dest, {
            image:   { url: inner.imageMessage.url },
            caption: inner.imageMessage.caption || '',
            mimetype: inner.imageMessage.mimetype || 'image/jpeg',
            contextInfo: CTX
        }, { quoted: FakeVCard });
        return true;
    }

    if (type === 'videoMessage') {
        await conn.sendMessage(dest, {
            video:   { url: inner.videoMessage.url },
            caption: inner.videoMessage.caption || '',
            mimetype: inner.videoMessage.mimetype || 'video/mp4',
            contextInfo: CTX
        }, { quoted: FakeVCard });
        return true;
    }

    if (type === 'audioMessage') {
        await conn.sendMessage(dest, {
            audio:    { url: inner.audioMessage.url },
            mimetype: inner.audioMessage.mimetype || 'audio/mpeg',
            ptt:      false,
            contextInfo: CTX
        }, { quoted: FakeVCard });
        return true;
    }

    return false;
}

// ══════════════════════════════════════════════════════════════
//  AUTO LISTENER — on:body, no prefix, no react
//  Every incoming message check karala view once nam auto save
// ══════════════════════════════════════════════════════════════
cmd({
    on:       'body',
    desc:     'Auto view once retriever — no prefix',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { from, sender }) => {
    try {
        if (!mek?.message) return;

        // Unwrap ephemeral if needed
        let msg = mek.message;
        const msgType = getContentType(msg);
        if (msgType === 'ephemeralMessage') {
            msg = msg.ephemeralMessage?.message || msg;
        }

        // Check if this is a view once message
        const vo = extractViewOnce(msg);
        if (!vo) return; // not view once — silently ignore

        // Destination: group → sender DM, private → same chat
        const dest = from.endsWith('@g.us') ? sender : from;

        // Small delay — non-detect
        await new Promise(r => setTimeout(r, 1000));

        await sendViewOnce(conn, dest, vo.inner, vo.type);

    } catch (e) {
        if (!e.message?.includes('Bad MAC') && !e.message?.includes('decrypt')) {
            console.error('[VV AUTO]', e.message);
        }
    }
});

// ══════════════════════════════════════════════════════════════
//  MANUAL CMD — .vv / .wtf / .viewonce (reply to view once)
//  No react — silent send
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'vv',
    alias:    ['wtf', 'viewonce', 'retrieve'],
    desc:     'Retrieve view once message (reply)',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // Get quoted message
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply('📌 Reply to a view once message!');

        const vo = extractViewOnce(quoted);
        if (!vo) return reply('❌ This is not a view once message!');

        // Silently send to user DM (non-detect — not in group chat)
        const dest = from.endsWith('@g.us') ? sender : from;

        await sendViewOnce(conn, dest, vo.inner, vo.type);

    } catch (e) {
        console.error('[VV CMD]', e.message);
        reply('❌ Failed: ' + e.message);
    }
});
