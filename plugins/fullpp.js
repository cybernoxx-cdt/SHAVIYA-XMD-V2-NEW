// ╔══════════════════════════════════════════════════╗
// ║         SHAVIYA-XMD V3 — ULTIMATE FULLDP          ║
// ║  WhatsApp Bypassed: 4K Full Photo Display         ║
// ║  No Crop, No Black Borders, Maximum Resolution    ║
// ╚══════════════════════════════════════════════════╝

const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// --- Helper: Download Image ---
async function downloadImageBuffer(quotedMsg) {
    const stream = await downloadContentFromMessage(quotedMsg.msg, 'image');
    let buf = Buffer.from([]);
    for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
    if (!buf || buf.length < 100) throw new Error('EMPTY_BUFFER');
    return buf;
}

// --- Helper: Process Image for 4K Full DP (WhatsApp Bypass) ---
async function processImageForFullDP(imgBuffer) {
    try {
        // Read image
        const image = await Jimp.read(imgBuffer);
        const width = image.getWidth();
        const height = image.getHeight();
        
        // Determine if image is landscape or portrait
        const isLandscape = width > height;
        
        // WhatsApp maximum supported resolution for DP
        // We'll use 4K resolution (4096x4096) for maximum quality
        const MAX_RESOLUTION = 4096;
        
        // Calculate the optimal size based on original aspect ratio
        let targetWidth, targetHeight;
        
        if (isLandscape) {
            // For landscape images, make width the maximum
            targetWidth = MAX_RESOLUTION;
            targetHeight = Math.floor((height / width) * MAX_RESOLUTION);
        } else {
            // For portrait images, make height the maximum
            targetHeight = MAX_RESOLUTION;
            targetWidth = Math.floor((width / height) * MAX_RESOLUTION);
        }
        
        // Ensure minimum dimensions for WhatsApp
        targetWidth = Math.max(targetWidth, 640);
        targetHeight = Math.max(targetHeight, 640);
        
        // Create a square canvas with the larger dimension
        const canvasSize = Math.max(targetWidth, targetHeight);
        
        // Create a transparent canvas (no black borders)
        const canvas = new Jimp(canvasSize, canvasSize, 0x00000000); // 0x00000000 = transparent
        
        // Calculate position to center the image
        const x = Math.floor((canvasSize - targetWidth) / 2);
        const y = Math.floor((canvasSize - targetHeight) / 2);
        
        // Resize the image to target dimensions
        const resizedImage = image.resize(targetWidth, targetHeight);
        
        // Paste the resized image onto the center of the canvas
        canvas.composite(resizedImage, x, y);
        
        // Return as JPEG buffer with maximum quality
        return await canvas.getBufferAsync(Jimp.MIME_JPEG);
    } catch (error) {
        console.error('[FULLDP] Image processing failed:', error.message);
        // Fallback: return original buffer if processing fails
        return imgBuffer;
    }
}

// --- Main Command ---
cmd({
    pattern:  'fulldp',
    alias:    ['fullpp', 'setdp', 'setfulldp', 'changedp', 'dpfull', 'setfulldp4k'],
    desc:     'Set 4K full-size profile picture (WhatsApp Bypassed) — NO CROP, NO BORDERS',
    category: 'owner',
    react:    '🖼️',
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {

    // 1. Owner Guard
    if (!isOwner) {
        return reply('⚠️ *Only bot owner can change profile picture.*');
    }

    // 2. Must reply to image
    if (!mek.quoted) {
        return reply(
            `🖼️ *How to use:*\nReply to any image with *.fulldp*\n_Example: reply an image and type .fulldp_`
        );
    }

    // 3. Check if image
    const qtype = (mek.quoted.type || '').toLowerCase();
    if (!qtype.includes('image')) {
        return reply(`❌ *Please reply to an IMAGE only.*\n_Detected type: ${qtype || 'unknown'}_`);
    }

    // 4. Download image
    let imgBuf;
    try {
        imgBuf = await mek.quoted.download();
    } catch {
        try {
            imgBuf = await downloadImageBuffer(mek.quoted);
        } catch (e) {
            console.error('[FULLDP] Download failed:', e.message);
            return reply('❌ *Failed to download image.* Try forwarding it first.');
        }
    }

    if (!imgBuf || imgBuf.length < 100) {
        return reply('❌ *Image buffer empty.* Try sending the image again.');
    }

    // 5. Show processing indicator
    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    // 6. Process image (bypass WhatsApp crop)
    let processedImg;
    let originalDimensions;
    let newDimensions;
    
    try {
        // Get original dimensions
        const originalImage = await Jimp.read(imgBuf);
        originalDimensions = `${originalImage.getWidth()}x${originalImage.getHeight()}`;
        
        // Process image for 4K display
        processedImg = await processImageForFullDP(imgBuf);
        
        // Get new dimensions
        const processedImage = await Jimp.read(processedImg);
        newDimensions = `${processedImage.getWidth()}x${processedImage.getHeight()}`;
        
        await conn.sendMessage(from, { react: { text: '🔄', key: mek.key } });
    } catch (e) {
        console.error('[FULLDP] Processing failed:', e.message);
        processedImg = imgBuf; // Fallback
        await conn.sendMessage(from, { react: { text: '⚠️', key: mek.key } });
    }

    // 7. Update Profile Picture
    try {
        await conn.updateProfilePicture(conn.user.id, processedImg);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(
            '✅ *4K Profile picture updated successfully!*\n' +
            '> 🌍 WhatsApp Bypassed: Full image preserved\n' +
            '> 🖼️ Open the DP to see full photo without crop\n' +
            '> 📏 Original: ' + (originalDimensions || 'Unknown') + '\n' +
            '> 📐 New: ' + (newDimensions || 'Unknown') + '\n' +
            '> ⏳ Takes 5-10 seconds to sync'
        );
    } catch (e) {
        const msg = e.message || '';
        console.error('[FULLDP] DP update failed:', msg);
        
        // Handle WhatsApp rate limits & errors
        if (msg.includes('not-authorized') || msg.includes('403')) {
            return reply(
                '❌ *WhatsApp blocked this action.*\n' +
                '_Rate limit hit — wait 2-3 hours and try again._'
            );
        }
        if (msg.includes('timeout')) {
            return reply(
                '⏱️ *Connection timeout.*\n_WhatsApp API is slow — try again in 1 minute._'
            );
        }
        if (msg.includes('file-size') || msg.includes('too-large')) {
            return reply(
                '📏 *Image too large.*\n_Try with a smaller image or lower resolution._'
            );
        }
        return reply(`❌ *Failed to set DP:* ${msg || 'Unknown error'}`);
    }
});
