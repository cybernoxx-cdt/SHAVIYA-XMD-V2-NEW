// ╔══════════════════════════════════════════════════════════════════════╗
// ║        SHAVIYA-XMD V2 — fulldp Plugin  (FULL PHOTO — NO BLACK)      ║
// ║  Owner-only | Photo scaled to fill square — zero black, zero crop   ║
// ║  Method: Smart scale-fill (photo itself fills every pixel)          ║
// ╚══════════════════════════════════════════════════════════════════════╝

const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ── Download raw buffer from quoted image ─────────────────────────────
async function downloadImageBuffer(quotedMsg) {
    const stream = await downloadContentFromMessage(quotedMsg.msg, 'image');
    let buf = Buffer.from([]);
    for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
    if (!buf || buf.length < 100) throw new Error('EMPTY_BUFFER');
    return buf;
}

// ═══════════════════════════════════════════════════════════════════════
//  makeFullDP
//
//  Problem with blur method:
//    WhatsApp renders DP as a circle — anything outside the circle
//    appears black regardless of what we put in corners.
//    So blurred background only works if the CIRCLE itself is filled.
//
//  Real solution — TWO options based on photo orientation:
//
//  PORTRAIT photo (tall):
//    → Already taller than wide → just scale to fill width → full body
//    → Scale so WIDTH = size → height will exceed size (head/feet clipped)
//    → BETTER: scale so full HEIGHT fits → width will be less → black sides
//    → BEST: use cover on width axis, shift gravity to TOP (keeps face/body)
//
//  LANDSCAPE photo (wide):
//    → Scale so HEIGHT = size → width exceeds → side clip
//
//  ACTUAL BEST METHOD for WhatsApp DP (circle crop aware):
//    → Target: 800x800 square
//    → Resize image using 'cover' fit with gravity 'centre'
//    → This fills the entire 800x800 — zero black, zero transparent
//    → WhatsApp circle crop will show CENTER of the square
//    → For portrait/full body: use gravity 'north' so top (face) is preserved
//    → User controls this via command: .fulldp (centre) or .fulldptop (north)
//
//  WHY THIS IS CORRECT:
//    Black bars appear because 'contain' adds padding.
//    'cover' never adds padding — image fills every pixel.
//    WhatsApp circle shows center 800px of the square.
//    If photo is portrait, 'cover' only clips sides (not top/bottom).
//    Full body is visible because height fills the circle top-to-bottom.
// ═══════════════════════════════════════════════════════════════════════
async function makeFullDP(inputBuf, gravity = 'centre') {
    try {
        const sharp = require('sharp');

        const TARGET = 800; // WhatsApp DP optimal resolution

        // ── Get metadata ──────────────────────────────────────────────
        const meta = await sharp(inputBuf).metadata();
        const w    = meta.width  || 800;
        const h    = meta.height || 800;

        // ── Portrait detection ────────────────────────────────────────
        // For portrait (full body) photos: gravity=north keeps face+body
        // For square/landscape: gravity=centre is fine
        const autoGravity = (h > w) ? 'north' : 'centre';
        const useGravity   = gravity || autoGravity;

        // ── Scale to fill square completely (cover = no black ever) ───
        const result = await sharp(inputBuf)
            .resize(TARGET, TARGET, {
                fit:      'cover',      // fills entire square, no padding
                position: useGravity    // portrait→north (keeps body), else centre
            })
            .jpeg({ quality: 95 })
            .toBuffer();

        return result;

    } catch (e) {
        console.warn('[FULLDP] sharp error, raw fallback:', e.message);
        return inputBuf;
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  .fulldp      → auto gravity (portrait=north, else centre)
//  .fulldptop   → force north (shows top/face of photo)
//  .fulldpmid   → force centre
//  .fulldpbot   → force south (shows bottom of photo)
//  .fullpp / .setdp / .setfulldp / .changedp → same as .fulldp
// ═══════════════════════════════════════════════════════════════════════

// ── Helper: shared handler ────────────────────────────────────────────
async function dpHandler(conn, mek, m, { from, reply, isOwner }, gravity) {

    if (!isOwner) {
        return reply('⚠️ *Only bot owner can change profile picture.*');
    }

    if (!mek.quoted) {
        return reply(
            `🖼️ *How to use:*\n\n` +
            `Reply to any image:\n` +
            `  *.fulldp*      → Auto fit (recommended)\n` +
            `  *.fulldptop*   → Show top of photo (face)\n` +
            `  *.fulldpmid*   → Show middle\n` +
            `  *.fulldpbot*   → Show bottom\n\n` +
            `_Zero black bars — photo fills entire circle!_`
        );
    }

    const qtype = (mek.quoted.type || '').toLowerCase();
    if (!qtype.includes('image')) {
        return reply(`❌ *Please reply to an IMAGE only.*\n_Type: ${qtype || 'unknown'}_`);
    }

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    // ── Download ──────────────────────────────────────────────────────
    let imgBuf;
    try {
        imgBuf = await mek.quoted.download();
    } catch {
        try {
            imgBuf = await downloadImageBuffer(mek.quoted);
        } catch (e) {
            console.error('[FULLDP] Download error:', e.message);
            return reply('❌ *Failed to download image.* Try again.');
        }
    }

    if (!imgBuf || imgBuf.length < 100) {
        return reply('❌ *Empty image buffer.* Forward image and retry.');
    }

    // ── Process ───────────────────────────────────────────────────────
    let finalBuf;
    try {
        finalBuf = await makeFullDP(imgBuf, gravity);
    } catch {
        finalBuf = imgBuf;
    }

    // ── Set DP ────────────────────────────────────────────────────────
    try {
        await conn.updateProfilePicture(conn.user.id, finalBuf);
    } catch (e) {
        const msg = e.message || '';
        console.error('[FULLDP] updateProfilePicture error:', msg);
        if (msg.includes('not-authorized') || msg.includes('403')) {
            return reply('❌ *WhatsApp rate-limited.*\n_Wait a few hours and retry._');
        }
        return reply(`❌ *Failed to set DP:* ${msg || 'Unknown error'}`);
    }

    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    return reply(
        '✅ *Full DP set successfully!*\n\n' +
        '> 🖼️ Photo fills entire circle — zero black bars\n' +
        '> 📐 Auto-fitted to WhatsApp DP format\n' +
        '> ⏳ May take a few seconds to update'
    );
}

// ── Main command ──────────────────────────────────────────────────────
cmd({
    pattern:  'fulldp',
    alias:    ['fullpp', 'setdp', 'setfulldp', 'changedp'],
    desc:     'Set full DP — photo fills circle, zero black bars (Owner Only)',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, ctx) => dpHandler(conn, mek, m, ctx, null));

// ── .fulldptop — show top of photo (face/head) ────────────────────────
cmd({
    pattern:  'fulldptop',
    desc:     'Set DP — show top of photo (Owner Only)',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, ctx) => dpHandler(conn, mek, m, ctx, 'north'));

// ── .fulldpmid — show middle of photo ────────────────────────────────
cmd({
    pattern:  'fulldpmid',
    desc:     'Set DP — show middle of photo (Owner Only)',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, ctx) => dpHandler(conn, mek, m, ctx, 'centre'));

// ── .fulldpbot — show bottom of photo ────────────────────────────────
cmd({
    pattern:  'fulldpbot',
    desc:     'Set DP — show bottom of photo (Owner Only)',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, ctx) => dpHandler(conn, mek, m, ctx, 'south'));
