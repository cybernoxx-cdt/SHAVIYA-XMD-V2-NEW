// plugins/removebg.js — SHAVIYA-XMD V2 | Background Remover Tool
// API: https://whiteshadow-x-api.vercel.app/api/ai/removebg
// Usage: Reply to any image with .removebg

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');

// ── Config ────────────────────────────────────────────────────
const REMOVEBG_API_TOKEN = 'e76n2P';
const REMOVEBG_API_URL   = 'https://whiteshadow-x-api.vercel.app/api/ai/removebg';

// ── React helper ──────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (_) {}
}

// ── Check if message has an image ────────────────────────────
function isImageMessage(m) {
    const q = m.quoted?.message || {};
    const d = m.message || {};
    return Boolean(
        q.imageMessage || d.imageMessage ||
        m.quoted?.mtype?.includes?.('imageMessage')
    );
}

// ── Download image buffer ─────────────────────────────────────
async function downloadImage(m) {
    if (m.quoted && typeof m.quoted.download === 'function') return await m.quoted.download();
    if (typeof m.download === 'function') return await m.download();
    throw new Error('Image download කරන්න බැරි වුණා.');
}

// ── Upload buffer to a public URL via telegra.ph ─────────────
// We need a public URL for the API. We upload the image to telegra.ph
// and get back a URL the API can access.
async function uploadToTelegraph(buffer, mimetype = 'image/jpeg') {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', buffer, { filename: 'image.jpg', contentType: mimetype });

    const res = await axios.post('https://telegra.ph/upload', form, {
        headers: form.getHeaders(),
        timeout: 30000
    });

    if (!res.data || !Array.isArray(res.data) || !res.data[0]?.src) {
        throw new Error('Image upload failed — telegra.ph response invalid.');
    }
    return 'https://telegra.ph' + res.data[0].src;
}

// ── Main handler ──────────────────────────────────────────────
async function removeBgHandler(conn, mek, m, { from, reply }) {

    // 1. Must reply to an image
    if (!isImageMessage(m)) {
        await react(conn, from, mek.key, '❌');
        return reply(
            '🖼️ *Remove Background*\n\n' +
            'Photo එකකට reply කරලා command දෙන්න.\n\n' +
            '▸ Usage: Photo → Reply → *.removebg*'
        );
    }

    await react(conn, from, mek.key, '⏳');
    await reply('⏳ Background remove කරනවා... ටිකක් ඉන්න.');

    try {
        // 2. Download the image
        const imgBuffer = await downloadImage(m);

        if (!imgBuffer || imgBuffer.length < 500) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image download කරන්න බැරි වුණා. නැවත try කරන්න.');
        }
        if (imgBuffer.length > 15 * 1024 * 1024) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image ලොකු වැඩියි. 15MB ට අඩු image try කරන්න.');
        }

        // 3. Upload to telegra.ph to get a public URL
        let imageUrl;
        try {
            imageUrl = await uploadToTelegraph(imgBuffer);
        } catch (uploadErr) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image upload කරන්න බැරි වුණා.\n\nHint: Internet connection check කරන්න.');
        }

        // 4. Call the removebg API
        const apiRes = await axios.get(REMOVEBG_API_URL, {
            params: {
                url: imageUrl,
                apitoken: REMOVEBG_API_TOKEN
            },
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const resultBuffer = Buffer.from(apiRes.data);

        if (!resultBuffer || resultBuffer.length < 500) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Background remove වුණේ නැහැ. API response invalid.\n\nනැවත try කරන්න.');
        }

        // 5. Send result back — PNG with transparent background
        await conn.sendMessage(from, {
            image: resultBuffer,
            mimetype: 'image/png',
            caption:
                '✅ *Background Remove සාර්ථකයි!*\n\n' +
                '🖼️ Background successfully removed.\n' +
                '📌 _SHAVIYA-XMD V2_'
        }, { quoted: mek });

        await react(conn, from, mek.key, '✅');

    } catch (err) {
        console.error('[removebg] Error:', err?.message || err);
        await react(conn, from, mek.key, '❌');

        let errMsg = '❌ Background remove කරන්න බැරි වුණා.';
        if (err?.response?.status === 429) {
            errMsg += '\n\n⚠️ API limit exceeded. ටිකක් ඉඳලා try කරන්න.';
        } else if (err?.response?.status === 400) {
            errMsg += '\n\n⚠️ Invalid image. වෙනත් photo try කරන්න.';
        } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
            errMsg += '\n\n⚠️ Request timeout. නැවත try කරන්න.';
        } else {
            errMsg += '\n\nError: ' + (err?.message || 'Unknown error');
        }

        reply(errMsg);
    }
}

// ── Register commands ─────────────────────────────────────────
cmd({
    pattern:  'removebg',
    react:    '🎨',
    category: 'tools',
    fromMe:   false,
    desc:     'Remove background from a photo using AI'
}, removeBgHandler);

cmd({
    pattern:  'bgremove',
    react:    '🎨',
    category: 'tools',
    fromMe:   false,
    desc:     'Remove background from a photo (alias)'
}, removeBgHandler);

cmd({
    pattern:  'rmbg',
    react:    '🎨',
    category: 'tools',
    fromMe:   false,
    desc:     'Remove background from a photo (short alias)'
}, removeBgHandler);
