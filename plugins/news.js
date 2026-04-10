const axios = require('axios');
const { cmd } = require('../command');

// Fake vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Shaviya",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94707085822:+94707085822
END:VCARD`
        }
    }
};

cmd({
    pattern: "news3",
    alias: ["sirasa","sirasanews"],
    desc: "Get latest Sirasa news.",
    category: "news",
    react: "📰",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const response = await axios.get("https://appi.srihub.store/news/sirasa?apikey=dew_1TqE8N6MtFQH7myhpydg9K0XCgjNJVwyUJEE0Pic");

        if (!response.data.status) 
            return reply("⚠️ Could not fetch Sirasa news.");

        const newsList = response.data.result;
        const allNews = Array.isArray(newsList) ? newsList : [newsList];

        for (let news of allNews) {

            let message = `
📰 *${news.title}*

📅 *Date:* ${news.date}

${news.desc}

🔗 *Read More:* ${news.url}

> © Powered by Sʜᴀᴠɪʏᴀ-Xᴍᴅ 🍄
            `;

            if (news.image) {
                await conn.sendMessage(
                    from, 
                    { 
                        image: { url: news.image }, 
                        caption: message 
                    },
                    { quoted: fakevCard } // ✅ vCard add here
                );
            } else {
                await conn.sendMessage(
                    from, 
                    { text: message },
                    { quoted: fakevCard } // ✅ vCard add here
                );
            }

            await new Promise(res => setTimeout(res, 500));
        }

        await conn.sendMessage(from, {
            text: "✅ *All news sent successfully!*"
        });

    } catch (err) {
        console.error(err);
        reply("❌ Error: Cannot fetch Sirasa news.");
    }
});
