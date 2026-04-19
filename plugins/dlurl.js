const { cmd, commands } = require('../command');
const axios = require('axios');
const config = require('../config');

// Global Footer
const shaviya_footer = "> © ᴘᴏᴡᴇʀᴅ ʙʏ ꜱʜᴀᴠɪʏᴀ";

cmd({
    pattern: "dlurl",
    alias: ["download", "getfile"],
    desc: "Download files directly from a given URL.",
    category: "download",
    react: "📥",
    use: '.dlurl <Direct Link>',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("❒ Please provide a direct download link.");

        
        const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
        if (!urlPattern.test(q)) {
            return await reply("🤒 This is not a valid direct link. Please check the URL and try again.");
        }

        await reply("🥷 Processing your request and downloading the file. Please wait...");

        
        const response = await axios.get(q, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        
        // Extracting Filename from URL
        let fileName = q.split('/').pop().split('?')[0];
        if (!fileName || fileName.length < 3) {
            fileName = "Downloaded_File";
        }

        // Sending the document to the user
        await conn.sendMessage(from, {
            document: Buffer.from(response.data),
            mimetype: contentType,
            fileName: fileName,
            caption: `*✅ DOWNLOAD COMPLETE*\n\n*📂 File Name:* ${fileName}\n*📊 Content Type:* ${contentType}\n\n${shadow_footer}`
        }, { quoted: mek });

    } catch (e) {
        console.error("Download Error:", e);
        
        if (e.response && e.response.status === 404) {
            return await reply("❌ File not found (404). The link might be broken or expired.");
        }
        
        return await reply("❌ An error occurred during the download: " + e.message);
    }
});
