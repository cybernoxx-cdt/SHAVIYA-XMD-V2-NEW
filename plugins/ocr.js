// plugins/ocr.js — SHAVIYA-XMD V2
// .ocr — Extract text from image (OCR)

'use strict';

const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

cmd({
    pattern: 'ocr',
    alias: ['readtext', 'img2text', 'textfromimg', 'readimg'],
    desc: 'Extract text from image (OCR)',
    category: 'utility',
    react: '🔤',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        const quoted = m.quoted || mek;
        const mime = quoted?.message?.imageMessage?.mimetype ||
                     quoted?.message?.documentMessage?.mimetype || '';

        if (!mime.includes('image')) return reply(
            `🔤 *OCR - IMAGE TO TEXT*\n\n` +
            `Reply to an image with:\n.ocr\n\n` +
            `Supports:\n` +
            `• Sinhala text 🇱🇰\n` +
            `• English text 🇬🇧\n` +
            `• Numbers & symbols\n` +
            `• Screenshots & photos\n\n` +
            `> 🔤 *SHAVIYA-XMD V2 · OCR*`
        );

        await conn.sendPresenceUpdate('composing', from);
        await reply('⏳ Reading text from image...');

        const buffer = await conn.downloadMediaMessage(quoted);
        const base64Img = buffer.toString('base64');

        let extractedText = null;

        // Primary: OCR.Space free API (2500 req/day free)
        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('base64Image', `data:image/jpeg;base64,${base64Img}`);
            form.append('language', 'eng');
            form.append('isOverlayRequired', 'false');
            form.append('filetype', 'jpg');
            form.append('detectOrientation', 'true');
            form.append('scale', 'true');
            form.append('OCREngine', '2');

            const res = await axios.post('https://api.ocr.space/parse/image', form, {
                headers: {
                    ...form.getHeaders(),
                    'apikey': 'helloworld' // free public key
                },
                timeout: 30000
            });

            const parsed = res.data?.ParsedResults?.[0]?.ParsedText;
            if (parsed && parsed.trim().length > 0) extractedText = parsed.trim();
        } catch (_) {}

        // Fallback: Google Cloud Vision public endpoint (no key, limited)
        if (!extractedText) {
            try {
                const res2 = await axios.post(
                    `https://vision.googleapis.com/v1/images:annotate`,
                    {
                        requests: [{
                            image: { content: base64Img },
                            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
                        }]
                    },
                    { timeout: 20000 }
                );
                const annotations = res2.data?.responses?.[0]?.textAnnotations;
                if (annotations?.length > 0) extractedText = annotations[0].description?.trim();
            } catch (_) {}
        }

        // Fallback 2: free OCR API
        if (!extractedText) {
            try {
                const tmpFile = path.join(os.tmpdir(), `ocr_${Date.now()}.jpg`);
                fs.writeFileSync(tmpFile, buffer);
                const FormData2 = require('form-data');
                const form2 = new FormData2();
                form2.append('image', fs.createReadStream(tmpFile));
                form2.append('lang', 'eng');

                const res3 = await axios.post('https://api.api-ninjas.com/v1/imagetotext', form2, {
                    headers: { ...form2.getHeaders(), 'X-Api-Key': 'your_key_here' },
                    timeout: 20000
                });

                try { fs.unlinkSync(tmpFile); } catch (_) {}
                const text3 = res3.data?.map?.(x => x.text)?.join(' ');
                if (text3?.trim()) extractedText = text3.trim();
            } catch (_) {}
        }

        if (!extractedText) {
            return reply(
                `❌ *Could not extract text from this image.*\n\n` +
                `Tips:\n` +
                `• Make sure text is clear and not blurry\n` +
                `• Use high contrast images\n` +
                `• Avoid very small text\n\n` +
                `> 🔤 *SHAVIYA-XMD V2 · OCR*`
            );
        }

        const charCount = extractedText.length;
        const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

        await conn.sendMessage(from, {
            text: `🔤 *TEXT EXTRACTED*\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${extractedText}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 Words: ${wordCount} | Characters: ${charCount}\n\n` +
                `> 🔤 *SHAVIYA-XMD V2 · OCR*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[ocr] error:', e.message);
        reply('❌ OCR failed. Please try again with a clearer image.');
    }
});
