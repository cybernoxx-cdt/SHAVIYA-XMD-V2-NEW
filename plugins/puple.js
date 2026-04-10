const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");

// ───────── CONFIGURATION ─────────
const FOOTER = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
const FIXED_THUMB_URL = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

/**
 * 📸 Create Thumbnail Logic (ඔයාගේ Brand Image එක Document Thumbnail එක ලෙස සැකසීම)
 */
async function makeFixedThumbnail(url) {
    try {
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300, 300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        console.log(`[THUMBNAIL ERROR] ${e.message}`);
        return null;
    }
}

/**
 * ⏳ Multi-Reply Waiter (Infinity System)
 */
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            const text = (msg.message.conversation || msg.message?.extendedTextMessage?.text || "").trim();
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            
            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");

            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text)) {
                resolve({ msg, text });
            }
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => { 
            conn.ev.off("messages.upsert", handler); 
            resolve(null);
        }, 600000); // විනාඩි 10ක් වලංගුයි
    });
}

cmd({
    pattern: "pupilmv",
    alias: ["pupil"],
    desc: "🎥 Search Sinhala subbed movies with Brand Thumbnail & Infinity Reply",
    category: "media",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, sender, reply }) => {

    if (!q) return await conn.sendMessage(from, { text: "Use: .pupilvideo <movie name>" }, { quoted: mek });

    try {
        // --- CACHE LOGIC (ඔයාගේ මුල් logic එක එලෙසම) ---
        const cacheKey = `pupilvideo_${q.toLowerCase()}`;
        let data = typeof movieCache !== 'undefined' ? movieCache.get(cacheKey) : null;

        if (!data) {
            const url = `https://darkyasiya-new-movie-api.vercel.app/api/movie/pupil/search?q=${encodeURIComponent(q)}`;
            const res = await axios.get(url);
            data = res.data;

            if (!data.success || !data.data?.length) {
                throw new Error("No results found for your query.");
            }
            if (typeof movieCache !== 'undefined') movieCache.set(cacheKey, data);
        }

        const movieList = data.data.map((m, i) => ({
            number: i + 1,
            title: m.title,
            published: m.published,
            author: m.author,
            tag: m.tag,
            link: m.link
        }));

        let textList = "🔢 𝑅𝑒𝑝𝑙𝑦 𝐵𝑒𝑙𝑜𝑤 𝑁𝑢𝑚𝑏𝑒𝑟\n━━━━━━━━━━━━━━━━━\n\n";
        movieList.forEach((m) => {
            textList += `🔸 *${m.number}. ${m.title}*\n`;
        });
        textList += "\n💬 *Reply with movie number to view details.*";

        const sentMsg = await conn.sendMessage(from, {
            text: `*🔍 𝐏𝐔𝐏𝐈𝐋𝐕𝐈𝐃𝐄𝐎 𝑪𝑰𝑵𝑬𝑴𝑨 𝑺𝑬𝑨𝑹𝑪𝑯 🎥*\n\n${textList}\n\n${FOOTER}`
        }, { quoted: mek });

        // --- INFINITY REPLY LOOP (Search Results) ---
        const startFlow = async () => {
            while (true) {
                const selection = await waitForReply(conn, from, sender, sentMsg.key.id);
                if (!selection) break;

                const num = parseInt(selection.text);
                const selected = movieList.find(m => m.number === num);

                if (selected) {
                    // Movie Details සහ Download Flow එක ආරම්භ කිරීම
                    handleMovieDownload(conn, from, sender, selected, selection.msg);
                } else {
                    conn.sendMessage(from, { text: "*Invalid Movie Number.*" }, { quoted: selection.msg });
                }
            }
        };
        startFlow();

    } catch (err) {
        await conn.sendMessage(from, { text: `*Error:* ${err.message}` }, { quoted: mek });
    }
});

/**
 * Movie Details ලබාගැනීම සහ Document ලෙස යැවීම
 */
async function handleMovieDownload(conn, from, sender, selected, quotedMsg) {
    try {
        await conn.sendMessage(from, { react: { text: "🎯", key: quotedMsg.key } });

        const movieUrl = `https://darkyasiya-new-movie-api.vercel.app/api/movie/pupil/movie?url=${encodeURIComponent(selected.link)}`;
        const movieRes = await axios.get(movieUrl);
        const movie = movieRes.data.data;

        if (!movie.downloadLink?.length) {
            return conn.sendMessage(from, { text: "*No download links available.*" }, { quoted: quotedMsg });
        }

        // විස්තර සකස් කිරීම (Cast ඇතුළුව)
        let info = `🎬 *${movie.title}*\n\n` +
            `⭐ *Tag:* ${selected.tag}\n` +
            `📅 *Published:* ${selected.published}\n` +
            `✍️ *Author:* ${selected.author}\n` +
            `👷‍♂️ *Cast:*\n${movie.cast.slice(0, 20).join(", ")}\n\n` +
            `🎥 *𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑳𝒊𝒏𝒌𝒔:* 📥\n\n`;

        movie.downloadLink.forEach((d, i) => {
            info += `♦️ ${i + 1}. *${d.type}* — ${d.size}\n`;
        });
        info += "\n🔢 *Reply with number to download.*";

        const downloadMsg = await conn.sendMessage(from, {
            image: { url: movie.image || "https://files.catbox.moe/ajfxoo.jpg" },
            caption: info
        }, { quoted: quotedMsg });

        // --- INFINITY REPLY LOOP (Quality Selection) ---
        const startDownloadFlow = async () => {
            while (true) {
                const dlSelection = await waitForReply(conn, from, sender, downloadMsg.key.id);
                if (!dlSelection) break;

                const num = parseInt(dlSelection.text);
                const chosen = movie.downloadLink[num - 1];

                if (chosen) {
                    await conn.sendMessage(from, { react: { text: "📥", key: dlSelection.msg.key } });

                    const size = chosen.size.toLowerCase();
                    const sizeGB = size.includes("gb") ? parseFloat(size) : parseFloat(size) / 1024;

                    if (sizeGB > 2) {
                        conn.sendMessage(from, { text: `⚠️ *Large File (${chosen.size}). Manual download required.*` }, { quoted: dlSelection.msg });
                        continue;
                    }

                    // Brand Thumbnail එක සෑදීම
                    const thumb = await makeFixedThumbnail(FIXED_THUMB_URL);

                    // වීඩියෝව Document එකක් ලෙස යැවීම
                    await conn.sendMessage(from, {
                        document: { url: chosen.link },
                        mimetype: "video/mp4",
                        fileName: `${selected.title} - ${chosen.size}.mp4`,
                        jpegThumbnail: thumb, // ලෝගෝ එක මෙතනින් සෙට් වේ
                        caption: `🎬 *${selected.title}*\n🎥 *Quality:* ${chosen.size}\n\n${FOOTER}`
                    }, { quoted: dlSelection.msg });

                    await conn.sendMessage(from, { react: { text: "✅", key: dlSelection.msg.key } });
                } else {
                    conn.sendMessage(from, { text: "*Invalid number.*" }, { quoted: dlSelection.msg });
                }
            }
        };
        startDownloadFlow();

    } catch (e) {
        conn.sendMessage(from, { text: "*Error processing download.*" }, { quoted: quotedMsg });
    }
}
