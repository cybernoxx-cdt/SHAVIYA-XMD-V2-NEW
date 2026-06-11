const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "bbc",
    alias: ["newsbbc"],
    desc: "Get latest BBC News",
    category: "news",
    react: "📰",
    filename: __filename
},
async (conn, mek, m, { from, reply, q }) => {
    try {

        const limit = q && !isNaN(q) ? q : "5";

        const api = `https://bbc-whiteshadow.vercel.app/?limit=${limit}`;

        const res = await axios.get(api, {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const data = res.data;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return reply("❌ BBC News not found.");
        }

        let msg = "📰 *BBC LATEST NEWS*\n\n";

        data.forEach((news, i) => {
            msg += `*${i + 1}. ${news.title || "No Title"}*\n`;

            if (news.description)
                msg += `📄 ${news.description}\n`;

            if (news.link)
                msg += `🔗 ${news.link}\n`;

            msg += "\n";
        });

        await conn.sendMessage(
            from,
            { text: msg },
            { quoted: mek }
        );

    } catch (e) {
        console.error(e);

        reply(
            `❌ BBC API Error\n\n${e.message}`
        );
    }
});
