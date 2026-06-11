const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "deepseek",
    alias: ["ds", "ai"],
    react: "🧠",
    desc: "DeepSeek AI",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {

    try {

        if (!q) {
            return reply(`Example:
.deepseek Hello
.deepseek Write a WhatsApp Bot`);
        }

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        const { data } = await axios.get(
            `https://whiteshadow-x-api.onrender.com/api/ai/deepseekr1?q=${encodeURIComponent(q)}&think=false&apitoken=e76n2P`,
            {
                timeout: 60000,
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            }
        );

        if (!data.success && !data.status) {
            return reply("Failed To Get Response From DeepSeek API");
        }

        const answer = data.result?.answer || "No Answer";

        await conn.sendMessage(
            from,
            {
                text: `${answer}

> Powered By SHAVIYA-XMD`
            },
            {
                quoted: mek
            }
        );

        await conn.sendMessage(from, {
            react: {
                text: "✅",
                key: mek.key
            }
        });

    } catch (e) {

        console.log(e);

        await conn.sendMessage(from, {
            react: {
                text: "❌",
                key: mek.key
            }
        });

        reply(`Error: ${e.message}`);
    }
});
