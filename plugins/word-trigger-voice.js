// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   plugins/triggervoice.js — SHAVIYA-XMD V2
//
//   🎵 Word Trigger Voice Plugin — Always ON
//
//   ✅ Case 1: trigger word type කළොත්
//             → message delete → voice note send
//
//   ✅ Case 2: ඕනෑ message එකකට reply කරලා trigger word type කළොත්
//             → reply message delete → quoted message ලා voice note send
//
//   ✅ Delete FIRST (fast) → then download & send
//   ✅ Groups + DM දෙකෙහිම works
//   ✅ Data: ranumitha_data/triggervoice.json
//   ✅ ffmpeg නැහැ — opus direct (no audio errors)
//
//   triggervoice.json FORMAT:
//   {
//     "fah":   "https://github.com/.../fah.opus",
//     "hello": "https://github.com/.../hello.opus"
//   }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use strict';

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');
const { cmd } = require('../command');

// ── Data file ────────────────────────────────────────────────
const VOICE_FILE = path.join(__dirname, '../ranumitha_data/triggervoice.json');

function loadTriggers() {
    try {
        if (!fs.existsSync(VOICE_FILE)) return {};
        return JSON.parse(fs.readFileSync(VOICE_FILE, 'utf8'));
    } catch (_) { return {}; }
}

// ── Download opus buffer ─────────────────────────────────────
async function downloadOpus(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  on:body — every message check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cmd({ on: 'body', dontAddCommandList: true },
async (conn, mek, m, { from, body }) => {
    try {
        if (!body || !body.trim()) return;

        const bodyLower = body.trim().toLowerCase();
        const triggers  = loadTriggers();
        if (Object.keys(triggers).length === 0) return;

        // ── Word match ───────────────────────────────────────
        let matchedUrl = null;
        for (const word in triggers) {
            if (bodyLower === word.trim().toLowerCase()) {
                matchedUrl = triggers[word];
                break;
            }
        }
        if (!matchedUrl) return;

        // ── Check if this is a reply to another message ──────
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo
                         || mek.message?.imageMessage?.contextInfo
                         || mek.message?.videoMessage?.contextInfo
                         || null;

        const isReply      = !!(contextInfo?.stanzaId);
        const quotedMsgId  = contextInfo?.stanzaId;
        const quotedSender = contextInfo?.participant || contextInfo?.remoteJid || from;

        // ── STEP 1: Delete trigger message FIRST (fast) ──────
        try {
            await conn.sendMessage(from, { delete: mek.key });
        } catch (_) {}

        // ── STEP 2: Download opus ────────────────────────────
        const opusBuf = await downloadOpus(matchedUrl);

        // ── STEP 3: Send voice note ──────────────────────────
        await conn.sendPresenceUpdate('recording', from);

        if (isReply && quotedMsgId) {
            // Voice note → quoted message ලා reply ලෙස යනවා
            await conn.sendMessage(from, {
                audio:    opusBuf,
                mimetype: 'audio/ogg; codecs=opus',
                ptt:      true
            }, {
                quoted: {
                    key: {
                        remoteJid:   from,
                        id:          quotedMsgId,
                        participant: quotedSender,
                        fromMe:      false
                    },
                    message: {}
                }
            });
            console.log(`[TRIGGERVOICE] ✅ Reply-voice for: "${bodyLower}"`);
        } else {
            // Normal voice note
            await conn.sendMessage(from, {
                audio:    opusBuf,
                mimetype: 'audio/ogg; codecs=opus',
                ptt:      true
            });
            console.log(`[TRIGGERVOICE] ✅ Voice for: "${bodyLower}"`);
        }

    } catch (e) {
        console.log('[TRIGGERVOICE] Error:', e.message);
    }
});
