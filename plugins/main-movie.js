const { cmd, commands } = require("../command");
const axios = require("axios");

// ----- Multi-Reply Smart Waiter -----
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            // ✅ FIX: correct chat + correct user (no @lid bypass)
            if (msg.key.remoteJid !== from) return;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            if (!msgSender.includes(sender.split('@')[0])) return;

            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const isTargetReply = context?.stanzaId === targetId;

            if (isTargetReply && !isNaN(text) && text.trim() !== "") {
                conn.ev.off("messages.upsert", handler);
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 1800000); // 30 min
    });
}

cmd({
    pattern: "movie",
    alias: ["allmovie"],
    desc: "Ultimate Multi-reply movie engine",
    category: "downloader",
    react: "🎬",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ කරුණාකර සෙවිය යුතු ෆිල්ම් එකේ නම ලබා දෙන්න.");

        const posterUrl = "https://whiteshadow-uploader.vercel.app/files/jfk.jpg";

        let menu = `╭━━━〔 🎬 SHAVIYA-XMD V2 MOVIE ENGINE 〕━━━⬣
┃
┃ 🔍 𝙎𝙚𝙖𝙧𝙘𝙝 :  *${q.toUpperCase()}*
┃
┃ ──「 🎞️ 𝙎𝙤𝙪𝙧𝙘𝙚 𝙎𝙚𝙡𝙚𝙘𝙩𝙞𝙤𝙣 」──
┃
┃ ➊  *Sinhalasub*
┃ ➋  *Cinesubz*
┃ ➌  *CineTV* _(Movies & TV Series)_
┃ ➍  *Dinka Sinhalasub*
┃ ➎  *SL Anime Club*
┃ ➏  *Pirate.lk*
┃ ➐  *Moviesublk*
┃
┃ ─────────────────⬣
┃ 💬 Reply with number to continue
┃ 🔢 *අංකය Reply කරන්න*
┃
╰━━━〔 🌏 SHAVIYA-XMD V2 MOVIE LK 〕━━━⬣
        ⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀꜱɪʏᴀ ᴛᴇᴄʜ ⚡`;

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

                    if      (selText === '1') targetPattern = "sinhalasub";
                    else if (selText === '2') targetPattern = "cinesubz";
                    else if (selText === '3') targetPattern = "cinetv";
                    else if (selText === '4') targetPattern = "dinka";
                    else if (selText === '5') targetPattern = "anime";
                    else if (selText === '6') targetPattern = "pirate";
                    else if (selText === '7') targetPattern = "moviesub";

                    if (targetPattern) {
                        await conn.sendMessage(from, { react: { text: "🔍", key: selection.msg.key } });

                        const selectedCmd = commands.find((c) => c.pattern === targetPattern);
                        if (selectedCmd) {
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
