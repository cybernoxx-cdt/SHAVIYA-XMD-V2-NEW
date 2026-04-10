const { cmd } = require("../command");
const axios = require("axios");

// ───────── CONFIGURATION ─────────
const FOOTER = "✫☘ 𝐇𝐀𝐒𝐈𝐘𝐀-𝐌𝐃 𝐀𝐈 𝐈𝐌𝐀𝐆𝐄 ☘";

cmd({
    pattern: "text2img",
    alias: ["text2img3", "genimg", "imagine"],
    desc: "Generate AI Images and send the actual image",
    category: "ai",
    react: "🎨",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        // Prompt එකක් ලබාදී ඇත්දැයි පරීක්ෂා කිරීම
        if (!q) return reply("❌ කරුණාකර නිර්මාණය කිරීමට අවශ්‍ය රූපය ගැන විස්තරයක් (Prompt) ලබාදෙන්න.\n\n*උදා:* `.aiimage a golden retriever playing in a park`.");

        // Reaction එකක් යැවීම
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        // 1. API එකෙන් Image URL එක ලබාගැනීම
        const apiUrl = `https://api.xte.web.id/ai/text2img?prompt=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);

        if (!response.data || !response.data.status || !response.data.result.url) {
            return reply("❌ රූපය නිර්මාණය කිරීමේදී දෝෂයක් සිදු විය. පසුව උත්සාහ කරන්න.");
        }

        const imageUrl = response.data.result.url;
        const finalPrompt = response.data.result.prompt;

        // 2. Image URL එක Buffer එකක් ලෙස බාගත කිරීම (සැබෑ රූපය යැවීමට මෙය අත්‍යවශ්‍ය වේ)
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });

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
