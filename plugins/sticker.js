// plugins/sticker.js — SHAVIYA-XMD V2
// ✅ FIX: Full ffmpeg-based WebP fallback when sharp/wa-sticker-formatter unavailable
// ✅ FIX: Uses ffmpeg-static → @ffmpeg-installer → system ffmpeg chain
// ✅ FIX: Supports image, video, sticker inputs

'use strict';

const { cmd }  = require('../command');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const axios    = require('axios');
const Config   = require('../config');
const fluent   = require('fluent-ffmpeg');

// ── Resolve ffmpeg path: ffmpeg-static → @ffmpeg-installer → system ──
let ffmpegPath = null;
try {
    const staticBin = require('ffmpeg-static');
    if (staticBin && fs.existsSync(staticBin)) {
        try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
        ffmpegPath = staticBin;
        console.log('[sticker] ✅ ffmpeg-static:', staticBin);
    }
} catch (_) {}

if (!ffmpegPath) {
    try {
        const inst = require('@ffmpeg-installer/ffmpeg');
        if (inst && inst.path && fs.existsSync(inst.path)) {
            ffmpegPath = inst.path;
            console.log('[sticker] ✅ @ffmpeg-installer ffmpeg:', inst.path);
        }
    } catch (_) {}
}

if (!ffmpegPath) {
    try {
        const { execSync } = require('child_process');
        const sys = execSync('which ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
        if (sys) { ffmpegPath = sys; console.log('[sticker] ✅ system ffmpeg:', sys); }
    } catch (_) {}
}

if (ffmpegPath) fluent.setFfmpegPath(ffmpegPath);

// ── Try loading wa-sticker-formatter (needs sharp) ──
let Sticker, StickerTypes;
let stickerFormatterAvailable = false;
try {
    const wsf = require('wa-sticker-formatter');
    Sticker = wsf.Sticker;
    StickerTypes = wsf.StickerTypes;
    stickerFormatterAvailable = true;
    console.log('[sticker] ✅ wa-sticker-formatter loaded');
} catch (e) {
    console.warn('[sticker] ⚠️  wa-sticker-formatter not available — using ffmpeg fallback');
}

// ── Fake vCard (author watermark) ─────────────────────────────
const fakevCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© SHAVIYA-XMD',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD\nORG:SHAVIYA TECH;\nTEL;type=CELL;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ── FFmpeg WebP fallback: converts image/video buffer → WebP sticker ──
function makeWebpFfmpeg(inputBuffer, isAnimated) {
    return new Promise((resolve, reject) => {
        const ext    = isAnimated ? 'mp4' : 'jpg';
        const tmpIn  = path.join(os.tmpdir(), `stk_in_${Date.now()}.${ext}`);
        const tmpOut = path.join(os.tmpdir(), `stk_out_${Date.now()}.webp`);
        fs.writeFileSync(tmpIn, inputBuffer);

        const cmd = fluent(tmpIn);

        if (isAnimated) {
            // Animated sticker (GIF/video)
            cmd.addOutputOptions([
                '-vcodec', 'libwebp',
                '-vf', "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                '-loop', '0',
                '-preset', 'default',
                '-an',
                '-vsync', '0',
                '-t', '8'
            ]);
        } else {
            // Static sticker
            cmd.addOutputOptions([
                '-vcodec', 'libwebp',
                '-vf', "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0",
                '-preset', 'default',
                '-loop', '0',
                '-an',
                '-frames:v', '1'
            ]);
        }

        cmd
            .toFormat('webp')
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

// ── Main sticker maker ────────────────────────────────────────
async function makeAndSendSticker(conn, mek, media, mime, packName, reply) {
    const isAnimated = ['videoMessage', 'gifMessage'].includes(mime);

    // Method 1: wa-sticker-formatter (best quality, needs sharp)
    if (stickerFormatterAvailable) {
        try {
            const sticker = new Sticker(media, {
                pack: packName,
                type: isAnimated ? StickerTypes.FULL : StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 75,
                background: 'transparent'
            });
            const buffer = await sticker.toBuffer();
            return conn.sendMessage(mek.chat, { sticker: buffer }, { quoted: fakevCard });
        } catch (e) {
            console.warn('[sticker] wa-sticker-formatter failed, trying ffmpeg fallback:', e.message);
        }
    }

    // Method 2: ffmpeg fallback (works without sharp)
    if (!ffmpegPath) {
        return reply('❌ ffmpeg not available on this server. Contact bot owner.');
    }
    try {
        const webpBuf = await makeWebpFfmpeg(media, isAnimated);
        return conn.sendMessage(mek.chat, { sticker: webpBuf }, { quoted: fakevCard });
    } catch (e) {
        console.error('[sticker] ffmpeg fallback failed:', e.message);
        return reply(`❌ Failed to create sticker: ${e.message}`);
    }
}

// ── .sticker / .s ─────────────────────────────────────────────
cmd({
    pattern:  'sticker',
    alias:    ['s', 'stickergif'],
    react:    '🔮',
    desc:     'Create sticker from image/video',
    category: 'sticker',
    use:      '<reply media>',
    filename: __filename
},
async (conn, mek, m, { reply }) => {
    if (!mek.quoted) return reply('*Reply to any Image or Video.*');
    const mime = mek.quoted.mtype;
    if (!['imageMessage', 'stickerMessage', 'videoMessage'].includes(mime)) {
        return reply('❌ Please reply to an image or video.');
    }
    try {
        const media = await mek.quoted.download();
        const pack  = Config.PACKNAME || 'SHAVIYA-XMD V2';
        await makeAndSendSticker(conn, mek, media, mime, pack, reply);
    } catch (err) {
        console.error('[sticker]', err.message);
        reply(`❌ Failed to create sticker: ${err.message}`);
    }
});

// ── .take <packname> ──────────────────────────────────────────
cmd({
    pattern:  'take',
    alias:    ['rename', 'stake'],
    react:    '🔮',
    desc:     'Create sticker with custom pack name',
    category: 'sticker',
    use:      '<reply sticker> <packname>',
    filename: __filename
},
async (conn, mek, m, { q, reply }) => {
    if (!mek.quoted) return reply('*Reply to any sticker.*');
    if (!q)          return reply('*Please provide a pack name: .take <packname>*');
    const mime = mek.quoted.mtype;
    if (!['imageMessage', 'stickerMessage', 'videoMessage'].includes(mime)) {
        return reply('❌ Please reply to an image or sticker.');
    }
    try {
        const media = await mek.quoted.download();
        await makeAndSendSticker(conn, mek, media, mime, q, reply);
    } catch (err) {
        console.error('[take]', err.message);
        reply(`❌ Failed: ${err.message}`);
    }
});
