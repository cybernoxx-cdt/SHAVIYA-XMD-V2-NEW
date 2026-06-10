// plugins/sinhalasub.js — SHAVIYA-XMD V2 | React System + Number Reply
const { cmd } = require('../command');
const axios = require("axios");

const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api/sinhalasub";

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
//  .movie command
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "ss2",
    alias: ["cinema", "films"],
    react: "🎬",
    category: "download",
    fromMe: false,
    desc: "🎬 සිංහල උපසිරැසි චිත්‍රපට සොයා ගන්න"
}, async (conn, mek, m, { from, q, reply, sender, prefix }) => {
    const query = getQuery(q);
    const _p = prefix || ".";

    if (!query) {
        return reply(
            `🎬 *සිංහල චිත්‍රපට සෙවුම*\n\n` +
            `*Usage:* ${_p}movie <movie name>\n` +
            `*Example:* ${_p}movie kishkindha`
        );
    }

    await react(conn, from, mek.key, "🔍");

    try {
        await conn.sendPresenceUpdate("composing", from);

        const { data } = await axios.get(
            `${API_BASE}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`,
            { timeout: 15000 }
        );

        if (!data?.success || !data?.results?.length) {
            await react(conn, from, mek.key, "❌");
            return reply(`❌ "${query}" සඳහා ප්‍රතිඵල හමු නොවිණි.`);
        }

        const results = data.results.slice(0, 8);
        let listMsg = `🎬 *සිංහල උපසිරැසි ප්‍රතිඵල*\n🔍 *${query}*\n📊 හමු වූ: ${results.length}\n\n`;
        results.forEach((movie, i) => { listMsg += `${i + 1}. *${movie.title}*\n`; });
        listMsg += `\n📌 *ඉහත message reply කරලා අංකය type කරන්න*\nඋදා: *1*`;

        const sentMsg = await conn.sendMessage(from, { text: listMsg }, { quoted: mek });
        await react(conn, from, mek.key, "✅");

        listenForNumberReply(conn, from, sender, sentMsg.key.id, 5 * 60 * 1000, async (num, replyMsg) => {
            const idx = parseInt(num) - 1;
            if (idx < 0 || idx >= results.length) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ 1–${results.length} අතර අංකයක් reply කරන්න.` }, { quoted: replyMsg });
            }
            await react(conn, from, replyMsg.key, "⏳");
            await fetchQualityOptions(conn, mek, replyMsg, from, sender, _p, results[idx].url, results[idx].title);
        });

    } catch (err) {
        console.error("Movie search error:", err);
        await react(conn, from, mek.key, "❌");
        reply(`❌ සෙවීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
});

// ── Quality options ───────────────────────────────────────────
async function fetchQualityOptions(conn, mek, triggerMsg, from, sender, prefix, movieUrl, title) {
    try {
        await conn.sendPresenceUpdate("composing", from);

        const { data } = await axios.get(
            `${API_BASE}/dl?apiKey=${API_KEY}&text=${encodeURIComponent(movieUrl)}`,
            { timeout: 15000 }
        );

        if (!data?.success || !data?.results?.links?.length) {
            await react(conn, from, triggerMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ "${title}" සඳහා download links හමු නොවිණි.` }, { quoted: mek });
        }

        const allLinks   = data.results.links;
        const videoLinks = allLinks.filter(l => l.quality !== "Subtitles");
        const subLink    = allLinks.find(l => l.quality === "Subtitles");
        const has720p    = videoLinks.some(l => l.size === "HD 720p");
        const has480p    = videoLinks.some(l => l.size === "SD 480p");

        if (!has720p && !has480p) {
            await react(conn, from, triggerMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ 720p හෝ 480p quality නෑ.` }, { quoted: mek });
        }

        const options = [];
        let qualMsg = `🎬 *${title}*\n📥 *Quality reply කරලා තෝරන්න:*\n\n`;
        if (has720p) { qualMsg += `*1.* 🎥 720p (HD) – උසස් quality\n`; options.push("HD 720p"); }
        if (has480p) { qualMsg += `*2.* 📺 480p (SD) – කුඩා ගොනු\n`;  options.push("SD 480p"); }
        qualMsg += `\n📌 *ඉහත message reply කරලා අංකය type කරන්න*`;

        const sentMsg = await conn.sendMessage(from, { text: qualMsg }, { quoted: mek });
        await react(conn, from, triggerMsg.key, "✅");

        listenForNumberReply(conn, from, sender, sentMsg.key.id, 5 * 60 * 1000, async (num, replyMsg) => {
            const qIdx = parseInt(num) - 1;
            if (qIdx < 0 || qIdx >= options.length) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ 1–${options.length} අතර reply කරන්න.` }, { quoted: mek });
            }
            await react(conn, from, replyMsg.key, "📥");
            const link = videoLinks.find(l => l.size === options[qIdx]);
            if (!link) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ Link හමු නොවිණි.` }, { quoted: mek });
            }
            await conn.sendMessage(from, {
                text: `✅ *${title}*\n\n` +
                      `📥 *Download Link (${options[qIdx]}):*\n${link.direct_link}` +
                      (subLink ? `\n\n📝 *Subtitles:*\n${subLink.direct_link}` : "") +
                      `\n\n> 🎬 Powered by SHAVIYA-XMD V2`
            }, { quoted: mek });
            await react(conn, from, replyMsg.key, "✅");
        });

    } catch (err) {
        console.error("Quality fetch error:", err);
        await react(conn, from, triggerMsg.key, "❌");
        conn.sendMessage(from, { text: `❌ Quality ලබා ගැනීම අසාර්ථකයි: ${err.message.substring(0, 100)}` }, { quoted: mek });
    }
}
