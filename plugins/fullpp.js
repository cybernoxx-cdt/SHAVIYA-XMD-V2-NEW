// ╔══════════════════════════════════════════════════════════════╗
// ║         SHAVIYA-XMD V2 — fulldp Plugin (FULL PHOTO)         ║
// ║  Owner-only | Full image fit into DP, no crop               ║
// ╚══════════════════════════════════════════════════════════════╝

const { cmd }  = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ── Download raw buffer from quoted image ─────────────────────────
async function downloadImageBuffer(quotedMsg) {
    const stream = await downloadContentFromMessage(quotedMsg.msg, 'image');
    let buf = Buffer.from([]);
    for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
    if (!buf || buf.length < 100) throw new Error('EMPTY_BUFFER');
    return buf;
}

// ── Make full-fit square: entire photo visible, no crop ──────────
// Strategy: fit image inside a square canvas (letterbox/pillarbox)
// WhatsApp forces square crop — we pre-embed the full photo
// inside a square so nothing is lost.
async function makeFullFitSquare(inputBuf) {
    try {
        const sharp = require('sharp');

        // Get original dimensions
        const meta = await sharp(inputBuf).metadata();
        const w = meta.width  || 800;
        const h = meta.height || 800;

        // Canvas size = longest side (so full image fits)
        const size = Math.max(w, h);

        // Embed full image centred on square canvas (black bg looks cleanest)
        const result = await sharp(inputBuf)
            .resize(size, size, {
                fit:        'contain',   // ← full image, no crop
                position:   'centre',
                background: { r: 0, g: 0, b: 0, alpha: 1 } // black bg
            })
            .jpeg({ quality: 95 })
            .toBuffer();

        return result;
    } catch (e) {
        // sharp not available — return raw buffer
        console.warn('[FULLDP] sharp unavailable, using raw buffer:', e.message);
        return inputBuf;
    }
}

// ═══════════════════════════════════════════════════════════════
//  Commands: .fulldp  .fullpp  .setdp  .setfulldp  .changedp
// ═══════════════════════════════════════════════════════════════
cmd({
    pattern:  'fulldp',
    alias:    ['fullpp', 'setdp', 'setfulldp', 'changedp'],
    desc:     'Set FULL profile picture — entire image visible, no crop (Owner Only)',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {

    // ── 1. Owner only ───────────────────────────────────────────
    if (!isOwner) {
        return reply('⚠️ *Only bot owner can change profile picture.*');
    }

    // ── 2. Must reply to a message ──────────────────────────────
    if (!mek.quoted) {
        return reply(
            `🖼️ *How to use:*\n` +
            `Reply to any image with *.fulldp*\n\n` +
            `_Full photo will be set as DP — nothing cropped!_`
        );
    }

    // ── 3. Image type check ─────────────────────────────────────
    const qtype = (mek.quoted.type || '').toLowerCase();
    if (!qtype.includes('image')) {
        return reply(`❌ *Please reply to an IMAGE only.*\n_Type detected: ${qtype || 'unknown'}_`);
    }

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    // ── 4. Download original image ──────────────────────────────
    let imgBuf;
    try {
        imgBuf = await mek.quoted.download();
    } catch {
        try {
            imgBuf = await downloadImageBuffer(mek.quoted);
        } catch (e) {
            console.error('[FULLDP] Download error:', e.message);
            return reply('❌ *Failed to download image.* Please try again.');
        }
    }

    if (!imgBuf || imgBuf.length < 100) {
        return reply('❌ *Empty image buffer.* Forward the image and try again.');
    }

    // ── 5. Fit full photo into square (no crop) ──────────────────
    let finalBuf;
    try {
        finalBuf = await makeFullFitSquare(imgBuf);
    } catch {
        finalBuf = imgBuf; // fallback: send raw
    }

    // ── 6. Set as WhatsApp profile picture ──────────────────────
    try {
        await conn.updateProfilePicture(conn.user.id, finalBuf);
    } catch (e) {
        const msg = e.message || '';
        console.error('[FULLDP] updateProfilePicture error:', msg);

        if (msg.includes('not-authorized') || msg.includes('403')) {
            return reply(
                '❌ *WhatsApp rate-limited this action.*\n' +
                '_Wait a few hours and try again._'
            );
        }
        return reply(`❌ *Failed to set DP:* ${msg || 'Unknown error'}`);
    }

    // ── 7. Done ──────────────────────────────────────────────────
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    return reply(
        '✅ *Full DP set successfully!*\n\n' +
        '> 🖼️ Full photo applied — no crop, full body visible\n' +
        '> ⏳ May take a few seconds to update on WhatsApp'
    );
});
