const { cmd } = require('../command');
const { fetchJson } = require('../lib/functions');

const footer = "> © Powerd by Sʜᴀᴠɪʏᴀ-Xᴍᴅ 🌝";
const menuImage = "https://files.catbox.moe/8fxouz.jpg";

let isChoosing = false;
let isChoosingQuality = false;

cmd({
    pattern: "xnxx",
    alias: ["xvdl", "xxx", "phv"],
    use: ".xnxx <video name>",
    react: "🤤",
    desc: "Search & download xnxx.com videos (18+).",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { q, from, reply }) => {

    try {
        if (!q) return await reply("❌ Please enter a video name!");

        isChoosing = false;
        isChoosingQuality = false;

        const searchApi = await fetchJson(
            `https://tharuzz-ofc-api-v2.vercel.app/api/search/xvsearch?query=${encodeURIComponent(q)}`
        );

        if (!searchApi.result?.xvideos?.length)
            return await reply("❌ No results found!");

        let listText = "🤤 𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 XNXX SEARCH RESULTS\n\n🔢 *Reply a number to choose a result.*\n\n";

        searchApi.result.xvideos.forEach((item, i) => {
            listText += `*${i + 1}.* | ${item.title || "No title"}\n`;
        });

        const listMsg = await conn.sendMessage(
            from,
            {
                image: { url: menuImage },
                caption: listText + `\n\n${footer}`
            },
            { quoted: mek }
        );

        const handleChoose = async (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            const txt =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text;

            const isReply =
                msg.message.extendedTextMessage?.contextInfo?.stanzaId === listMsg.key.id;

            if (!isReply) return;
            if (isChoosing) return; // 🔒 lock prevents duplicate triggers
            isChoosing = true;

            const index = parseInt(txt.trim()) - 1;

            if (isNaN(index) || index < 0 || index >= searchApi.result.xvideos.length) {
                isChoosing = false;
                return await reply("❌ Invalid number!");
            }

            const chosen = searchApi.result.xvideos[index];

            const downloadApi = await fetchJson(
                `https://tharuzz-ofc-api-v2.vercel.app/api/download/xvdl?url=${chosen.link}`
            );

            const info = downloadApi.result;
            const HQ = info.dl_Links.highquality;
            const LQ = info.dl_Links.lowquality;

            const askMsg = await conn.sendMessage(
                from,
                {
                    image: { url: info.thumbnail },
                    caption:
                        `*🔞 VIDEO INFO*\n\n` +
                        `*Title:* ${info.title}\n` +
                        `*Duration:* ${info.duration}\n\n` +
                        `Reply number:\n1 | High Quality\n2 | Low Quality\n\n${footer}`
                },
                { quoted: msg }
            );

            const handleQuality = async (u) => {
                const t = u.messages?.[0];
                if (!t?.message) return;

                const choice =
                    t.message.conversation ||
                    t.message.extendedTextMessage?.text;

                const isReplyQ =
                    t.message.extendedTextMessage?.contextInfo?.stanzaId === askMsg.key.id;

                if (!isReplyQ) return;
                if (isChoosingQuality) return; // 🔒 prevents double
                isChoosingQuality = true;

                let sendURL;

                if (choice.trim() === "1") sendURL = HQ;
                else if (choice.trim() === "2") sendURL = LQ;
                else {
                    isChoosingQuality = false;
                    return await reply("❌ Enter *1* or *2* only!");
                }

                // ⬇️ Download reaction
                await conn.sendMessage(from, {
                    react: { text: "⬇️", key: t.key }
                });

                // ⬆️ Upload reaction
                await conn.sendMessage(from, {
                    react: { text: "⬆️", key: t.key }
                });

                // Send Video
                await conn.sendMessage(
                    from,
                    {
                        video: { url: sendURL },
                        caption: `🔞 Video\n> ${info.title}`
                    },
                    { quoted: t }
                );

                // ✔️ Done reaction
                await conn.sendMessage(from, {
                    react: { text: "✔️", key: t.key }
                });

                isChoosing = false;
                isChoosingQuality = false;
            };

            conn.ev.on("messages.upsert", handleQuality);
        };

        conn.ev.on("messages.upsert", handleChoose);

    } catch (err) {
        console.log(err);
        await reply("❌ Error: " + err);
    }
});
