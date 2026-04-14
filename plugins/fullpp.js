// ╔══════════════════════════════════════════════════╗
// ║         SHAVIYA-XMD V2 — fulldp Plugin           ║
// ║  Owner-only: set bot profile picture (full DP)   ║
// ╚══════════════════════════════════════════════════╝

const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function downloadImageBuffer(quotedMsg) {
    const stream = await downloadContentFromMessage(quotedMsg.msg, 'image');
    let buf = Buffer.from([]);
    for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
    if (!buf || buf.length < 100) throw new Error('EMPTY_BUFFER');
    return buf;
}

cmd({
    pattern:  'fulldp',
    alias:    ['fullpp', 'setdp', 'setfulldp', 'changedp'],
    desc:     'Set full-style profile picture for the bot (Owner Only)',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {

    // ── 1. Owner guard ──────────────────────────────────
    if (!isOwner) {
        return reply('⚠️ *Only bot owner can change profile picture.*');
    }

    // ── 2. Must reply to a message ──────────────────────
    if (!mek.quoted) {
        return reply(
            `🖼️ *How to use:*\nReply to any image with *.fulldp*\n_Example: reply an image and type .fulldp_`
        );
    }

    // ── 3. Check it is an image ─────────────────────────
    const qtype = (mek.quoted.type || '').toLowerCase();
    if (!qtype.includes('image')) {
        return reply(`❌ *Please reply to an IMAGE only.*\n_Detected type: ${qtype || 'unknown'}_`);
    }

    // ── 4. Download original image (no resize/crop) ──────
    let imgBuf;
    try {
        imgBuf = await mek.quoted.download();
    } catch {
        try {
            imgBuf = await downloadImageBuffer(mek.quoted);
        } catch (e) {
            console.error('[FULLDP] Download failed:', e.message);
            return reply('❌ *Failed to download image.* Try again.');
        }
    }

    if (!imgBuf || imgBuf.length < 100) {
        return reply('❌ *Image buffer empty.* Try forwarding the image first.');
    }

    // ── 5. Apply full image as-is ─────────────────────────
    try {
        await conn.updateProfilePicture(conn.user.id, imgBuf);
    } catch (e) {
        const msg = e.message || '';
        console.error('[FULLDP] updateProfilePicture error:', msg);
        if (msg.includes('not-authorized') || msg.includes('403')) {
            return reply(
                '❌ *WhatsApp blocked this action.*\n' +
                '_Rate limit hit — wait a few hours and try again._'
            );
        }
        return reply(`❌ *Failed to set DP:* ${msg || 'Unknown error'}`);
    }

    // ── 6. Success ────────────────────────────────────────
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    return reply(
        '✅ *Profile picture updated successfully!*\n' +
        '> ⏳ May take a few seconds to show on WhatsApp.'
    );
});
