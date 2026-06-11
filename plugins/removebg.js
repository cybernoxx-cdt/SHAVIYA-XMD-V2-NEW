// plugins/removebg.js — SHAVIYA-XMD V2 | Background Remover Plugin
// API: https://whiteshadow-x-api.onrender.com/api/ai/removebg
// Usage: .removebg (quote an image) | .rmbg (quote) | .nobg <image_url>

'use strict';

const { cmd }                           = require('../command');
const axios                             = require('axios');
const { downloadContentFromMessage }    = require('@whiskeysockets/baileys');
const fs                                = require('fs');
const path                              = require('path');
const os                                = require('os');

// ── Config ─────────────────────────────────────────────────────
const API_TOKEN = 'e76n2P';
const API_URL   = 'https://whiteshadow-x-api.onrender.com/api/ai/removebg';

// ── React helper ───────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (_) {}
}

// ── Upload image buffer to Telegra.ph (no token needed) ────────
async function uploadToTelegraph(buffer, filename = 'image.jpg') {
    const FormData = require('form-data');
    const form     = new FormData();
    form.append('file', buffer, { filename, contentType: 'image/jpeg' });

    const res = await axios.post('https://telegra.ph/upload', form, {
        headers: form.getHeaders(),
        timeout: 30000
    });

    // telegra.ph returns: [{ src: "/file/xxxxxxx.jpg" }]
    const src = res.data?.[0]?.src;
    if (!src) throw new Error('Telegra.ph upload failed: ' + JSON.stringify(res.data));
    return 'https://telegra.ph' + src;
}

// ── Download quoted image → Buffer ─────────────────────────────
async function downloadQuotedImage(m) {
    // m.quoted is the quoted message proto
    const quoted = m.msg?.contextInfo?.quotedMessage;
    if (!quoted) return null;

    // Find image inside quoted
    const inner =
        quoted.imageMessage ||
        quoted.viewOnceMessage?.message?.imageMessage ||
        quoted.viewOnceMessageV2?.message?.imageMessage ||
        quoted.viewOnceMessageV2Extension?.message?.imageMessage ||
        null;

    if (!inner) return null;

    const stream = await downloadContentFromMessage(inner, 'image');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// ── Call removebg API with image URL ──────────────────────────
async function callRemoveBg(imageUrl) {
    const apiCall = `${API_URL}?url=${encodeURIComponent(imageUrl)}&apitoken=${API_TOKEN}`;

    const res = await axios.get(apiCall, {
        timeout: 90000,
        responseType: 'arraybuffer',   // Try binary first
        headers: {
            'Accept':     '*/*',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36'
        },
        validateStatus: () => true      // Don't throw on non-2xx — check manually
    });

    const contentType = res.headers['content-type'] || '';

    // ── Case 1: API returned image directly (png/jpeg/webp) ──
    if (contentType.includes('image/') || contentType.includes('octet-stream')) {
        return { type: 'buffer', buffer: Buffer.from(res.data), contentType };
    }

    // ── Case 2: API returned JSON with URL ──
    try {
        const text = Buffer.from(res.data).toString('utf-8');
        const json = JSON.parse(text);

        // Common JSON response field names
        const url =
            json?.result_url || json?.url || json?.image_url ||
            json?.output     || json?.data?.url || json?.image ||
            json?.link       || json?.result    || null;

        if (url && typeof url === 'string' && url.startsWith('http')) {
            return { type: 'url', url };
        }

        // Maybe base64
        const b64 = json?.base64 || json?.data || json?.image_base64 || null;
        if (b64 && typeof b64 === 'string' && b64.length > 100) {
            const clean  = b64.replace(/^data:image\/\w+;base64,/, '');
            return { type: 'buffer', buffer: Buffer.from(clean, 'base64'), contentType: 'image/png' };
        }

        throw new Error('API returned JSON but no image found: ' + text.slice(0, 300));
    } catch (parseErr) {
        // Not JSON and not image — surface the error
        throw new Error('Unexpected API response: ' + contentType + ' | ' + parseErr.message);
    }
}

// ── Fetch image buffer from URL ────────────────────────────────
async function fetchBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
}

