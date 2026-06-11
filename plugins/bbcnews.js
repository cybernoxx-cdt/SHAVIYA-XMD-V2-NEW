const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "bbc",
    alias: ["newsbbc"],
    react: "📰",
    desc: "Latest BBC Sinhala News",
    category: "news",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {

    try {

        const limit = q || "1";

        const api = `https://bbc-whiteshadow.vercel.app/?limit=${limit}`;

        const { data } = await axios.get(api, {
            timeout: 60000
        });

        if (!data.success || !data.result || data.result.length < 1) {
            return reply("❌ No BBC News Found");
        }

        const news = data.result[0];

        let caption = `📰 *BBC SINHALA NEWS*\n\n`;
        caption += `📌 *Title:* ${news.title}\n\n`;

        if (news.timestamp) {
            caption += `📅 *Date:* ${news.timestamp}\n\n`;
        }

        if (news.content) {
            let content = news.content.substring(0, 1500);

            if (news.content.length > 1500) {
                content += "\n\n...";
            }

            caption += `${content}\n\n`;
        }

        caption += `🔗 ${news.url}\n\n`;
        caption += `> Powered By SHAVIYA-XMD`;

        if (news.imageUrl) {
            await conn.sendMessage(
                from,
                {
                    image: { url: news.imageUrl },
                    caption
                },
                { quoted: mek }
            );
        } else {
            await conn.sendMessage(
                from,
                { text: caption },
                { quoted: mek }
            );
        }

    } catch (err) {

        console.log(err);

        reply(`❌ BBC Error\n\n${err.message}`);
    }
});
