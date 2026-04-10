// plugins/v2s.js — SHAVIYA-XMD V2
// ✅ FIX: ffmpeg-static → @ffmpeg-installer → system ffmpeg chain
// ✅ FIX: Correct output path passed to fluent-ffmpeg .save()
// ✅ FIX: Temp file cleanup on error

'use strict';

const { cmd }    = require('../command');
const fluent     = require('fluent-ffmpeg');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');

// ── Resolve ffmpeg: ffmpeg-static → @ffmpeg-installer → system ──
let ffmpegPath = null;

try {
    const staticBin = require('ffmpeg-static');
    if (staticBin && fs.existsSync(staticBin)) {
        try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
        ffmpegPath = staticBin;
        console.log('[v2s] ✅ Using ffmpeg-static:', staticBin);
    }
} catch (_) {}

if (!ffmpegPath) {
    try {
        const inst = require('@ffmpeg-installer/ffmpeg');
        if (inst && inst.path && fs.existsSync(inst.path)) {
            ffmpegPath = inst.path;
            console.log('[v2s] ✅ Using @ffmpeg-installer:', inst.path);
        }
    } catch (_) {}
}

if (!ffmpegPath) {
    try {
        const { execSync } = require('child_process');
        const sys = execSync('which ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
        if (sys) { ffmpegPath = sys; console.log('[v2s] ✅ Using system ffmpeg:', sys); }
    } catch (_) {}
}

if (ffmpegPath) {
    fluent.setFfmpegPath(ffmpegPath);
} else {
    console.error('[v2s] ❌ ffmpeg not found — v2s command will be disabled.');
}

// ── Helper: convert video buffer → mp3 buffer ────────────────
function videoToMp3(inputBuffer) {
    return new Promise((resolve, reject) => {
        const uid    = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const tmpIn  = path.join(os.tmpdir(), `v2s_in_${uid}.mp4`);
        const tmpOut = path.join(os.tmpdir(), `v2s_out_${uid}.mp3`);

        const cleanup = () => {
            try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (_) {}
            try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
        };

        try { fs.writeFileSync(tmpIn, inputBuffer); } catch (e) { return reject(e); }

        fluent(tmpIn)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .toFormat('mp3')
            .on('end', () => {
                try {
                    const buf = fs.readFileSync(tmpOut);
                    cleanup();
                    resolve(buf);
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            })
            .on('error', (e) => {
                cleanup();
                reject(e);
            })
            .save(tmpOut);   // ✅ FIX: explicit output path passed to .save()
    });
}

// ── .v2s command ─────────────────────────────────────────────
cmd({
    pattern:  'v2s',
    alias:    ['video2mp3', 'videotoaudio', 'v2a'],
    react:    '🎵',
    desc:     'Convert video to MP3 audio',
    category: 'tools',
    filename: __filename
},
async (conn, mek, m, { reply }) => {
    try {
        if (!ffmpegPath) return reply('❌ ffmpeg is not available on this server. Contact bot owner.');
        if (!mek.quoted)                         return reply('🎥 *Reply to a video message to convert.*');
        if (mek.quoted.mtype !== 'videoMessage') return reply('❌ Please reply to a *video* message.');

        await reply('⏳ Converting video to audio... please wait.');

        const videoBuffer = await mek.quoted.download();
        if (!videoBuffer || !videoBuffer.length) return reply('❌ Could not download the video.');

        const mp3Buffer = await videoToMp3(videoBuffer);

        await conn.sendMessage(mek.chat, {
            audio:    mp3Buffer,
            mimetype: 'audio/mpeg',
            ptt:      false
        }, { quoted: mek });

    } catch (err) {
        console.error('[v2s]', err.message);
        reply(`❌ Conversion failed: ${err.message}`);
    }
});
