const { cmd } = require("../command");
const axios = require("axios");
const sharp = require('sharp'); // Thumbnail සැකසීමට අවශ්‍ය වේ

// ───────── CONFIGURATION ─────────
const AC2_FOOTER = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
const API_BASE = "https://sl-anime1.vercel.app/api/handler";
const GDRIVE_API_KEY = "AIzaSyB7OnWWJpaxzG70ko0aWXKgzjBpb4KZR98";
// ඔබේ ස්ථාවර GitHub පින්තූර ලින්ක් එක (thumbnail සඳහා)
const fixed_thumb_url = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

// ───────── Create thumbnail ─────────
async function makeThumbnail(url) {
    try {
        console.log("📸 Generating thumbnail...");
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        console.log("❌ Thumbnail error:", e.message);
        return null;
    }
}

/**
 * Multi-Reply Smart Waiter
 * එකම ලිස්ට් එකට කිහිප වතාවක් රිප්ලයි කිරීමට ඉඩ ලබාදෙයි.
 */
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
                // සටහන: මෙතනදී handler එක off කරන්නේ නැත (Multi-reply සඳහා)
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        // විනාඩි 10ක් යනකම් රිප්ලයි බලාපොරොත්තු වේ
        setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 600000); 
    });
}

cmd({
    pattern: "anime",
    alias: ["ac2", "movie2"],
    desc: "Ultimate Multi-Reply GDrive Downloader with Ep Name",
    category: "downloader",
    react: "⛩️",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ කරුණාකර ඇනිමේ නමක් සඳහන් කරන්න.");

        const searchRes = await axios.get(`${API_BASE}?action=search&query=${encodeURIComponent(q)}`);
        const results = searchRes.data?.data;
        if (!results?.length) return reply("❌ කිසිවක් හමු නොවීය.");

        let listText = "⛩️ *𝐀𝐍𝐈𝐌𝐄𝐂𝐋𝐔𝐁𝟐 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n";
        results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });
        const sentSearch = await conn.sendMessage(from, { text: listText + `\nඅංකය Reply කරන්න. (කිහිපයක් වුවද තේරිය හැක)` }, { quoted: m });

        // --- Search List එක පාලනය කරන ලූප් එක ---
        const startSearchFlow = async () => {
            while (true) {
                const animeSelection = await waitForReply(conn, from, sender, sentSearch.key.id);
                if (!animeSelection) break;

                (async () => {
                    const idx = parseInt(animeSelection.text) - 1;
                    const selected = results[idx];
                    if (!selected) return;

                    await conn.sendMessage(from, { react: { text: "⏳", key: animeSelection.msg.key } });
                    const detRes = await axios.get(`${API_BASE}?action=details&url=${encodeURIComponent(selected.link)}`);
                    const details = detRes.data?.data;

                    if (details.episodes && details.episodes.length > 0) {
                        let epText = `📺 *${details.title}*\n\n*Select Episode:*`;
                        details.episodes.forEach((ep, i) => { epText += `\n*${i + 1}.* Episode ${ep.ep_num}`; });
                        const sentEp = await conn.sendMessage(from, { image: { url: details.image }, caption: epText + `\n\nඑපිසෝඩ් අංකය එවන්න. (කිහිපයක් වුවද තේරිය හැක)` }, { quoted: animeSelection.msg });

                        // --- Episode List එක පාලනය කරන ලූප් එක ---
                        const startEpFlow = async () => {
                            while (true) {
                                const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
                                if (!epSel) break;

                                (async () => {
                                    const epIdx = parseInt(epSel.text) - 1;
                                    const chosenEp = details.episodes[epIdx];
                                    if (chosenEp) {
                                        await handleDownload(conn, from, sender, chosenEp.link, details.title, epSel.msg, chosenEp.ep_num);
                                    }
                                })();
                            }
                        };
                        startEpFlow();
                    } else {
                        await handleDownload(conn, from, sender, selected.link, details.title, animeSelection.msg, "Movie");
                    }
                })();
            }
        };

        /**
         * Download Helper
         */
        async function handleDownload(conn, from, sender, url, title, quotedMsg, epNum) {
            try {
                const dlRes = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(url)}`);
                const dlLinks = dlRes.data?.download_links;
                if (!dlLinks) return;

                let qText = `🎬 *Select Quality:*\n*${title}*\n📺 *Episode:* ${epNum}`;
                dlLinks.forEach((dl, i) => { qText += `\n*${i + 1}.* ${dl.quality}`; });
                const sentQual = await conn.sendMessage(from, { text: qText + `\n\nQuality අංකය එවන්න.` }, { quoted: quotedMsg });

                const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
                if (!qSel) return;

                const chosen = dlLinks[parseInt(qSel.text) - 1];
                const driveMatch = chosen.direct_link.match(/(?:drive\.google\.com\/file\/d\/|id=)([\w-]+)/);
                if (!driveMatch) return;
                
                const fileId = driveMatch[1];
                await conn.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });

                const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GDRIVE_API_KEY}`;
                
                const response = await axios({
                    method: 'get',
                    url: downloadUrl,
                    responseType: 'arraybuffer'
                });

                // File නම නිවැරදිව සැකසීම
                const finalFileName = `${title} - Ep ${epNum} [${chosen.quality}].mp4`;

                // --- THUMBNAIL GENERATION ---
                let jpegThumbnail = await makeThumbnail(fixed_thumb_url); 
                // ---------------------------

                await conn.sendMessage(from, {
                    document: Buffer.from(response.data),
                    mimetype: "video/mp4",
                    fileName: finalFileName,
                    jpegThumbnail: jpegThumbnail, // Thumbnail එක මෙතැනට එකතු වේ
                    caption: `✅ *Download Complete*\n\n🎬 *Anime:* ${title}\n📺 *Episode:* ${epNum}\n💎 *Quality:* ${chosen.quality}\n\n${AC2_FOOTER}`
                }, { quoted: qSel.msg });

            } catch (e) {
                console.log(e);
            }
        }

        startSearchFlow();

    } catch (e) {
        console.log(e);
        reply("❌ දෝෂයක් සිදු විය.");
    }
});
