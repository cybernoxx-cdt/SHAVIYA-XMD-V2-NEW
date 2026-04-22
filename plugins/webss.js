// plugins/screenshot.js — SHAVIYA-XMD V2
// .sss — Website Screenshot (Fixed for Heroku/Railway/Render)

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: 'ss',
    alias: ['screenshot', 'webshot', 'ss', 'capture'],
    desc: 'Take screenshot of a website',
    category: 'utility',
    react: '📸',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `📸 *WEBSITE SCREENSHOT*\n\n` +
            `Usage: .sss <url>\n\n` +
            `Examples:\n` +
            `• .sss https://google.com\n` +
            `• .sss youtube.com\n` +
            `• .sss https://github.com\n\n` +
            `> 📸 *SHAVIYA-XMD V2 · Screenshot*`
        );

        // Auto add https:// if missing
        let url = q.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Validate URL
        try { new URL(url); } catch (_) {
            return reply('❌ Invalid URL. Example: .sss https://google.com');
        }

        await reply('⏳ Taking screenshot... please wait.');
        await conn.sendPresenceUpdate('composing', from);

        let imageBuffer = null;

        // API 1: screenshotmachine.com (free tier)
        try {
            const apiUrl = `https://image.thum.io/get/width/1280/crop/800/${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (res.data && res.data.byteLength > 5000) {
                imageBuffer = Buffer.from(res.data);
            }
        } catch (_) {}

        // API 2: htmlcsstoimage
        if (!imageBuffer) {
            try {
                const apiUrl2 = `https://mini.s-shot.ru/1280x800/PNG/1280/${encodeURIComponent(url)}`;
                const res2 = await axios.get(apiUrl2, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                if (res2.data && res2.data.byteLength > 5000) {
                    imageBuffer = Buffer.from(res2.data);
                }
            } catch (_) {}
        }

        // API 3: screenshotapi.net
        if (!imageBuffer) {
            try {
                const apiUrl3 = `https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(url)}&device=desktop&dimension=1280x800&format=png&cacheLimit=0`;
                const res3 = await axios.get(apiUrl3, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                if (res3.data && res3.data.byteLength > 5000) {
                    imageBuffer = Buffer.from(res3.data);
                }
            } catch (_) {}
        }

        // API 4: Puppeteer-based free public API
        if (!imageBuffer) {
            try {
                const res4 = await axios.get(
                    `https://api.pikwy.com/?tkn=free&url=${encodeURIComponent(url)}&w=1280&h=800&t=png`,
                    { responseType: 'arraybuffer', timeout: 30000 }
                );
                if (res4.data && res4.data.byteLength > 5000) {
                    imageBuffer = Buffer.from(res4.data);
                }
            } catch (_) {}
        }

        if (!imageBuffer) {
            return reply(
                `❌ Screenshot failed for: ${url}\n\n` +
                `Possible reasons:\n` +
                `• Website is down or blocked\n` +
                `• URL requires login\n` +
                `• All screenshot APIs are busy\n\n` +
                `Try again after a moment.\n\n` +
                `> 📸 *SHAVIYA-XMD V2*`
            );
        }

        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: `📸 *Screenshot Captured!*\n\n🌐 URL: ${url}\n\n> 📸 *SHAVIYA-XMD V2 · Screenshot*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[screenshot] error:', e.message);
        reply('❌ Screenshot failed: ' + e.message);
    }
});
