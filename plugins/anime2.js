// plugins/anime.js — SHAVIYA-XMD V2 | React System + Number Reply
const { cmd } = require('../command');
const axios = require("axios");

const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api";

function getQuery(q) {
    if (!q) return "";
    if (Array.isArray(q)) return q.join(" ").trim();
    if (typeof q === "string") return q.trim();
    if (typeof q === "object") return Object.values(q).join(" ").trim();
    return "";
}

// ── React helper ─────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

// ── Number reply listener ─────────────────────────────────────
function listenForNumberReply(conn, from, sender, targetMsgId, timeoutMs, callback) {
    const handler = (upsert) => {
        const msg = upsert.messages?.[0];
        if (!msg?.message) return;
        const text = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text || ""
        ).trim();
        const context   = msg.message.extendedTextMessage?.contextInfo;
        const msgSender = msg.key.participant || msg.key.remoteJid;
        const isReply   = context?.stanzaId === targetMsgId;
        const isUser    = msgSender.includes(sender.split("@")[0]) || msgSender.includes("@lid");
        if (msg.key.remoteJid === from && isUser && isReply && /^\d+$/.test(text)) {
            conn.ev.off("messages.upsert", handler);
            clearTimeout(timer);
            callback(text, msg);
        }
    };
    const timer = setTimeout(() => conn.ev.off("messages.upsert", handler), timeoutMs);
    conn.ev.on("messages.upsert", handler);
}

// ══════════════════════════════════════════════════════════════
//  .anime command
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "anime2",
    alias: ["ani", "animesearch"],
    react: "🎌",
    category: "download",
    fromMe: false,
    desc: "🎌 SL Anime Club වෙතින් anime episodes search සහ download කරන්න"
}, async (conn, mek, m, { from, q, reply, sender, prefix }) => {
    const query = getQuery(q);
    const _p = prefix || ".";

    if (!query) {
        return reply(
            `🎌 *AnimeClub Search*\n\n` +
            `*Usage:* ${_p}anime <anime name>\n` +
            `*Example:* ${_p}anime Naruto`
        );
    }

    await react(conn, from, mek.key, "🔍");

    try {
        await conn.sendPresenceUpdate("composing", from);
        await reply(`🔎 Searching for "${query}"...`);

        const searchRes = await axios.get(
            `${API_BASE}/anime/search?apiKey=${API_KEY}&url=${encodeURIComponent(query)}`,
            { timeout: 15000 }
        );

        if (!searchRes.data?.success || !searchRes.data?.result?.length) {
            await react(conn, from, mek.key, "❌");
            return reply(`❌ No results found for "${query}".`);
        }

        const results = searchRes.data.result.slice(0, 10);
        let listMsg = `🎌 *Anime Search Results*\n🔍 *${query}*\n📊 Found: ${results.length}\n\n`;
        results.forEach((anime, i) => {
            listMsg += `${i + 1}. *${anime.title}*\n   📅 ${anime.year || "N/A"} | ⭐ ${anime.rating || "N/A"}\n\n`;
        });
        listMsg += `📌 *ඉහත message reply කරලා අංකය type කරන්න*\nඋදා: *1*`;

        const sentMsg = await conn.sendMessage(from, { text: listMsg }, { quoted: mek });
        await react(conn, from, mek.key, "✅");

        listenForNumberReply(conn, from, sender, sentMsg.key.id, 5 * 60 * 1000, async (num, replyMsg) => {
            const idx = parseInt(num) - 1;
            if (idx < 0 || idx >= results.length) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ 1–${results.length} අතර reply කරන්න.` }, { quoted: replyMsg });
            }
            await react(conn, from, replyMsg.key, "⏳");
            await fetchEpisodeList(conn, mek, replyMsg, from, sender, results[idx].url, results[idx].title);
        });

    } catch (error) {
        console.error("Anime search error:", error);
        await react(conn, from, mek.key, "❌");
        reply(`❌ Search failed: ${error.message.substring(0, 100)}`);
    }
});

// ── Episode list ──────────────────────────────────────────────
async function fetchEpisodeList(conn, mek, triggerMsg, from, sender, animeUrl, animeTitle) {
    try {
        await conn.sendPresenceUpdate("composing", from);
        await conn.sendMessage(from, { text: `📺 Fetching episodes for *${animeTitle}*...` }, { quoted: mek });

        const epRes = await axios.get(
            `${API_BASE}/animeclub/ep?apiKey=${API_KEY}&url=${encodeURIComponent(animeUrl)}`,
            { timeout: 15000 }
        );

        if (!epRes.data?.success || !epRes.data?.episodes?.length) {
            await react(conn, from, triggerMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ No episodes found for ${animeTitle}.` }, { quoted: mek });
        }

        const episodes = epRes.data.episodes.slice(0, 30);
        let epListMsg = `🎌 *${animeTitle}*\n📺 *Episodes (${episodes.length})*\n\n`;
        episodes.forEach((ep, i) => {
            epListMsg += `${i + 1}. *${ep.title || `Episode ${ep.number || i + 1}`}*\n`;
        });
        epListMsg += `\n📌 *ඉහත message reply කරලා episode අංකය type කරන්න*`;

        const sentMsg = await conn.sendMessage(from, { text: epListMsg }, { quoted: mek });
        await react(conn, from, triggerMsg.key, "✅");

        listenForNumberReply(conn, from, sender, sentMsg.key.id, 5 * 60 * 1000, async (num, replyMsg) => {
            const epIdx = parseInt(num) - 1;
            if (epIdx < 0 || epIdx >= episodes.length) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ 1–${episodes.length} අතර reply කරන්න.` }, { quoted: mek });
            }
            await react(conn, from, replyMsg.key, "📥");
            await fetchDownload(conn, mek, replyMsg, from, episodes[epIdx].url, animeTitle);
        });

    } catch (error) {
        console.error("Episode fetch error:", error);
        await react(conn, from, triggerMsg.key, "❌");
        conn.sendMessage(from, { text: `❌ Failed to fetch episodes: ${error.message.substring(0, 100)}` }, { quoted: mek });
    }
}

// ── Download link ─────────────────────────────────────────────
async function fetchDownload(conn, mek, triggerMsg, from, episodeUrl, animeTitle) {
    try {
        await conn.sendPresenceUpdate("composing", from);
        await conn.sendMessage(from, { text: `📥 Getting download link for *${animeTitle}*...` }, { quoted: mek });

        const dlRes = await axios.get(
            `${API_BASE}/animeclub/dl?apiKey=${API_KEY}&url=${encodeURIComponent(episodeUrl)}`,
            { timeout: 15000 }
        );

        if (!dlRes.data?.success || !dlRes.data?.download_url) {
            await react(conn, from, triggerMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ No download link found for this episode.` }, { quoted: mek });
        }

        await conn.sendMessage(from, {
            text: `🎌 *${animeTitle}*\n\n📥 *Download Link:*\n${dlRes.data.download_url}\n\n> AnimeClub | SHAVIYA-XMD V2`
        }, { quoted: mek });

        await react(conn, from, triggerMsg.key, "✅");
    } catch (error) {
        console.error("Download error:", error);
        await react(conn, from, triggerMsg.key, "❌");
        conn.sendMessage(from, { text: `❌ Download failed: ${error.message.substring(0, 100)}` }, { quoted: mek });
    }
}
