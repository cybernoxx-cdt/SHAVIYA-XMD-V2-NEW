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

        if (!m.quoted) {
            return reply("🖼️ Reply To An Image");
        }

        const mime = m.quoted.mimetype || "";

        if (!mime.includes("image")) {
            return reply("🖼️ Reply To An Image");
        }

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        const media = await m.quoted.download();

        if (!media) {
            return reply("❌ Image Download Failed");
        }

        const imageUrl = await TelegraPh(media);

        if (!imageUrl) {
            return reply("❌ Telegraph Upload Failed");
        }

        const api = `https://whiteshadow-x-api.onrender.com/api/ai/removebg?url=${encodeURIComponent(imageUrl)}&apitoken=e76n2P`;

        const { data } = await axios.get(api, {
            timeout: 120000
        });

        if (!data.status || !data.resultsImage) {
            return reply("❌ RemoveBG API Failed");
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

        console.log("REMOVEBG ERROR:", err.response?.data || err);

        await conn.sendMessage(from, {
            react: {
                text: "❌",
                key: mek.key
            }
        });

        reply(
            JSON.stringify(
                err.response?.data || err.message,
                null,
                2
            )
        );
    }
});
