const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "web2zip",
    alias: ["saveweb", "sitezip"],
    react: "🌐",
    desc: "Convert Website To ZIP",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {

    try {

        if (!q) {
            return reply("Example:\n.web2zip https://fast.com");
        }

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        const api = `https://whiteshadow-x-api.onrender.com/api/tools/saveweb2zip?url=${encodeURIComponent(q)}&apitoken=e76n2P`;

        const { data } = await axios.get(api, {
            timeout: 120000
        });

        if (!data.status || !data.result?.download_link) {
            return reply("❌ Failed To Create ZIP");
        }

        const zipUrl = data.result.download_link;
        const website = data.result.website;
        const files = data.result.files_copied;

        await conn.sendMessage(
            from,
            {
                document: { url: zipUrl },
                mimetype: "application/zip",
                fileName: `${new URL(website).hostname}.zip`,
                caption: `╭━━〔 🌐 WEB TO ZIP 〕━━⬣
┃ 🌍 Website : ${website}
┃ 📁 Files Copied : ${files}
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

        await conn.sendMessage(from, {
            react: {
                text: "❌",
                key: mek.key
            }
        });

        reply(`❌ Web2Zip Failed\n\n${err.message}`);
    }
});
