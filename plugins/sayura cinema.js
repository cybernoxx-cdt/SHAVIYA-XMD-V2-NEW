const { cmd } = require("../command");
const axios = require("axios");
const fg = require('api-dylux'); // Google Drive dl සඳහා
const { getBuffer } = require('../lib/functions2'); // 59KB ගැටළුව විසඳීමට
const sharp = require('sharp'); // Thumbnail සැකසීමට අවශ්‍ය වේ

// ───────── CONFIGURATION ─────────
const FOOTER = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
// ඔබේ ස්ථාවර GitHub පින්තූර ලින්ක් එක (thumbnail සඳහා)
const fixed_thumb_url = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";
// ඔබේ Sayura Cinema API URL එක මෙතැනට දමන්න
const API_BASE = "https://sayura-cinema-api.vercel.app"; 

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
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        // විනාඩි 10ක් යනකම් රිප්ලයි බලාපොරොත්තු වේ
        setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 600000); 
    });
}

cmd({
    pattern: "sayura",
    alias: ["sc", "movie8"],
    desc: "Search and Download Movies/Series from SayuraCinema",
    category: "downloader",
    react: "🔍",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ කරුණාකර චිත්‍රපටයක නමක් සඳහන් කරන්න. \nඋදා: `.search ben 10`");

        // 1. සෙවීම (Search)
        const searchRes = await axios.get(`${API_BASE}/?q=${encodeURIComponent(q)}`);
        const results = searchRes.data?.results;
        
        if (!searchRes.data?.status || !results?.length) return reply("❌ කිසිවක් හමු නොවීය.");

        let listText = "🔍 *𝐒𝐀𝐘𝐔𝐑𝐀 𝐂𝐈𝐍𝐄𝐌𝐀 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n";
        results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });
        
        const sentSearch = await conn.sendMessage(from, { text: listText + `\nඅංකය Reply කරන්න.` }, { quoted: m });

        // --- Search List එක පාලනය කරන ලූප් එක ---
        const startSearchFlow = async () => {
            while (true) {
                const selection = await waitForReply(conn, from, sender, sentSearch.key.id);
                if (!selection) break;

                const idx = parseInt(selection.text) - 1;
                const selected = results[idx];
                
                if (!selected) {
                    reply("❌ වැරදි අංකයකි.");
                    continue;
                }

                await conn.sendMessage(from, { react: { text: "⏳", key: selection.msg.key } });

                // 2. විස්තර ලබාගැනීම (Details)
                const detRes = await axios.get(`${API_BASE}/?url=${encodeURIComponent(selected.url)}`);
                const details = detRes.data?.data;
                
                if (!details) {
                    reply("❌ විස්තර ලබා ගැනීමට නොහැකි විය.");
                    continue;
                }

                // 3. Movie ද නැත්නම් Episodes ද කියා පරීක්ෂා කිරීම
                if (details.episodes && details.episodes.length > 0) {
                    // SERIES කොටස
                    let epText = `📺 *${details.title}*\n\n*Select Episode:*`;
                    details.episodes.forEach((ep, i) => { epText += `\n*${i + 1}.* Episode ${ep.number}`; });
                    
                    const sentEp = await conn.sendMessage(from, { 
                        image: { url: details.poster }, 
                        caption: epText + `\n\nඑපිසෝඩ් අංකය එවන්න.` 
                    }, { quoted: selection.msg });

                    // --- Episode List එක පාලනය කරන ලූප් එක ---
                    const startEpFlow = async () => {
                        while (true) {
                            const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
                            if (!epSel) break;

                            const epIdx = parseInt(epSel.text) - 1;
                            const chosenEp = details.episodes[epIdx];
                            
                            if (chosenEp) {
                                // GDrive link එක dylux හරහා පිරිසිදු කර බාගත කිරීම
                                await downloadAndSendGDrive(conn, from, chosenEp.url, `${details.title} - Ep ${chosenEp.number}`, epSel.msg);
                            } else {
                                reply("❌ වැරදි එපිසෝඩ් අංකයකි.");
                            }
                        }
                    };
                    startEpFlow();
                } else if (details.downloads && details.downloads.length > 0) {
                    // MOVIE කොටස (Direct Links)
                    let dlText = `🎬 *${details.title}*\n\n*Select Quality:*`;
                    details.downloads.forEach((dl, i) => { dlText += `\n*${i + 1}.* ${dl.quality}`; });

                    const sentDl = await conn.sendMessage(from, { 
                        image: { url: details.poster }, 
                        caption: dlText + `\n\nQuality අංකය එවන්න.` 
                    }, { quoted: selection.msg });

                    // --- Quality List එක පාලනය කරන ලූප් එක ---
                    const startDlFlow = async () => {
                        while (true) {
                            const dlSel = await waitForReply(conn, from, sender, sentDl.key.id);
                            if (!dlSel) break;

                            const dlIdx = parseInt(dlSel.text) - 1;
                            const chosenDl = details.downloads[dlIdx];
                            
                            if (chosenDl) {
                                // GDrive link එක dylux හරහා පිරිසිදු කර බාගත කිරීම
                                await downloadAndSendGDrive(conn, from, chosenDl.url, `${details.title} [${chosenDl.quality}]`, dlSel.msg);
                            } else {
                                reply("❌ වැරදි Quality අංකයකි.");
                            }
                        }
                    };
                    startDlFlow();
                } else {
                    reply("❌ බාගත කිරීමේ ලින්ක් හමු නොවීය.");
                }
            }
        };

        startSearchFlow();

    } catch (e) {
        console.log(e);
        reply("❌ දෝෂයක් සිදු විය.");
    }
});

/**
 * GDrive Downloader Helper
 * FIXED LOGIC: Uses api-dylux + getBuffer + makeThumbnail
 */
async function downloadAndSendGDrive(conn, from, url, title, quotedMsg) {
    try {
        await conn.sendMessage(from, { react: { text: "📥", key: quotedMsg.key } });
        
        // 1. Google Drive ලින්ක් එක dylux සඳහා සකසන්න
        let formattedUrl = url.replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/').replace('&export=download' , '/view');
        
        // 2. api-dylux හරහා සැබෑ URL එක ලබාගන්න
        let res = await fg.GDriveDl(formattedUrl);
        if (!res || !res.downloadUrl) throw new Error("Could not get GDrive link");
        
        // 3. 59KB ගැටළුව විසඳීමට බෆරයක් ලෙස බාගත කිරීම
        let videoBuffer = await getBuffer(res.downloadUrl); 
        
        // --- THUMBNAIL GENERATION ---
        let jpegThumbnail = await makeThumbnail(fixed_thumb_url); // ස්ථාවර Thumbnail එක generate කිරීම
        // ---------------------------
        
        // 4. බෆරය document එකක් ලෙස Thumbnail සමඟ යැවීම
        await conn.sendMessage(from, { 
            document: videoBuffer, 
            fileName: `${title}.mp4`,
            mimetype: "video/mp4",
            jpegThumbnail: jpegThumbnail, // Thumbnail එක මෙතැනට එකතු වේ
            caption: `✅ *Download Complete*\n\n🎬 *File:* ${title}\n\n${FOOTER}` 
        }, { quoted: quotedMsg });

    } catch (e) {
        console.log(e);
        conn.sendMessage(from, { text: `❌ ෆයිල් එක යැවීමේදී දෝෂයක් විය: ${e.message}` }, { quoted: quotedMsg });
    }
}
