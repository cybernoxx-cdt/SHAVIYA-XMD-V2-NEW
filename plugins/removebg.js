const { cmd } = require('../command');
const axios = require('axios');
const { TelegraPh } = require('../lib/telegraph');

cmd({
    pattern: "removebg",
    alias: ["rmbg", "nobg"],
    react: "🖼️",
    desc: "Remove Image Background",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {

    try {

        const quoted = mek.quoted;

        if (!quoted) {
            return reply("🖼️ Reply To An Image");
        }

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        // Download replied image
        const media = await quoted.download();

        if (!media) {
            return reply("❌ Failed To Download Image");
        }

        // Upload image to Telegraph
        const imageUrl = await TelegraPh(media);

        if (!imageUrl) {
            return reply("❌ Telegraph Upload Failed");
        }

        // RemoveBG API
        const api = `https://whiteshadow-x-api.onrender.com/api/ai/removebg?url=${encodeURIComponent(imageUrl)}&apitoken=e76n2P`;

        const { data } = await axios.get(api, {
            timeout: 120000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!data.status || !data.resultsImage) {
            return reply("❌ Failed To Remove Background");
        }

        await conn.sendMessage(
            from,
            {
                image: { url: data.resultsImage },
                caption: "> Powered By SHAVIYA-XMD"
            },
            { quoted: mek }
        );

        await conn.sendMessage(from, {
            react: {
                text: "✅",
                key: mek.key
            }
        });

    } catch (err) {

        console.log(err);

        await conn.sendMessage(from, {
            react: {
                text: "❌",
                key: mek.key
            }
        });

        reply(`❌ RemoveBG Failed\n\n${err.message}`);
    }
});