// ── Main handler ───────────────────────────────────────────────
async function removeBgHandler(conn, mek, m, { from, q, reply, args }) {

    await react(conn, from, mek.key, '⏳');

    let imageUrl = null;
    let sourceLabel = '';

    // ── Step 1: Get image URL ──────────────────────────────────

    // A) URL passed directly as argument (.nobg <url>)
    const argUrl = (Array.isArray(q) ? q.join(' ') : q || '').trim();
    if (argUrl && /^https?:\/\//i.test(argUrl)) {
        imageUrl    = argUrl;
        sourceLabel = '🔗 URL';
    }

    // B) Quoted image → download → upload to Telegra.ph → get URL
    if (!imageUrl) {
        try {
            const imgBuffer = await downloadQuotedImage(m);
            if (imgBuffer && imgBuffer.length > 0) {
                await reply('📤 Image upload කරනවා...');
                imageUrl    = await uploadToTelegraph(imgBuffer, 'source.jpg');
                sourceLabel = '🖼️ Quoted Image';
            }
        } catch (uploadErr) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Image upload failed: ' + uploadErr.message);
        }
    }

    // C) Nothing provided
    if (!imageUrl) {
        await react(conn, from, mek.key, '❌');
        return reply(
            '╔══════════════════════╗\n' +
            '║  🎨 *BACKGROUND REMOVER*  ║\n' +
            '╚══════════════════════╝\n\n' +
            '📌 *Usage:*\n\n' +
            '  1️⃣  Image Quote කරලා:\n' +
            '     ▸ `.removebg`\n' +
            '     ▸ `.rmbg`\n' +
            '     ▸ `.nobg`\n\n' +
            '  2️⃣  Image URL දීලා:\n' +
            '     ▸ `.nobg` https://example.com/photo.jpg\n\n' +
            '⚠️ _Image quote කරලා command ලිය හිත_\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n' +
            '_Powered by SHAVIYA-XMD V2_'
        );
    }

    // ── Step 2: Call API ───────────────────────────────────────
    await reply(
        '🎨 *Background remove* කරනවා...\n' +
        `📥 Source: ${sourceLabel}\n` +
        '_AI processing... ටිකක් ඉන්න_'
    );

    try {
        const result = await callRemoveBg(imageUrl);

        let finalBuffer;

        if (result.type === 'buffer') {
            finalBuffer = result.buffer;
        } else if (result.type === 'url') {
            finalBuffer = await fetchBuffer(result.url);
        }

        if (!finalBuffer || finalBuffer.length < 500) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ Background remove API valid image එකක් return කළේ නෑ. Try again.');
        }

        // ── Step 3: Send as PNG image (transparent bg preserved) ──
        await conn.sendMessage(from, {
            image:   finalBuffer,
            mimetype: 'image/png',
            caption:
                '✅ *Background Removed!*\n' +
                '━━━━━━━━━━━━━━━━━━━━━━\n' +
                '🎨 *Tool:* AI Background Remover\n' +
                '📌 _PNG format — transparent background_\n' +
                '━━━━━━━━━━━━━━━━━━━━━━\n' +
                '_Powered by SHAVIYA-XMD V2_'
        }, { quoted: mek });

        // Also send as sticker (transparent PNG = perfect sticker)
        try {
            await conn.sendMessage(from, {
                sticker: finalBuffer,
            }, { quoted: mek });
        } catch (_) {
            // sticker send fail වුනත් main image already sent — ignore
        }

        await react(conn, from, mek.key, '✅');

    } catch (err) {
        console.error('[removebg] Error:', err?.message || err);
        await react(conn, from, mek.key, '❌');

        const status = err?.response?.status;
        let errMsg   = '❌ *Background Remover* fail වුණා.\n\n';

        if (status === 400)
            errMsg += '⚠️ Image URL invalid හෝ API support නෑ.';
        else if (status === 403)
            errMsg += '⚠️ API token invalid.';
        else if (status === 429)
            errMsg += '⚠️ Rate limit. ටිකක් ඉඳලා try කරන්න.';
        else if (status === 500 || status === 503)
            errMsg += '⚠️ API server error. Later try කරන්න.';
        else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout'))
            errMsg += '⚠️ Timeout. Image size check කරන්න (max ~5MB).';
        else if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED')
            errMsg += '⚠️ API server unreachable.';
        else
            errMsg += 'Error: ' + (err?.message || 'Unknown');

        reply(errMsg);
    }
}

// ── Register Commands ──────────────────────────────────────────
cmd({
    pattern:  'removebg',
    react:    '🎨',
    category: 'tools',
    fromMe:   false,
    desc:     'Remove image background using AI (quote an image)',
    filename: __filename
}, removeBgHandler);

cmd({
    pattern:  'rmbg',
    react:    '🎨',
    category: 'tools',
    fromMe:   false,
    desc:     'Remove background (short alias)',
    filename: __filename
}, removeBgHandler);

cmd({
    pattern:  'nobg',
    react:    '🎨',
    category: 'tools',
    fromMe:   false,
    desc:     'Remove background (alias, supports URL arg)',
    filename: __filename
}, removeBgHandler);
