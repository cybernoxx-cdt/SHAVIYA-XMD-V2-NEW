const { cmd, commands } = require("../command");
const axios = require("axios");

// ----- Multi-Reply Smart Waiter (Anime plugin logic) -----
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            
            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");

            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text)) {
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 600000); 
    });
}

cmd({
    pattern: "movie",
    alias: ["movie5"],
    desc: "Ultimate Multi-reply movie engine with fixed UI",
    category: "downloader",
    react: "🎬",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ කරුණාකර සෙවිය යුතු ෆිල්ම් එකේ නම ලබා දෙන්න.");

        const posterUrl = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

        // --- Premium UI Design ---
        let menu = `╭━━━〔 🎬 SHAVIYA-XMD V2 MOVIE ENGINE 〕━━━⬣
┃
┃ 🔍 𝙎𝙚𝙖𝙧𝙘𝙝 :  *${q.toUpperCase()}*
┃
┃ ──「 🎞️ 𝙎𝙤𝙪𝙧𝙘𝙚 𝙎𝙚𝙡𝙚𝙘𝙩𝙞𝙤𝙣 」──
┃
┃ ➊  *Sinhalasub*
┃ ➋  *Cinesubz*
┃ ➌  *Dinka Sinhalasub*
┃ ➍  *SL Anime Club*
┃ ➎  *Pirate.lk*
┃ ➏  *Moviesublk*
┃
┃ ─────────────────⬣
┃ 💬 Reply with number to continue
┃ 🔢 *අංකය Reply කරන්න*
┃
╰━━━〔 🌏 SHAVIYA-XMD V2 MOVIE LK 〕━━━⬣
        ⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀꜱɪʏᴀ ᴛᴇᴄʜ ⚡`;

        // Image එකක් ලෙස යැවීමෙන් පින්තූරය නොපෙනී යාමේ ගැටලුව ස්ථිරවම විසඳේ.
        const listMsg = await conn.sendMessage(from, { 
            image: { url: posterUrl }, 
            caption: menu 
        }, { quoted: m });

        // --- Multi-Reply Flow Control ---
        const startFlow = async () => {
            while (true) {
                const selection = await waitForReply(conn, from, sender, listMsg.key.id);
                if (!selection) break;

                (async () => {
                    let targetPattern = "";
                    const selText = selection.text;

                    if (selText === '1') targetPattern = "sinhalasub";
                    else if (selText === '2') targetPattern = "cinesubz";
                    else if (selText === '3') targetPattern = "dinka";
                    else if (selText === '4') targetPattern = "anime";
                    else if (selText === '5') targetPattern = "pirate";
                    else if (selText === '6') targetPattern = "moviesub";

                    if (targetPattern) {
                        await conn.sendMessage(from, { react: { text: "🔍", key: selection.msg.key } });
                        
                        const selectedCmd = commands.find((c) => c.pattern === targetPattern);
                        if (selectedCmd) {
                            // මෙතනදී q: q ලබා දීමෙන් මුල් සෙවුම් නමම පාවිච්චි වේ.
                            await selectedCmd.function(conn, selection.msg, selection.msg, { 
                                from, 
                                q: q, 
                                reply, 
                                isGroup: m.isGroup, 
                                sender: m.sender, 
                                pushname: m.pushname 
                            });
                        }
                    }
                })();
            }
        };

        startFlow();

    } catch (e) {
        console.error("Movie Engine Error:", e);
    }
});
