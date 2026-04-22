// plugins/compress.js — SHAVIYA-XMD V2
// .compress — Image & Video Compressor

'use strict';

const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Resolve ffmpeg path
let ffmpegPath = 'ffmpeg';
try {
    const staticBin = require('ffmpeg-static');
    if (staticBin && fs.existsSync(staticBin)) {
        try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
        ffmpegPath = staticBin;
    }
} catch (_) {}

try {
    if (ffmpegPath === 'ffmpeg') {
        const inst = require('@ffmpeg-installer/ffmpeg');
        if (inst?.path && fs.existsSync(inst.path)) ffmpegPath = inst.path;
    }
} catch (_) {}

cmd({
    pattern: 'compress',
    alias: ['comp', 'compimg', 'compvid', 'resize'],
    desc: 'Compress image or video',
    category: 'utility',
    react: '🗜️',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        const quoted = m.quoted || mek;
        const mime = quoted?.message?.imageMessage?.mimetype ||
                     quoted?.message?.videoMessage?.mimetype ||
                     quoted?.message?.documentMessage?.mimetype || '';

        if (!mime) return reply(
            `🗜️ *COMPRESS TOOL*\n\n` +
            `Reply to an image or video with:\n` +
            `.compress\n\n` +
            `Options (add after cmd):\n` +
            `• .compress 50 → 50% quality (image)\n` +
            `• .compress low|med|high → video quality\n\n` +
            `> 🗜️ *SHAVIYA-XMD V2 · Compress*`
        );

        const isImage = mime.includes('image');
        const isVideo = mime.includes('video');

        if (!isImage && !isVideo) return reply('❌ Only images and videos are supported.');

        await reply('⏳ Compressing... Please wait.');
        await conn.sendPresenceUpdate('composing', from);

        // Download media
        const buffer = await conn.downloadMediaMessage(quoted);
        const tmpIn = path.join(os.tmpdir(), `shaviya_in_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`);
        const tmpOut = path.join(os.tmpdir(), `shaviya_out_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`);
        fs.writeFileSync(tmpIn, buffer);

        const originalSize = fs.statSync(tmpIn).size;

        if (isImage) {
            const quality = parseInt(q) || 60; // default 60%
            const clampedQ = Math.max(10, Math.min(95, quality));

            await execPromise(
                `"${ffmpegPath}" -y -i "${tmpIn}" -q:v ${Math.round((100 - clampedQ) / 10)} "${tmpOut}"`
            );
        } else {
            // Video compression
            const preset = q?.toLowerCase().includes('high') ? 18 :
                           q?.toLowerCase().includes('med') ? 28 : 35; // crf value

            await execPromise(
                `"${ffmpegPath}" -y -i "${tmpIn}" -vcodec libx264 -crf ${preset} -preset fast -acodec aac "${tmpOut}"`,
                { timeout: 120000 }
            );
        }

        const compressedSize = fs.statSync(tmpOut).size;
        const saved = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);
        const origMB = (originalSize / 1024 / 1024).toFixed(2);
        const compMB = (compressedSize / 1024 / 1024).toFixed(2);

        const caption =
            `✅ *Compression Done!*\n\n` +
            `📦 Original: ${origMB} MB\n` +
            `📦 Compressed: ${compMB} MB\n` +
            `💾 Saved: ${saved}%\n\n` +
            `> 🗜️ *SHAVIYA-XMD V2 · Compress*`;

        if (isImage) {
            await conn.sendMessage(from, {
                image: fs.readFileSync(tmpOut),
                caption
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: fs.readFileSync(tmpOut),
                caption,
                mimetype: 'video/mp4'
            }, { quoted: mek });
        }

        // Cleanup
        try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch (_) {}

    } catch (e) {
        console.error('[compress] error:', e.message);
        reply('❌ Compression failed: ' + e.message);
    }
});
