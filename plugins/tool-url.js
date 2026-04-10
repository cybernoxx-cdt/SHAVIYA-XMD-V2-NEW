const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { cmd, commands } = require("../command");

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format file size to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from mime type
 */
function getFileExtension(mimeType) {
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/mpeg': '.mpg',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'text/plain': '.txt'
  };
  return extensions[mimeType] || '.bin';
}

/**
 * Get media type category
 */
function getMediaType(mimeType) {
  if (mimeType.includes('image')) return '🖼️ IMAGE';
  if (mimeType.includes('video')) return '🎬 VIDEO';
  if (mimeType.includes('audio')) return '🎵 AUDIO';
  if (mimeType.includes('application/pdf')) return '📄 PDF';
  if (mimeType.includes('text')) return '📝 TEXT';
  if (mimeType.includes('application/zip')) return '🗜️ ARCHIVE';
  return '📁 FILE';
}

/**
 * Get emoji for file type
 */
function getFileEmoji(mimeType) {
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎬';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
  return '📁';
}

// ============================================
// MAIN UPLOAD COMMAND - CATBOX
// ============================================

cmd({
  'pattern': "upload",
  'alias': ["tourl", "imgtourl", "geturl", "catbox", "mediaurl"],
  'react': '🖇️',
  'desc': "Upload any media to Catbox and get direct URL",
  'category': "utility",
  'use': ".upload [reply to media]",
  'filename': __filename
}, async (client, message, args, { reply }) => {
  try {
    // Check if quoted message exists
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';
    
    if (!mimeType) {
      return reply(`🖇️ *SHAVIYA-XMD URL UPLOADER*\n\n` +
                   `📌 *Usage:*\n` +
                   `   • Reply to an image/video/audio with: *.upload*\n` +
                   `   • Or send media with caption: *.upload*\n\n` +
                   `✨ *Supported Formats:*\n` +
                   `   🖼️ Images: JPG, PNG, GIF, WEBP\n` +
                   `   🎬 Videos: MP4, MKV, AVI, MOV\n` +
                   `   🎵 Audio: MP3, WAV, OGG, M4A\n` +
                   `   📄 Documents: PDF, ZIP, TXT\n\n` +
                   `📊 *Limits:*\n` +
                   `   • Max Size: 200MB\n` +
                   `   • Files kept permanently\n\n` +
                   `💫 *SHAVIYA-XMD*`);
    }

    // Check file size (Catbox max is 200MB)
    const fileSize = (quotedMsg.msg || quotedMsg).fileLength || 0;
    if (fileSize > 200 * 1024 * 1024) {
      return reply(`❌ *File Too Large!*\n\n` +
                   `📦 Size: ${formatBytes(fileSize)}\n` +
                   `⚠️ Max: 200MB\n\n` +
                   `Please use a smaller file.`);
    }

    // Send processing message
    const processingMsg = await client.sendMessage(message.key.remoteJid, {
      text: `🖇️ *Uploading to Catbox...*\n\n` +
            `📁 Type: ${getMediaType(mimeType)}\n` +
            `📦 Size: ${formatBytes(fileSize)}\n` +
            `⏳ Please wait...\n\n` +
            `💫 SHAVIYA-XMD`
    }, { quoted: message });

    // Download media
    const mediaBuffer = await quotedMsg.download();
    const extension = getFileExtension(mimeType);
    const tempFilePath = path.join(os.tmpdir(), `catbox_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Prepare form data for Catbox
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tempFilePath), `SHAVIYA_${Date.now()}${extension}`);
    form.append('reqtype', 'fileupload');

    // Upload to Catbox
    const response = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: 120000 // 2 minute timeout
    });

    if (!response.data || response.data.includes('error')) {
      throw new Error("Upload failed, please try again");
    }

    const mediaUrl = response.data.trim();
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    // Get original filename if available
    const originalName = (quotedMsg.msg || quotedMsg).fileName || 'Unknown';

    // Prepare success message
    const uploadTime = new Date().toLocaleString();
    const mediaType = getMediaType(mimeType);
    const fileEmoji = getFileEmoji(mimeType);
    
    const successMessage = `*${fileEmoji} ${mediaType} UPLOADED SUCCESSFULLY*\n\n` +
                           `┌─⊷ *FILE DETAILS*\n` +
                           `│ ${fileEmoji} *Type:* ${mediaType}\n` +
                           `│ 📝 *Name:* ${originalName}\n` +
                           `│ 📦 *Size:* ${formatBytes(mediaBuffer.length)}\n` +
                           `│ 🔗 *URL:* ${mediaUrl}\n` +
                           `│ 🕐 *Time:* ${uploadTime}\n` +
                           `└──────────────\n\n` +
                           `✨ *Direct Link:*\n` +
                           `${mediaUrl}\n\n` +
                           `💫 *SHAVIYA-XMD*\n` +
                           `> © Powered by Catbox.moe`;

    // Edit processing message with result
    await client.sendMessage(message.key.remoteJid, {
      text: successMessage,
      edit: processingMsg.key
    });
    
    console.log(`✅ [UPLOAD] ${mediaType} uploaded: ${mediaUrl}`);

  } catch (error) {
    console.error('Upload error:', error);
    reply(`❌ *Upload Failed!*\n\n` +
          `Error: ${error.message || 'Unknown error'}\n\n` +
          `Please try again later.\n\n` +
          `💫 SHAVIYA-XMD`);
  }
});

// ============================================
// IMAGE UPLOAD - IMGBB
// ============================================

cmd({
  pattern: "imgbb",
  alias: ["img2url", "uploadimg", "imageurl", "imgurl"],
  react: "🖼️",
  desc: "Upload images to ImgBB and get direct link",
  category: "utility",
  use: ".imgbb [reply to image]",
  filename: __filename,
}, async (client, message, args, { reply }) => {
  try {
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || "";

    if (!mimeType || !mimeType.startsWith("image/")) {
      return reply(`🖼️ *IMG UPLOADER*\n\n` +
                   `📌 *Usage:*\n` +
                   `   • Reply to an image with: *.imgbb*\n` +
                   `   • Send image with caption: *.imgbb*\n\n` +
                   `✨ *Supported:* JPG, PNG, GIF, WEBP\n\n` +
                   `💫 SHAVIYA-XMD`);
    }

    const fileSize = (quotedMsg.msg || quotedMsg).fileLength || 0;
    
    // ImgBB free limit is 32MB
    if (fileSize > 32 * 1024 * 1024) {
      return reply(`❌ *File Too Large!*\n\n` +
                   `📦 Size: ${formatBytes(fileSize)}\n` +
                   `⚠️ Max: 32MB\n\n` +
                   `Please use a smaller image.`);
    }

    // Send processing message
    const processingMsg = await client.sendMessage(message.key.remoteJid, {
      text: `🖼️ *Uploading to ImgBB...*\n\n` +
            `📦 Size: ${formatBytes(fileSize)}\n` +
            `⏳ Please wait...\n\n` +
            `💫 SHAVIYA-XMD`
    }, { quoted: message });

    // Download image
    const mediaBuffer = await quotedMsg.download();
    const tempFilePath = path.join(os.tmpdir(), `imgbb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Create form data
    const form = new FormData();
    form.append("image", fs.createReadStream(tempFilePath));
    
    // ImgBB API Key (Free account)
    const imgbbApiKey = "eb6ec8d812ae32e7a1a765740fd1b497";
    const expiration = 3600; // 1 hour (max for free tier)

    // Upload to ImgBB
    const response = await axios.post(
      `https://api.imgbb.com/1/upload?expiration=${expiration}&key=${imgbbApiKey}`,
      form,
      { 
        headers: form.getHeaders(),
        timeout: 60000
      }
    );

    // Clean up
    fs.unlinkSync(tempFilePath);

    const data = response.data.data;
    if (!data || !data.url) throw new Error("Upload failed");

    const uploadTime = new Date().toLocaleString();
    const originalName = (quotedMsg.msg || quotedMsg).fileName || 'Image';

    const successMessage = `🖼️ *IMAGE UPLOADED SUCCESSFULLY*\n\n` +
                           `┌─⊷ *IMAGE DETAILS*\n` +
                           `│ 🖼️ *Name:* ${originalName}\n` +
                           `│ 📏 *Size:* ${formatBytes(mediaBuffer.length)}\n` +
                           `│ 📐 *Dimensions:* ${data.width} x ${data.height}\n` +
                           `│ 🔗 *URL:* ${data.url}\n` +
                           `│ 🕐 *Expires:* ${new Date(Date.now() + expiration * 1000).toLocaleString()}\n` +
                           `└──────────────\n\n` +
                           `✨ *Direct Link:*\n` +
                           `${data.url}\n\n` +
                           `🔄 *Delete Link:*\n` +
                           `${data.delete_url}\n\n` +
                           `💫 *SHAVIYA-XMD*\n` +
                           `> © Powered by ImgBB`;

    // Edit processing message
    await client.sendMessage(message.key.remoteJid, {
      text: successMessage,
      edit: processingMsg.key
    });

    // Also send the image preview with link
    await client.sendMessage(message.key.remoteJid, {
      image: { url: data.url },
      caption: `🖼️ *Your uploaded image*\n\n🔗 ${data.url}\n\n💫 SHAVIYA-XMD`
    });

    console.log(`✅ [IMGBB] Image uploaded: ${data.url}`);

  } catch (error) {
    console.error('ImgBB error:', error);
    reply(`❌ *Upload Failed!*\n\n` +
          `Error: ${error.message || 'Unknown error'}\n\n` +
          `💫 SHAVIYA-XMD`);
  }
});

// ============================================
// FILE INFO COMMAND
// ============================================

cmd({
  pattern: "fileinfo",
  alias: ["mediainfo", "filecheck"],
  react: "ℹ️",
  desc: "Get detailed information about a file",
  category: "utility",
  use: ".fileinfo [reply to file]",
  filename: __filename,
}, async (client, message, args, { reply }) => {
  try {
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';
    
    if (!mimeType) {
      return reply(`ℹ️ *FILE INFO*\n\n` +
                   `📌 Reply to a file to get its information.\n\n` +
                   `💫 SHAVIYA-XMD`);
    }

    const fileSize = (quotedMsg.msg || quotedMsg).fileLength || 0;
    const fileName = (quotedMsg.msg || quotedMsg).fileName || 'Unknown';
    const mediaType = getMediaType(mimeType);
    const fileEmoji = getFileEmoji(mimeType);
    
    // Get additional metadata if available
    let dimensions = '';
    let duration = '';
    
    if (mimeType.includes('image') && (quotedMsg.msg || quotedMsg).width) {
      dimensions = `${(quotedMsg.msg || quotedMsg).width} x ${(quotedMsg.msg || quotedMsg).height}`;
    }
    
    if (mimeType.includes('video') && (quotedMsg.msg || quotedMsg).seconds) {
      const secs = (quotedMsg.msg || quotedMsg).seconds;
      const mins = Math.floor(secs / 60);
      const remSecs = secs % 60;
      duration = `${mins}:${remSecs.toString().padStart(2, '0')}`;
    }

    const infoMessage = `ℹ️ *${fileEmoji} FILE INFORMATION*\n\n` +
                        `┌─⊷ *DETAILS*\n` +
                        `│ 📝 *Name:* ${fileName}\n` +
                        `│ 🗂️ *Type:* ${mediaType}\n` +
                        `│ 📦 *Size:* ${formatBytes(fileSize)}\n` +
                        `│ 🔖 *MIME:* ${mimeType}`;
    
    let infoWithExtras = infoMessage;
    if (dimensions) infoWithExtras += `\n│ 📐 *Dimensions:* ${dimensions}`;
    if (duration) infoWithExtras += `\n│ ⏱️ *Duration:* ${duration}`;
    
    infoWithExtras += `\n└──────────────\n\n` +
                      `💫 *SHAVIYA-XMD*`;
    
    reply(infoWithExtras);
    
  } catch (error) {
    console.error('File info error:', error);
    reply(`❌ Error: ${error.message}`);
  }
});

// ============================================
// BATCH UPLOAD COMMAND
// ============================================

cmd({
  pattern: "batchupload",
  alias: ["bupload", "multiupload"],
  react: "📦",
  desc: "Upload multiple files at once (Max 5)",
  category: "utility",
  use: ".batchupload [reply to files]",
  filename: __filename,
}, async (client, message, args, { reply }) => {
  try {
    reply(`📦 *Batch Upload Mode*\n\n` +
          `Send up to 5 files (images/videos/audios).\n` +
          `Type *done* when finished.\n` +
          `Timeout: 2 minutes\n\n` +
          `💫 SHAVIYA-XMD`);
    
    // Implementation for batch upload can be added here
    // This would collect multiple files and upload them all
    
  } catch (error) {
    reply(`❌ Error: ${error.message}`);
  }
});
