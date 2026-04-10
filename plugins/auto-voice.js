// plugins/auto-voice.js — Auto Voice + Auto Sticker + Auto Reply
// ✅ iOS + Android compatible PTT via ffmpeg-static (no system ffmpeg needed)

'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const axios = require('axios');
const fluent = require('fluent-ffmpeg');
const { cmd } = require('../command');
const { getSetting, setSetting, getConfig } = require('../lib/settings');

// ── Resolve ffmpeg (ffmpeg-static preferred) ──────────────
let ffmpegPath = null;
try {
    const staticBin = require('ffmpeg-static');
    if (staticBin && fs.existsSync(staticBin)) {
        try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
        ffmpegPath = staticBin;
    }
} catch (_) {}

if (!ffmpegPath) {
    const { execSync } = require('child_process');
    try {
        const s = execSync('which ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
        if (s) ffmpegPath = s;
    } catch (_) {}
}

if (ffmpegPath) fluent.setFfmpegPath(ffmpegPath);

// ── JSON data files ───────────────────────────────────────
const VOICE_FILE   = path.join(__dirname, '../ranumitha_data/autovoice.json');
const STICKER_FILE = path.join(__dirname, '../ranumitha_data/autosticker.json');
const REPLY_FILE   = path.join(__dirname, '../ranumitha_data/autoreply.json');

function loadJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) { return {}; }
}

// ── Download audio buffer ─────────────────────────────────
async function downloadAudio(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer', timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
}

// ── Convert any audio → OGG Opus PTT (iOS fix) ───────────
function convertToOpusPTT(inputBuffer) {
    return new Promise((resolve, reject) => {
        if (!ffmpegPath) return reject(new Error('ffmpeg not available'));
        const tmpIn  = path.join(os.tmpdir(), `av_in_${Date.now()}.tmp`);
        const tmpOut = path.join(os.tmpdir(), `av_out_${Date.now()}.ogg`);
        fs.writeFileSync(tmpIn, inputBuffer);
        fluent(tmpIn)
            .audioCodec('libopus')
            .audioChannels(1)
            .audioFrequency(48000)
            .audioBitrate('64k')
            .format('ogg')
            .on('end', () => {
                try {
                    const buf = fs.readFileSync(tmpOut);
                    try { fs.unlinkSync(tmpIn); } catch (_) {}
                    try { fs.unlinkSync(tmpOut); } catch (_) {}
                    resolve(buf);
                } catch (e) { reject(e); }
            })
            .on('error', (e) => {
                try { fs.unlinkSync(tmpIn); } catch (_) {}
                try { fs.unlinkSync(tmpOut); } catch (_) {}
                reject(e);
            })
            .save(tmpOut);
    });
}

// ── Send voice note ───────────────────────────────────────
async function sendVoiceNote(conn, from, mek, audioUrl) {
    try {
        const rawBuf  = await downloadAudio(audioUrl);
        const opusBuf = await convertToOpusPTT(rawBuf);
        await conn.sendPresenceUpdate('recording', from);
        await conn.sendMessage(from, {
            audio: opusBuf,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: mek });
        return true;
    } catch (e) {
        console.log('[AUTO-VOICE] Opus convert failed, trying URL fallback:', e.message);
        try {
            const isOpus = audioUrl.toLowerCase().includes('.opus');
            await conn.sendPresenceUpdate('recording', from);
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: isOpus ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
                ptt: true
            }, { quoted: mek });
            return true;
        } catch (e2) {
            console.log('[AUTO-VOICE] Fallback also failed:', e2.message);
            return false;
        }
    }
}

// ══════════════════════════════════════════════════════════
//  .autovoice on/off
// ══════════════════════════════════════════════════════════
cmd({
    pattern:  'autovoice',
    alias:    ['autovc', 'auto-voice'],
    desc:     'Auto Voice + Sticker + Reply toggle',
    category: 'owner',
    react:    '🔊',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('autoVoice') ?? false;
        return reply(`🔊 *Auto Voice Status*\n\n📌 *Current:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage:\n• *.autovoice on*  → Enable\n• *.autovoice off* → Disable\n\n> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟐 ⚡`);
    }
    const newVal = sub === 'on';
    setSetting('autoVoice', newVal);
    return reply(`${newVal ? '✅' : '❌'} *Auto Voice ${sub.toUpperCase()}!*\n\n_Saved instantly — no restart needed_ ✅\n\n> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟐 ⚡`);
});

// ══════════════════════════════════════════════════════════
//  on:body — auto voice / sticker / reply handler
// ══════════════════════════════════════════════════════════
cmd({ on: 'body', dontAddCommandList: true },
async (conn, mek, m, { from, body, isOwner }) => {
    try {
        const enabled = getSetting('autoVoice') ?? getConfig('AUTO_VOICE') ?? false;
        if (!enabled) return;
        if (isOwner) return;
        if (!body || !body.trim()) return;
        const bodyLower = body.trim().toLowerCase();

        // 1. Auto Voice
        try {
            const voiceData = loadJson(VOICE_FILE);
            for (const text in voiceData) {
                if (bodyLower === text.trim().toLowerCase()) {
                    await sendVoiceNote(conn, from, mek, voiceData[text]);
                    break;
                }
            }
        } catch (e) { console.log('[AUTO-VOICE]:', e.message); }

        // 2. Auto Sticker
        try {
            const stickerData = loadJson(STICKER_FILE);
            for (const text in stickerData) {
                if (bodyLower === text.trim().toLowerCase()) {
                    await conn.sendMessage(from, { sticker: { url: stickerData[text] } }, { quoted: mek });
                    break;
                }
            }
        } catch (e) { console.log('[AUTO-STICKER]:', e.message); }

        // 3. Auto Reply
        try {
            const replyData = loadJson(REPLY_FILE);
            for (const text in replyData) {
                if (bodyLower === text.trim().toLowerCase()) {
                    await m.reply(replyData[text]);
                    break;
                }
            }
        } catch (e) { console.log('[AUTO-REPLY]:', e.message); }

    } catch (e) {
        console.log('[AUTO-REACTIONS]:', e.message);
    }
});
