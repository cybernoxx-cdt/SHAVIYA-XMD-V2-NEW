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
async (conn, mek, m, { from, q, reply }) => {

    try {

        if (!q) {
            return reply(`🧠 *DeepSeek R1 AI*

Example:
.deepseek Hello
.deepseek Write a WhatsApp Bot`);
        }

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        const api = `https://whiteshadow-x-api.onrender.com/api/ai/deepseekr1?q=${encodeURIComponent(q)}&think=true&apitoken=e76n2P`;

        const { data } = await axios.get(api, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!data.status) {
            return reply("❌ Failed To Get Response From DeepSeek API");
        }

        const answer = data.result?.answer || "No Answer";
        const reasoning = data.result?.reasoning || "No Thinking Data";

        const msg = `╭━━〔 🧠 DEEPSEEK R1 〕━━⬣
┃❍ Query : ${q}
╰━━━━━━━━━━━━⬣

🤔 *Thinking*
${reasoning}

━━━━━━━━━━━━━━⬣

💬 *Answer*
${answer}

> Powered By SHAVIYA-XMD`;

        await conn.sendMessage(
            from,
            {
                text: msg
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

        reply(`❌ DeepSeek Error\n\n${e.message}`);
    }
});
