const { cmd } = require("../command");
const axios = require("axios");

// ───────── CONFIGURATION ─────────
const API_BASE  = "https://whiteshadow-x-api.onrender.com/api/ai/text2img";
const API_TOKEN = "e76n2P";
const FOOTER    = "🎗 𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐀𝐈 𝐈𝐌𝐀𝐆𝐄 🔰";

cmd({
    pattern: "text2img",
    alias: ["text2img3", "genimg", "t2i", "aiimage"],
    desc: "Generate AI Images and send the actual image",
    category: "ai",
    react: "🎨",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        // Prompt එකක් ලබාදී ඇත්දැයි පරීක්ෂා කිරීම
        if (!q) return reply("❌ කරුණාකර නිර්මාණය කිරීමට අවශ්‍ය රූපය ගැන විස්තරයක් (Prompt) ලබාදෙන්න.\n\n*උදා:* `.text2img a golden retriever playing in a park`");

        // Reaction එකක් යැවීම
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        // 1. API එකෙන් Image URL එක ලබාගැනීම (WhiteShadow API)
        const apiUrl = `${API_BASE}?prompt=${encodeURIComponent(q)}&apitoken=${API_TOKEN}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });

        const data = response.data;
        if (!data || !data.success || !data.image) {
            return reply("❌ රූපය නිර්මාණය කිරීමේදී දෝෂයක් සිදු විය. පසුව උත්සාහ කරන්න.");
        }

        const imageUrl    = data.image;
        const finalPrompt = data.prompt || q;

        // 2. Image URL එක Buffer එකක් ලෙස බාගත කිරීම (සැබෑ රූපය යැවීමට මෙය අත්‍යවශ්‍ය වේ)
        const imageBuffer = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000 });

        await conn.sendMessage(from, { react: { text: "🖼️", key: m.key } });

        // 3. සැබෑ රූපය (Image) Caption එක සමඟ යැවීම
        await conn.sendMessage(from, {
            image: Buffer.from(imageBuffer.data),
            caption: `🎨 *AI Generated Image*\n\n✨ *Prompt:* ${finalPrompt}\n\n${FOOTER}`
        }, { quoted: mek });

        // සාර්ථක බව පෙන්වීමට Reaction එකක්
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
        console.error("❌ AI Image Error:", e.message);
        reply(`❌ Error: ${e.message}`);
    }
});
