// plugins/removebg.js — SHAVIYA-XMD V2 | Background Remover Tool
// API: https://whiteshadow-x-api.vercel.app/api/ai/removebg
// Usage: Reply to any image with .removebg

'use strict';

const { cmd }        = require('../command');
const axios          = require('axios');
const { Readable }   = require('stream');
const { uploadToR2 } = require('../lib/upload');

// ── Config ────────────────────────────────────────────────────
const REMOVEBG_API_TOKEN = 'e76n2P';
const REMOVEBG_API_URL   = 'https://whiteshadow-x-api.vercel.app/api/ai/removebg';

// ── React helper ──────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (_) {}
}

// ── Main handler ──────────────────────────────────────────────
async function removeBgHandler(conn, mek, m, { from, reply }) {

    // ✅ FIX: Use m.quoted.type like sticker.js does
    if (!m.quoted) {
        await react(conn, from, mek.key, '❌');
        return reply(
            '🖼️ *Remove Background*\n\n' +
            'Photo එකකට reply කරලා command දෙන්න.\n\n' +
            '▸ Usage: Photo → Reply → *.removebg*'
        );
    }

    const mime = m.quoted.type;
    if (mime !== 'imageMessage') {
        await react(conn, from, mek.key, '❌');
        return reply('❌ Image එකකට reply කරන්න. (Video/sticker වලට support නෑ)');
    }

    await react(conn, from, mek.key, '⏳');
    await reply('⏳ Background remove කරනවා... ටිකක් ඉන්න.');

    try {
        // ✅ FIX: Use m.quoted.download() — same as sticker.js
        const imgBuffer = await m.quoted.download();

        if (!imgBuffer || imgBuffer.length < 500) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image download කරන්න බැරි වුණා. නැවත try කරන්න.');
        }
        if (imgBuffer.length > 15 * 1024 * 1024) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image ලොකු වැඩියි. 15MB ට අඩු image try කරන්න.');
        }

        // ✅ FIX: Upload to Cloudflare R2 (bot's own upload system)
        const filename = 'removebg_' + Date.now();
        const stream   = Readable.from(imgBuffer);
        const imageUrl = await uploadToR2(stream, filename);

        if (!imageUrl) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image upload කරන්න බැරි වුණා. නැවත try කරන්න.');
        }

        // Call the removebg API
        const apiRes = await axios.get(REMOVEBG_API_URL, {
            params: {
                url:      imageUrl,
                apitoken: REMOVEBG_API_TOKEN
            },
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const resultBuffer = Buffer.from(apiRes.data);

        if (!resultBuffer || resultBuffer.length < 500) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Background remove වුණේ නැහැ. නැවත try කරන්න.');
        }

        // Send result
        await conn.sendMessage(from, {
            image:    resultBuffer,
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
        const status = err?.response?.status;
        if (status === 429)      errMsg += '\n\n⚠️ API limit exceeded. ටිකක් ඉඳලා try කරන්න.';
        else if (status === 400) errMsg += '\n\n⚠️ Invalid image. වෙනත් photo try කරන්න.';
        else if (status === 500) errMsg += '\n\n⚠️ API server error. ටිකක් ඉඳලා try කරන්න.';
        else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout'))
                                 errMsg += '\n\n⚠️ Timeout. නැවත try කරන්න.';
        else                     errMsg += '\n\nError: ' + (err?.message || 'Unknown');

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
