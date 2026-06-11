const { cmd } = require('../command');
const axios = require('axios');

async function getDeepSeek(query) {
    const { data } = await axios.get(
        `https://whiteshadow-x-api.onrender.com/api/ai/deepseekr1?q=${encodeURIComponent(query)}&think=true&apitoken=e76n2P`,
        {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        }
    );

    return data;
}

// Answer Only
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

        if (!q) return reply("Please provide a prompt.");

        const data = await getDeepSeek(q);

        const answer = data.result?.answer || "No response.";

        await conn.sendMessage(
            from,
            {
                text: `${answer}\n\n> Powered By SHAVIYA-XMD`
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`Error: ${e.message}`);
    }
});

// Thinking + Answer
cmd({
    pattern: "thinking",
    react: "🤔",
    desc: "DeepSeek Thinking",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {

    try {

        if (!q) return reply("Please provide a prompt.");

        const data = await getDeepSeek(q);

        const thinking = data.result?.reasoning || "No thinking available.";
        const answer = data.result?.answer || "No response.";

        await conn.sendMessage(
            from,
            {
                text: `${thinking}\n\n${answer}\n\n> Powered By SHAVIYA-XMD`
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`Error: ${e.message}`);
    }
});
