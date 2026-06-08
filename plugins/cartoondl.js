const { cmd } = require("../command");
const { fetchJson } = require("../lib/functions");
const axios = require("axios");

const API_BASE = "https://cartoon-lk.vercel.app/api";
const searchCache = new Map();

cmd({
    pattern: "cd",
    react: "🎬",
    desc: "Search & download cartoons from cartoons.lk\n\n.cd <name> - Search\n.cd <number> - Download selected",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { q, reply, args, chatId }) => {

    try {
        if (!q) {
            return reply(`🎬 *Cartoon Downloader*

📌 *How to use:*
1. Search: .cd kung fu panda
2. Pick number: .cd 1
3. Get video instantly

*Commands:*
.cd <movie name>
.cd <number>`);
        }

        // If number - download selected
        if (/^\d+$/.test(q.trim())) {
            const index = parseInt(q.trim()) - 1;
            const cached = searchCache.get(chatId);
            if (!cached || !cached[index]) {
                return reply("❌ No search results. Use .cd <movie name> first");
            }
            const selected = cached[index];
            await conn.sendPresenceUpdate("downloading", m.chat);
            await reply(`⏬ Downloading *${selected.title}* ...`);

            // Get download link
            const dlUrl = `${API_BASE}/download?post_id=${selected.post_id}&type=single&link_index=0`;
            const dlRes = await fetchJson(dlUrl);
            if (!dlRes || !dlRes.success || !dlRes.direct_link) {
                return reply("❌ Download link not found.");
            }

            const videoUrl = dlRes.direct_link;
            
            // Download video as buffer
            const videoBuffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => Buffer.from(r.data));
            
            // Send as video message
            await conn.sendMessage(m.chat, {
                video: videoBuffer,
                caption: `🎬 *${selected.title}*\n📥 Source: cartoons.lk`,
                mimetype: 'video/mp4'
            }, { quoted: mek });
            
            searchCache.delete(chatId);
            return;
        }

        // ----- SEARCH -----
        await conn.sendPresenceUpdate("composing", m.chat);
        const searchUrl = `${API_BASE}/search?q=${encodeURIComponent(q)}`;
        const res = await fetchJson(searchUrl);

        if (!res || !res.results || res.results.length === 0) {
            return reply(`❌ No results for "${q}"`);
        }

        const results = res.results.slice(0, 10);
        searchCache.set(chatId, results);

        let msg = `🔎 *Results for:* ${q}\n\n`;
        results.forEach((item, i) => {
            msg += `${i+1}. *${item.title}*\n   🆔 Post ID: ${item.post_id}\n   🔗 ${item.url}\n\n`;
        });
        msg += `✨ Reply with number to download video: .cd 1`;
        reply(msg);
        
    } catch (e) {
        console.error(e);
        reply("❌ Error. Try again.");
    }
});
