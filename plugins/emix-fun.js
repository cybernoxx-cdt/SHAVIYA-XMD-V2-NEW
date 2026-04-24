// plugins/emix-fun.js — SHAVIYA-XMD V2
// ✅ FIX: Removed wa-sticker-formatter (sharp crash on Heroku)
// ✅ FIX: Uses ffmpeg-based WebP conversion for sticker output

'use strict';

const { cmd }    = require('../command');
const { fetchEmix } = require('../lib/emix-utils');
const axios      = require('axios');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const fluent     = require('fluent-ffmpeg');

// ── Resolve ffmpeg path ──────────────────────────────────────────
let ffmpegPath = null;
try {
    const staticBin = require('ffmpeg-static');
    if (staticBin && fs.existsSync(staticBin)) {
        try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
        ffmpegPath = staticBin;
    }
} catch (_) {}

if (!ffmpegPath) {
    try {
        const inst = require('@ffmpeg-installer/ffmpeg');
        if (inst?.path && fs.existsSync(inst.path)) ffmpegPath = inst.path;
    } catch (_) {}
}

if (!ffmpegPath) {
    try {
        const { execSync } = require('child_process');
        const sys = execSync('which ffmpeg 2>/dev/null', { encoding: 'utf8' }).trim();
        if (sys) ffmpegPath = sys;
    } catch (_) {}
}

if (ffmpegPath) fluent.setFfmpegPath(ffmpegPath);

// ── Convert image buffer → WebP sticker buffer via ffmpeg ────────
function toWebpSticker(inputPath) {
    return new Promise((resolve, reject) => {
        const outPath = path.join(os.tmpdir(), `emix_sticker_${Date.now()}.webp`);
        fluent(inputPath)
            .outputOptions([
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white@0',
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-qscale', '75',
                '-preset', 'default',
                '-loop', '0',
                '-an',
                '-vsync', '0'
            ])
            .toFormat('webp')
            .save(outPath)
            .on('end', () => {
                try {
                    const buf = fs.readFileSync(outPath);
                    fs.unlinkSync(outPath);
                    resolve(buf);
                } catch (e) { reject(e); }
            })
            .on('error', reject);
    });
}

// ── CMD: .emix ───────────────────────────────────────────────────
cmd({
    pattern:  'emix',
    desc:     'Combine two emojis into a sticker.',
    category: 'fun',
    react:    '😃',
    use:      '.emix 😂,🙂',
    filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.includes(',')) return reply(
            `❌ *Usage:* .emix 😂,🙂\n_Send two emojis separated by a comma._`
        );

        const [emoji1, emoji2] = q.split(',').map(e => e.trim());
        if (!emoji1 || !emoji2) return reply('❌ Please provide two emojis separated by a comma.');

        await reply('⏳ Generating emoji mix sticker...');

        // Fetch emoji mix image URL
        const imageUrl = await fetchEmix(emoji1, emoji2);
        if (!imageUrl) return reply('❌ Could not generate emoji mix. Try different emojis.');

        // Download image
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const imgBuffer = Buffer.from(imgRes.data);

        // Write to temp file for ffmpeg
        const tmpIn = path.join(os.tmpdir(), `emix_in_${Date.now()}.png`);
        fs.writeFileSync(tmpIn, imgBuffer);

        let stickerBuffer = null;

        // Convert to WebP sticker via ffmpeg
        if (ffmpegPath) {
            try {
                stickerBuffer = await toWebpSticker(tmpIn);
            } catch (e) {
                console.error('[emix] ffmpeg convert error:', e.message);
            }
        }

        // Cleanup temp input
        try { fs.unlinkSync(tmpIn); } catch (_) {}

        if (!stickerBuffer) {
            // Fallback: send as image if ffmpeg fails
            return await conn.sendMessage(from, {
                image: imgBuffer,
                caption: `😃 *Emoji Mix:* ${emoji1} + ${emoji2}\n\n> 😃 *SHAVIYA-XMD V2 · Emix*`
            }, { quoted: mek });
        }

        // Send as sticker
        await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });

    } catch (e) {
        console.error('[emix] error:', e.message);
        reply(`❌ Could not generate emoji mix: ${e.message}`);
    }
});
