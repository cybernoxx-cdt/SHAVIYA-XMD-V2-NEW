const { cmd } = require('../command');
const axios = require('axios');
const { TelegraPh } = require('../lib/telegraph'); // telegraph uploader path

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

        const quoted = mek.quoted || mek.msg?.contextInfo?.quotedMessage;

        if (!quoted) {
            return reply("🖼️ Reply To An Image");
        }

        const mime = (mek.quoted?.mimetype || "");

        if (!mime.startsWith("image")) {
            return reply("❌ Please Reply To An Image");
        }

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        // Download Image
        const media = await mek.quoted.download();

        // Upload To Telegraph
        const imageUrl = await TelegraPh(media);

        // Remove Background API
        const api = `https://whiteshadow-x-api.onrender.com/api/ai/removebg?url=${encodeURIComponent(imageUrl)}&apitoken=e76n2P`;

        const { data } = await axios.get(api, {
            timeout: 120000
        });

        const result =
            data.result ||
            data.url ||
            data.image ||
            data.output ||
            data.download_url;

        if (!result) {
            return reply("❌ Failed To Remove Background");
        }

        await conn.sendMessage(
            from,
            {
                image: { url: result },
                caption:
`╭━━〔 🖼️ REMOVE BG 〕━━⬣
┃ ✅ Background Removed
╰━━━━━━━━━━━━⬣

> Powered By SHAVIYA-XMD`
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

        reply(
`❌ RemoveBG Failed

${err.message}`
        );
    }
});
