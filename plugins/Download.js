const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp'); // sharp එක අනිවාර්යයෙන් install කර තිබිය යුතුය

// ඔබේ ස්ථාවර thumbnail ලින්ක් එක
const fixed_thumb_url = "https://files.catbox.moe/f18ceb.jpg";
const cinesubz_footer = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰"; // Footer text එක

// ───────── Create thumbnail ─────────
async function makeThumbnail(url) {
    try {
        console.log("🖼️ Generating thumbnail..."); // CONSOLE: පින්තූරය සාදන බව පෙන්වයි
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        console.log("❌ Thumbnail error:", e.message); // CONSOLE: දෝෂයක් ඇත්නම් පෙන්වයි
        return null;
    }
}

cmd({
    pattern: "download",
    alias: ["downurl"],
    react: "🔰",
    desc: "Download with original file name, thumbnail and footer.",
    category: "downloader",
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❗ කරුණාකර download link එකක් ලබා දෙන්න.");

        let link = q.trim();
        const urlPattern = /^(https?:\/\/[^\s]+)/;
        if (!urlPattern.test(link)) return reply("❗ URL එක වැරදියි.");

        console.log(`📥 Starting download for: ${link}`); // CONSOLE: බාගත කිරීම ආරම්භ කළ බව පෙන්වයි
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        // 🔍 Pixeldrain නම් API ලින්ක් එකට හරවන්න (Hotlink protection)
        if (link.includes("pixeldrain.com/u/")) {
            console.log("🔗 Pixeldrain link detected, converting to API link..."); // CONSOLE: ලින්ක් එක පරිවර්තනය කරන බව පෙන්වයි
            const fileId = link.split('/').pop();
            link = `https://pixeldrain.com/api/file/${fileId}?download`;
        }

        // 🔍 සර්වර් එකෙන් Headers ලබා ගැනීම
        let fileName = "SHAVIYA-XMD V2-File.mp4"; // Default නම
        
        try {
            console.log("🌐 Fetching server headers..."); // CONSOLE: සර්වර් එකෙන් තොරතුරු ඉල්ලන බව පෙන්වයි
            const response = await axios.head(link, { 
                maxRedirects: 10,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (response.headers['content-disposition']) {
                const disposition = response.headers['content-disposition'];
                const match = disposition.match(/filename=(?:["']([^"']+)["']|([^;]+))/);
                if (match) {
                    fileName = match[1] || match[2];
                    console.log(`🏷️ File name found: ${fileName}`); // CONSOLE: ෆයිල් නම සොයාගත් බව පෙන්වයි
                }
            }
        } catch (e) {
            console.log("Could not get header, using default name."); // CONSOLE: දෝෂයක් ඇත්නම් පෙන්වයි
        }

        // URL එකෙන් නම ගැනීමට උත්සාහ කිරීම (Header එකෙන් නැතිනම්)
        if (fileName === "SHAVIYA-XMD V2-File.mp4") {
            try {
                const urlName = new URL(link).pathname.split('/').pop();
                if (urlName) {
                    fileName = decodeURIComponent(urlName);
                    console.log(`🏷️ File name extracted from URL: ${fileName}`); // CONSOLE: URL එකෙන් නම ගත් බව පෙන්වයි
                }
            } catch (e) {}
        }

        // 💡 ගොනුවේ නම සහ Footer එක එකතු කිරීම
        let info = `🎬 *${fileName}*\n\n${cinesubz_footer}`;
        console.log(`📝 Caption generated: ${info}`); // CONSOLE: Caption එක පෙන්වයි

        // 🖼️ Thumbnail එක සාදා ගැනීම
        const thumb = await makeThumbnail(fixed_thumb_url);

        console.log("🚀 Sending document..."); // CONSOLE: ෆයිල් එක යවන බව පෙන්වයි
        await conn.sendMessage(from, {
            document: { url: link },
            mimetype: "video/mp4",
            fileName: fileName,
            jpegThumbnail: thumb || undefined, // Thumbnail එක මෙතනින් එකතු වේ
            caption: info // නම සහ Footer සහිත caption එක
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
        console.log("✅ Process completed successfully."); // CONSOLE: සාර්ථකව නිම වූ බව පෙන්වයි

    } catch (e) {
        console.log("❌ CRITICAL ERROR:", e); // CONSOLE: දෝෂයක් ඇත්නම් පෙන්වයි
        reply(`❌ Error: ${e.message}`);
    }
});
