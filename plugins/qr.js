// plugins/qr.js — SHAVIYA-XMD V2
// .qr — QR Code Generator & Scanner

'use strict';

const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── QR Generator ──
cmd({
    pattern: 'qr',
    alias: ['qrcode', 'makeqr', 'genqr'],
    desc: 'Generate QR code from text or link',
    category: 'utility',
    react: '📷',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `📷 *QR CODE GENERATOR*\n\n` +
            `Usage: .qr <text or link>\n\n` +
            `Examples:\n` +
            `• .qr https://github.com\n` +
            `• .qr Hello World\n` +
            `• .qr +94771234567\n\n` +
            `> 📷 *SHAVIYA-XMD V2 · QR Gen*`
        );

        await conn.sendPresenceUpdate('composing', from);

        let imageBuffer = null;

        // Primary: goqr.me (free, no key)
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(q)}&format=png&margin=2`;
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
            if (res.data) imageBuffer = Buffer.from(res.data);
        } catch (_) {}

        // Fallback
        if (!imageBuffer) {
            try {
                const url2 = `https://chart.googleapis.com/chart?chs=512x512&cht=qr&chl=${encodeURIComponent(q)}&choe=UTF-8`;
                const res2 = await axios.get(url2, { responseType: 'arraybuffer', timeout: 15000 });
                if (res2.data) imageBuffer = Buffer.from(res2.data);
            } catch (_) {}
        }

        if (!imageBuffer) return reply('❌ QR generation failed. Please try again.');

        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: `📷 *QR Code Generated!*\n\n` +
                `📝 Content: ${q.length > 50 ? q.slice(0, 50) + '...' : q}\n\n` +
                `> 📷 *SHAVIYA-XMD V2 · QR Gen*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[qr] error:', e.message);
        reply('❌ QR generation failed. Please try again.');
    }
});

// ── QR Scanner ──
cmd({
    pattern: 'qrscan',
    alias: ['readqr', 'scanqr', 'qrdecode'],
    desc: 'Scan/Read QR code from image',
    category: 'utility',
    react: '🔍',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const quoted = m.quoted || mek;
        const mime = quoted?.message?.imageMessage?.mimetype || '';

        if (!mime.includes('image')) return reply(
            `🔍 *QR CODE SCANNER*\n\n` +
            `Reply to an image containing a QR code with:\n` +
            `.qrscan\n\n` +
            `> 🔍 *SHAVIYA-XMD V2 · QR Scan*`
        );

        await conn.sendPresenceUpdate('composing', from);
        await reply('⏳ Scanning QR code...');

        const buffer = await conn.downloadMediaMessage(quoted);
        const tmpFile = path.join(os.tmpdir(), `qr_scan_${Date.now()}.jpg`);
        fs.writeFileSync(tmpFile, buffer);

        let result = null;

        // Use goqr.me scan API
        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', fs.createReadStream(tmpFile));

            const res = await axios.post('https://api.qrserver.com/v1/read-qr-code/', form, {
                headers: form.getHeaders(),
                timeout: 20000
            });

            result = res.data?.[0]?.symbol?.[0]?.data;
        } catch (_) {}

        try { fs.unlinkSync(tmpFile); } catch (_) {}

        if (!result) return reply('❌ Could not read QR code. Make sure the image is clear and contains a QR code.');

        await conn.sendMessage(from, {
            text: `🔍 *QR Code Scanned!*\n\n` +
                `📋 *Content:*\n${result}\n\n` +
                `> 🔍 *SHAVIYA-XMD V2 · QR Scan*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[qrscan] error:', e.message);
        reply('❌ QR scan failed. Please try again.');
    }
});
