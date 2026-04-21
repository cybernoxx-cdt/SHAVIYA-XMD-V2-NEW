// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   plugins/word-trigger-voice.js — SHAVIYA-XMD V2
//   🎵 Word Trigger Voice Plugin — Always ON
//   ✅ GitHub raw .opus → proper arraybuffer download + magic byte validation
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

// ── Convert GitHub blob URL → raw.githubusercontent.com ──────
function toDirectUrl(url) {
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url
            .replace('github.com', 'raw.githubusercontent.com')
            .replace('/blob/', '/');
    }
    return url;
}

// ── Download opus buffer with validation ─────────────────────
async function downloadOpus(url) {
    const directUrl = toDirectUrl(url);

    const res = await axios.get(directUrl, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*',
            'Cache-Control': 'no-cache'
        }
    });

    const buf = Buffer.from(res.data);

    if (buf.length < 100) {
        throw new Error(`Downloaded file too small (${buf.length} bytes) — not valid opus`);
    }

    // Check OGG magic bytes: "OggS"
    const magic = buf.slice(0, 4).toString('ascii');
    if (magic !== 'OggS') {
        console.warn(`[TRIGGERVOICE] ⚠️ Magic bytes: "${magic}" — may not be valid OGG. Sending anyway.`);
    }

    return buf;
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

        // ── Check if this is a reply ─────────────────────────
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo
                         || mek.message?.imageMessage?.contextInfo
                         || mek.message?.videoMessage?.contextInfo
                         || null;

        const isReply      = !!(contextInfo?.stanzaId);
        const quotedMsgId  = contextInfo?.stanzaId;
        const quotedSender = contextInfo?.participant || contextInfo?.remoteJid || from;

        // ── STEP 1: Delete trigger message ───────────────────
        try {
            await conn.sendMessage(from, { delete: mek.key });
        } catch (_) {}

        // ── STEP 2: Download opus ────────────────────────────
        let opusBuf;
        try {
            opusBuf = await downloadOpus(matchedUrl);
            console.log(`[TRIGGERVOICE] ✅ Downloaded ${(opusBuf.length / 1024).toFixed(1)}KB for: "${bodyLower}"`);
        } catch (dlErr) {
            console.error(`[TRIGGERVOICE] ❌ Download failed for "${bodyLower}":`, dlErr.message);
            return;
        }

        // ── STEP 3: Send voice note ──────────────────────────
        await conn.sendPresenceUpdate('recording', from);

        const audioPayload = {
            audio:    opusBuf,
            mimetype: 'audio/ogg; codecs=opus',
            ptt:      true
        };

        if (isReply && quotedMsgId) {
            await conn.sendMessage(from, audioPayload, {
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
            console.log(`[TRIGGERVOICE] ✅ Reply-voice sent for: "${bodyLower}"`);
        } else {
            await conn.sendMessage(from, audioPayload);
            console.log(`[TRIGGERVOICE] ✅ Voice sent for: "${bodyLower}"`);
        }

    } catch (e) {
        console.log('[TRIGGERVOICE] Error:', e.message);
    }
});
