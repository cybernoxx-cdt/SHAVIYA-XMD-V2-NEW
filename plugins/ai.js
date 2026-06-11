const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "deepseek",
    alias: ["ds", "ai"],
    react: "🧠",
    desc: "DeepSeek R1 AI Chat",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, {
    from,
    q,
    reply
}) => {

    try {

        if (!q) {
            return reply(
                "*🧠 DeepSeek R1 AI*\n\n" +
                "Example:\n" +
                ".deepseek Hello\n" +
                ".deepseek Write a WhatsApp bot"
            );
        }

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "⏳",
                    key: mek.key
                }
            }
        );

        const api =
        `https://whiteshadow-x-api.onrender.com/api/ai/deepseekr1?q=${encodeURIComponent(q)}&think=true&apitoken=e76n2P`;

        const { data } = await axios.get(api, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        let result = "";

        if (typeof data === "string") {
            result = data;
        }

        else if (data.result) {
            result = data.result;
        }

        else if (data.response) {
            result = data.response;
        }

        else if (data.answer) {
            result = data.answer;
        }

        else if (data.message) {
            result = data.message;
        }

        else {
            result = JSON.stringify(data, null, 2);
        }

        await conn.sendMessage(
            from,
            {
                text:
                `╭━━〔 🧠 DEEPSEEK R1 〕━━⬣\n` +
                `┃❍ Query : ${q}\n` +
                `╰━━━━━━━━━━━━⬣\n\n` +
                `${result}\n\n` +
                `> Powered By SHAVIYA-XMD`
            },
            { quoted: mek }
        );

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "✅",
                    key: mek.key
                }
            }
        );

    } catch (err) {

        console.log(err);

        reply(
            `❌ DeepSeek Error\n\n${err.message}`
        );
    }
});
