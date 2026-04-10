const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");

// ───────── CONFIGURATION ─────────
const SEARCH_API_KEY = "kertas"; // XV search API key
const FOOTER = "✫☘ 𝐇𝐀𝐒𝐈𝐘𝐀-𝐌𝐃 𝐗𝐕𝐈𝐃𝐄𝐎𝐒 ☘";
const TEMP_DIR = path.resolve(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Thumbnail එකක් සාදා බෆරයක් ලෙස ලබාදීම
 */
async function makeThumbnail(url) {
    try {
        if (!url) return null;
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        console.log("❌ Thumbnail error:", e.message);
        return null;
    }
}

/**
 * Multi-Reply Smart Waiter (Infinity Reply Logic)
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

            // අංකයක් පමණක් ඇතුළත් රිප්ලයි එකක්දැයි බලයි
            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text)) {
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        // විනාඩි 10ක් යනකම් රිප්ලයි බලාපොරොත්තු වේ
        setTimeout(() => { 
            conn.ev.off("messages.upsert", handler); 
            resolve(null);
        }, 600000); 
    });
}

cmd({
    pattern: "xvideos",
    alias: ["xv", "xvdl"],
    desc: "Search and Download XVideos with Infinity Reply Support",
    category: "download",
    react: "🔞",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❌ Please provide a link or search query.");

        // --- කෙලින්ම ලින්ක් එකක් ලබාදුන් විට ---
        if (q.includes("xvideos.com")) {
            return await handleDownload(conn, from, q, "XV Video", null, m);
        }

        // --- 1. සර්ච් කිරීම (Search Logic) ---
        const searchUrl = `https://api.xte.web.id/v1/search/xv?query=${encodeURIComponent(q)}&apikey=${SEARCH_API_KEY}`;
        const searchRes = await axios.get(searchUrl);
        const results = searchRes.data?.result;

        if (!searchRes.data?.status || !results?.length) return reply("❌ No results found on XVideos.");

        let listText = "🔞 *𝐇𝐀𝐒𝐈𝐘𝐀-𝐌𝐃 𝐗𝐕𝐈𝐃𝐄𝐎𝐒*\n\n";
        results.slice(0, 10).forEach((v, i) => { 
            listText += `*${i + 1}.* ${v.title} [${v.duration}]\n\n`; 
        });

        const sentSearch = await conn.sendMessage(from, { 
            text: listText + `අංකය Reply කර වීඩියෝව ලබාගන්න.\n\n*(ඔබට අවශ්‍ය අංක එකින් එක Reply කර ඕනෑම වීඩියෝ ප්‍රමාණයක් ලබාගත හැක)*` 
        }, { quoted: m });

        // --- INFINITY REPLY LOOP ---
        // මෙම ලූප් එක මගින් යූසර් එම සර්ච් ලිස්ට් එකට රිප්ලයි කරන සෑම වතාවකම ක්‍රියාත්මක වේ.
        const startFlow = async () => {
            while (true) {
                const selection = await waitForReply(conn, from, sender, sentSearch.key.id);
                
                if (!selection) {
                    console.log("⏱️ Reply session expired for:", from);
                    break; 
                }

                const idx = parseInt(selection.text) - 1;
                const selected = results[idx];

                if (selected) {
                    // වීඩියෝව ඩවුන්ලෝඩ් කර යැවීම (Background එකේ සිදුවේ)
                    handleDownload(conn, from, selected.link, selected.title, selected.thumbnail, selection.msg);
                } else {
                    conn.sendMessage(from, { text: "❌ Invalid number. Please select between 1-10." }, { quoted: selection.msg });
                }
            }
        };

        // ලූප් එක ආරම්භ කිරීම
        startFlow();

    } catch (e) {
        console.error("❌ Command Error:", e);
        reply("❌ Error occurred during searching.");
    }
});

/**
 * ඩවුන්ලෝඩ් කර යැවීමේ සහය ශ්‍රිතය (Helper Function)
 */
async function handleDownload(conn, from, videoUrl, videoTitle, thumbUrl, quotedMsg) {
    try {
        // රිඇක්ෂන් එකක් දමන්න
        await conn.sendMessage(from, { react: { text: "⏳", key: quotedMsg.key } });

        // 1. ඩවුන්ලෝඩ් ලින්ක් එක ලබාගැනීම (High Speed Bypass)
        const dlRes = await axios.get(`https://api.xte.web.id/v1/download/xv?url=${encodeURIComponent(videoUrl)}`);
        
        if (!dlRes.data.status || !dlRes.data.result) {
            return conn.sendMessage(from, { text: "❌ Failed to fetch download links." }, { quoted: quotedMsg });
        }

        const data = dlRes.data.result;
        // සාමාන්‍යයෙන් පළමු ලින්ක් එක හොඳම Quality එක වේ
        const dlLink = data.links[0]?.url;
        const finalTitle = data.title || videoTitle;
        const finalThumb = data.thumbnail || thumbUrl;

        if (!dlLink) return conn.sendMessage(from, { text: "❌ No download link available." }, { quoted: quotedMsg });

        await conn.sendMessage(from, { react: { text: "📥", key: quotedMsg.key } });

        // 2. Thumbnail එක සකසා ගැනීම
        const docThumb = await makeThumbnail(finalThumb);

        // 3. Document එකක් ලෙස වීඩියෝව යැවීම (High Speed)
        await conn.sendMessage(from, {
            document: { url: dlLink },
            mimetype: "video/mp4",
            fileName: `${finalTitle.replace(/[/\\?%*:|"<>]/g, '')}.mp4`,
            jpegThumbnail: docThumb,
            caption: `✅ *XV Download Complete*\n\n🎬 *Title:* ${finalTitle}\n\n${FOOTER}`
        }, { quoted: quotedMsg });

        // අවසාන රිඇක්ෂන් එක
        await conn.sendMessage(from, { react: { text: "✅", key: quotedMsg.key } });

    } catch (e) {
        console.error("❌ Download Error:", e.message);
        conn.sendMessage(from, { text: `❌ Error downloading video: ${e.message}` }, { quoted: quotedMsg });
    }
}
